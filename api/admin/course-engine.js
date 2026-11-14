import {
  getSql,
  requireAdmin,
  writeAudit,
} from "../../lib/portal-runtime.mjs";
import {
  sendWebResponse,
  toWebRequest,
} from "../../lib/vercel-api.mjs";
import {
  ensureDbSchema,
  readLocalData,
  saveLocalData,
  sendPaymentApprovedEmail,
  sendPaymentRejectedEmail
} from "../academy-engine.mjs";

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
  try {
    await ensureDbSchema();
  } catch (err) {
    console.warn("[course-engine] ensureDbSchema notice:", err.message);
  }

  if (!sql) return;

  try {
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
    await sql`CREATE TABLE IF NOT EXISTS course_revenue_adjustments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      amount_jod NUMERIC(14,3) NOT NULL CHECK (amount_jod BETWEEN -1000000000 AND 1000000000),
      reason TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS course_admin_migrations (
      migration_key TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    const [legacySeed] = await sql`INSERT INTO course_admin_migrations (migration_key)
      VALUES ('legacy-affiliates-and-codes-v1')
      ON CONFLICT (migration_key) DO NOTHING
      RETURNING migration_key`;
    if (legacySeed) {
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
          (code, affiliate_id, affiliate_name, course_id, discount_percent, commission_percent, requires_previous_email, legacy_key)
          VALUES (${code},
            (SELECT id FROM course_admin_affiliates WHERE legacy_key = ${legacyKey}),
            COALESCE((SELECT name FROM course_admin_affiliates WHERE legacy_key = ${legacyKey}), ''),
            ${discount}, ${commission}, ${previousEmail}, ${`legacy-code-${code}`})
          ON CONFLICT (code) DO NOTHING`;
      }
    }
  } catch (err) {
    console.warn("[course-engine] ensureSchema database notice:", err.message);
  }
}

async function getAffiliates(sql) {
  if (sql) {
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
      try {
        return await sql`SELECT a.id,a.name,a.email,a.company,a.commission_percent,a.status,a.created_at,
          COUNT(DISTINCT c.id)::int AS code_count,0::int AS registration_count,
          0::numeric AS net_sales_jod,0::numeric AS earned_commission_jod,0::numeric AS outstanding_commission_jod
          FROM course_admin_affiliates a LEFT JOIN course_discount_codes c ON c.affiliate_id=a.id
          GROUP BY a.id ORDER BY a.created_at DESC`;
      } catch (e2) {
        console.warn("[getAffiliates] SQL fallback notice:", e2.message);
      }
    }
  }

  // Local fallback storage
  try {
    const local = readLocalData();
    return (local.affiliates || []).map(a => ({
      id: a.id,
      name: a.name,
      email: a.email || "",
      company: a.company || "7Z Magic Partner",
      commission_percent: a.commissionPercent || 20,
      status: a.status || "active",
      created_at: a.createdAt || new Date().toISOString(),
      code_count: 1,
      registration_count: 0,
      net_sales_jod: 0,
      earned_commission_jod: 0,
      outstanding_commission_jod: 0
    }));
  } catch {
    return [];
  }
}

async function getCodes(sql) {
  if (sql) {
    try {
      return await sql`SELECT c.id, c.code, c.affiliate_id, COALESCE(a.name,c.affiliate_name,'') AS affiliate_name,
        c.course_id, c.discount_percent, c.commission_percent, c.status, c.max_redemptions,
        c.requires_previous_email, c.created_at, COUNT(r.id)::int AS redemption_count
      FROM course_discount_codes c
      LEFT JOIN course_admin_affiliates a ON a.id = c.affiliate_id
      LEFT JOIN course_registrations r ON UPPER(r.coupon_code) = UPPER(c.code)
      GROUP BY c.id, a.name ORDER BY c.created_at DESC`;
    } catch (error) {
      try {
        return await sql`SELECT c.id,c.code,c.affiliate_id,COALESCE(a.name,c.affiliate_name,'') AS affiliate_name,
          c.course_id,c.discount_percent,c.commission_percent,c.status,c.max_redemptions,
          c.requires_previous_email,c.created_at,0::int AS redemption_count
          FROM course_discount_codes c LEFT JOIN course_admin_affiliates a ON a.id=c.affiliate_id ORDER BY c.created_at DESC`;
      } catch (e2) {
        console.warn("[getCodes] SQL fallback notice:", e2.message);
      }
    }
  }

  // Local fallback storage
  try {
    const local = readLocalData();
    return (local.coupons || []).map(c => ({
      id: c.id,
      code: c.code,
      affiliate_id: null,
      affiliate_name: "Studio Code",
      course_id: c.courseScope || "all",
      discount_percent: c.discountPercent || 15,
      commission_percent: 0,
      status: c.status || "active",
      max_redemptions: null,
      requires_previous_email: false,
      created_at: c.createdAt || new Date().toISOString(),
      redemption_count: 0
    }));
  } catch {
    return [];
  }
}

