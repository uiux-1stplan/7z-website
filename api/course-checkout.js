import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import { get, issueSignedToken, presignUrl } from "@vercel/blob";
import { prepare, sqlClient, sendZohoMail, workbook } from "./course-registration.js";

const CAPACITY = 60;
const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const PROOF_TYPES = Object.freeze({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" });
const ALLOWED_ORIGINS = new Set(["https://7z-magic.com", "https://www.7z-magic.com"]);
const COUPONS = Object.freeze({
  HASSAN10: { discountPercent: 10, affiliateName: "حسن ريان", commissionPercent: 25 },
  SHAS10: { discountPercent: 10, affiliateName: "شأس مطر", commissionPercent: 25 },
  ABDULRAHMAN10: { discountPercent: 10, affiliateName: "عبدالرحمن محمد", commissionPercent: 25 },
  "7Z10": { discountPercent: 10, affiliateName: "", commissionPercent: 0 },
  ALUMNI15: { discountPercent: 15, affiliateName: "", commissionPercent: 0, requiresPreviousEmail: true },
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
    const sql = sqlClient();
    await prepare(sql);
    const methods = getPaymentMethods();
    const priceJod = Number(process.env.COURSE_PRICE_JOD);
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
        if (couponCode && !COUPONS[couponCode]) return res.status(400).json({ error: "This discount code is invalid." });
        const coupon = couponCode ? COUPONS[couponCode] : null;
        const previousCourseEmail = String(body.previousCourseEmail ?? "").trim().toLowerCase();
        if (coupon?.requiresPreviousEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(previousCourseEmail)) return res.status(400).json({ error: "Enter the email used for your previous course.", code: "PREVIOUS_COURSE_EMAIL_REQUIRED" });
        const discountJod = coupon ? money(priceJod * coupon.discountPercent / 100) : 0;
        const commissionJod = coupon?.commissionPercent ? money((priceJod - discountJod) * coupon.commissionPercent / 100) : 0;
        await sql`UPDATE course_checkout_intents SET coupon_code=${couponCode},discount_percent=${coupon?.discountPercent ?? 0},discount_jod=${discountJod},affiliate_name=${coupon?.affiliateName ?? ""},commission_percent=${coupon?.commissionPercent ?? 0},commission_jod=${commissionJod},commission_status=${coupon?.commissionPercent ? "PENDING_PAYMENT_REVIEW" : "NOT_APPLICABLE"},previous_course_email=${coupon?.requiresPreviousEmail ? previousCourseEmail : ""} WHERE token_hash=${tokenHash} AND status='PENDING' AND expires_at > NOW()`;
      }
      const current = (await sql`SELECT coupon_code,discount_percent,discount_jod,affiliate_name,commission_percent,commission_jod,commission_status,previous_course_email FROM course_checkout_intents WHERE token_hash=${tokenHash}`)[0];
      const discountJod = money(current?.discount_jod ?? 0);
      return res.status(200).json({ ok: true, priceJod, originalPriceJod: priceJod, discountJod, totalJod: money(priceJod - discountJod), couponCode: current?.coupon_code ?? "", discountPercent: Number(current?.discount_percent ?? 0), previousCourseEmail: current?.previous_course_email ?? "", requiresPreviousCourseEmail: Boolean(COUPONS[current?.coupon_code]?.requiresPreviousEmail), currency: "JOD", methods, expiresAt: new Date(intent.expires_at).toISOString() });
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
    const records = await sql`SELECT seat_number,full_name,email,phone,location,experience,preferred_language,goal,previous_course_email,created_at,payment_provider,payment_reference,payment_proof_pathname,payment_proof_content_type,payment_status,coupon_code,discount_percent,discount_jod,affiliate_name,commission_percent,commission_jod,commission_status FROM course_registrations WHERE seat_number=${seat}`;
    const registration = records[0];
    if (!registration) throw new Error("Created registration could not be loaded.");
    let attachment;
    if (seat % 20 === 0) {
      const start = seat - 19;
      const rows = await sql`SELECT seat_number,full_name,email,phone,location,experience,preferred_language,goal,previous_course_email,created_at,payment_status,payment_provider,payment_reference,coupon_code,discount_percent,discount_jod,affiliate_name,commission_percent,commission_jod,commission_status FROM course_registrations WHERE seat_number BETWEEN ${start} AND ${seat} ORDER BY seat_number`;
      if (rows.length === 20) attachment = { name: `7Z-Course-Registrations-${start}-${seat}.xlsx`, bytes: workbook(rows, start, seat) };
    }
    proofAttachment.name = `payment-proof-seat-${seat}.${PROOF_TYPES[registration.payment_proof_content_type]}`;
    const methodName = methods.find((method) => method.id === provider)?.name ?? provider;
    const subject = attachment ? `Course registrations ${seat - 19}-${seat}/60 · payment pending review` : `Course payment reference · seat ${seat}/60 · ${registration.full_name}`;
    const discountJod = money(registration.discount_jod ?? 0);
    const payableJod = money(priceJod - discountJod);
    const details = `Payment status: PENDING REVIEW — transfer reference received, not yet verified\nSeat: ${seat}/${CAPACITY}\nList price: ${priceJod} JOD\nDiscount code: ${registration.coupon_code || "—"}\nDiscount: ${registration.discount_percent || 0}% (${discountJod} JOD)\nAmount due: ${payableJod} JOD\nAffiliate: ${registration.affiliate_name || "—"}\nCommission: ${registration.commission_percent || 0}% (${money(registration.commission_jod ?? 0)} JOD) — ${registration.commission_status}\nPrevious-course email for alumni eligibility review: ${registration.previous_course_email || "—"}\nPayment method: ${methodName}\nTransfer reference: ${reference}\nReceipt image: attached for manual review\nName: ${registration.full_name}\nEmail: ${registration.email}\nPhone: ${registration.phone}\nLocation: ${registration.location}\nExperience: ${registration.experience}\nPreferred language: ${registration.preferred_language}\nGoal: ${registration.goal || "—"}\nSubmitted: ${new Date(registration.created_at).toISOString()}${attachment ? `\n\nThe completed ${seat - 19}-${seat} registration batch is attached as an Excel workbook.` : ""}`;
    let emailSent = true;
    try { await sendZohoMail({ subject, body: details, attachment, proofAttachment }); }
    catch (mailError) { console.error("Payment reference saved; Zoho email failed", mailError); emailSent = false; }
    return res.status(201).json({ ok: true, seat, capacity: CAPACITY, paymentStatus: "PENDING_REVIEW", emailSent, batchFileSent: Boolean(attachment) });
  } catch (error) {
    console.error("Course checkout failed", error);
    return res.status(503).json({ error: "Checkout is temporarily unavailable." });
  }
}
