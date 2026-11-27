/**
 * 7Z MAGIC ACADEMY & MARKETPLACE — SERVICE ROUTER
 * Handles Registration, Receipt Upload (@vercel/blob), Coupon Validation, Waitlist, Lead Magnets & Admin Actions (USD Base)
 */

import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BASE_CURRENCY,
  MARKETPLACE_PRODUCTS,
  OFFICIAL_WHOP_URLS,
  normalizeProductId,
  resolveProduct,
  roundMoney
} from "../lib/marketplace-catalog.mjs";
import {
  ensureDbSchema,
  getSqlClient,
  readLocalData,
  saveLocalData,
  validateAndResolveDiscountCode,
  saveDiscountCodeDual,
  saveAffiliateDual,
  sendAdminRegistrationAlert,
  sendPaymentApprovedEmail,
  sendPaymentRejectedEmail,
  sendStudentRegistrationConfirmation,
  sendLeadMagnetEmail,
  sendWaitlistEmails,
  trigger20RegistrationExcelReport
} from "./academy-engine.mjs";

const rootDir = process.env.VERCEL ? "/tmp/7z-academy" : resolve(fileURLToPath(new URL("..", import.meta.url)));
const receiptsDir = join(rootDir, "media", "uploads", "receipts");
const MAX_RECEIPT_BYTES = 6 * 1024 * 1024;
const ALLOWED_RECEIPT_TYPES = Object.freeze({
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf"
});

// Ensure tables exist on boot
ensureDbSchema().catch((e) => console.warn("Schema init error:", e.message));

