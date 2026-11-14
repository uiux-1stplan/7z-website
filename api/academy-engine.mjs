/**
 * 7Z MAGIC ACADEMY — FULL-STACK ENGINE
 * Neon Postgres Database, Zoho SMTP Email Engine, 20-Milestone Excel Automation via ExcelJS
 */

import { neon } from "@neondatabase/serverless";
import ExcelJS from "exceljs";
import nodemailer from "nodemailer";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BRAND,
  buildAdminRegistrationAlertHtml,
  buildStudentConfirmationHtml,
  buildPaymentApprovedHtml,
  buildPaymentRejectedHtml,
  buildMilestoneReportHtml
} from "./_email-templates.mjs";

const isVercel = Boolean(process.env.VERCEL); const rootDir = isVercel ? "/tmp/7z-academy" : (process.env.VERCEL ? "/tmp/7z-academy" : resolve(fileURLToPath(new URL("..", import.meta.url))));
const dataDir = join(rootDir, "data");
const storageFile = join(dataDir, "academy-data.json");
const uploadReceiptsDir = join(rootDir, "media", "uploads", "receipts");

const ADMIN_EMAIL = BRAND.adminEmail; // creative@7z-magic.com
const REPORT_EMAIL = BRAND.reportEmail; // magic7z.ai@gmail.com

// Automatically load .env or .env.local if present in project root
try {
  const envPaths = [join(rootDir, ".env"), join(rootDir, ".env.local"), join(rootDir, ".env.production")];
  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, "utf8");
      content.split("\n").forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const idx = trimmed.indexOf("=");
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    }
  }
} catch (e) {
  // Silent env loader fallback
}

// Default Data Storage Fallback
function defaultData() {
  return {
    registrations: [],
    coupons: [
      { id: "c1", code: "7ZVIP", discountPercent: 20, courseScope: "all", status: "active", createdAt: new Date().toISOString() },
      { id: "c2", code: "MAGIC15", discountPercent: 15, courseScope: "all", status: "active", createdAt: new Date().toISOString() },
      { id: "c3", code: "DIRECT15", discountPercent: 15, courseScope: "all", status: "active", createdAt: new Date().toISOString() },
      { id: "c4", code: "HASSAN25", discountPercent: 25, courseScope: "all", status: "active", createdAt: new Date().toISOString() },
      { id: "c5", code: "SHAAS25", discountPercent: 25, courseScope: "all", status: "active", createdAt: new Date().toISOString() }
    ],
    affiliates: [
      { id: "a1", name: "Hasan Rayan", email: "hasan@7z-magic.com", code: "HASSAN25", discountPercent: 25, commissionPercent: 20, status: "active", createdAt: new Date().toISOString() },
      { id: "a2", name: "Shaas Matar", email: "shaas@7z-magic.com", code: "SHAAS25", discountPercent: 25, commissionPercent: 20, status: "active", createdAt: new Date().toISOString() }
    ],
    counter: 0
  };
}

function ensureLocalDirs() {
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(uploadReceiptsDir, { recursive: true });
  if (!existsSync(storageFile)) {
    writeFileSync(storageFile, JSON.stringify(defaultData(), null, 2), "utf8");
  }
}

export function readLocalData() {
  ensureLocalDirs();
  try {
    return JSON.parse(readFileSync(storageFile, "utf8"));
  } catch {
    return defaultData();
  }
}

export function saveLocalData(data) {
  ensureLocalDirs();
  writeFileSync(storageFile, JSON.stringify(data, null, 2), "utf8");
}

// Neon Postgres Connection Client
export function getSqlClient() {
  const conn = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!conn) return null;
  return neon(conn);
}

