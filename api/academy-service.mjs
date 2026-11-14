/**
 * 7Z MAGIC ACADEMY — SERVICE ROUTER
 * Handles Registration, Code Validation, Admin Data & Actions
 */

import {
  ensureDbSchema,
  getSqlClient,
  readLocalData,
  saveLocalData,
  sendAdminRegistrationAlert,
  sendPaymentApprovedEmail,
  sendPaymentRejectedEmail,
  sendStudentRegistrationConfirmation,
  trigger20RegistrationExcelReport
} from "./academy-engine.mjs";
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = process.env.VERCEL ? "/tmp/7z-academy" : resolve(fileURLToPath(new URL("..", import.meta.url)));
const receiptsDir = join(rootDir, "media", "uploads", "receipts");

// Ensure tables exist on boot
ensureDbSchema().catch((e) => console.warn("Schema init error:", e.message));

// 1. Validate Discount / Affiliate Code
export async function handleValidateCode(codeStr, courseId = "all") {
  const code = String(codeStr || "").trim().toUpperCase();
  if (!code) return { valid: false, message: "يرجى إدخال الكود" };

  const sql = getSqlClient();
  if (sql) {
    try {
      // Check Coupons
      const [coupon] = await sql`
        SELECT * FROM academy_coupons 
        WHERE upper(code) = ${code} AND status = 'active'
        LIMIT 1;
      `;
      if (coupon) {
        if (coupon.course_scope !== "all" && coupon.course_scope !== courseId) {
          return { valid: false, message: "هذا الكود غير مخصص لهذه الدورة" };
        }
        return { valid: true, discountPercent: coupon.discount_percent, code: coupon.code, type: "coupon" };
      }

      // Check Affiliates
      const [affiliate] = await sql`
        SELECT * FROM academy_affiliates 
        WHERE upper(code) = ${code} AND status = 'active'
        LIMIT 1;
      `;
      if (affiliate) {
        return {
          valid: true,
          discountPercent: affiliate.discount_percent,
          code: affiliate.code,
          affiliateName: affiliate.name,
          type: "affiliate"
        };
      }
    } catch (e) {
      console.warn("DB validate code error, using local fallback:", e.message);
    }
  }

  // Local fallback
  const local = readLocalData();
  const c = local.coupons.find((x) => x.code.toUpperCase() === code && x.status === "active");
  if (c) {
    if (c.courseScope && c.courseScope !== "all" && c.courseScope !== courseId) {
      return { valid: false, message: "هذا الكود غير مخصص لهذه الدورة" };
    }
    return { valid: true, discountPercent: c.discountPercent, code: c.code, type: "coupon" };
  }

  const a = local.affiliates.find((x) => x.code.toUpperCase() === code && x.status === "active");
  if (a) {
    return { valid: true, discountPercent: a.discountPercent, code: a.code, affiliateName: a.name, type: "affiliate" };
  }

  return { valid: false, message: "الكود المدخل غير صالح أو منتهي الصلاحية" };
}

