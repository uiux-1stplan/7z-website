import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import { get, issueSignedToken, presignUrl } from "@vercel/blob";
import { prepare, sqlClient, sendZohoMail, workbook } from "./course-registration.js";

const COURSES = Object.freeze({ "cinematic-film": { name: "7Z AI Cinematic Filmmaking", capacity: null }, "ai-engineering": { name: "دورة الذكاء الاصطناعي للمهندسين", capacity: null } });
const DEFAULT_COURSE = "cinematic-film";
const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const PROOF_TYPES = Object.freeze({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" });
const ALLOWED_ORIGINS = new Set(["https://7z-magic.com", "https://www.7z-magic.com"]);
const COURSE_COUPONS = Object.freeze({
  "cinematic-film": Object.freeze({
    HASSAN10: { discountPercent: 10, affiliateName: "حسن ريان", commissionPercent: 25 },
    SHAS10: { discountPercent: 10, affiliateName: "شأس مطر", commissionPercent: 25 },
    ABDULRAHMAN10: { discountPercent: 10, affiliateName: "عبدالرحمن محمد", commissionPercent: 25 },
    "7Z10": { discountPercent: 10, affiliateName: "", commissionPercent: 0 },
    ALUMNI15: { discountPercent: 15, affiliateName: "", commissionPercent: 0, requiresPreviousEmail: true },
  }),
  "ai-engineering": Object.freeze({
    AIENG10: { discountPercent: 10, affiliateName: "", commissionPercent: 0 },
    AIENGALUMNI15: { discountPercent: 15, affiliateName: "", commissionPercent: 0, requiresPreviousEmail: true },
    AYA10: { discountPercent: 10, affiliateName: "Aya", commissionPercent: 20 },
    ANAS10: { discountPercent: 10, affiliateName: "Anas Aide", commissionPercent: 20 },
    ABD10: { discountPercent: 10, affiliateName: "Abedulrahman", commissionPercent: 20 },
    "7ZM10": { discountPercent: 10, affiliateName: "7Z Magic", commissionPercent: 0 },
    HR10: { discountPercent: 10, affiliateName: "Hasan Rayyan", commissionPercent: 0 },
  }),
});

function money(value) { return Math.round((Number(value) + Number.EPSILON) * 1000) / 1000; }

function matchesImageType(bytes, contentType) {
  if (contentType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (contentType === "image/webp") return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  return false;
}

function setHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
}

function settingText(value) {
  const raw = String(value ?? "").trim();
  try { const parsed = JSON.parse(raw); return typeof parsed === "string" ? parsed.trim() : raw; } catch { return raw; }
}

function getPaymentMethods() {
  const cliqInstructions = settingText(process.env.COURSE_CLIQ_INSTRUCTIONS);
  const westernInstructions = settingText(process.env.COURSE_WU_INSTRUCTIONS);
  const methods = [];
  if (process.env.COURSE_CLIQ_ALIAS?.trim() && process.env.COURSE_CLIQ_PHONE?.trim() && cliqInstructions) {
    methods.push({ id: "CLIQ", name: "CliQ", recipient: process.env.COURSE_CLIQ_ALIAS.trim(), account: process.env.COURSE_CLIQ_PHONE.trim(), instructions: cliqInstructions });
  }
  if (process.env.COURSE_WU_BENEFICIARY?.trim() && westernInstructions) {
    methods.push({ id: "WESTERN_UNION", name: "Western Union", recipient: process.env.COURSE_WU_BENEFICIARY.trim(), account: "", instructions: westernInstructions });
  }
  return methods;
}

function requestBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  return {};
}

export default async function handler(req, res) {
  setHeaders(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") { res.setHeader("Allow", "POST, OPTIONS"); return res.status(405).json({ error: "Method not allowed." }); }
  if (!ALLOWED_ORIGINS.has(req.headers.origin)) return res.status(403).json({ error: "Origin not allowed." });

  const body = requestBody(req);
  const token = typeof body.token === "string" ? body.token : "";
  if (token.length < 40 || token.length > 100) return res.status(400).json({ error: "This checkout link is not valid." });
  const tokenHash = createHash("sha256").update(token).digest("hex");

  try {
    // Registration creates and migrates the checkout schema before issuing a token.
    // Keep checkout requests read-only with respect to DDL to avoid transient schema-lock failures.
    const sql = sqlClient();
    const methods = getPaymentMethods();
    const intentMetaRows = await sql`SELECT course_id,price_jod,status,expires_at FROM course_checkout_intents WHERE token_hash=${tokenHash}`;
    const intentMeta = intentMetaRows[0];
    if (!intentMeta) return res.status(404).json({ error: "This checkout link is not valid." });
    const courseId = String(intentMeta.course_id || DEFAULT_COURSE), course = COURSES[courseId];
    if (!course) return res.status(400).json({ error: "Course not found." });
    const courseCoupons = COURSE_COUPONS[courseId] ?? Object.freeze({});
    const CAPACITY = course.capacity;
    const priceJod = Number(intentMeta.price_jod ?? process.env.COURSE_PRICE_JOD);
    if (!Number.isFinite(priceJod) || priceJod <= 0 || methods.length === 0) return res.status(503).json({ error: "Checkout is not configured yet." });

    if (body.action === "proof-url") {
      const provider = String(body.provider ?? "").toUpperCase();
      const contentType = String(body.contentType ?? "").toLowerCase();
      const size = Number(body.size);
      if (!["CLIQ", "WESTERN_UNION"].includes(provider) || !methods.some((method) => method.id === provider)) return res.status(400).json({ error: "Choose an available transfer method." });
      if (!PROOF_TYPES[contentType] || !Number.isInteger(size) || size < 1 || size > MAX_PROOF_BYTES) return res.status(400).json({ error: "Upload a JPG, PNG, or WebP image up to 5 MB." });
      const rows = await sql`SELECT status,expires_at,payment_proof_pathname,payment_proof_content_type,payment_proof_provider FROM course_checkout_intents WHERE token_hash=${tokenHash}`;
      const intent = rows[0];
      if (!intent) return res.status(404).json({ error: "This checkout link is not valid." });
      if (intent.status !== "PENDING" || new Date(intent.expires_at) <= new Date()) return res.status(410).json({ error: "This checkout link has expired. Please start again from registration." });
      const pathname = `course-payment-proofs/${tokenHash}/${randomUUID()}.${PROOF_TYPES[contentType]}`;
      const validUntil = Date.now() + 5 * 60 * 1000;
      const signedToken = await issueSignedToken({ pathname, operations: ["put"], validUntil, allowedContentTypes: [contentType], maximumSizeInBytes: MAX_PROOF_BYTES });
      const { presignedUrl } = await presignUrl(signedToken, { pathname, operation: "put", access: "private", validUntil, allowedContentTypes: [contentType], maximumSizeInBytes: MAX_PROOF_BYTES, allowOverwrite: false });
      await sql`UPDATE course_checkout_intents SET payment_proof_pathname=${pathname},payment_proof_content_type=${contentType},payment_proof_provider=${provider} WHERE token_hash=${tokenHash} AND status='PENDING' AND expires_at > NOW()`;
      return res.status(200).json({ ok: true, uploadUrl: presignedUrl, pathname, validUntil });
    }

    if (body.action === "proof-confirm") {
      const provider = String(body.provider ?? "").toUpperCase();
      const contentType = String(body.contentType ?? "").toLowerCase();
      const pathname = String(body.pathname ?? "");
      const blobUrl = String(body.blobUrl ?? "");
      let parsedBlobUrl;
      try { parsedBlobUrl = new URL(blobUrl); } catch {}
      if (!["CLIQ", "WESTERN_UNION"].includes(provider) || !methods.some((method) => method.id === provider) || !PROOF_TYPES[contentType] || !pathname.startsWith(`course-payment-proofs/${tokenHash}/`) || !parsedBlobUrl || parsedBlobUrl.protocol !== "https:" || !parsedBlobUrl.hostname.endsWith(".private.blob.vercel-storage.com") || parsedBlobUrl.search || parsedBlobUrl.hash || parsedBlobUrl.pathname.slice(1) !== pathname) return res.status(400).json({ error: "The payment proof is not valid." });
      const rows = await sql`SELECT status,expires_at,payment_proof_pathname,payment_proof_content_type,payment_proof_provider FROM course_checkout_intents WHERE token_hash=${tokenHash}`;
      const intent = rows[0];
      if (!intent) return res.status(404).json({ error: "This checkout link is not valid." });
      if (intent.status !== "PENDING" || new Date(intent.expires_at) <= new Date()) return res.status(410).json({ error: "This checkout link has expired. Please start again from registration." });
      const expectedPath = String(intent.payment_proof_pathname || "");
      const extension = `.${PROOF_TYPES[contentType]}`;
      const expectedStem = expectedPath.endsWith(extension) ? expectedPath.slice(0, -extension.length) : "";
      const actualStem = pathname.endsWith(extension) ? pathname.slice(0, -extension.length) : "";
      const generatedSuffix = actualStem.startsWith(`${expectedStem}-`) ? actualStem.slice(expectedStem.length + 1) : "";
      const matchesExpectedPath = pathname === expectedPath || (!!generatedSuffix && /^[A-Za-z0-9_-]{6,}$/.test(generatedSuffix));
      if (!expectedStem || !actualStem || !matchesExpectedPath || intent.payment_proof_content_type !== contentType || intent.payment_proof_provider !== provider) return res.status(400).json({ error: "The payment proof is not valid." });      const blob = await get(blobUrl, { access: "private", useCache: false });
      if (!blob || blob.statusCode !== 200) return res.status(400).json({ error: "The uploaded image could not be verified." });
      const validBlob = blob.blob.size <= MAX_PROOF_BYTES && blob.blob.contentType === contentType;
      await blob.stream.cancel();
      if (!validBlob) return res.status(400).json({ error: "The uploaded image could not be verified." });
      await sql`UPDATE course_checkout_intents SET payment_proof_pathname=${blobUrl},payment_proof_content_type=${contentType},payment_proof_provider=${provider} WHERE token_hash=${tokenHash} AND status='PENDING' AND expires_at > NOW()`;
      return res.status(200).json({ ok: true });
    }

    if (body.action === "details") {
      const rows = await sql`SELECT * FROM course_checkout_intents WHERE token_hash=${tokenHash}`;
      const intent = rows[0];
      if (!intent) return res.status(404).json({ error: "This checkout link is not valid." });
      if (intent.status !== "PENDING") return res.status(410).json({ error: "This checkout link has already been used or expired." });
      if (new Date(intent.expires_at) <= new Date()) {
        await sql`UPDATE course_checkout_intents SET status='EXPIRED' WHERE token_hash=${tokenHash} AND status='PENDING'`;
        return res.status(410).json({ error: "This checkout link has expired. Please start again from registration." });
      }
      if (body.couponCode !== undefined) {
        const couponCode = String(body.couponCode ?? "").trim().toUpperCase();
        if (couponCode && !Object.hasOwn(courseCoupons, couponCode)) return res.status(400).json({ error: "This discount code is invalid." });
        const coupon = couponCode ? courseCoupons[couponCode] : null;
        const previousCourseEmail = String(body.previousCourseEmail ?? "").trim().toLowerCase();
        if (coupon?.requiresPreviousEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(previousCourseEmail)) return res.status(400).json({ error: "Enter the email used for your previous course.", code: "PREVIOUS_COURSE_EMAIL_REQUIRED" });
        const discountJod = coupon ? money(priceJod * coupon.discountPercent / 100) : 0;
        const commissionJod = coupon?.commissionPercent ? money((priceJod - discountJod) * coupon.commissionPercent / 100) : 0;
        await sql`UPDATE course_checkout_intents SET coupon_code=${couponCode},discount_percent=${coupon?.discountPercent ?? 0},discount_jod=${discountJod},affiliate_name=${coupon?.affiliateName ?? ""},commission_percent=${coupon?.commissionPercent ?? 0},commission_jod=${commissionJod},commission_status=${coupon?.commissionPercent ? "PENDING_PAYMENT_REVIEW" : "NOT_APPLICABLE"},previous_course_email=${coupon?.requiresPreviousEmail ? previousCourseEmail : ""} WHERE token_hash=${tokenHash} AND status='PENDING' AND expires_at > NOW()`;
      }
      const current = (await sql`SELECT coupon_code,discount_percent,discount_jod,affiliate_name,commission_percent,commission_jod,commission_status,previous_course_email FROM course_checkout_intents WHERE token_hash=${tokenHash}`)[0];
      const discountJod = money(current?.discount_jod ?? 0);
      return res.status(200).json({ ok: true, priceJod, originalPriceJod: priceJod, discountJod, totalJod: money(priceJod - discountJod), couponCode: current?.coupon_code ?? "", discountPercent: Number(current?.discount_percent ?? 0), previousCourseEmail: current?.previous_course_email ?? "", requiresPreviousCourseEmail: Boolean(courseCoupons[current?.coupon_code]?.requiresPreviousEmail), currency: "JOD", courseId, courseName: course.name, capacity: CAPACITY, methods, expiresAt: new Date(intent.expires_at).toISOString() });
    }

    if (body.action !== "submit") return res.status(400).json({ error: "Checkout action is not valid." });
    const provider = String(body.provider ?? "").toUpperCase();
    const reference = String(body.reference ?? "").trim().slice(0, 160);
    if (!methods.some((method) => method.id === provider)) return res.status(400).json({ error: "Choose an available payment method." });
    if (reference.length < 3) return res.status(400).json({ error: "Enter the transfer reference." });

    const proofRows = await sql`SELECT status,expires_at,payment_proof_pathname,payment_proof_content_type,payment_proof_provider FROM course_checkout_intents WHERE token_hash=${tokenHash}`;
    const proof = proofRows[0];
    if (!proof) return res.status(404).json({ error: "This checkout link is not valid." });
    if (proof.status === "PENDING" && new Date(proof.expires_at) <= new Date()) return res.status(410).json({ error: "This checkout link has expired. Please start again from registration." });
    if (proof.status === "PENDING" && (!proof.payment_proof_pathname || proof.payment_proof_provider !== provider)) return res.status(400).json({ error: "Upload the transfer receipt image before submitting." });
    if (!proof.payment_proof_pathname || proof.payment_proof_provider !== provider) return res.status(409).json({ error: "This payment request was already submitted with another method." });
    const proofObject = await get(proof.payment_proof_pathname, { access: "private", useCache: false });
    if (!proofObject || proofObject.statusCode !== 200) throw new Error("Private payment proof could not be retrieved.");
    const proofChunks = [];
    let proofSize = 0;
    for await (const chunk of proofObject.stream) {
      proofSize += chunk.length;
      if (proofSize > MAX_PROOF_BYTES) throw new Error("Payment proof exceeded the allowed size.");
      proofChunks.push(Buffer.from(chunk));
    }
    const proofBytes = Buffer.concat(proofChunks);
    if (!matchesImageType(proofBytes, proof.payment_proof_content_type)) throw new Error("Payment proof does not match the declared image type.");
    const proofAttachment = { name: `payment-proof.${PROOF_TYPES[proof.payment_proof_content_type]}`, contentType: proof.payment_proof_content_type, bytes: proofBytes };

    const result = (await sql`SELECT * FROM complete_course_payment(${tokenHash},${provider},${reference})`)[0];
    if (result.outcome === "expired") return res.status(410).json({ error: "This checkout link has expired. Please start again from registration." });
    if (result.outcome === "invalid") return res.status(404).json({ error: "This checkout link is not valid." });
    if (result.outcome === "duplicate") return res.status(409).json({ error: "This email is already registered.", duplicate: true });
    if (result.outcome === "full") return res.status(409).json({ error: "Course is full.", full: true });
    if (result.outcome === "proof_missing") return res.status(400).json({ error: "Upload the transfer receipt image before submitting." });
    if (result.outcome === "submitted") return res.status(200).json({ ok: true, seat: Number(result.seat), capacity: CAPACITY, paymentStatus: "PENDING_REVIEW", alreadySubmitted: true, emailSent: false, batchFileSent: false });

    const seat = Number(result.seat);
    const records = await sql`SELECT seat_number,full_name,email,phone,location,experience,preferred_language,goal,previous_course_email,created_at,payment_provider,payment_reference,payment_proof_pathname,payment_proof_content_type,payment_status,coupon_code,discount_percent,discount_jod,affiliate_name,commission_percent,commission_jod,commission_status,course_id,price_jod FROM course_registrations WHERE course_id=${courseId} AND seat_number=${seat}`;
    const registration = records[0];
    if (!registration) throw new Error("Created registration could not be loaded.");
    let attachment;
    if (seat % 20 === 0) {
      const start = seat - 19;
      const rows = await sql`SELECT seat_number,full_name,email,phone,location,experience,preferred_language,goal,previous_course_email,created_at,payment_status,payment_provider,payment_reference,coupon_code,discount_percent,discount_jod,affiliate_name,commission_percent,commission_jod,commission_status,course_id,price_jod FROM course_registrations WHERE course_id=${courseId} AND seat_number BETWEEN ${start} AND ${seat} ORDER BY seat_number`;
      if (rows.length === 20) attachment = { name: `7Z-${courseId}-Registrations-${start}-${seat}.xlsx`, bytes: workbook(rows, start, seat) };
    }
    proofAttachment.name = `payment-proof-seat-${seat}.${PROOF_TYPES[registration.payment_proof_content_type]}`;
    const methodName = methods.find((method) => method.id === provider)?.name ?? provider;
    const subject = attachment ? `${course.name} registrations ${seat - 19}-${seat} · payment pending review` : `${course.name} payment reference · registration ${seat} · ${registration.full_name}`;
    const discountJod = money(registration.discount_jod ?? 0);
    const payableJod = money(priceJod - discountJod);
    const details = `Payment status: PENDING REVIEW — transfer reference received, not yet verified\nCourse: ${course.name}\nRegistration number: ${seat}\nList price: ${priceJod} JOD\nDiscount code: ${registration.coupon_code || "—"}\nDiscount: ${registration.discount_percent || 0}% (${discountJod} JOD)\nAmount due: ${payableJod} JOD\nAffiliate: ${registration.affiliate_name || "—"}\nCommission: ${registration.commission_percent || 0}% (${money(registration.commission_jod ?? 0)} JOD) — ${registration.commission_status}\nPrevious-course email for alumni eligibility review: ${registration.previous_course_email || "—"}\nPayment method: ${methodName}\nTransfer reference: ${reference}\nReceipt image: attached for manual review\nName: ${registration.full_name}\nEmail: ${registration.email}\nPhone: ${registration.phone}\nLocation: ${registration.location}\nExperience: ${registration.experience}\nPreferred language: ${registration.preferred_language}\nGoal: ${registration.goal || "—"}\nSubmitted: ${new Date(registration.created_at).toISOString()}${attachment ? `\n\nThe completed ${seat - 19}-${seat} registration batch is attached as an Excel workbook.` : ""}`;
    const emailEscape = (value) => String(value ?? "—").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
    const emailField = (label, value) => `<tr><td style="padding:11px 14px;border-bottom:1px solid #e4eaf2;color:#63718a;font-size:13px;width:36%;">${emailEscape(label)}</td><td style="padding:11px 14px;border-bottom:1px solid #e4eaf2;color:#18263c;font-size:14px;font-weight:600;word-break:break-word;">${emailEscape(value)}</td></tr>`;
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Payment received · 7Z Magic</title></head>
<body style="margin:0;padding:32px 12px;background:#eef3f9;font-family:Arial,Helvetica,sans-serif;color:#172338;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:700px;margin:0 auto;background:#fff;border:1px solid #dce5f0;border-radius:18px;overflow:hidden;">
<tr><td style="padding:28px 34px;background:#080d16;background-image:linear-gradient(125deg,#080d16,#13233b);"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="vertical-align:middle;"><img src="https://7z-magic.com/7Z-LogoT.png" width="62" height="62" alt="7Z Magic" style="display:block;width:62px;height:62px;object-fit:cover;border-radius:12px;border:1px solid #33435b;"></td><td style="padding-left:16px;vertical-align:middle;"><div style="color:#fff;font-size:20px;font-weight:700;letter-spacing:2px;">7Z MAGIC</div><div style="margin-top:6px;color:#9db2d1;font-size:10px;letter-spacing:2px;">AI CINEMATIC FILMMAKING</div></td><td align="right" style="vertical-align:middle;color:#8eb4ff;font-size:12px;">ACADEMY<br><span style="color:#91a0b7;">PAYMENT REVIEW</span></td></tr></table></td></tr>
<tr><td style="padding:32px 34px 12px;"><div style="font-size:12px;font-weight:700;letter-spacing:1.5px;color:#487ef7;">NEW PAYMENT SUBMISSION</div><h1 style="margin:10px 0 8px;font-size:26px;line-height:1.25;color:#142238;">Transfer reference received</h1><p style="margin:0;color:#5d6b80;font-size:15px;line-height:1.7;">A student submitted payment details. The transfer is <strong style="color:#b87412;">pending manual verification</strong>.</p></td></tr>
<tr><td style="padding:14px 34px 24px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fb;border:1px solid #e2e9f3;border-radius:12px;"><tr><td style="padding:17px 20px;"><div style="font-size:11px;color:#68778d;text-transform:uppercase;letter-spacing:1px;">Registration number</div><div style="margin-top:5px;font-size:24px;font-weight:700;color:#142238;">${seat}</div></td><td align="right" style="padding:17px 20px;"><div style="font-size:11px;color:#68778d;text-transform:uppercase;letter-spacing:1px;">Amount due</div><div style="margin-top:5px;font-size:24px;font-weight:700;color:#142238;">${payableJod} <span style="font-size:14px;">JOD</span></div></td></tr></table></td></tr>
<tr><td style="padding:0 34px 24px;"><h2 style="margin:0 0 11px;font-size:16px;color:#18263c;">Payment summary</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e4eaf2;border-radius:10px;overflow:hidden;">${emailField("Course",course.name)}${emailField("Status","Pending review")}${emailField("Payment method",methodName)}${emailField("Transfer reference",reference)}${emailField("List price",`${priceJod} JOD`)}${emailField("Discount",`${registration.discount_percent || 0}% · ${discountJod} JOD · ${registration.coupon_code || "No coupon"}`)}${emailField("Affiliate",registration.affiliate_name || "—")}${emailField("Commission",`${registration.commission_percent || 0}% · ${money(registration.commission_jod ?? 0)} JOD · ${registration.commission_status}`)}</table></td></tr>
<tr><td style="padding:0 34px 24px;"><h2 style="margin:0 0 11px;font-size:16px;color:#18263c;">Student details</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e4eaf2;border-radius:10px;overflow:hidden;">${emailField("Full name",registration.full_name)}${emailField("Email",registration.email)}${emailField("Phone",registration.phone)}${emailField("Location",registration.location)}${emailField("Experience",registration.experience)}${emailField("Preferred language",registration.preferred_language)}${emailField("Course goal",registration.goal || "—")}${emailField("Previous-course email",registration.previous_course_email || "—")}${emailField("Submitted",new Date(registration.created_at).toLocaleString("en-US",{timeZone:"Asia/Amman",dateStyle:"medium",timeStyle:"short"}))}</table></td></tr>
<tr><td style="padding:0 34px 28px;"><div style="padding:15px 17px;background:#fff8eb;border:1px solid #f2dfbc;border-radius:10px;color:#725323;font-size:13px;line-height:1.65;"><strong>Next step:</strong> Verify the transfer in the receiving account before approving the student. The receipt image is attached for manual review.${registration.previous_course_email ? ` Alumni email submitted for eligibility review: <strong>${emailEscape(registration.previous_course_email)}</strong>.` : ""}</div>${attachment ? `<p style="margin:16px 0 0;color:#596981;font-size:13px;">The completed ${seat - 19}–${seat} registration batch is attached as an Excel workbook.</p>` : ""}</td></tr>
<tr><td style="padding:19px 34px;background:#f5f7fa;border-top:1px solid #e4eaf2;color:#718096;font-size:11px;line-height:1.6;">7Z MAGIC · AI CINEMATIC FILMMAKING<br>This automated notification was sent to the academy team.</td></tr></table></body></html>`;
    let emailSent = true;
    try { await sendZohoMail({ subject, body: details, html, attachment, proofAttachment }); }
    catch (mailError) { console.error("Payment reference saved; Zoho email failed", mailError); emailSent = false; }
    return res.status(201).json({ ok: true, seat, capacity: CAPACITY, paymentStatus: "PENDING_REVIEW", emailSent, batchFileSent: Boolean(attachment) });
  } catch (error) {
    console.error("Course checkout failed", error);
    return res.status(503).json({ error: "Checkout is temporarily unavailable." });
  }
}
