import { del, issueSignedToken, presignUrl } from "@vercel/blob";
import { prepare, sqlClient } from "../../api/course-registration.js";
import { requireAdmin, writeAudit } from "../../lib/portal-runtime.mjs";
import { toWebRequest, sendWebResponse, readJson, sendJson } from "../../lib/vercel-api.mjs";

const COURSES = Object.freeze({
  "cinematic-film": { name: "AI Cinematic Filmmaking", priceJod: 250 },
  "ai-engineering": { name: "AI for Engineers", priceJod: 200 },
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
    if (req.method === "POST" && !isSameOrigin(req)) return fail(res, 403, "This action must be performed from the admin dashboard.");
    if (!["GET", "POST"].includes(req.method)) return fail(res, 405, "This request method is not supported.");

    const sql = sqlClient();
    await prepare(sql);

    if (req.method === "GET") {
      if (req.query?.action === "proof") {
        const registrationId = Number(req.query?.registrationId);
        if (!Number.isSafeInteger(registrationId) || registrationId < 1) return fail(res, 400, "Registration not found.");
        const rows = await sql`SELECT payment_proof_pathname,payment_proof_content_type FROM course_registrations WHERE id=${registrationId} AND deleted_at IS NULL`;
        const proofUrl = String(rows[0]?.payment_proof_pathname || "");
        if (!proofUrl) return fail(res, 404, "No receipt is attached to this registration.");
        let parsedProof;
        try { parsedProof = new URL(proofUrl); } catch {}
        if (!parsedProof || parsedProof.protocol !== "https:" || !parsedProof.hostname.endsWith(".private.blob.vercel-storage.com") || !parsedProof.pathname.startsWith("/course-payment-proofs/")) return fail(res, 404, "The receipt is currently unavailable.");
        const pathname = decodeURIComponent(parsedProof.pathname.slice(1));
        const validUntil = Date.now() + 5 * 60 * 1000;
        const signedToken = await issueSignedToken({ pathname, operations: ["get"], validUntil });
        const { presignedUrl } = await presignUrl(signedToken, { pathname, operation: "get", access: "private", validUntil });
        return sendJson(res, 200, { ok: true, url: presignedUrl, validUntil });
      }
      const rawCourse = clean(req.query?.course, 40);
      const courseId = rawCourse === "all" || !rawCourse ? "all" : rawCourse;
      if (courseId !== "all" && !COURSES[courseId]) return fail(res, 400, "Course not found.");
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
        WHERE deleted_at IS NULL AND (${courseId} = 'all' OR course_id = ${courseId})
        ORDER BY created_at DESC, id DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;
      const counts = await sql`
        SELECT COUNT(*)::int AS total FROM course_registrations
        WHERE deleted_at IS NULL AND (${courseId} = 'all' OR course_id = ${courseId})
      `;
      const coupons = await sql`
        SELECT id, course_id, code, discount_percent, affiliate_name, commission_percent,
          requires_previous_email, active, created_at, updated_at
        FROM course_coupons
        WHERE deleted_at IS NULL AND (${courseId} = 'all' OR course_id = ${courseId})
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
        WHERE deleted_at IS NULL
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
        WHERE deleted_at IS NULL AND commission_percent > 0
        GROUP BY course_id, COALESCE(NULLIF(affiliate_name, ''), 'Direct / no affiliate')
        ORDER BY course_id, affiliate_name
      `;
      const couponSummary = await sql`
        SELECT course_id, coupon_code AS code, COUNT(*)::int AS uses,
          COALESCE(SUM(discount_jod), 0)::numeric AS discount_total,
          COALESCE(SUM(commission_jod) FILTER (WHERE payment_status = 'PAID'), 0)::numeric AS commission_total
        FROM course_registrations
        WHERE deleted_at IS NULL AND coupon_code <> ''
        GROUP BY course_id, coupon_code
        ORDER BY course_id, coupon_code
      `;
      const refundAdjustments = await sql`
        SELECT registration_id, course_id, seat_number, list_price_jod, discount_jod,
          amount_after_discount_jod, affiliate_name, commission_jod, commission_already_paid_jod,
          refund_due_jod, refund_status, deleted_at
        FROM course_registration_adjustments
        WHERE refund_due_jod > 0 AND (${courseId} = 'all' OR course_id = ${courseId})
        ORDER BY deleted_at DESC, registration_id DESC
        LIMIT 500
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
        refundAdjustments,
      });
    }

    const body = await readJson(req);
    const action = clean(body.action, 40);

    if (action === "delete-registration") {
      const registrationId = Number(body.registrationId);
      if (!Number.isSafeInteger(registrationId) || registrationId < 1) return fail(res, 400, "Select a valid registration.");
      const current = await sql`SELECT id,course_id,seat_number,payment_status,payment_proof_pathname FROM course_registrations WHERE id=${registrationId} AND deleted_at IS NULL`;
      if (!current[0]) return fail(res, 404, "This registration was already removed or could not be found.");
      const proofUrl = String(current[0].payment_proof_pathname || "");
      if (proofUrl) {
        let parsed;
        try { parsed = new URL(proofUrl); } catch {}
        if (!parsed || parsed.protocol !== "https:" || !parsed.hostname.endsWith(".private.blob.vercel-storage.com") || !parsed.pathname.startsWith("/course-payment-proofs/")) return fail(res, 409, "The attached receipt could not be verified for secure removal. No student data was changed.");
        try { await del(proofUrl); }
        catch (error) {
          console.error("Student receipt deletion failed", error);
          return fail(res, 503, "The receipt could not be securely deleted. The student record was left unchanged.");
        }
      }
      const removed = await sql`
        WITH source AS (
          SELECT * FROM course_registrations WHERE id=${registrationId} AND deleted_at IS NULL FOR UPDATE
        ), archived AS (
          INSERT INTO course_registration_adjustments(
            registration_id,course_id,seat_number,payment_status,list_price_jod,discount_code,
            discount_percent,discount_jod,amount_after_discount_jod,affiliate_name,
            commission_percent,commission_jod,commission_status,commission_already_paid_jod,
            refund_due_jod,refund_status,deleted_by
          )
          SELECT id,course_id,seat_number,payment_status,price_jod,coupon_code,
            discount_percent,discount_jod,price_jod-discount_jod,affiliate_name,
            commission_percent,commission_jod,commission_status,
            CASE WHEN commission_status='PAID' THEN commission_jod ELSE 0 END,
            CASE WHEN payment_status='PAID' THEN price_jod-discount_jod ELSE 0 END,
            CASE WHEN payment_status='PAID' THEN 'PENDING_REFUND' WHEN payment_status='REFUNDED' THEN 'ALREADY_REFUNDED' ELSE 'NOT_REQUIRED' END,
            ${gate.auth.userId}
          FROM source
          ON CONFLICT(registration_id) DO NOTHING
          RETURNING registration_id
        )
        UPDATE course_registrations AS r SET
          full_name='Removed student',
          email='removed+' || r.id::text || '@deleted.invalid',
          phone='',location='',experience='',preferred_language='',
          goal='',previous_course_email='',payment_reference='',
          payment_proof_pathname='',payment_proof_content_type='',
          deleted_at=NOW(),deleted_by=${gate.auth.userId}
        FROM archived WHERE r.id=archived.registration_id
        RETURNING r.id,r.course_id,r.seat_number,r.payment_status
      `;
      if (!removed[0]) return fail(res, 409, "The registration changed during removal. Refresh the dashboard before trying again.");
      await writeAudit({ actorUserId: gate.auth.userId, action: "COURSE_REGISTRATION_REMOVED", targetType: "course_registration", targetId: String(registrationId), details: { courseId: removed[0].course_id, seatNumber: Number(removed[0].seat_number), previousPaymentStatus: removed[0].payment_status, receiptDeleted: Boolean(proofUrl), accountingSnapshot: true } });
      return sendJson(res, 200, { ok: true, refundDue: removed[0].payment_status === "PAID" });
    }

    if (action === "save-coupon") {
      const courseId = clean(body.courseId, 40);
      const code = clean(body.code, 24).toUpperCase();
      const discountPercent = Number(body.discountPercent);
      const commissionPercent = Number(body.commissionPercent || 0);
      const affiliateName = clean(body.affiliateName, 120);
      const requiresPreviousEmail = body.requiresPreviousEmail === true;
      const couponId = body.couponId == null ? null : Number(body.couponId);
      if (!COURSES[courseId]) return fail(res, 400, "Choose a valid course.");
      if (!/^[A-Z0-9][A-Z0-9-]{1,23}$/.test(code)) return fail(res, 400, "Use 2–24 English letters, numbers, or hyphens for the code.");
      if (!percent(discountPercent) || discountPercent === 0 || !percent(commissionPercent)) return fail(res, 400, "Discount and commission rates must be between 0% and 100%.");
      if (commissionPercent > 0 && !affiliateName) return fail(res, 400, "Enter an affiliate name when setting a commission.");
      if (couponId !== null && (!Number.isSafeInteger(couponId) || couponId < 1)) return fail(res, 400, "The discount code update is invalid.");
      if (couponId !== null) {
        const conflict = await sql`SELECT id FROM course_coupons WHERE course_id=${courseId} AND code=${code} AND id<>${couponId}`;
        if (conflict.length) return fail(res, 409, "That code already exists for this course.");
        const updated = await sql`
          UPDATE course_coupons SET course_id=${courseId},code=${code},discount_percent=${discountPercent},
            affiliate_name=${affiliateName},commission_percent=${commissionPercent},
            requires_previous_email=${requiresPreviousEmail},updated_by=${gate.auth.userId},updated_at=NOW()
          WHERE id=${couponId} AND deleted_at IS NULL RETURNING id
        `;
        if (!updated[0]) return fail(res, 404, "Discount code not found.");
      } else {
        await sql`
          INSERT INTO course_coupons(course_id,code,discount_percent,affiliate_name,commission_percent,requires_previous_email,active,created_by,updated_by,deleted_at,deleted_by)
          VALUES(${courseId},${code},${discountPercent},${affiliateName},${commissionPercent},${requiresPreviousEmail},TRUE,${gate.auth.userId},${gate.auth.userId},NULL,'')
          ON CONFLICT(course_id,code) DO UPDATE SET discount_percent=EXCLUDED.discount_percent,
            affiliate_name=EXCLUDED.affiliate_name, commission_percent=EXCLUDED.commission_percent,
            requires_previous_email=EXCLUDED.requires_previous_email, active=TRUE, deleted_at=NULL, deleted_by='',
            updated_by=EXCLUDED.updated_by, updated_at=NOW()
        `;
      }
      await writeAudit({ actorUserId: gate.auth.userId, action: couponId === null ? "COURSE_COUPON_SAVED" : "COURSE_COUPON_EDITED", targetType: "course_coupon", targetId: `${courseId}:${code}`, details: { courseId, code, discountPercent, affiliateName, commissionPercent, requiresPreviousEmail } });
      return sendJson(res, 200, { ok: true });
    }

    if (action === "toggle-coupon") {
      const couponId = Number(body.couponId);
      if (!Number.isSafeInteger(couponId) || couponId < 1 || typeof body.active !== "boolean") return fail(res, 400, "The discount code update is invalid.");
      const rows = await sql`UPDATE course_coupons SET active=${body.active},updated_by=${gate.auth.userId},updated_at=NOW() WHERE id=${couponId} AND deleted_at IS NULL RETURNING course_id,code,active`;
      if (!rows[0]) return fail(res, 404, "Discount code not found.");
      await writeAudit({ actorUserId: gate.auth.userId, action: body.active ? "COURSE_COUPON_ACTIVATED" : "COURSE_COUPON_DEACTIVATED", targetType: "course_coupon", targetId: `${rows[0].course_id}:${rows[0].code}`, details: rows[0] });
      return sendJson(res, 200, { ok: true });
    }

    if (action === "delete-coupon") {
      const couponId = Number(body.couponId);
      if (!Number.isSafeInteger(couponId) || couponId < 1) return fail(res, 400, "The discount code update is invalid.");
      const rows = await sql`UPDATE course_coupons SET active=FALSE,deleted_at=NOW(),deleted_by=${gate.auth.userId},updated_by=${gate.auth.userId},updated_at=NOW() WHERE id=${couponId} AND deleted_at IS NULL RETURNING course_id,code,affiliate_name`;
      if (!rows[0]) return fail(res, 404, "Discount code not found.");
      await writeAudit({ actorUserId: gate.auth.userId, action: "COURSE_COUPON_DELETED", targetType: "course_coupon", targetId: `${rows[0].course_id}:${rows[0].code}`, details: rows[0] });
      return sendJson(res, 200, { ok: true });
    }

    if (action === "edit-affiliate" || action === "delete-affiliate") {
      const courseId = clean(body.courseId, 40);
      const affiliateName = clean(body.affiliateName, 120);
      if (!COURSES[courseId] || !affiliateName) return fail(res, 400, "Choose a valid course and affiliate.");
      if (action === "edit-affiliate") {
        const newName = clean(body.newName, 120);
        if (newName.length < 2) return fail(res, 400, "Enter a valid affiliate name.");
        const rows = await sql`UPDATE course_coupons SET affiliate_name=${newName},updated_by=${gate.auth.userId},updated_at=NOW() WHERE course_id=${courseId} AND affiliate_name=${affiliateName} AND deleted_at IS NULL RETURNING id`;
        if (!rows.length) return fail(res, 404, "Affiliate not found for this course.");
        await writeAudit({ actorUserId: gate.auth.userId, action: "COURSE_AFFILIATE_RENAMED", targetType: "course_affiliate", targetId: `${courseId}:${affiliateName}`, details: { courseId, previousName: affiliateName, newName, updatedCodes: rows.length } });
        return sendJson(res, 200, { ok: true, updatedCodes: rows.length });
      }
      const rows = await sql`UPDATE course_coupons SET active=FALSE,deleted_at=NOW(),deleted_by=${gate.auth.userId},updated_by=${gate.auth.userId},updated_at=NOW() WHERE course_id=${courseId} AND affiliate_name=${affiliateName} AND deleted_at IS NULL RETURNING id`;
      if (!rows.length) return fail(res, 404, "Affiliate not found for this course.");
      await writeAudit({ actorUserId: gate.auth.userId, action: "COURSE_AFFILIATE_REMOVED", targetType: "course_affiliate", targetId: `${courseId}:${affiliateName}`, details: { courseId, affiliateName, removedCodes: rows.length } });
      return sendJson(res, 200, { ok: true, removedCodes: rows.length });
    }

    if (action === "mark-commission-paid") {
      const registrationId = Number(body.registrationId);
      if (!Number.isSafeInteger(registrationId) || registrationId < 1) return fail(res, 400, "The commission update is invalid.");
      const rows = await sql`
        UPDATE course_registrations SET commission_status='PAID', commission_paid_at=NOW(),
          commission_paid_by=${gate.auth.userId}
        WHERE id=${registrationId} AND deleted_at IS NULL AND payment_status='PAID' AND commission_percent > 0 AND commission_status='PAYABLE'
        RETURNING id,course_id,seat_number,affiliate_name,commission_jod,commission_status
      `;
      if (!rows[0]) return fail(res, 409, "This commission is not currently payable. Refresh and check its status.");
      await writeAudit({ actorUserId: gate.auth.userId, action: "COURSE_COMMISSION_MARKED_PAID", targetType: "course_registration", targetId: String(registrationId), details: { ...rows[0], manualAccountingConfirmation: true } });
      return sendJson(res, 200, { ok: true });
    }

    return fail(res, 400, "The requested action is invalid.");
  } catch (error) {
    console.error("Course finance administration failed", error);
    return fail(res, 500, "Academy finance is temporarily unavailable. Please try again.");
  }
}