// 2. Register Student & Upload Receipt
export async function handleRegistration(body) {
  const local = readLocalData();
  const sqlForSeat = getSqlClient();
  let dbMaxSeat = 0;
  if (sqlForSeat) {
    try {
      const [cntRow] = await sqlForSeat`SELECT GREATEST(COALESCE(MAX(seat_number), 0), COUNT(*))::int AS max_seat FROM academy_registrations;`;
      dbMaxSeat = Number(cntRow?.max_seat || 0);
    } catch {}
  }
  const nextSeat = Math.max(local.counter || 0, dbMaxSeat) + 1;
  const ref = `7Z-REG-${Math.floor(100000 + Math.random() * 900000)}`;

  let receiptFilePath = "";
  if (body.receiptBase64) {
    try {
      const match = body.receiptBase64.match(/^data:([^;]+);base64,(.+)$/);
      const ext = body.receiptName?.endsWith(".pdf") ? ".pdf" : ".jpg";
      const filename = `receipt-${ref}-${Date.now()}${ext}`;
      const dest = join(receiptsDir, filename);
      const buffer = Buffer.from(match ? match[2] : body.receiptBase64, "base64");
      writeFileSync(dest, buffer);
      receiptFilePath = `/media/uploads/receipts/${filename}`;
    } catch (err) {
      console.warn("Could not write receipt to disk:", err.message);
    }
  }

  const regRecord = {
    seatNumber: nextSeat,
    reference: ref,
    fullName: String(body.fullName || "").trim(),
    email: String(body.email || "").trim().toLowerCase(),
    phone: String(body.phone || "").trim(),
    city: String(body.city || "").trim(),
    experience: String(body.experience || "").trim(),
    notes: String(body.notes || "").trim(),
    courseId: String(body.courseId || "cinematic-film"),
    courseName: String(body.courseName || (body.courseId === "ai-engineering" ? "دورة الذكاء الاصطناعي للمهندسين" : "صناعة الأفلام والمحتوى السينمائي بالذكاء الاصطناعي")),
    promoCode: String(body.promoCode || "").toUpperCase(),
    discountPercent: Number(body.discountPercent || 0),
    discountJod: Number(body.discountJod || 0),
    finalPrice: Number(body.finalPrice || 250),
    paymentStatus: "PENDING_REVIEW",
    receiptUrl: receiptFilePath || body.receiptUrl || "",
    receiptName: body.receiptName || "receipt.jpg",
    receiptType: body.receiptType || "image/jpeg",
    receiptBase64: body.receiptBase64 || "",
    submittedAt: body.submittedAt || new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  // Try Neon DB Insert into both tables
  const sql = getSqlClient();
  if (sql) {
    try {
      await sql`
        INSERT INTO academy_registrations (
          seat_number, reference, full_name, email, phone, city, experience, notes,
          course_id, course_name, promo_code, discount_percent, discount_jod, final_price,
          payment_status, receipt_url, receipt_name, receipt_base64
        ) VALUES (
          ${regRecord.seatNumber}, ${regRecord.reference}, ${regRecord.fullName}, ${regRecord.email}, ${regRecord.phone}, ${regRecord.city}, ${regRecord.experience}, ${regRecord.notes},
          ${regRecord.courseId}, ${regRecord.courseName}, ${regRecord.promoCode}, ${regRecord.discountPercent}, ${regRecord.discountJod}, ${regRecord.finalPrice},
          ${regRecord.paymentStatus}, ${regRecord.receiptUrl}, ${regRecord.receiptName}, ${regRecord.receiptBase64}
        );
      `;

      await sql`
        INSERT INTO course_registrations (
          seat_number, full_name, email, phone, location, experience,
          course_id, price_jod, discount_jod, coupon_code, payment_status,
          payment_reference, receipt_url, receipt_name, receipt_base64
        ) VALUES (
          ${regRecord.seatNumber}, ${regRecord.fullName}, ${regRecord.email}, ${regRecord.phone}, ${regRecord.city}, ${regRecord.experience},
          ${regRecord.courseId}, ${regRecord.finalPrice}, ${regRecord.discountJod}, ${regRecord.promoCode}, ${regRecord.paymentStatus},
          ${regRecord.reference}, ${regRecord.receiptUrl}, ${regRecord.receiptName}, ${regRecord.receiptBase64}
        );
      `;
    } catch (e) {
      console.warn("DB insert error, saving to local store:", e.message);
    }
  }

  // Always update local storage
  local.registrations.push(regRecord);
  local.counter = nextSeat;
  saveLocalData(local);

  // Await automated emails before Vercel freezes the serverless function
  const [adminMailRes, studentMailRes] = await Promise.allSettled([
    sendAdminRegistrationAlert(regRecord),
    sendStudentRegistrationConfirmation(regRecord)
  ]);

  if (nextSeat > 0 && nextSeat % 20 === 0) {
    await trigger20RegistrationExcelReport(local.registrations, nextSeat).catch((e) =>
      console.error("20 Excel trigger error:", e.message)
    );
  }

  return {
    ok: true,
    reference: ref,
    seatNumber: nextSeat,
    emailStatus: {
      admin: adminMailRes.status === "fulfilled" ? adminMailRes.value : { error: adminMailRes.reason?.message },
      student: studentMailRes.status === "fulfilled" ? studentMailRes.value : { error: studentMailRes.reason?.message }
    }
  };
}

// 3. Admin Data Provider
export async function getAdminData() {
  const sql = getSqlClient();
  let registrations = [];
  let coupons = [];
  let affiliates = [];

  if (sql) {
    try {
      const regRows = await sql`SELECT * FROM academy_registrations ORDER BY created_at DESC;`;
      const coupRows = await sql`SELECT * FROM academy_coupons ORDER BY created_at DESC;`;
      const affRows = await sql`SELECT * FROM academy_affiliates ORDER BY created_at DESC;`;

      registrations = regRows.map((r) => ({
        id: r.id,
        seatNumber: r.seat_number,
        reference: r.reference,
        fullName: r.full_name,
        email: r.email,
        phone: r.phone,
        city: r.city,
        experience: r.experience,
        courseId: r.course_id,
        courseName: r.course_name,
        promoCode: r.promo_code,
        discountPercent: r.discount_percent,
        discountJod: r.discount_jod,
        finalPrice: r.final_price,
        paymentStatus: r.payment_status,
        receiptUrl: r.receipt_url,
        receiptName: r.receipt_name,
        receiptBase64: r.receipt_base64,
        createdAt: r.created_at
      }));

      coupons = coupRows.map((c) => ({
        id: c.id,
        code: c.code,
        discountPercent: c.discount_percent,
        courseScope: c.course_scope,
        status: c.status,
        createdAt: c.created_at
      }));

      affiliates = affRows.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        code: a.code,
        discountPercent: a.discount_percent,
        commissionPercent: a.commission_percent,
        status: a.status,
        createdAt: a.created_at
      }));
    } catch (e) {
      console.warn("DB read error, using local data fallback:", e.message);
    }
  }

  if (registrations.length === 0) {
    const local = readLocalData();
    registrations = local.registrations;
    coupons = local.coupons;
    affiliates = local.affiliates;
  }

  // Calculate Affiliate Stats
  const affiliateStats = affiliates.map((aff) => {
    const usedRegs = registrations.filter(
      (r) => r.promoCode && r.promoCode.toUpperCase() === aff.code.toUpperCase()
    );
    const confirmedRegs = usedRegs.filter((r) => ["PAID", "APPROVED", "VERIFIED"].includes(r.paymentStatus));
    const totalSalesJod = confirmedRegs.reduce((sum, r) => sum + Number(r.finalPrice || 0), 0);
    const commissionOwed = (totalSalesJod * Number(aff.commissionPercent || 0)) / 100;

    return {
      ...aff,
      totalUses: usedRegs.length,
      confirmedCount: confirmedRegs.length,
      totalSalesJod,
      commissionOwed
    };
  });

  const totalRevenue = registrations
    .filter((r) => ["PAID", "APPROVED", "VERIFIED"].includes(r.paymentStatus))
    .reduce((sum, r) => sum + Number(r.finalPrice || 0), 0);
  const pendingCount = registrations.filter((r) => r.paymentStatus === "PENDING_REVIEW").length;
  const approvedCount = registrations.filter((r) => ["PAID", "APPROVED", "VERIFIED"].includes(r.paymentStatus)).length;

  return {
    registrations,
    coupons,
    affiliates: affiliateStats,
    stats: {
      totalRegistrations: registrations.length,
      pendingCount,
      approvedCount,
      totalRevenue
    }
  };
}