function matchesMagicBytes(bytes, contentType) {
  if (contentType === "image/jpeg" || contentType === "image/jpg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/png") {
    return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (contentType === "image/webp") {
    return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  }
  if (contentType === "application/pdf") {
    return bytes.length >= 4 && bytes.subarray(0, 4).toString("ascii") === "%PDF";
  }
  return false;
}

function normalizeReceiptMime(rawType = "", fileName = "") {
  const mime = String(rawType || "").toLowerCase().trim();
  if (ALLOWED_RECEIPT_TYPES[mime]) return mime === "image/jpg" ? "image/jpeg" : mime;
  const lowerName = String(fileName || "").toLowerCase();
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg";
  if (lowerName.endsWith(".png")) return "image/png";
  if (lowerName.endsWith(".webp")) return "image/webp";
  if (lowerName.endsWith(".pdf")) return "application/pdf";
  return "";
}

// 0. Public Catalog Metadata (Safe non-sensitive summary)
export function getPublicCatalog() {
  return {
    ok: true,
    currency: BASE_CURRENCY,
    whop: OFFICIAL_WHOP_URLS,
    products: MARKETPLACE_PRODUCTS
  };
}

// 1. Validate Discount / Affiliate Code (USD calculation)
export async function handleValidateCode(codeStr, courseId = "all") {
  const canonicalCourse = courseId === "all" ? "all" : normalizeProductId(courseId);
  const res = await validateAndResolveDiscountCode(codeStr, canonicalCourse);
  const product = canonicalCourse !== "all" ? resolveProduct(canonicalCourse) : null;
  const basePriceUsd = Number(product?.priceUsd || 0);
  if (res?.valid && basePriceUsd > 0) {
    const discountPercent = Number(res.discountPercent || 0);
    const discountUsd = roundMoney((basePriceUsd * discountPercent) / 100);
    const finalPriceUsd = roundMoney(Math.max(0, basePriceUsd - discountUsd));
    return {
      ...res,
      currency: BASE_CURRENCY,
      basePriceUsd,
      discountUsd,
      finalPriceUsd
    };
  }
  return {
    ...res,
    currency: BASE_CURRENCY
  };
}

// 1b. Upload Transfer Receipt to Vercel Blob (private) with local fallback
export async function handleReceiptUpload(body) {
  const rawBase64 = String(body?.fileBase64 || body?.receiptBase64 || "").trim();
  const fileName = String(body?.fileName || body?.receiptName || "receipt.jpg").slice(0, 160);
  const dataMatch = rawBase64.match(/^data:([^;]+);base64,(.+)$/);
  const declaredMime = normalizeReceiptMime(body?.contentType || dataMatch?.[1] || "", fileName);
  const b64Payload = dataMatch ? dataMatch[2] : rawBase64;

  if (!declaredMime || !b64Payload) {
    return { ok: false, status: 400, error: "يرجى رفع إيصال بصيغة JPG أو PNG أو WEBP أو PDF فقط / Upload JPG, PNG, WEBP, or PDF receipt." };
  }

  const buffer = Buffer.from(b64Payload, "base64");
  if (!buffer.length || buffer.length > MAX_RECEIPT_BYTES) {
    return { ok: false, status: 400, error: "حجم ملف الإيصال يجب أن لا يتجاوز 6MB / Receipt size must be 6MB or less." };
  }

  if (!matchesMagicBytes(buffer, declaredMime)) {
    return { ok: false, status: 400, error: "محتوى الملف لا يطابق صيغة الصورة أو الـ PDF المحددة / Invalid receipt file format." };
  }

  const ext = ALLOWED_RECEIPT_TYPES[declaredMime] || "jpg";
  const pathname = `academy-receipts/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const uploaded = await put(pathname, buffer, {
        access: "private",
        contentType: declaredMime,
        addRandomSuffix: false,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      return {
        ok: true,
        storage: "vercel-blob",
        receiptUrl: uploaded.url,
        receiptPathname: uploaded.pathname,
        contentType: declaredMime,
        size: buffer.length
      };
    } catch (err) {
      console.error("[receipt-upload] Vercel Blob upload error:", err.message);
      return { ok: false, status: 503, error: "تعذر رفع الإيصال للتخزين السحابي حالياً / Cloud storage upload unavailable." };
    }
  }

  // Local development fallback
  mkdirSync(receiptsDir, { recursive: true });
  const localFileName = `receipt-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const dest = join(receiptsDir, localFileName);
  writeFileSync(dest, buffer);
  return {
    ok: true,
    storage: "local",
    receiptUrl: `/media/uploads/receipts/${localFileName}`,
    receiptPathname: `/media/uploads/receipts/${localFileName}`,
    contentType: declaredMime,
    size: buffer.length
  };
}

// 2. Register Student / Customer Order (USD Canonical + Server Catalog Validation)
export async function handleRegistration(body) {
  await ensureDbSchema().catch(() => {});

  const fullName = String(body.fullName || "").trim().slice(0, 160);
  const email = String(body.email || "").trim().toLowerCase().slice(0, 180);
  const phone = String(body.phone || "").trim().slice(0, 60);
  const city = String(body.city || "").trim().slice(0, 120) || "Amman / Global";
  const experience = String(body.experience || "marketplace").trim().slice(0, 80);
  const notes = String(body.notes || "").trim().slice(0, 500);
  const language = body.language === "en" ? "en" : "ar";

  if (fullName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length < 6) {
    return {
      ok: false,
      status: 400,
      error: language === "en"
        ? "Please enter your full name, valid email address, and WhatsApp phone number."
        : "يرجى إدخال الاسم الكامل والبريد الإلكتروني الصحيح ورقم الواتساب."
    };
  }

  const courseId = normalizeProductId(body.courseId || body.productId || "cinematic-film");
  const product = resolveProduct(courseId);
  if (!product) {
    return { ok: false, status: 400, error: "Selected product or course was not found in catalog." };
  }

  const basePriceUsd = roundMoney(product.priceUsd || 0);
  const promoCode = String(body.promoCode || "").trim().toUpperCase().slice(0, 32);
  let discountPercent = 0;
  let affiliateName = "";
  let commissionPercent = 0;

  if (promoCode) {
    const codeCheck = await validateAndResolveDiscountCode(promoCode, product.id);
    if (codeCheck && codeCheck.valid) {
      discountPercent = Number(codeCheck.discountPercent || 0);
      affiliateName = codeCheck.affiliateName || "";
      commissionPercent = Number(codeCheck.commissionPercent || 0);
    }
  }

  const discountUsd = basePriceUsd > 0 ? roundMoney((basePriceUsd * discountPercent) / 100) : 0;
  const finalPriceUsd = roundMoney(Math.max(0, basePriceUsd - discountUsd));
  const commissionUsd = finalPriceUsd > 0 ? roundMoney((finalPriceUsd * commissionPercent) / 100) : 0;

  const rawProvider = String(body.paymentProvider || body.paymentMethod || "CliQ / Western Union").trim();
  const isWhop = /whop/i.test(rawProvider);
  const isInquiry = product.isInquiry || basePriceUsd === 0 || /inquiry/i.test(rawProvider);
  const paymentProvider = isWhop ? "Whop" : isInquiry ? "Inquiry" : rawProvider.slice(0, 80);

  // Handle receipt (either already uploaded to Vercel Blob via receipt-upload, or inline base64 fallback)
  let receiptUrl = String(body.receiptUrl || "").trim();
  let receiptName = String(body.receiptName || "").trim() || "receipt.jpg";
  let receiptType = String(body.receiptType || "image/jpeg").trim();
  const receiptBase64 = String(body.receiptBase64 || "");

  if (!receiptUrl && receiptBase64) {
    const uploadRes = await handleReceiptUpload({
      fileName: receiptName,
      contentType: receiptType,
      fileBase64: receiptBase64
    });
    if (!uploadRes.ok) {
      return uploadRes;
    }
    receiptUrl = uploadRes.receiptUrl;
    receiptType = uploadRes.contentType;
  }

  if (!isWhop && !isInquiry && finalPriceUsd > 0 && !receiptUrl && !receiptBase64) {
    return {
      ok: false,
      status: 400,
      error: language === "en"
        ? "Please upload your CliQ or Western Union transfer receipt before submitting."
        : "يرجى إرفاق صورة أو ملف إيصال التحويل المالي (CliQ أو Western Union) قبل تأكيد الطلب."
    };
  }

  const local = readLocalData();
  const sql = getSqlClient();
  let dbMaxSeat = 0;
  if (sql) {
    try {
      const [cntRow] = await sql`SELECT GREATEST(COALESCE(MAX(seat_number), 0), COUNT(*))::int AS max_seat FROM academy_registrations;`;
      dbMaxSeat = Number(cntRow?.max_seat || 0);
    } catch {}
  }
  const nextSeat = Math.max(local.counter || 0, dbMaxSeat) + 1;
  const ref = `7Z-REG-${Math.floor(100000 + Math.random() * 900000)}`;

  const paymentStatus = isWhop ? "WHOP_PENDING" : isInquiry ? "INQUIRY" : "PENDING_REVIEW";
  const courseName = language === "en" ? product.nameEn : product.nameAr;

  const regRecord = {
    seatNumber: nextSeat,
    reference: ref,
    fullName,
    email,
    phone,
    city,
    experience,
    notes: notes || (product.id === "course-foundations" ? "1.4GB Complete Masterclass Bundle (Manual Admin Delivery)" : ""),
    language,
    courseId: product.id,
    courseName,
    productType: product.type,
    currency: BASE_CURRENCY,
    basePriceUsd,
    promoCode,
    discountPercent,
    discountJod: discountUsd,
    discountUsd,
    finalPrice: finalPriceUsd,
    paymentProvider,
    paymentStatus,
    receiptUrl,
    receiptName,
    receiptType,
    // Keep Base64 in memory for immediate email attachment, omit giant payload from DB if Blob URL is stored
    receiptBase64: receiptUrl ? "" : receiptBase64,
    affiliateName,
    commissionPercent,
    commissionJod: commissionUsd,
    submittedAt: body.submittedAt || new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  if (sql) {
    try {
      await sql`
        INSERT INTO academy_registrations (
          seat_number, reference, full_name, email, phone, city, experience, preferred_language, notes,
          course_id, course_name, product_type, currency, promo_code, discount_percent,
          discount_jod, final_price, payment_provider, payment_status,
          receipt_url, receipt_name, receipt_base64
        ) VALUES (
          ${regRecord.seatNumber}, ${regRecord.reference}, ${regRecord.fullName}, ${regRecord.email},
          ${regRecord.phone}, ${regRecord.city}, ${regRecord.experience}, ${language || "ar"}, ${regRecord.notes},
          ${regRecord.courseId}, ${regRecord.courseName}, ${regRecord.productType}, ${BASE_CURRENCY},
          ${regRecord.promoCode}, ${regRecord.discountPercent}, ${regRecord.discountUsd},
          ${regRecord.finalPrice}, ${regRecord.paymentProvider}, ${regRecord.paymentStatus},
          ${regRecord.receiptUrl}, ${regRecord.receiptName}, ${regRecord.receiptBase64}
        );
      `;

      await sql`
        INSERT INTO course_registrations (
          seat_number, full_name, email, phone, location, experience, preferred_language, goal,
          course_id, product_type, currency, price_jod, discount_jod, price_usd, discount_usd,
          coupon_code, affiliate_name, commission_percent, commission_jod, commission_status,
          payment_provider, payment_status, payment_reference, receipt_url, receipt_name, receipt_base64
        ) VALUES (
          ${regRecord.seatNumber}, ${regRecord.fullName}, ${regRecord.email}, ${regRecord.phone},
          ${regRecord.city}, ${regRecord.experience}, ${language || "ar"}, ${regRecord.notes},
          ${regRecord.courseId}, ${regRecord.productType}, ${BASE_CURRENCY},
          ${basePriceUsd}, ${discountUsd}, ${basePriceUsd}, ${discountUsd},
          ${regRecord.promoCode}, ${affiliateName}, ${commissionPercent}, ${commissionUsd},
          ${commissionPercent > 0 ? "PENDING_PAYMENT_REVIEW" : "NOT_APPLICABLE"},
          ${paymentProvider}, ${paymentStatus}, ${regRecord.reference},
          ${regRecord.receiptUrl}, ${regRecord.receiptName}, ${regRecord.receiptBase64}
        )
        ON CONFLICT (course_id, lower(email)) DO UPDATE SET
          payment_provider = EXCLUDED.payment_provider,
          payment_reference = EXCLUDED.payment_reference,
          payment_status = EXCLUDED.payment_status,
          receipt_url = COALESCE(NULLIF(EXCLUDED.receipt_url, ''), course_registrations.receipt_url),
          price_usd = EXCLUDED.price_usd,
          discount_usd = EXCLUDED.discount_usd,
          coupon_code = EXCLUDED.coupon_code,
          payment_submitted_at = NOW();
      `;
    } catch (e) {
      console.warn("DB insert error, saving to local store:", e.message);
    }
  }

  local.registrations.push(regRecord);
  local.counter = nextSeat;
  saveLocalData(local);

  const mailRecord = { ...regRecord, receiptBase64: receiptBase64 || "" };
  const [adminMailRes, studentMailRes] = await Promise.allSettled([
    sendAdminRegistrationAlert(mailRecord),
    sendStudentRegistrationConfirmation(mailRecord)
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
    currency: BASE_CURRENCY,
    productId: product.id,
    basePriceUsd,
    discountUsd,
    finalPriceUsd,
    paymentProvider,
    paymentStatus,
    whopUrl: isWhop ? (product.whopUrl || OFFICIAL_WHOP_URLS.storeMain) : null,
    emailStatus: {
      admin: adminMailRes.status === "fulfilled" ? adminMailRes.value : { error: adminMailRes.reason?.message },
      student: studentMailRes.status === "fulfilled" ? studentMailRes.value : { error: studentMailRes.reason?.message }
    }
  };
}

// 2b. VIP Waitlist Registration
export async function handleWaitlist(body) {
  await ensureDbSchema().catch(() => {});

  const fullName = String(body.fullName || "").trim().slice(0, 160);
  const email = String(body.email || "").trim().toLowerCase().slice(0, 180);
  const whatsapp = String(body.whatsapp || body.phone || "").trim().slice(0, 60);
  const discipline = String(body.discipline || "").trim().slice(0, 140);
  const rawProductId = String(body.productId || "agent-architect").trim().slice(0, 80);
  const product = resolveProduct(rawProductId);
  const productId = product?.id || rawProductId;
  const productTitle = String(body.productTitle || product?.nameEn || productId).slice(0, 200);

  if (fullName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || whatsapp.length < 6) {
    return { ok: false, status: 400, error: "يرجى إدخال الاسم والبريد الإلكتروني ورقم الواتساب بشكل صحيح / Valid name, email, and WhatsApp required." };
  }

  const reference = `7Z-VIP-${Math.floor(100000 + Math.random() * 900000)}`;
  const entry = {
    reference,
    productId,
    productTitle,
    fullName,
    email,
    whatsapp,
    discipline,
    status: "WAITLISTED",
    createdAt: new Date().toISOString()
  };

  const sql = getSqlClient();
  if (sql) {
    try {
      await sql`
        INSERT INTO marketplace_waitlist (reference, product_id, product_title, full_name, email, whatsapp, discipline, status)
        VALUES (${reference}, ${productId}, ${productTitle}, ${fullName}, ${email}, ${whatsapp}, ${discipline}, 'WAITLISTED');
      `;
    } catch (e) {
      console.warn("[waitlist] SQL insert notice:", e.message);
    }
  }

  const local = readLocalData();
  if (!Array.isArray(local.waitlist)) local.waitlist = [];
  local.waitlist.unshift(entry);
  saveLocalData(local);

  const emailStatus = await sendWaitlistEmails(entry).catch((e) => ({ error: e.message }));
  return { ok: true, reference, entry, emailStatus };
}

// 2c. Lead Magnet (Video Guide PDF / Company Profile PDF / 5000+ Prompt Vault)
const LEAD_ASSET_CATALOG = {
  "video-guide": {
    id: "video-guide",
    titleEn: "7Z AI Video Creation Handbook (PDF)",
    titleAr: "دليل صناعة الفيديو بالذكاء الاصطناعي (PDF)"
  },
  "company-profile": {
    id: "company-profile",
    titleEn: "7Z Company Profile 2026 (PDF)",
    titleAr: "البروفايل التعريفي للشركة 2026 (PDF)"
  },
  "prompt-vault": {
    id: "prompt-vault",
    titleEn: "5000+ AI Prompts Master Vault (PDF)",
    titleAr: "بنك البرومبتات الشامل 5000+ (PDF)",
    downloadUrl: "https://7z-magic.com/marketplace/assets/7Z-Magic-5000-Prompt-Vault.pdf"
  }
};

export async function handleLeadMagnet(body) {
  await ensureDbSchema().catch(() => {});

  const fullName = String(body.fullName || "").trim().slice(0, 160);
  const email = String(body.email || "").trim().toLowerCase().slice(0, 180);
  const whatsapp = String(body.whatsapp || "").trim().slice(0, 40);
  const rawAssetId = String(body.assetId || "prompt-vault").trim();
  const assetMeta = LEAD_ASSET_CATALOG[rawAssetId] || LEAD_ASSET_CATALOG["prompt-vault"];
  const language = body.language === "en" ? "en" : "ar";
  const assetTitle = String(body.assetTitle || "").trim().slice(0, 180) || (language === "en" ? assetMeta.titleEn : assetMeta.titleAr);
  const campaignLabel = `${assetMeta.id} · ${assetMeta.titleEn}`;

  if (fullName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, status: 400, error: "يرجى إدخال الاسم والبريد الإلكتروني الصحيح / Enter valid name and email." };
  }
  if (whatsapp.replace(/[^0-9]/g, "").length < 7) {
    return { ok: false, status: 400, error: "يرجى إدخال رقم واتساب صحيح / Enter a valid WhatsApp number." };
  }

  const reference = `7Z-LEAD-${Math.floor(100000 + Math.random() * 900000)}`;
  const lead = {
    reference,
    campaign: campaignLabel,
    assetId: assetMeta.id,
    assetTitle,
    fullName,
    email,
    whatsapp,
    language,
    status: "DELIVERED",
    createdAt: new Date().toISOString()
  };

  const sql = getSqlClient();
  if (sql) {
    try {
      await sql`
        INSERT INTO marketplace_leads (reference, campaign, asset_id, asset_title, full_name, email, whatsapp, status)
        VALUES (${reference}, ${campaignLabel}, ${assetMeta.id}, ${assetTitle}, ${fullName}, ${email}, ${whatsapp}, 'DELIVERED');
      `;
    } catch (e) {
      console.warn("[lead-magnet] SQL insert notice:", e.message);
    }
  }

  const local = readLocalData();
  if (!Array.isArray(local.leads)) local.leads = [];
  local.leads.unshift(lead);
  saveLocalData(local);

  const assetLinks = {
    "video-guide": "https://7z-magic.com/marketplace/assets/7ZOS_AI_Video_Guide.pdf",
    "company-profile": "https://7z-magic.com/marketplace/assets/7Z_Company_Profile_2026_Landscape_Edition.pdf",
    "prompt-vault": "https://7z-magic.com/marketplace/assets/7Z-Magic-5000-Prompt-Vault.pdf"
  };
  const downloadUrl = assetLinks[assetMeta.id] || assetLinks["prompt-vault"];

  const emailStatus = await sendLeadMagnetEmail(lead).catch((e) => ({ error: e.message }));
  return {
    ok: true,
    reference,
    assetId: assetMeta.id,
    assetTitle,
    downloadUrl,
    emailStatus
  };
}

// 3. Admin Data Provider (USD)
export async function getAdminData() {
  const sql = getSqlClient();
  let registrations = [];
  let coupons = [];
  let affiliates = [];
  let waitlist = [];
  let leads = [];

  if (sql) {
    try {
      const regRows = await sql`SELECT * FROM academy_registrations ORDER BY created_at DESC;`;
      const coupRows = await sql`SELECT * FROM academy_coupons ORDER BY created_at DESC;`;
      const affRows = await sql`SELECT * FROM academy_affiliates ORDER BY created_at DESC;`;
      const waitRows = await sql`SELECT * FROM marketplace_waitlist ORDER BY created_at DESC;`.catch(() => []);
      const leadRows = await sql`SELECT * FROM marketplace_leads ORDER BY created_at DESC;`.catch(() => []);

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
        productType: r.product_type || "course",
        currency: r.currency || BASE_CURRENCY,
        promoCode: r.promo_code,
        discountPercent: r.discount_percent,
        discountJod: r.discount_jod,
        finalPrice: r.final_price,
        paymentProvider: r.payment_provider || "CliQ / Western Union",
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

      waitlist = (waitRows || []).map((w) => ({
        id: w.id,
        reference: w.reference,
        productId: w.product_id,
        productTitle: w.product_title,
        fullName: w.full_name,
        email: w.email,
        whatsapp: w.whatsapp,
        discipline: w.discipline,
        status: w.status,
        createdAt: w.created_at
      }));

      leads = (leadRows || []).map((l) => ({
        id: l.id,
        reference: l.reference,
        campaign: l.campaign,
        fullName: l.full_name,
        email: l.email,
        status: l.status,
        createdAt: l.created_at
      }));
    } catch (e) {
      console.warn("DB read error, using local data fallback:", e.message);
    }
  }

  const local = readLocalData();
  if (registrations.length === 0) registrations = local.registrations || [];
  if (coupons.length === 0) coupons = local.coupons || [];
  if (affiliates.length === 0) affiliates = local.affiliates || [];
  if (waitlist.length === 0) waitlist = local.waitlist || [];
  if (leads.length === 0) leads = local.leads || [];

  const affiliateStats = affiliates.map((aff) => {
    const usedRegs = registrations.filter(
      (r) => r.promoCode && r.promoCode.toUpperCase() === aff.code.toUpperCase()
    );
    const confirmedRegs = usedRegs.filter((r) => ["PAID", "APPROVED", "VERIFIED"].includes(r.paymentStatus));
    const totalSalesUsd = confirmedRegs.reduce((sum, r) => sum + Number(r.finalPrice || 0), 0);
    const commissionOwed = (totalSalesUsd * Number(aff.commissionPercent || 0)) / 100;

    return {
      ...aff,
      totalUses: usedRegs.length,
      confirmedCount: confirmedRegs.length,
      totalSalesJod: totalSalesUsd,
      totalSalesUsd,
      commissionOwed
    };
  });

  const totalRevenue = registrations
    .filter((r) => ["PAID", "APPROVED", "VERIFIED"].includes(r.paymentStatus))
    .reduce((sum, r) => sum + Number(r.finalPrice || 0), 0);
  const pendingCount = registrations.filter((r) => ["PENDING_REVIEW", "WHOP_PENDING", "INQUIRY"].includes(r.paymentStatus)).length;
  const approvedCount = registrations.filter((r) => ["PAID", "APPROVED", "VERIFIED"].includes(r.paymentStatus)).length;

  return {
    currency: BASE_CURRENCY,
    registrations,
    coupons,
    affiliates: affiliateStats,
    waitlist,
    leads,
    stats: {
      totalRegistrations: registrations.length,
      pendingCount,
      approvedCount,
      totalRevenue,
      waitlistCount: waitlist.length,
      leadsCount: leads.length
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

    await saveDiscountCodeDual(newCoupon);
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

    await saveAffiliateDual(newAff);
    return { ok: true, affiliate: newAff };
  }

  return { ok: false, error: "Unknown action" };
}