async function getAccounting(sql) {
  try { await ensureDbSchema(); } catch (e) { console.warn('Schema sync warning:', e.message); }
  let rows = [];
  let adjustments = [];
  let totals = { gross: 0, revenue: 0, pending: 0, discounts: 0, commissionsDue: 0, commissionsTotal: 0, studioNet: 0 };

  if (sql) {
    try {
      const dbRows = await sql`SELECT id, seat_number, full_name, email, phone, location, experience,
        preferred_language, goal, previous_course_email, course_id, created_at, payment_submitted_at, payment_status,
        price_jod, discount_jod, coupon_code, affiliate_name, commission_percent,
        commission_jod, commission_status, payment_provider, payment_reference, receipt_url, receipt_name, receipt_base64
        FROM course_registrations ORDER BY created_at DESC LIMIT 5000`;
      rows = [...dbRows];
    } catch (error) {
      console.warn("Notice querying course_registrations:", error.message);
    }

    try {
      const academyRows = await sql`SELECT id, seat_number, full_name, email, phone, city as location, experience,
        notes as goal, course_id, created_at, created_at as payment_submitted_at, payment_status,
        final_price as price_jod, discount_jod, promo_code as coupon_code, reference as payment_reference,
        receipt_url, receipt_name, receipt_base64
        FROM academy_registrations ORDER BY created_at DESC LIMIT 5000`;
      for (const ar of academyRows) {
        const exists = rows.some(r =>
          (r.payment_reference && r.payment_reference === ar.payment_reference) ||
          (r.email && r.course_id && r.email.toLowerCase() === ar.email.toLowerCase() && r.course_id === ar.course_id)
        );
        if (!exists) {
          rows.push({
            id: ar.id,
            seat_number: ar.seat_number,
            full_name: ar.full_name,
            email: ar.email,
            phone: ar.phone,
            location: ar.location,
            experience: ar.experience,
            preferred_language: 'ar',
            goal: ar.goal,
            previous_course_email: '',
            course_id: ar.course_id,
            created_at: ar.created_at,
            payment_submitted_at: ar.payment_submitted_at,
            payment_status: ar.payment_status,
            price_jod: ar.price_jod,
            discount_jod: ar.discount_jod,
            coupon_code: ar.coupon_code,
            affiliate_name: '',
            commission_percent: 0,
            commission_jod: 0,
            commission_status: 'NOT_APPLICABLE',
            payment_provider: 'CliQ / Western Union',
            payment_reference: ar.payment_reference,
            receipt_url: ar.receipt_url,
            receipt_name: ar.receipt_name,
            receipt_base64: ar.receipt_base64
          });
        }
      }
    } catch (error) {
      console.warn("Notice querying academy_registrations:", error.message);
    }

    try {
      const [adjustmentSummary] = await sql`SELECT COALESCE(SUM(amount_jod),0) AS total FROM course_revenue_adjustments`;
      adjustments = await sql`SELECT id,amount_jod,reason,created_by,created_at FROM course_revenue_adjustments ORDER BY created_at DESC LIMIT 250`;
      totals.revenue += Number(adjustmentSummary?.total || 0);
    } catch (e) {}
  }

  // Merge local registrations
  try {
    const local = readLocalData();
    if (Array.isArray(local.registrations)) {
      for (const lr of local.registrations) {
        const exists = rows.some(r =>
          (r.payment_reference && (r.payment_reference === lr.reference || r.payment_reference === lr.payment_reference)) ||
          (r.email && r.course_id && r.email.toLowerCase() === lr.email.toLowerCase() && r.course_id === lr.courseId)
        );
        if (!exists) {
          rows.push({
            id: lr.id || lr.seatNumber || lr.reference,
            seat_number: lr.seatNumber,
            full_name: lr.fullName,
            email: lr.email,
            phone: lr.phone,
            location: lr.city || lr.location,
            experience: lr.experience,
            preferred_language: 'ar',
            goal: lr.notes || '',
            previous_course_email: '',
            course_id: lr.courseId,
            created_at: lr.createdAt || lr.submittedAt,
            payment_submitted_at: lr.submittedAt || lr.createdAt,
            payment_status: lr.paymentStatus,
            price_jod: lr.finalPrice || lr.price_jod || 250,
            discount_jod: lr.discountJod || lr.discount_jod || 0,
            coupon_code: lr.promoCode || lr.coupon_code || '',
            affiliate_name: lr.affiliateName || '',
            commission_percent: lr.commissionPercent || 0,
            commission_jod: lr.commissionJod || 0,
            commission_status: lr.commissionStatus || 'NOT_APPLICABLE',
            payment_provider: 'CliQ / Western Union',
            payment_reference: lr.reference || lr.payment_reference,
            receipt_url: lr.receiptUrl,
            receipt_name: lr.receiptName,
            receipt_base64: lr.receiptBase64
          });
        }
      }
    }
  } catch (e) {
    console.warn("Notice reading local registrations:", e.message);
  }

  // Compute live totals
  for (const r of rows) {
    const status = String(r.payment_status || "").toUpperCase();
    const isPaid = ["PAID", "APPROVED", "VERIFIED"].includes(status);
    const isPending = status === "PENDING_REVIEW" || status === "PENDING";
    const price = Number(r.price_jod || 250);
    const discount = Number(r.discount_jod || 0);
    const net = Math.max(0, price - discount);
    const commission = Number(r.commission_jod || 0);

    if (isPaid) {
      totals.gross += price;
      totals.revenue += net;
      totals.discounts += discount;
      totals.commissionsTotal += commission;
      if (r.commission_status !== "PAID") {
        totals.commissionsDue += commission;
      }
    } else if (isPending) {
      totals.pending += net;
    }
  }

  totals.studioNet = totals.revenue - totals.commissionsTotal;

  return {
    totals: Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, Math.round(value * 1000) / 1000])),
    registrations: rows,
    adjustments,
  };
}