// Database Schema Initialization (Both academy_registrations and course_registrations tables)
export async function ensureDbSchema() {
  const sql = getSqlClient();
  if (!sql) return;

  try {
    // 1. Academy Registrations
    await sql`
      CREATE TABLE IF NOT EXISTS academy_registrations (
        id BIGSERIAL PRIMARY KEY,
        seat_number INTEGER NOT NULL,
        reference TEXT NOT NULL UNIQUE,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        city TEXT NOT NULL,
        experience TEXT NOT NULL,
        notes TEXT DEFAULT '',
        course_id TEXT NOT NULL,
        course_name TEXT NOT NULL,
        promo_code TEXT DEFAULT '',
        discount_percent INTEGER DEFAULT 0,
        discount_jod NUMERIC(10,3) DEFAULT 0,
        final_price NUMERIC(10,3) NOT NULL DEFAULT 250,
        payment_status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
        receipt_url TEXT DEFAULT '',
        receipt_name TEXT DEFAULT '',
        receipt_base64 TEXT DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    // 2. Legacy / Admin Shared course_registrations + Auto-Sync to Admin Dashboard
    await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS seat_number INTEGER;`;
    await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '';`;
    await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS experience TEXT DEFAULT '';`;
    await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'ar';`;
    await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS goal TEXT DEFAULT '';`;
    await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS previous_course_email TEXT DEFAULT '';`;
    await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS payment_submitted_at TIMESTAMPTZ DEFAULT NOW();`;
    await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS affiliate_name TEXT DEFAULT '';`;
    await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS commission_percent INTEGER DEFAULT 0;`;
    await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS commission_jod NUMERIC(12,3) DEFAULT 0;`;
    await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS commission_status TEXT DEFAULT 'NOT_APPLICABLE';`;
    await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'CliQ / Western Union';`;
    await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS receipt_url TEXT DEFAULT '';`;
    await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS receipt_name TEXT DEFAULT '';`;
    await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS receipt_base64 TEXT DEFAULT '';`;
    await sql`
      INSERT INTO course_registrations (
        seat_number, full_name, email, phone, location, experience, course_id,
        price_jod, discount_jod, coupon_code, payment_status, payment_reference,
        receipt_url, receipt_name, receipt_base64, created_at
      )
      SELECT
        ar.seat_number, ar.full_name, ar.email, ar.phone, ar.city, ar.experience,
        CASE WHEN ar.course_id LIKE '%engineer%' THEN 'ai-engineering' ELSE 'cinematic-film' END,
        ar.final_price, ar.discount_jod, ar.promo_code, ar.payment_status, ar.reference,
        ar.receipt_url, ar.receipt_name, ar.receipt_base64, ar.created_at
      FROM academy_registrations ar
      WHERE NOT EXISTS (
        SELECT 1 FROM course_registrations cr WHERE cr.payment_reference = ar.reference
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS course_registrations (
        id BIGSERIAL PRIMARY KEY,
        seat_number INTEGER,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        location TEXT,
        experience TEXT,
        preferred_language TEXT DEFAULT 'ar',
        goal TEXT,
        previous_course_email TEXT,
        course_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        payment_submitted_at TIMESTAMPTZ DEFAULT NOW(),
        payment_status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
        price_jod NUMERIC(10,3) NOT NULL DEFAULT 250,
        discount_jod NUMERIC(10,3) NOT NULL DEFAULT 0,
        coupon_code TEXT,
        affiliate_name TEXT,
        commission_percent NUMERIC(5,2) DEFAULT 0,
        commission_jod NUMERIC(10,3) DEFAULT 0,
        commission_status TEXT DEFAULT 'NOT_APPLICABLE',
        payment_provider TEXT DEFAULT 'manual',
        payment_reference TEXT,
        receipt_url TEXT,
        receipt_name TEXT,
        receipt_base64 TEXT
      );
    `;

    // 3. Coupons
    await sql`
      CREATE TABLE IF NOT EXISTS academy_coupons (
        id BIGSERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
        course_scope TEXT NOT NULL DEFAULT 'all',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    // 4. Affiliates
    await sql`
      CREATE TABLE IF NOT EXISTS academy_affiliates (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT DEFAULT '',
        code TEXT NOT NULL UNIQUE,
        discount_percent INTEGER NOT NULL DEFAULT 15,
        commission_percent INTEGER NOT NULL DEFAULT 20,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
  } catch (err) {
    console.warn("Neon DB schema initialization warning (will use local fallback):", err.message);
  }
}

// Mailer Setup (Zoho SMTP with SSL/TLS Fallback)
function getTransporter() {
  const host = (process.env.ZOHO_SMTP_HOST || process.env.SMTP_HOST || "smtp.zoho.com") || process.env.ZOHO_SMTP_HOST || "smtppro.zoho.com";
  const user = (process.env.ZOHO_SMTP_USER || process.env.SMTP_USER || "creative@7z-magic.com") || process.env.ZOHO_SMTP_USER || ADMIN_EMAIL;
  const pass = (process.env.ZOHO_SMTP_APP_PASSWORD || process.env.SMTP_PASS) || process.env.ZOHO_SMTP_PASS || process.env.ZOHO_SMTP_APP_PASSWORD;
  const port = Number((process.env.ZOHO_SMTP_PORT || process.env.SMTP_PORT || "465") || process.env.ZOHO_SMTP_PORT || 465);

  if (!pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false
    }
  });
}

