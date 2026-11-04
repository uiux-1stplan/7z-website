import { issueSignedToken, presignUrl } from "@vercel/blob";
import { prepare, sqlClient } from "../../api/course-registration.js";
import { requireAdmin, writeAudit } from "../../lib/portal-runtime.mjs";
import { toWebRequest, sendWebResponse, readJson, sendJson } from "../../lib/vercel-api.mjs";

const COURSES = Object.freeze({
  "cinematic-film": { name: "صناعة الأفلام السينمائية بالذكاء الاصطناعي", priceJod: 250 },
  "ai-engineering": { name: "دورة الذكاء الاصطناعي للمهندسين", priceJod: 200 },
});
function isSameOrigin(req) {
  const origin = String(req.headers.origin || "");
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim().toLowerCase();
  const protocol = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim().toLowerCase();
  try {
    const parsed = new URL(origin);
    return protocol === "https" && parsed.protocol === "https:" && parsed.host.toLowerCase() === host;
  } catch { return false; }
}
const clean = (value, max = 120) => String(value ?? "").trim().slice(0, max);
const percent = (value) => Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 100;

function fail(res, status, error) { return sendJson(res, status, { error }); }

export default async function handler(req, res) {
  try {
    const gate = await requireAdmin(toWebRequest(req));
    if (!gate.ok) return sendWebResponse(res, gate.response);
    if (req.method === "POST" && !isSameOrigin(req)) return fail(res, 403, "يلزم تنفيذ الطلب من لوحة الإدارة.");
    if (!["GET", "POST"].includes(req.method)) return fail(res, 405, "طريقة الطلب غير مدعومة.");

    const sql = sqlClient();
    await prepare(sql);

    if (req.method === "GET") {
      if (req.query?.action === "proof") {
        const registrationId = Number(req.query?.registrationId);
        if (!Number.isSafeInteger(registrationId) || registrationId < 1) return fail(res, 400, "التسجيل غير موجود.");
        const rows = await sql`SELECT payment_proof_pathname,payment_proof_content_type FROM course_registrations WHERE id=${registrationId}`;
        const proofUrl = String(rows[0]?.payment_proof_pathname || "");
        if (!proofUrl) return fail(res, 404, "لا يوجد إيصال مرفق بهذا التسجيل.");
        let parsedProof;
        try { parsedProof = new URL(proofUrl); } catch {}
        if (!parsedProof || parsedProof.protocol !== "https:" || !parsedProof.hostname.endsWith(".private.blob.vercel-storage.com") || !parsedProof.pathname.startsWith("/course-payment-proofs/")) return fail(res, 404, "الإيصال غير متاح حاليًا.");
        const pathname = decodeURIComponent(parsedProof.pathname.slice(1));
        const validUntil = Date.now() + 5 * 60 * 1000;
        const signedToken = await issueSignedToken({ pathname, operations: ["get"], validUntil });
        const { presignedUrl } = await presignUrl(signedToken, { pathname, operation: "get", access: "private", validUntil });
        return sendJson(res, 200, { ok: true, url: presignedUrl, validUntil });
      }
      const rawCourse = clean(req.query?.course, 40);
      const courseId = rawCourse === "all" || !rawCourse ? "all" : rawCourse;
      if (courseId !== "all" && !COURSES[courseId]) return fail(res, 400, "الدورة غير موجودة.");
      const page = Math.max(1, Math.min(100000, Number.parseInt(req.query?.page, 10) || 1));
      const pageSize = 100;
      const offset = (page - 1) * pageSize;
      const registrations = await sql`
        SELECT id, seat_number, full_name, email, phone, location, payment_status,
          payment_provider, payment_reference, payment_proof_pathname, payment_proof_content_type, price_jod, discount_jod, discount_percent,
          coupon_code, affiliate_name, commission_percent, commission_jod, commission_status,
          commission_paid_at, commission_payment_reference, course_id, payment_submitted_at,
          created_at, payment_verified_at
        FROM course_registrations
        WHERE (${courseId} = 'all' OR course_id = ${courseId})
        ORDER BY created_at DESC, id DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;
      const counts = await sql`
        SELECT COUNT(*)::int AS total FROM course_registrations
        WHERE (${courseId} = 'all' OR course_id = ${courseId})
      `;
      const coupons = await sql`
        SELECT id, course_id, code, discount_percent, affiliate_name, commission_percent,
          requires_previous_email, active, created_at, updated_at
        FROM course_coupons
        WHERE (${courseId} = 'all' OR course_id = ${courseId})
        ORDER BY course_id, active DESC, code
      `;
      const courseSummary = await sql`
        SELECT course_id,
          COUNT(*)::int AS registrations,
          COUNT(*) FILTER (WHERE payment_status = 'PENDING_REVIEW')::int AS pending_payments,
          COUNT(*) FILTER (WHERE payment_status = 'PAID')::int AS paid_registrations,
          COALESCE(SUM(price_jod) FILTER (WHERE payment_status = 'PAID'), 0)::numeric AS paid_list_value,
          COALESCE(SUM(discount_jod) FILTER (WHERE payment_status = 'PAID'), 0)::numeric AS discounts_applied,
          COALESCE(SUM(price_jod - discount_jod) FILTER (WHERE payment_status = 'PAID'), 0)::numeric AS net_collected,
          COALESCE(SUM(commission_jod) FILTER (WHERE payment_status = 'PAID'), 0)::numeric AS commission_total,
          COALESCE(SUM(commission_jod) FILTER (WHERE payment_status = 'PAID' AND commission_status = 'PAYABLE'), 0)::numeric AS commission_payable,
          COALESCE(SUM(commission_jod) FILTER (WHERE payment_status = 'PAID' AND commission_status = 'PAID'), 0)::numeric AS commission_paid,
          COALESCE(SUM(price_jod - discount_jod - commission_jod) FILTER (WHERE payment_status = 'PAID'), 0)::numeric AS academy_net
        FROM course_registrations
        GROUP BY course_id
      `;
      const commissionSummary = await sql`
        SELECT course_id, COALESCE(NULLIF(affiliate_name, ''), 'Direct / no affiliate') AS affiliate_name,
          COUNT(*) FILTER (WHERE payment_status = 'PAID')::int AS paid_registrations,
          COALESCE(SUM(price_jod - discount_jod) FILTER (WHERE payment_status = 'PAID'), 0)::numeric AS paid_after_discount,
          COALESCE(SUM(commission_jod) FILTER (WHERE payment_status = 'PAID'), 0)::numeric AS commission_total,
          COALESCE(SUM(commission_jod) FILTER (WHERE payment_status = 'PAID' AND commission_status = 'PAYABLE'), 0)::numeric AS commission_payable,
          COALESCE(SUM(commission_jod) FILTER (WHERE payment_status = 'PAID' AND commission_status = 'PAID'), 0)::numeric AS commission_paid,
          COALESCE(SUM(price_jod - discount_jod - commission_jod) FILTER (WHERE payment_status = 'PAID'), 0)::numeric AS academy_net
        FROM course_registrations
        WHERE commission_percent > 0
        GROUP BY course_id, COALESCE(NULLIF(affiliate_name, ''), 'Direct / no affiliate')
        ORDER BY course_id, affiliate_name
      `;
      const couponSummary = await sql`
        SELECT course_id, coupon_code AS code, COUNT(*)::int AS uses,
          COALESCE(SUM(discount_jod), 0)::numeric AS discount_total,
          COALESCE(SUM(commission_jod) FILTER (WHERE payment_status = 'PAID'), 0)::numeric AS commission_total
        FROM course_registrations
        WHERE coupon_code <> ''
        GROUP BY course_id, coupon_code
        ORDER BY course_id, coupon_code
      `;
      return sendJson(res, 200, {
        ok: true,
        courses: Object.entries(COURSES).map(([id, course]) => ({ id, ...course })),
        registrations,
        pagination: { page, pageSize, total: Number(counts[0]?.total || 0), pages: Math.max(1, Math.ceil(Number(counts[0]?.total || 0) / pageSize)) },
        coupons,
        courseSummary,
        commissionSummary,
        couponSummary,
      });
    }

    const body = await readJson(req);
    const action = clean(body.action, 40);

    if (action === "save-coupon") {
      const courseId = clean(body.courseId, 40);
      const code = clean(body.code, 24).toUpperCase();
      const discountPercent = Number(body.discountPercent);
      const commissionPercent = Number(body.commissionPercent || 0);
      const affiliateName = clean(body.affiliateName, 120);
      const requiresPreviousEmail = body.requiresPreviousEmail === true;
      if (!COURSES[courseId]) return fail(res, 400, "اختر دورة صحيحة.");
      if (!/^[A-Z0-9][A-Z0-9-]{1,23}$/.test(code)) return fail(res, 400, "يجب أن يتكون الكود من 2 إلى 24 حرفًا أو رقمًا إنجليزيًا أو شرطة.");
      if (!percent(discountPercent) || discountPercent === 0 || !percent(commissionPercent)) return fail(res, 400, "نسبتا الخصم والعمولة يجب أن تكونا بين 0 و100.");
      if (commissionPercent > 0 && !affiliateName) return fail(res, 400, "أدخل اسم المسوّق عند تحديد عمولة.");
      await sql`
        INSERT INTO course_coupons(course_id,code,discount_percent,affiliate_name,commission_percent,requires_previous_email,active,created_by,updated_by)
        VALUES(${courseId},${code},${discountPercent},${affiliateName},${commissionPercent},${requiresPreviousEmail},TRUE,${gate.auth.userId},${gate.auth.userId})
        ON CONFLICT(course_id,code) DO UPDATE SET discount_percent=EXCLUDED.discount_percent,
          affiliate_name=EXCLUDED.affiliate_name, commission_percent=EXCLUDED.commission_percent,
          requires_previous_email=EXCLUDED.requires_previous_email, active=TRUE,
          updated_by=EXCLUDED.updated_by, updated_at=NOW()
      `;
      await writeAudit({ actorUserId: gate.auth.userId, action: "COURSE_COUPON_SAVED", targetType: "course_coupon", targetId: `${courseId}:${code}`, details: { courseId, code, discountPercent, affiliateName, commissionPercent, requiresPreviousEmail } });
      return sendJson(res, 200, { ok: true });
    }

    if (action === "toggle-coupon") {
      const couponId = Number(body.couponId);
      if (!Number.isSafeInteger(couponId) || couponId < 1 || typeof body.active !== "boolean") return fail(res, 400, "بيانات تعديل الكود غير صحيحة.");
      const rows = await sql`UPDATE course_coupons SET active=${body.active},updated_by=${gate.auth.userId},updated_at=NOW() WHERE id=${couponId} RETURNING course_id,code,active`;
      if (!rows[0]) return fail(res, 404, "الكود غير موجود.");
      await writeAudit({ actorUserId: gate.auth.userId, action: body.active ? "COURSE_COUPON_ACTIVATED" : "COURSE_COUPON_DEACTIVATED", targetType: "course_coupon", targetId: `${rows[0].course_id}:${rows[0].code}`, details: rows[0] });
      return sendJson(res, 200, { ok: true });
    }

    if (action === "mark-commission-paid") {
      const registrationId = Number(body.registrationId);
      const reference = clean(body.reference, 160);
      if (!Number.isSafeInteger(registrationId) || registrationId < 1 || reference.length < 3) return fail(res, 400, "أدخل مرجع تحويل العمولة بعد صرفها.");
      const rows = await sql`
        UPDATE course_registrations SET commission_status='PAID', commission_paid_at=NOW(),
          commission_paid_by=${gate.auth.userId}, commission_payment_reference=${reference}
        WHERE id=${registrationId} AND payment_status='PAID' AND commission_percent > 0 AND commission_status='PAYABLE'
        RETURNING id,course_id,seat_number,affiliate_name,commission_jod,commission_status
      `;
      if (!rows[0]) return fail(res, 409, "هذه العمولة غير مستحقة للصرف حاليًا. حدّث القائمة وتحقق من حالتها.");
      await writeAudit({ actorUserId: gate.auth.userId, action: "COURSE_COMMISSION_MARKED_PAID", targetType: "course_registration", targetId: String(registrationId), details: { ...rows[0], reference } });
      return sendJson(res, 200, { ok: true });
    }

    return fail(res, 400, "الإجراء المطلوب غير صحيح.");
  } catch (error) {
    console.error("Course finance administration failed", error);
    return fail(res, 500, "تعذر تحميل إدارة الدورات مؤقتًا. حاول مرة أخرى.");
  }
}

