import {
  getSql,
  requireAdmin,
  writeAudit,
} from "../../lib/portal-runtime.mjs";
import {
  sendWebResponse,
  toWebRequest,
} from "../../lib/vercel-api.mjs";
import { sendZohoMail } from "../course-registration.js";

const courses = new Set(["all", "cinematic-film", "ai-engineering"]);
function send(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(body);
}

function bodyOf(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return JSON.parse(String(req.body || "{}")); } catch { return {}; }
}

function text(value, limit = 180) {
  return String(value ?? "").trim().slice(0, limit);
}

function percent(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 100 ? number : null;
}

async function ensureSchema(sql) {
  await sql`CREATE TABLE IF NOT EXISTS course_admin_affiliates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    company TEXT NOT NULL DEFAULT '',
    commission_percent INTEGER NOT NULL DEFAULT 20 CHECK (commission_percent BETWEEN 0 AND 100),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    legacy_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS course_discount_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    affiliate_id UUID REFERENCES course_admin_affiliates(id) ON DELETE SET NULL,
    affiliate_name TEXT NOT NULL DEFAULT '',
    course_id TEXT NOT NULL DEFAULT 'all',
    discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 0 AND 100),
    commission_percent INTEGER NOT NULL DEFAULT 0 CHECK (commission_percent BETWEEN 0 AND 100),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    max_redemptions INTEGER,
    requires_previous_email BOOLEAN NOT NULL DEFAULT FALSE,
    legacy_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

  const legacyAffiliates = [
    ["legacy-hassan", "Hassan Rayan", 25],
    ["legacy-shaas", "Shaas Matar", 25],
    ["legacy-abdulrahman", "Abdulrahman Mohammed", 25],
  ];
  for (const [key, name, commission] of legacyAffiliates) {
    await sql`INSERT INTO course_admin_affiliates (name, commission_percent, legacy_key)
      VALUES (${name}, ${commission}, ${key}) ON CONFLICT (legacy_key) DO NOTHING`;
  }

  const legacyCodes = [
    ["HASSAN10", "legacy-hassan", 10, 25, false],
    ["SHAS10", "legacy-shaas", 10, 25, false],
    ["ABDULRAHMAN10", "legacy-abdulrahman", 10, 25, false],
    ["7Z10", null, 10, 0, false],
    ["ALUMNI15", null, 15, 0, true],
  ];
  for (const [code, legacyKey, discount, commission, previousEmail] of legacyCodes) {
    await sql`INSERT INTO course_discount_codes
      (code, affiliate_id, affiliate_name, discount_percent, commission_percent, requires_previous_email, legacy_key)
      VALUES (${code},
        (SELECT id FROM course_admin_affiliates WHERE legacy_key = ${legacyKey}),
        COALESCE((SELECT name FROM course_admin_affiliates WHERE legacy_key = ${legacyKey}), ''),
        ${discount}, ${commission}, ${previousEmail}, ${`legacy-code-${code}`})
      ON CONFLICT (code) DO NOTHING`;
  }
}

async function getAffiliates(sql) {
  try {
    return await sql`SELECT a.id, a.name, a.email, a.company, a.commission_percent,
      a.status, a.created_at,
      COUNT(DISTINCT c.id)::int AS code_count,
      COUNT(r.id)::int AS registration_count,
      COALESCE(SUM(CASE WHEN r.payment_status IN ('PAID','APPROVED','VERIFIED')
        THEN GREATEST(COALESCE(r.price_jod,250) - COALESCE(r.discount_jod,0),0) ELSE 0 END),0)::numeric(12,3) AS net_sales_jod,
      COALESCE(SUM(CASE WHEN r.payment_status IN ('PAID','APPROVED','VERIFIED')
        THEN COALESCE(r.commission_jod,0) ELSE 0 END),0)::numeric(12,3) AS earned_commission_jod,
      COALESCE(SUM(CASE WHEN r.payment_status IN ('PAID','APPROVED','VERIFIED') AND r.commission_status <> 'PAID'
        THEN COALESCE(r.commission_jod,0) ELSE 0 END),0)::numeric(12,3) AS outstanding_commission_jod
    FROM course_admin_affiliates a
    LEFT JOIN course_discount_codes c ON c.affiliate_id = a.id
    LEFT JOIN course_registrations r ON UPPER(r.coupon_code) = UPPER(c.code)
    GROUP BY a.id ORDER BY a.created_at DESC`;
  } catch (error) {
    if (error?.code !== "42P01") throw error;
    return sql`SELECT a.id,a.name,a.email,a.company,a.commission_percent,a.status,a.created_at,
      COUNT(DISTINCT c.id)::int AS code_count,0::int AS registration_count,
      0::numeric AS net_sales_jod,0::numeric AS earned_commission_jod,0::numeric AS outstanding_commission_jod
      FROM course_admin_affiliates a LEFT JOIN course_discount_codes c ON c.affiliate_id=a.id
      GROUP BY a.id ORDER BY a.created_at DESC`;
  }
}

async function getCodes(sql) {
  try {
    return await sql`SELECT c.id, c.code, c.affiliate_id, COALESCE(a.name,c.affiliate_name,'') AS affiliate_name,
      c.course_id, c.discount_percent, c.commission_percent, c.status, c.max_redemptions,
      c.requires_previous_email, c.created_at, COUNT(r.id)::int AS redemption_count
    FROM course_discount_codes c
    LEFT JOIN course_admin_affiliates a ON a.id = c.affiliate_id
    LEFT JOIN course_registrations r ON UPPER(r.coupon_code) = UPPER(c.code)
    GROUP BY c.id, a.name ORDER BY c.created_at DESC`;
  } catch (error) {
    if (error?.code !== "42P01") throw error;
    return sql`SELECT c.id,c.code,c.affiliate_id,COALESCE(a.name,c.affiliate_name,'') AS affiliate_name,
      c.course_id,c.discount_percent,c.commission_percent,c.status,c.max_redemptions,
      c.requires_previous_email,c.created_at,0::int AS redemption_count
      FROM course_discount_codes c LEFT JOIN course_admin_affiliates a ON a.id=c.affiliate_id ORDER BY c.created_at DESC`;
  }
}

async function getAccounting(sql) {
  let rows = [];
  let totals = { gross: 0, revenue: 0, pending: 0, discounts: 0, commissionsDue: 0, commissionsTotal: 0, studioNet: 0 };
  try {
    const [summary] = await sql`SELECT
      COALESCE(SUM(CASE WHEN payment_status IN ('PAID','APPROVED','VERIFIED') THEN COALESCE(price_jod,250) ELSE 0 END),0) AS gross,
      COALESCE(SUM(CASE WHEN payment_status IN ('PAID','APPROVED','VERIFIED') THEN GREATEST(COALESCE(price_jod,250)-COALESCE(discount_jod,0),0) ELSE 0 END),0) AS revenue,
      COALESCE(SUM(CASE WHEN payment_status='PENDING_REVIEW' THEN GREATEST(COALESCE(price_jod,250)-COALESCE(discount_jod,0),0) ELSE 0 END),0) AS pending,
      COALESCE(SUM(COALESCE(discount_jod,0)),0) AS discounts,
      COALESCE(SUM(CASE WHEN payment_status IN ('PAID','APPROVED','VERIFIED') AND commission_status<>'PAID' THEN COALESCE(commission_jod,0) ELSE 0 END),0) AS commissions_due,
      COALESCE(SUM(CASE WHEN payment_status IN ('PAID','APPROVED','VERIFIED') THEN COALESCE(commission_jod,0) ELSE 0 END),0) AS commissions_total
      FROM course_registrations`;
    totals = {
      gross: Number(summary?.gross || 0), revenue: Number(summary?.revenue || 0),
      pending: Number(summary?.pending || 0), discounts: Number(summary?.discounts || 0),
      commissionsDue: Number(summary?.commissions_due || 0), commissionsTotal: Number(summary?.commissions_total || 0),
    };
    totals.studioNet = totals.revenue - totals.commissionsTotal;
    rows = await sql`SELECT id, full_name, email, course_id, created_at, payment_status,
      price_jod, discount_jod, coupon_code, affiliate_name, commission_percent,
      commission_jod, commission_status, payment_provider, payment_reference
      FROM course_registrations ORDER BY created_at DESC LIMIT 500`;
  } catch (error) {
    if (error?.code !== "42P01") throw error;
  }
  return {
    totals: Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, Math.round(value * 1000) / 1000])),
    registrations: rows,
  };
}

export default async function handler(req, res) {
  try {
    const gate = await requireAdmin(toWebRequest(req));
    if (!gate.ok) return sendWebResponse(res, gate.response);
    if (!["GET", "POST"].includes(req.method)) return send(res, 405, { error: "Method not allowed." });

    const sql = getSql();
    await ensureSchema(sql);

    if (req.method === "GET") {
      if (req.query?.view === "accounting") return send(res, 200, await getAccounting(sql));
      const [affiliates, codes] = await Promise.all([getAffiliates(sql), getCodes(sql)]);
      return send(res, 200, { affiliates, codes });
    }

    const body = bodyOf(req);
    if (body.action === "create-affiliate") {
      const name = text(body.name, 120);
      const email = text(body.email, 180).toLowerCase();
      const company = text(body.company, 160);
      const commission = percent(body.commissionPercent);
      if (!name || commission === null || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return send(res, 400, { error: "Enter a name, valid email and commission between 0 and 100." });
      const [affiliate] = await sql`INSERT INTO course_admin_affiliates (name,email,company,commission_percent)
        VALUES (${name},${email || null},${company},${commission}) RETURNING id,name,email,company,commission_percent,status,created_at`;
      await writeAudit({ actorUserId: gate.auth.userId, action: "course_affiliate_created", targetType: "course_affiliate", targetId: affiliate.id, details: { email, commissionPercent: commission } });
      return send(res, 201, { affiliate });
    }

    if (body.action === "create-code") {
      const code = text(body.code, 32).toUpperCase();
      const courseId = text(body.courseId || "all", 32);
      const discount = percent(body.discountPercent);
      const hasCommission = body.commissionPercent !== "" && body.commissionPercent !== undefined;
      const commissionInput = hasCommission ? percent(body.commissionPercent) : null;
      if (!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code) || !courses.has(courseId) || discount === null || (hasCommission && commissionInput === null)) return send(res, 400, { error: "Check the code, course and percentage values." });
      if (body.affiliateId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(body.affiliateId))) return send(res, 400, { error: "The selected affiliate is not valid." });
      const affiliateRows = body.affiliateId ? await sql`SELECT id,name,commission_percent,status FROM course_admin_affiliates WHERE id=${text(body.affiliateId,64)}` : [];
      const affiliate = affiliateRows[0];
      if (body.affiliateId && (!affiliate || affiliate.status !== "active")) return send(res, 400, { error: "Choose an active affiliate." });
      const commission = commissionInput ?? Number(affiliate?.commission_percent || 0);
      const maxUses = body.maxRedemptions ? Number(body.maxRedemptions) : null;
      if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 1000000)) return send(res, 400, { error: "Maximum uses must be a positive whole number." });
      const [coupon] = await sql`INSERT INTO course_discount_codes
        (code,affiliate_id,affiliate_name,course_id,discount_percent,commission_percent,max_redemptions)
        VALUES (${code},${affiliate?.id || null},${affiliate?.name || ""},${courseId},${discount},${commission},${maxUses})
        RETURNING id,code,affiliate_id,affiliate_name,course_id,discount_percent,commission_percent,status,max_redemptions,created_at`;
      await writeAudit({ actorUserId: gate.auth.userId, action: "course_discount_code_created", targetType: "course_discount_code", targetId: coupon.id, details: { code, courseId, discountPercent: discount, commissionPercent: commission } });
      return send(res, 201, { coupon });
    }

    if (body.action === "toggle-affiliate") {
      const status = body.status === "inactive" ? "inactive" : "active";
      const [affiliate] = await sql`UPDATE course_admin_affiliates SET status=${status},updated_at=NOW() WHERE id=${text(body.id,64)} RETURNING id,status`;
      if (!affiliate) return send(res, 404, { error: "Affiliate not found." });
      await writeAudit({ actorUserId: gate.auth.userId, action: "course_affiliate_status_changed", targetType: "course_affiliate", targetId: affiliate.id, details: { status } });
      return send(res, 200, { affiliate });
    }

    if (body.action === "toggle-code") {
      const status = body.status === "inactive" ? "inactive" : "active";
      const [coupon] = await sql`UPDATE course_discount_codes SET status=${status},updated_at=NOW() WHERE id=${text(body.id,64)} RETURNING id,status`;
      if (!coupon) return send(res, 404, { error: "Discount code not found." });
      await writeAudit({ actorUserId: gate.auth.userId, action: "course_discount_code_status_changed", targetType: "course_discount_code", targetId: coupon.id, details: { status } });
      return send(res, 200, { coupon });
    }

    if (body.action === "set-payment-status") {
      const status = ["PAID", "REJECTED", "PENDING_REVIEW"].includes(body.status) ? body.status : null;
      const registrationId = Number(body.id);
      if (!status || !Number.isSafeInteger(registrationId) || registrationId < 1) return send(res, 400, { error: "Payment update is not valid." });
      const [before] = await sql`SELECT id,full_name,email,course_id,seat_number,price_jod,discount_jod,coupon_code,payment_status FROM course_registrations WHERE id=${registrationId}`;
      if (!before) return send(res, 404, { error: "Registration not found." });
      const [registration] = await sql`UPDATE course_registrations SET payment_status=${status},
        commission_status=CASE WHEN ${status}='PAID' AND commission_percent>0 THEN 'PAYABLE'
          WHEN ${status}='PAID' THEN 'NOT_APPLICABLE' WHEN ${status}='PENDING_REVIEW' AND commission_percent>0 THEN 'PENDING_PAYMENT_REVIEW'
          ELSE 'NOT_APPLICABLE' END
        WHERE id=${registrationId} RETURNING id,payment_status,commission_status`;
      await writeAudit({ actorUserId: gate.auth.userId, action: "course_payment_status_changed", targetType: "course_registration", targetId: registration.id, details: { status } });
      let notificationSent = null;
      if (before.payment_status !== status && ["PAID", "REJECTED"].includes(status)) {
        const approved = status === "PAID";
        const courseName = before.course_id === "ai-engineering" ? "7Z AI for Engineers" : "7Z AI Cinematic Filmmaking";
        const amount = Math.max(0, Number(before.price_jod || 0) - Number(before.discount_jod || 0));
        const headline = approved ? "Payment approved — your place is confirmed" : "We could not verify this payment yet";
        const next = approved ? "Your course payment has been approved. Learning platform access details will follow separately once enrollment access is ready." : "Your payment was not approved. Please contact the academy team with your transfer reference to resolve the issue.";
        const safe = (value) => String(value ?? "").replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
        const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body style="margin:0;padding:28px 12px;background:#eef3f9;font-family:Arial,Helvetica,sans-serif;color:#172338"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:auto;background:#fff;border:1px solid #dce5f0;border-radius:18px;overflow:hidden"><tr><td style="padding:24px 30px;background:linear-gradient(125deg,#080d16,#13233b)"><img src="https://7z-magic.com/assets/brand/7Z-LogoT(3).png" width="58" height="58" alt="7Z Magic" style="display:block;object-fit:contain"><div style="margin-top:12px;color:#fff;font-size:18px;font-weight:bold;letter-spacing:2px">7Z MAGIC ACADEMY</div></td></tr><tr><td style="padding:30px"><div style="font-size:11px;letter-spacing:1.5px;color:#487ef7;font-weight:bold">PAYMENT ${approved ? "APPROVED" : "UPDATE"}</div><h1 style="font-size:25px;line-height:1.3;margin:10px 0;color:#142238">${headline}</h1><p style="color:#5d6b80;font-size:15px;line-height:1.75">Hello ${safe(before.full_name)},<br>${next}</p><div style="padding:16px 18px;background:#f3f6fb;border:1px solid #e2e9f3;border-radius:12px;color:#24344d"><strong>${safe(courseName)}</strong><div style="margin-top:8px">Seat ${Number(before.seat_number)} · ${amount.toFixed(2)} JOD · Code ${safe(before.coupon_code || "None")}</div><div style="margin-top:8px">Status: <strong>${status}</strong></div></div><p style="margin-top:22px;color:#5d6b80;font-size:13px">Questions? <a href="mailto:creative@7z-magic.com" style="color:#315fd4">creative@7z-magic.com</a></p></td></tr><tr><td style="padding:18px 30px;background:#f5f7fa;color:#718096;font-size:11px">7Z MAGIC · Academy</td></tr></table></body></html>`;
        try { await sendZohoMail({ to: before.email, subject: `${approved ? "Payment approved" : "Payment update"} · ${courseName}`, body: `${headline}\n${next}\nCourse: ${courseName}\nSeat: ${before.seat_number}\nAmount: ${amount.toFixed(2)} JOD\nStatus: ${status}`, html }); notificationSent = true; }
        catch (mailError) { console.error("Payment status updated; student notification failed", mailError); notificationSent = false; }
      }
      return send(res, 200, { registration, notificationSent });
    }

    if (body.action === "set-commission-status") {
      const status = body.status === "PAID" ? "PAID" : "PAYABLE";
      const registrationId = Number(body.id);
      if (!Number.isSafeInteger(registrationId) || registrationId < 1) return send(res, 400, { error: "Commission update is not valid." });
      const [registration] = await sql`UPDATE course_registrations SET commission_status=${status}
        WHERE id=${registrationId} AND payment_status IN ('PAID','APPROVED','VERIFIED') AND commission_percent>0
        RETURNING id,commission_status`;
      if (!registration) return send(res, 409, { error: "Only verified affiliate commissions can be marked payable or paid." });
      await writeAudit({ actorUserId: gate.auth.userId, action: "course_commission_status_changed", targetType: "course_registration", targetId: registration.id, details: { status } });
      return send(res, 200, { registration });
    }

    return send(res, 400, { error: "Unknown course management action." });
  } catch (error) {
    console.error("Course admin engine:", error);
    if (error?.code === "23505") return send(res, 409, { error: "That discount code is already in use." });
    return send(res, 500, { error: "Course administration is temporarily unavailable." });
  }
}