// 4. Admin Action Handler (Approve, Reject, Manage Coupons & Affiliates)
export async function handleAdminAction(action, body) {
  const local = readLocalData();
  const sql = getSqlClient();
  const identifier = String(body.reference || body.id || "").trim();

  if (action === "approve-payment") {
    let foundReg = local.registrations.find(
      (r) => r.reference === identifier || String(r.id) === identifier || String(r.seatNumber) === identifier
    );

    if (sql) {
      try {
        const [row] = await sql`
          UPDATE academy_registrations 
          SET payment_status = 'APPROVED' 
          WHERE reference = ${identifier} OR id::text = ${identifier}
          RETURNING *;
        `;
        await sql`
          UPDATE course_registrations 
          SET payment_status = 'PAID' 
          WHERE payment_reference = ${identifier} OR id::text = ${identifier};
        `;
        if (row) {
          foundReg = {
            fullName: row.full_name,
            email: row.email,
            courseName: row.course_name,
            seatNumber: row.seat_number,
            reference: row.reference
          };
        }
      } catch (e) {
        console.warn("DB update error:", e.message);
      }
    }

    if (foundReg) {
      foundReg.paymentStatus = "APPROVED";
      saveLocalData(local);
      await sendPaymentApprovedEmail(foundReg).catch((e) => console.error("Approve email error:", e.message));
      return { ok: true, status: "APPROVED", registration: foundReg };
    }
    return { ok: false, error: "Registration not found" };
  }

  if (action === "reject-payment") {
    const reason = body.reason || "";
    let foundReg = local.registrations.find(
      (r) => r.reference === identifier || String(r.id) === identifier || String(r.seatNumber) === identifier
    );

    if (sql) {
      try {
        const [row] = await sql`
          UPDATE academy_registrations 
          SET payment_status = 'REJECTED' 
          WHERE reference = ${identifier} OR id::text = ${identifier}
          RETURNING *;
        `;
        await sql`
          UPDATE course_registrations 
          SET payment_status = 'REJECTED' 
          WHERE payment_reference = ${identifier} OR id::text = ${identifier};
        `;
        if (row) {
          foundReg = {
            fullName: row.full_name,
            email: row.email,
            courseName: row.course_name,
            reference: row.reference
          };
        }
      } catch (e) {
        console.warn("DB update error:", e.message);
      }
    }

    if (foundReg) {
      foundReg.paymentStatus = "REJECTED";
      saveLocalData(local);
      await sendPaymentRejectedEmail(foundReg, reason).catch((e) => console.error("Reject email error:", e.message));
      return { ok: true, status: "REJECTED", registration: foundReg };
    }
    return { ok: false, error: "Registration not found" };
  }

  if (action === "create-coupon") {
    const newCoupon = {
      id: `c_${Date.now()}`,
      code: String(body.code || "").trim().toUpperCase(),
      discountPercent: Number(body.discountPercent || 15),
      courseScope: body.courseScope || "all",
      status: "active",
      createdAt: new Date().toISOString()
    };

    if (sql) {
      try {
        await sql`
          INSERT INTO academy_coupons (code, discount_percent, course_scope, status)
          VALUES (${newCoupon.code}, ${newCoupon.discountPercent}, ${newCoupon.courseScope}, ${newCoupon.status})
          ON CONFLICT (code) DO NOTHING;
        `;
      } catch (e) {
        console.warn("DB coupon insert error:", e.message);
      }
    }

    local.coupons.push(newCoupon);
    saveLocalData(local);
    return { ok: true, coupon: newCoupon };
  }

  if (action === "create-affiliate") {
    const newAff = {
      id: `a_${Date.now()}`,
      name: String(body.name || "").trim(),
      email: String(body.email || "").trim(),
      code: String(body.code || "").trim().toUpperCase(),
      discountPercent: Number(body.discountPercent || 15),
      commissionPercent: Number(body.commissionPercent || 20),
      status: "active",
      createdAt: new Date().toISOString()
    };

    if (sql) {
      try {
        await sql`
          INSERT INTO academy_affiliates (name, email, code, discount_percent, commission_percent, status)
          VALUES (${newAff.name}, ${newAff.email}, ${newAff.code}, ${newAff.discountPercent}, ${newAff.commissionPercent}, ${newAff.status})
          ON CONFLICT (code) DO NOTHING;
        `;
      } catch (e) {
        console.warn("DB affiliate insert error:", e.message);
      }
    }

    local.affiliates.push(newAff);
    saveLocalData(local);
    return { ok: true, affiliate: newAff };
  }

  return { ok: false, error: "Unknown action" };
}