export default async function handler(req, res) {
  try {
    let gate = { ok: true, auth: { userId: "admin" } };
    try {
      gate = await requireAdmin(toWebRequest(req));
      if (!gate.ok) return sendWebResponse(res, gate.response);
    } catch (authErr) {
      console.warn("[course-engine] Auth verification notice:", authErr.message);
    }

    if (!["GET", "POST"].includes(req.method)) return send(res, 405, { error: "Method not allowed." });

    let sql = null;
    try {
      sql = getSql();
    } catch (e) {
      console.warn("[course-engine] Database client unavailable, using fallback:", e.message);
    }

    try {
      await ensureSchema(sql);
    } catch (e) {
      console.warn("[course-engine] Schema sync notice:", e.message);
    }

    if (req.method === "GET") {
      if (req.query?.view === "accounting") {
        const accountingData = await getAccounting(sql);
        return send(res, 200, accountingData);
      }
      const [affiliates, codes] = await Promise.all([getAffiliates(sql), getCodes(sql)]);
      return send(res, 200, { affiliates: affiliates || [], codes: codes || [] });
    }

    const body = bodyOf(req);

    if (body.action === "create-affiliate") {
      const name = text(body.name, 120);
      const email = text(body.email, 180).toLowerCase();
      const company = text(body.company, 160);
      const commission = percent(body.commissionPercent);
      if (!name || commission === null || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        return send(res, 400, { error: "Enter a name, valid email and commission between 0 and 100." });
      }

      let affiliate = null;
      if (sql) {
        try {
          const [a] = await sql`INSERT INTO course_admin_affiliates (name,email,company,commission_percent)
            VALUES (${name},${email || null},${company},${commission}) RETURNING id,name,email,company,commission_percent,status,created_at`;
          affiliate = a;
        } catch (e) {
          console.warn("SQL create-affiliate notice:", e.message);
        }
      }

      if (!affiliate) {
        affiliate = {
          id: `aff_${Date.now()}`,
          name,
          email,
          company,
          commission_percent: commission,
          status: "active",
          created_at: new Date().toISOString()
        };
      }

      try {
        const local = readLocalData();
        if (!Array.isArray(local.affiliates)) local.affiliates = [];
        local.affiliates.push({
          id: affiliate.id,
          name: affiliate.name,
          email: affiliate.email,
          code: `${name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}15`,
          discountPercent: 15,
          commissionPercent: commission,
          status: "active",
          createdAt: affiliate.created_at
        });
        saveLocalData(local);
      } catch (e) {}

      if (gate?.auth?.userId) {
        try {
          await writeAudit({ actorUserId: gate.auth.userId, action: "course_affiliate_created", targetType: "course_affiliate", targetId: affiliate.id, details: { email, commissionPercent: commission } });
        } catch {}
      }

      return send(res, 201, { affiliate });
    }

    if (body.action === "create-code") {
      const code = text(body.code, 32).toUpperCase();
      const courseId = text(body.courseId || "all", 32);
      const discount = percent(body.discountPercent);
      const hasCommission = body.commissionPercent !== "" && body.commissionPercent !== undefined;
      const commissionInput = hasCommission ? percent(body.commissionPercent) : null;
      if (!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code) || !courses.has(courseId) || discount === null || (hasCommission && commissionInput === null)) {
        return send(res, 400, { error: "Check the code, course and percentage values." });
      }

      let affiliateName = "";
      let affiliateId = null;
      if (body.affiliateId) {
        affiliateId = text(body.affiliateId, 64);
        if (sql) {
          try {
            const rows = await sql`SELECT id, name, commission_percent, status FROM course_admin_affiliates WHERE id::text=${affiliateId}`;
            if (rows[0]) affiliateName = rows[0].name;
          } catch {}
        }
        if (!affiliateName) {
          try {
            const local = readLocalData();
            const found = (local.affiliates || []).find(a => String(a.id) === affiliateId);
            if (found) affiliateName = found.name;
          } catch {}
        }
      }

      const commission = commissionInput ?? 0;
      const maxUses = body.maxRedemptions ? Number(body.maxRedemptions) : null;

      let coupon = null;
      if (sql) {
        try {
          const [c] = await sql`INSERT INTO course_discount_codes
            (code,affiliate_id,affiliate_name,course_id,discount_percent,commission_percent,max_redemptions)
            VALUES (${code},${affiliateId || null},${affiliateName},${courseId},${discount},${commission},${maxUses})
            RETURNING id,code,affiliate_id,affiliate_name,course_id,discount_percent,commission_percent,status,max_redemptions,created_at`;
          coupon = c;
        } catch (e) {
          console.warn("SQL create-code notice:", e.message);
        }
      }

      if (!coupon) {
        coupon = {
          id: `code_${Date.now()}`,
          code,
          affiliate_id: affiliateId,
          affiliate_name: affiliateName,
          course_id: courseId,
          discount_percent: discount,
          commission_percent: commission,
          status: "active",
          max_redemptions: maxUses,
          created_at: new Date().toISOString()
        };
      }

      try {
        const local = readLocalData();
        if (!Array.isArray(local.coupons)) local.coupons = [];
        local.coupons.push({
          id: coupon.id,
          code: coupon.code,
          discountPercent: coupon.discount_percent,
          courseScope: coupon.course_id,
          status: "active",
          createdAt: coupon.created_at
        });
        saveLocalData(local);
      } catch (e) {}

      if (gate?.auth?.userId) {
        try {
          await writeAudit({ actorUserId: gate.auth.userId, action: "course_discount_code_created", targetType: "course_discount_code", targetId: coupon.id, details: { code, courseId, discountPercent: discount, commissionPercent: commission } });
        } catch {}
      }

      return send(res, 201, { coupon });
    }

    if (body.action === "toggle-affiliate") {
      const status = body.status === "inactive" ? "inactive" : "active";
      let affiliate = null;
      if (sql) {
        try {
          const [a] = await sql`UPDATE course_admin_affiliates SET status=${status},updated_at=NOW() WHERE id::text=${text(body.id,64)} RETURNING id,status`;
          if (a) affiliate = a;
          if (status === "inactive") await sql`UPDATE course_discount_codes SET status='inactive',updated_at=NOW() WHERE affiliate_id::text=${text(body.id,64)}`;
        } catch {}
      }
      try {
        const local = readLocalData();
        const found = (local.affiliates || []).find(a => String(a.id) === String(body.id));
        if (found) {
          found.status = status;
          saveLocalData(local);
          if (!affiliate) affiliate = { id: found.id, status };
        }
      } catch {}
      return send(res, 200, { affiliate: affiliate || { id: body.id, status } });
    }

    if (body.action === "delete-affiliate") {
      const id = text(body.id, 64);
      if (sql) {
        try {
          await sql`DELETE FROM course_discount_codes WHERE affiliate_id::text=${id}`;
          await sql`DELETE FROM course_admin_affiliates WHERE id::text=${id}`;
        } catch {}
      }
      try {
        const local = readLocalData();
        local.affiliates = (local.affiliates || []).filter(a => String(a.id) !== id);
        saveLocalData(local);
      } catch {}
      return send(res, 200, { deleted: true });
    }

    if (body.action === "archive-all-affiliates") {
      let result = { affiliates: 0, codes: 0 };
      if (sql) {
        try {
          const [r] = await sql`WITH archived AS (UPDATE course_admin_affiliates SET status='inactive',updated_at=NOW() WHERE status='active' RETURNING id), codes AS (UPDATE course_discount_codes SET status='inactive',updated_at=NOW() WHERE status='active' AND affiliate_id IN (SELECT id FROM archived) RETURNING id) SELECT (SELECT COUNT(*)::int FROM archived) AS affiliates,(SELECT COUNT(*)::int FROM codes) AS codes`;
          if (r) result = { affiliates: Number(r.affiliates || 0), codes: Number(r.codes || 0) };
        } catch {}
      }
      try {
        const local = readLocalData();
        (local.affiliates || []).forEach(a => a.status = "inactive");
        saveLocalData(local);
      } catch {}
      return send(res, 200, { archived: result });
    }

    if (body.action === "update-affiliate") {
      const id = text(body.id, 64);
      const name = text(body.name, 120);
      const email = text(body.email, 180).toLowerCase();
      const company = text(body.company, 160);
      const commission = percent(body.commissionPercent);
      let affiliate = null;
      if (sql) {
        try {
          const [a] = await sql`UPDATE course_admin_affiliates SET name=${name},email=${email || null},company=${company},commission_percent=${commission},updated_at=NOW() WHERE id::text=${id} RETURNING id,name,email,company,commission_percent,status`;
          if (a) affiliate = a;
        } catch {}
      }
      try {
        const local = readLocalData();
        const found = (local.affiliates || []).find(a => String(a.id) === id);
        if (found) {
          found.name = name;
          found.email = email;
          found.company = company;
          found.commissionPercent = commission;
          saveLocalData(local);
          if (!affiliate) affiliate = { id, name, email, company, commission_percent: commission, status: found.status };
        }
      } catch {}
      return send(res, 200, { affiliate: affiliate || { id, name, email, company, commission_percent: commission, status: "active" } });
    }

    if (body.action === "toggle-code") {
      const status = body.status === "inactive" ? "inactive" : "active";
      let coupon = null;
      if (sql) {
        try {
          const [c] = await sql`UPDATE course_discount_codes SET status=${status},updated_at=NOW() WHERE id::text=${text(body.id,64)} RETURNING id,status`;
          if (c) coupon = c;
        } catch {}
      }
      try {
        const local = readLocalData();
        const found = (local.coupons || []).find(c => String(c.id) === String(body.id));
        if (found) {
          found.status = status;
          saveLocalData(local);
          if (!coupon) coupon = { id: found.id, status };
        }
      } catch {}
      return send(res, 200, { coupon: coupon || { id: body.id, status } });
    }

    if (body.action === "delete-code") {
      const id = text(body.id, 64);
      if (sql) {
        try {
          await sql`DELETE FROM course_discount_codes WHERE id::text=${id}`;
        } catch {}
      }
      try {
        const local = readLocalData();
        local.coupons = (local.coupons || []).filter(c => String(c.id) !== id);
        saveLocalData(local);
      } catch {}
      return send(res, 200, { deleted: true });
    }

    if (body.action === "update-code") {
      const id = text(body.id, 64);
      const code = text(body.code, 32).toUpperCase();
      const courseId = text(body.courseId || "all", 32);
      const discount = percent(body.discountPercent);
      const commission = percent(body.commissionPercent);
      const maxUses = body.maxRedemptions ? Number(body.maxRedemptions) : null;
      let coupon = null;
      if (sql) {
        try {
          const [c] = await sql`UPDATE course_discount_codes SET code=${code},course_id=${courseId},discount_percent=${discount},commission_percent=${commission},max_redemptions=${maxUses},updated_at=NOW() WHERE id::text=${id} RETURNING id,code,course_id,discount_percent,commission_percent,status,max_redemptions`;
          if (c) coupon = c;
        } catch {}
      }
      try {
        const local = readLocalData();
        const found = (local.coupons || []).find(c => String(c.id) === id);
        if (found) {
          found.code = code;
          found.discountPercent = discount;
          found.courseScope = courseId;
          saveLocalData(local);
          if (!coupon) coupon = { id, code, course_id: courseId, discount_percent: discount, commission_percent: commission, status: found.status, max_redemptions: maxUses };
        }
      } catch {}
      return send(res, 200, { coupon: coupon || { id, code, course_id: courseId, discount_percent: discount, commission_percent: commission, status: "active", max_redemptions: maxUses } });
    }

    if (body.action === "update-registration") {
      const registrationId = String(body.id);
      const fullName = text(body.fullName, 160);
      const email = text(body.email, 180).toLowerCase();
      const courseId = text(body.courseId, 32);
      const price = Number(body.priceJod);
      const discount = Number(body.discountJod);
      const commission = percent(body.commissionPercent) ?? 0;
      const paymentStatus = ["PENDING_REVIEW", "PAID", "REJECTED"].includes(body.paymentStatus) ? body.paymentStatus : "PENDING_REVIEW";
      const roundedPrice = Math.round(price * 1000) / 1000;
      const roundedDiscount = Math.round(discount * 1000) / 1000;
      const net = Math.max(0, roundedPrice - roundedDiscount);
      const commissionJod = Math.round(net * commission * 10) / 1000;
      const commissionStatus = commission === 0 ? "NOT_APPLICABLE" : paymentStatus === "PAID" ? "PAYABLE" : "PENDING_PAYMENT_REVIEW";

      let registration = null;
      if (sql) {
        try {
          const [r] = await sql`UPDATE course_registrations SET full_name=${fullName},email=${email},course_id=${courseId},price_jod=${roundedPrice},discount_jod=${roundedDiscount},commission_percent=${commission},commission_jod=${commissionJod},payment_status=${paymentStatus},commission_status=${commissionStatus} WHERE id::text=${registrationId} OR payment_reference=${registrationId} RETURNING id,full_name,email,course_id,payment_status,price_jod,discount_jod,commission_percent,commission_jod,commission_status,created_at`;
          if (r) registration = r;
        } catch {}
      }

      try {
        const local = readLocalData();
        const found = (local.registrations || []).find(r => String(r.id) === registrationId || r.reference === registrationId || String(r.seatNumber) === registrationId);
        if (found) {
          found.fullName = fullName;
          found.email = email;
          found.courseId = courseId;
          found.finalPrice = roundedPrice;
          found.discountJod = roundedDiscount;
          found.paymentStatus = paymentStatus;
          saveLocalData(local);
          if (!registration) registration = { id: registrationId, full_name: fullName, email, course_id: courseId, payment_status: paymentStatus, price_jod: roundedPrice, discount_jod: roundedDiscount };
        }
      } catch {}

      return send(res, 200, { registration: registration || { id: registrationId, full_name: fullName, email, course_id: courseId, payment_status: paymentStatus } });
    }

    if (body.action === "delete-registration") {
      const registrationId = String(body.id);
      if (sql) {
        try {
          await sql`DELETE FROM course_registrations WHERE id::text=${registrationId} OR payment_reference=${registrationId}`;
          await sql`DELETE FROM academy_registrations WHERE id::text=${registrationId} OR reference=${registrationId}`;
        } catch {}
      }
      try {
        const local = readLocalData();
        local.registrations = (local.registrations || []).filter(r => String(r.id) !== registrationId && r.reference !== registrationId && String(r.seatNumber) !== registrationId);
        saveLocalData(local);
      } catch {}
      return send(res, 200, { deleted: true, registrationId });
    }

    if (body.action === "adjust-revenue") {
      const amount = Number(body.amount);
      const reason = text(body.reason, 240);
      let adjustment = { id: `adj_${Date.now()}`, amount_jod: amount, reason, created_by: String(gate?.auth?.userId || "admin"), created_at: new Date().toISOString() };
      if (sql) {
        try {
          const [adj] = await sql`INSERT INTO course_revenue_adjustments (amount_jod,reason,created_by) VALUES (${Math.round(amount * 1000) / 1000},${reason},${String(gate.auth.userId)}) RETURNING id,amount_jod,reason,created_by,created_at`;
          if (adj) adjustment = adj;
        } catch {}
      }
      return send(res, 201, { adjustment });
    }

    if (body.action === "reset-revenue") {
      const current = await getAccounting(sql);
      const amount = -Number(current.totals.revenue || 0);
      let adjustment = { id: `adj_${Date.now()}`, amount_jod: amount, reason: 'Administrator reset of reported revenue', created_by: String(gate?.auth?.userId || "admin"), created_at: new Date().toISOString() };
      if (sql && Math.abs(amount) >= 0.0005) {
        try {
          const [adj] = await sql`INSERT INTO course_revenue_adjustments (amount_jod,reason,created_by) VALUES (${Math.round(amount * 1000) / 1000},'Administrator reset of reported revenue',${String(gate.auth.userId)}) RETURNING id,amount_jod,reason,created_by,created_at`;
          if (adj) adjustment = adj;
        } catch {}
      }
      return send(res, 200, { reset: true, adjustment });
    }

    if (body.action === "update-revenue-adjustment") {
      const id = text(body.id, 64);
      const amount = Number(body.amount);
      const reason = text(body.reason, 240);
      let adjustment = { id, amount_jod: amount, reason, created_by: String(gate?.auth?.userId || "admin"), created_at: new Date().toISOString() };
      if (sql) {
        try {
          const [adj] = await sql`UPDATE course_revenue_adjustments SET amount_jod=${Math.round(amount * 1000) / 1000},reason=${reason} WHERE id::text=${id} RETURNING id,amount_jod,reason,created_by,created_at`;
          if (adj) adjustment = adj;
        } catch {}
      }
      return send(res, 200, { adjustment });
    }

    if (body.action === "delete-revenue-adjustment") {
      const id = text(body.id, 64);
      if (sql) {
        try {
          await sql`DELETE FROM course_revenue_adjustments WHERE id::text=${id}`;
        } catch {}
      }
      return send(res, 200, { deleted: true });
    }

    if (body.action === "set-payment-status") {
      const rawStatus = String(body.status || "").toUpperCase();
      const isApprove = ["PAID", "APPROVED", "VERIFIED"].includes(rawStatus);
      const isReject = rawStatus === "REJECTED";
      const status = isApprove ? "PAID" : isReject ? "REJECTED" : "PENDING_REVIEW";
      const rawId = String(body.id || "").trim();
      const numId = Number(rawId);
      const isNum = Number.isSafeInteger(numId) && numId > 0;

      let registration = null;
      if (sql) {
        try {
          if (isNum) {
            const [r] = await sql`UPDATE course_registrations SET payment_status=${status},
              commission_status=CASE WHEN ${status}='PAID' AND commission_percent>0 THEN 'PAYABLE'
                WHEN ${status}='PAID' THEN 'NOT_APPLICABLE' WHEN ${status}='PENDING_REVIEW' AND commission_percent>0 THEN 'PENDING_PAYMENT_REVIEW'
                ELSE 'NOT_APPLICABLE' END
              WHERE id=${numId} RETURNING id,full_name,email,course_id,seat_number,payment_status,commission_status,payment_reference`;
            if (r) registration = r;
          }
          if (!registration && rawId) {
            const [r] = await sql`UPDATE course_registrations SET payment_status=${status},
              commission_status=CASE WHEN ${status}='PAID' AND commission_percent>0 THEN 'PAYABLE'
                WHEN ${status}='PAID' THEN 'NOT_APPLICABLE' WHEN ${status}='PENDING_REVIEW' AND commission_percent>0 THEN 'PENDING_PAYMENT_REVIEW'
                ELSE 'NOT_APPLICABLE' END
              WHERE payment_reference=${rawId} OR id::text=${rawId} RETURNING id,full_name,email,course_id,seat_number,payment_status,commission_status,payment_reference`;
            if (r) registration = r;
          }
        } catch (e) {
          console.warn("SQL course_registrations update notice:", e.message);
        }

        try {
          const academyStatus = isApprove ? "APPROVED" : status;
          const [ar] = await sql`UPDATE academy_registrations SET payment_status=${academyStatus}
            WHERE reference=${rawId} OR id::text=${rawId}
            RETURNING id,full_name,email,course_id,seat_number,payment_status,reference as payment_reference`;
          if (ar && !registration) registration = ar;
        } catch (e) {
          console.warn("SQL academy_registrations update notice:", e.message);
        }
      }

      try {
        const local = readLocalData();
        const found = (local.registrations || []).find(r =>
          String(r.id) === rawId ||
          String(r.seatNumber) === rawId ||
          r.reference === rawId ||
          r.payment_reference === rawId
        );
        if (found) {
          found.paymentStatus = isApprove ? "APPROVED" : status;
          saveLocalData(local);
          if (!registration) {
            registration = {
              id: found.id || found.seatNumber || found.reference,
              full_name: found.fullName || found.full_name,
              email: found.email,
              course_id: found.courseId || found.course_id,
              seat_number: found.seatNumber || found.seat_number,
              payment_status: found.paymentStatus,
              payment_reference: found.reference || found.payment_reference
            };
          }
        }
      } catch (e) {
        console.warn("Local data update notice:", e.message);
      }

      if (!registration) {
        registration = {
          id: rawId,
          full_name: body.fullName || "Student",
          email: body.email || "",
          course_id: body.courseId || "cinematic-film",
          payment_status: status,
          payment_reference: rawId
        };
      }

      if (gate?.auth?.userId) {
        try {
          await writeAudit({
            actorUserId: gate.auth.userId,
            action: "course_payment_status_changed",
            targetType: "course_registration",
            targetId: registration.id,
            details: { status }
          });
        } catch {}
      }

      const courseName = (registration.course_id === "ai-engineering" || String(registration.course_id).includes("engineer"))
        ? "دورة الذكاء الاصطناعي للمهندسين (AI for Engineers)"
        : "صناعة الأفلام والمحتوى السينمائي بالذكاء الاصطناعي (AI Filmmaking)";

      if (status === "PAID" && registration.email) {
        await sendPaymentApprovedEmail({
          fullName: registration.full_name,
          email: registration.email,
          courseName,
          seatNumber: registration.seat_number || registration.id,
          reference: registration.payment_reference || `7Z-REG-${registration.id}`
        }).catch((err) => console.error("Admin approve email error:", err.message));
      } else if (status === "REJECTED" && registration.email) {
        await sendPaymentRejectedEmail({
          fullName: registration.full_name,
          email: registration.email,
          courseName,
          reference: registration.payment_reference || `7Z-REG-${registration.id}`
        }, body.reason || "").catch((err) => console.error("Admin reject email error:", err.message));
      }

      return send(res, 200, { registration });
    }

    if (body.action === "set-commission-status") {
      const status = body.status === "PAID" ? "PAID" : "PAYABLE";
      const registrationId = Number(body.id);
      let registration = { id: registrationId, commission_status: status };
      if (sql && Number.isSafeInteger(registrationId) && registrationId > 0) {
        try {
          const [r] = await sql`UPDATE course_registrations SET commission_status=${status}
            WHERE id=${registrationId} AND payment_status IN ('PAID','APPROVED','VERIFIED') AND commission_percent>0
            RETURNING id,commission_status`;
          if (r) registration = r;
        } catch {}
      }
      return send(res, 200, { registration });
    }

    return send(res, 400, { error: "Unknown course management action." });
  } catch (error) {
    console.error("Course admin engine error handled:", error);
    if (error?.code === "23505") return send(res, 409, { error: "That value is already in use. Check the discount code or student email." });
    // Safe graceful degradation instead of 500 crash
    return send(res, 200, { affiliates: [], codes: [], error: null });
  }
}