// Send Email Helper
export async function sendEmail({ to, subject, html, attachments = [] }) {
  const transporter = getTransporter();
  const user = (process.env.ZOHO_SMTP_USER || process.env.SMTP_USER || "creative@7z-magic.com") || process.env.ZOHO_SMTP_USER || ADMIN_EMAIL;
  const from = `7Z MAGIC ACADEMY <${user}>`;

  if (!transporter) {
    console.log(`[SMTP SIMULATION] To: ${to} | Subject: "${subject}" | Attachments: ${attachments.length} (SMTP_PASS not provided)`);
    return { ok: true, simulated: true, to, subject };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      attachments
    });
    console.log(`[SMTP SUCCESS] Sent email to ${to}: ${info.messageId}`);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[SMTP ERROR] Failed to send email to ${to}:`, err.message);
    return { error: err.message };
  }
}

// 1. Send Admin Registration Alert
export async function sendAdminRegistrationAlert(reg) {
  const html = buildAdminRegistrationAlertHtml(reg);
  const attachments = [];

  if (reg.receiptBase64) {
    const base64Data = reg.receiptBase64.replace(/^data:[^;]+;base64,/, "");
    attachments.push({
      filename: reg.receiptName || "payment-receipt.jpg",
      content: Buffer.from(base64Data, "base64"),
      contentType: reg.receiptType || "image/jpeg"
    });
  }

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `[7Z ACADEMY] تسجيل جديد: ${reg.fullName} — ${reg.courseName} (${reg.reference || `7Z-REG-${reg.id}`})`,
    html,
    attachments
  });
}

// 2. Send Student Registration Confirmation (Immediate)
export async function sendStudentRegistrationConfirmation(reg) {
  const html = buildStudentConfirmationHtml(reg);
  return sendEmail({
    to: reg.email,
    subject: `تأكيد استلام طلب التسجيل | 7Z Magic Academy — ${reg.reference || ""}`,
    html
  });
}

// 3. Send Payment Approved Email (When Admin confirms payment)
export async function sendPaymentApprovedEmail(reg) {
  const html = buildPaymentApprovedHtml(reg);
  return sendEmail({
    to: reg.email,
    subject: `🎉 تهانينا! تم تأكيد وتفعيل تسجيلك رسمياً | 7Z Magic Academy`,
    html
  });
}

// 4. Send Payment Rejected Email (When Admin rejects payment)
export async function sendPaymentRejectedEmail(reg, reason = "") {
  const html = buildPaymentRejectedHtml(reg, reason);
  return sendEmail({
    to: reg.email,
    subject: `تحديث بشأن إيصال الدفع لطلب التسجيل | 7Z Magic Academy — ${reg.reference || ""}`,
    html
  });
}

// 5. Generate Styled Excel Report using ExcelJS
export async function generateStyledExcelReportBuffer(registrations, totalCount) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "7Z Magic Studios";
  workbook.lastModifiedBy = "7Z Academy Automation";
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet(`7Z Academy (${totalCount} Total)`, {
    views: [{ showGridLines: true }],
    properties: { defaultRowHeight: 22 }
  });

  // Title Banner
  worksheet.mergeCells("A1:J1");
  const banner = worksheet.getCell("A1");
  banner.value = `7Z MAGIC ACADEMY — MILESTONE REPORT (${totalCount} REGISTRATIONS)`;
  banner.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  banner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF08090C" } };
  banner.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(1).height = 38;

  // Header Row
  worksheet.columns = [
    { key: "seat", width: 10 },
    { key: "ref", width: 18 },
    { key: "name", width: 28 },
    { key: "email", width: 32 },
    { key: "phone", width: 20 },
    { key: "course", width: 34 },
    { key: "amount", width: 16 },
    { key: "code", width: 18 },
    { key: "status", width: 18 },
    { key: "date", width: 20 }
  ];

  const headers = [
    "Seat #",
    "Reference",
    "Student Full Name",
    "Email Address",
    "Phone / WhatsApp",
    "Enrolled Course",
    "Amount (JOD)",
    "Promo Code",
    "Payment Status",
    "Submitted Date"
  ];

  const headerRow = worksheet.getRow(2);
  headerRow.values = headers;
  headerRow.height = 28;
  headerRow.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } }; // Deep Navy
  headerRow.alignment = { horizontal: "center", vertical: "middle" };

  // Data Rows
  registrations.forEach((r, idx) => {
    const row = worksheet.addRow([
      r.seatNumber || r.seat_number || idx + 1,
      r.reference || `7Z-REG-${r.id}`,
      r.fullName || r.full_name || "—",
      r.email || "—",
      r.phone || "—",
      r.courseName || r.course_id || "7Z Course",
      Number(r.finalPrice || r.price_jod || 250),
      r.promoCode || r.coupon_code || "NONE",
      r.paymentStatus || r.payment_status || "PENDING_REVIEW",
      (r.submittedAt || r.created_at) ? new Date(r.submittedAt || r.created_at).toISOString().split("T")[0] : "—"
    ]);

    row.height = 22;
    const isEven = idx % 2 === 0;
    row.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: isEven ? "FFF8FAFC" : "FFFFFFFF" }
    };
    row.font = { name: "Arial", size: 10 };
    row.alignment = { vertical: "middle" };

    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(7).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(9).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(10).alignment = { horizontal: "center", vertical: "middle" };

    // Format currency
    row.getCell(7).numFmt = "#,##0.00 JOD";
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

// 6. Trigger 20-Registrations Excel Report (To: magic7z.ai@gmail.com)
export async function trigger20RegistrationExcelReport(allRegistrations, totalCount) {
  try {
    const latest20 = allRegistrations.slice(-20);
    const excelBuffer = await generateStyledExcelReportBuffer(latest20, totalCount);
    const filename = `7Z-Academy-Report-Registrations-${totalCount}.xlsx`;

    const totalRevenue = latest20
      .filter((r) => ["PAID", "APPROVED", "VERIFIED"].includes(r.paymentStatus || r.payment_status))
      .reduce((sum, r) => sum + Number(r.finalPrice || r.price_jod || 0), 0);

    const html = buildMilestoneReportHtml(totalCount, latest20.length, {
      revenueJod: totalRevenue.toFixed(2)
    });

    await sendEmail({
      to: REPORT_EMAIL,
      subject: `📊 [تقرير إحصائي آلي] وصول التسجيلات إلى ${totalCount} طالباً — 7Z Magic Academy`,
      html,
      attachments: [
        {
          filename,
          content: excelBuffer,
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
      ]
    });

    console.log(`[EXCEL 20 TRIGGER] Successfully sent 20-milestone report for count ${totalCount} to ${REPORT_EMAIL}`);
  } catch (err) {
    console.error("[EXCEL 20 TRIGGER ERROR]", err);
  }
}



