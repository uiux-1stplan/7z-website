/**
 * 7Z MAGIC ACADEMY — FULL-STACK ENGINE
 * Neon Postgres Database, Zoho SMTP Email Templates, 20-Registration Excel Automation, Admin Actions
 */

import { neon } from "@neondatabase/serverless";
import * as XLSX from "xlsx";
import nodemailer from "nodemailer";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dataDir = join(rootDir, "data");
const storageFile = join(dataDir, "academy-data.json");
const uploadReceiptsDir = join(rootDir, "media", "uploads", "receipts");

const ADMIN_EMAIL = "creative@7z-magic.com";
const REPORT_EMAIL = "magic7z.ai@gmail.com";

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

// Database Schema Initialization
export async function ensureDbSchema() {
  const sql = getSqlClient();
  if (!sql) return;

  try {
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

    // Seed default coupons if empty
    const [couponCount] = await sql`SELECT count(*)::int as count FROM academy_coupons`;
    if (couponCount && couponCount.count === 0) {
      await sql`
        INSERT INTO academy_coupons (code, discount_percent, course_scope) VALUES
        ('7ZVIP', 20, 'all'),
        ('MAGIC15', 15, 'all'),
        ('DIRECT15', 15, 'all'),
        ('HASSAN25', 25, 'all'),
        ('SHAAS25', 25, 'all')
        ON CONFLICT (code) DO NOTHING;
      `;
    }

    // Seed default affiliates if empty
    const [affCount] = await sql`SELECT count(*)::int as count FROM academy_affiliates`;
    if (affCount && affCount.count === 0) {
      await sql`
        INSERT INTO academy_affiliates (name, email, code, discount_percent, commission_percent) VALUES
        ('Hasan Rayan', 'hasan@7z-magic.com', 'HASSAN25', 25, 20),
        ('Shaas Matar', 'shaas@7z-magic.com', 'SHAAS25', 25, 20)
        ON CONFLICT (code) DO NOTHING;
      `;
    }
  } catch (err) {
    console.warn("Neon DB schema initialization warning (will use local fallback):", err.message);
  }
}

// Mailer Setup (Zoho SMTP)
function getTransporter() {
  const host = process.env.ZOHO_SMTP_HOST || "smtp.zoho.com";
  const user = process.env.ZOHO_SMTP_USER || ADMIN_EMAIL;
  const pass = process.env.ZOHO_SMTP_APP_PASSWORD;

  if (!pass) {
    // Return null if credentials are not configured in local environment
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: 465,
    secure: true,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });
}

// Send Email Helper
export async function sendEmail({ to, subject, html, attachments = [] }) {
  const transporter = getTransporter();
  const from = `7Z MAGIC ACADEMY <${process.env.ZOHO_SMTP_USER || ADMIN_EMAIL}>`;

  if (!transporter) {
    console.log(`[SMTP DEV LOG] Email to: ${to} | Subject: "${subject}" | (SMTP not configured locally, message saved/logged)`);
    return { dev: true };
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

// HTML Email Layout Wrapper
function wrapEmailHtml({ title, preheader, contentHtml }) {
  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #06070d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Cairo', Helvetica, Arial, sans-serif; color: #f8fafc; }
    .email-wrap { width: 100%; max-width: 600px; margin: 0 auto; background-color: #0c101d; border: 1px solid #1e3a8a; border-radius: 16px; overflow: hidden; }
    .email-head { background: linear-gradient(135deg, #0d172e, #06070d); padding: 32px 24px; text-align: center; border-bottom: 1px solid rgba(56, 189, 248, 0.2); }
    .email-logo { height: 48px; width: auto; margin-bottom: 12px; }
    .email-badge { display: inline-block; padding: 4px 12px; border-radius: 999px; background: rgba(37, 99, 235, 0.2); border: 1px solid #38bdf8; color: #38bdf8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
    .email-body { padding: 32px 28px; line-height: 1.7; font-size: 15px; color: #cbd5e1; }
    .email-body h1, .email-body h2 { color: #ffffff; margin-top: 0; }
    .card-box { background: rgba(30, 58, 138, 0.15); border: 1px solid rgba(37, 99, 235, 0.3); border-radius: 12px; padding: 18px 20px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.08); font-size: 14px; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #94a3b8; }
    .detail-val { color: #f8fafc; font-weight: 600; }
    .status-pill { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; }
    .status-review { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid #f59e0b; }
    .status-approved { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #10b981; }
    .status-rejected { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #ef4444; }
    .email-foot { background-color: #06070d; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255, 255, 255, 0.08); }
    .email-foot a { color: #38bdf8; text-decoration: none; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader}
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 24px 10px;">
    <tr>
      <td align="center">
        <div class="email-wrap">
          <div class="email-head">
            <img src="https://7z-magic.com/assets/brand/7Z-LogoT(3).png" alt="7Z Magic" class="email-logo">
            <br>
            <span class="email-badge">7Z MAGIC ACADEMY</span>
          </div>
          <div class="email-body">
            ${contentHtml}
          </div>
          <div class="email-foot">
            <p>7Z MAGIC STUDIOS · Amman, Jordan</p>
            <p><a href="mailto:creative@7z-magic.com">creative@7z-magic.com</a> · <a href="https://7z-magic.com/academy/">7z-magic.com/academy</a></p>
            <p>&copy; 2026 7Z Magic. All rights reserved.</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// 1. Send Admin Alert Email
export async function sendAdminRegistrationAlert(reg) {
  const contentHtml = `
    <h2>إشعار تسجيل جديد وحجز مقعد 🎓</h2>
    <p>تم استلام طلب تسجيل جديد من قبل طالب في الأكاديمية مع إرفاق إيصال الدفع:</p>
    
    <div class="card-box">
      <div class="detail-row"><span class="detail-label">رقم الحجز المرجعي:</span><span class="detail-val">${reg.reference}</span></div>
      <div class="detail-row"><span class="detail-label">اسم الطالب:</span><span class="detail-val">${reg.fullName}</span></div>
      <div class="detail-row"><span class="detail-label">البريد الإلكتروني:</span><span class="detail-val">${reg.email}</span></div>
      <div class="detail-row"><span class="detail-label">رقم الهاتف / واتساب:</span><span class="detail-val" dir="ltr">${reg.phone}</span></div>
      <div class="detail-row"><span class="detail-label">البلد والمدينة:</span><span class="detail-val">${reg.city}</span></div>
      <div class="detail-row"><span class="detail-label">الدورة المختارة:</span><span class="detail-val">${reg.courseName}</span></div>
      <div class="detail-row"><span class="detail-label">مستوى الخبرة:</span><span class="detail-val">${reg.experience}</span></div>
      ${reg.promoCode ? `<div class="detail-row"><span class="detail-label">كود الخصم/المسوق:</span><span class="detail-val">${reg.promoCode} (-${reg.discountPercent}%)</span></div>` : ""}
      <div class="detail-row"><span class="detail-label">المبلغ الصافي:</span><span class="detail-val" style="color:#38bdf8;">${reg.finalPrice} JOD</span></div>
      <div class="detail-row"><span class="detail-label">حالة الدفع:</span><span class="status-pill status-review">قيد المراجعة والتحقق</span></div>
    </div>

    ${reg.notes ? `<p><strong>ملاحظات الطالب:</strong> ${reg.notes}</p>` : ""}

    <p style="margin-top:20px;">
      📎 <strong>إيصال التحويل المرفق:</strong> مرفق مع هذه الرسالة. يمكنك أيضاً مراجعته وتأكيد الدفع أو رفضه مباشرة من لوحة الآدمن:
      <br><br>
      <a href="https://7z-magic.com/admin/" style="display:inline-block;padding:10px 20px;border-radius:8px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;">فتح لوحة تحكم 7Z الآدمن ←</a>
    </p>
  `;

  const html = wrapEmailHtml({
    title: `طلب تسجيل جديد: ${reg.fullName} - ${reg.courseName}`,
    preheader: `تم استلام تسجيل جديد بقيمة ${reg.finalPrice} JOD من ${reg.fullName}`,
    contentHtml
  });

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
    subject: `[7Z Academy] طلب تسجيل جديد: ${reg.fullName} (${reg.courseName})`,
    html,
    attachments
  });
}

// 2. Send Student Confirmation Email
export async function sendStudentRegistrationConfirmation(reg) {
  const contentHtml = `
    <h2>أهلاً بك في أكاديمية 7Z MAGIC ✨</h2>
    <p>مرحباً <strong>${reg.fullName}</strong>،</p>
    <p>تم استلام طلب تسجيلك وإيصال التحويل المالي بنجاح في دورة: <br><strong style="color:#38bdf8;font-size:16px;">${reg.courseName}</strong></p>
    
    <div class="card-box">
      <div class="detail-row"><span class="detail-label">رقم الحجز المرجعي:</span><span class="detail-val">${reg.reference}</span></div>
      <div class="detail-row"><span class="detail-label">المبلغ المحول:</span><span class="detail-val">${reg.finalPrice} د.أ</span></div>
      <div class="detail-row"><span class="detail-label">حالة المقعد:</span><span class="status-pill status-review">قيد مراجعة الإيصال</span></div>
    </div>

    <div style="background:rgba(37,99,235,0.18);border:1px solid #38bdf8;border-radius:10px;padding:16px;margin:22px 0;">
      <h3 style="color:#38bdf8;margin:0 0 8px 0;font-size:15px;">⚡ ملاحظة هامة جداً بشأن التفعيل:</h3>
      <p style="margin:0;font-size:14px;color:#f8fafc;font-weight:600;">
        تفعيل مقعدك الرسمي في الدورة وتزويدك ببيانات الوصول ومواد التدريب سيتم فور قيام فريق الإدارة بمراجعة وتأكيد إيصال الدفع المرفق في طلبك.
      </p>
    </div>

    <p>في حال كان لديك أي استفسار، يسعدنا تواصلك معنا دائماً عبر البريد <a href="mailto:creative@7z-magic.com">creative@7z-magic.com</a> أو عبر الواتساب على الرقم <strong>+962 79 702 0089</strong>.</p>
  `;

  const html = wrapEmailHtml({
    title: "تأكيد استلام طلب التسجيل | 7Z MAGIC ACADEMY",
    preheader: `تم استلام طلب تسجيلك بنجاح - رقم الحجز ${reg.reference}`,
    contentHtml
  });

  return sendEmail({
    to: reg.email,
    subject: `تأكيد استلام طلب التسجيل في أكاديمية 7Z MAGIC (${reg.reference})`,
    html
  });
}

// 3. Send Payment Approved Email
export async function sendPaymentApprovedEmail(reg) {
  const contentHtml = `
    <h2 style="color:#34d399;">تم تأكيد دفعك وتفعيل مقعدك التدريبي رسمياً! 🎉</h2>
    <p>عزيزنا <strong>${reg.fullName}</strong>،</p>
    <p>يسرنا إبلاغك بأن فريق الإدارة قد قام بمراجعة وتأكيد إيصال الدفع بنجاح. مقعدك الآن مؤكد ومفعل بالكامل في دورة:</p>
    
    <div class="card-box">
      <div class="detail-row"><span class="detail-label">الدورة:</span><span class="detail-val" style="color:#38bdf8;">${reg.courseName}</span></div>
      <div class="detail-row"><span class="detail-label">رقم المقعد الرسمي:</span><span class="detail-val">#${reg.seatNumber}</span></div>
      <div class="detail-row"><span class="detail-label">رقم الحجز:</span><span class="detail-val">${reg.reference}</span></div>
      <div class="detail-row"><span class="detail-label">حالة المقعد:</span><span class="status-pill status-approved">مؤكد ومفعل ✓</span></div>
    </div>

    <p>سيتم تزويدك بروابط الوصول إلى بيئة الدورة والمشروع التطبيقي واللقاءات التوجيهية في بريد قادم قبل موعد الانطلاق.</p>
    <p>نتمنى لك رحلة ملهمة تصنع خلالها ما تتخيله بأعلى معايير الإبداع والاحتراف!</p>
  `;

  const html = wrapEmailHtml({
    title: "تم تأكيد الدفع وتفعيل المقعد | 7Z MAGIC ACADEMY",
    preheader: `تهانينا! مقعدك في ${reg.courseName} مفعل رسمياً`,
    contentHtml
  });

  return sendEmail({
    to: reg.email,
    subject: `تم تأكيد مقعدك رسمياً في ${reg.courseName} | 7Z MAGIC ACADEMY`,
    html
  });
}

// 4. Send Payment Rejected Email
export async function sendPaymentRejectedEmail(reg, reason = "") {
  const contentHtml = `
    <h2 style="color:#f87171;">إشعار بشأن التحقق من إيصال الدفع</h2>
    <p>مرحباً <strong>${reg.fullName}</strong>،</p>
    <p>نود إعلامك بأنه تعذر التحقق من نجاح عملية التحويل المالي الخاصة بطلبك رقم (<strong>${reg.reference}</strong>) في دورة <strong>${reg.courseName}</strong>.</p>
    
    <div class="card-box" style="border-color:#ef4444;">
      <div class="detail-row"><span class="detail-label">حالة الطلب:</span><span class="status-pill status-rejected">لم يكتمل التحقق</span></div>
      ${reason ? `<div class="detail-row"><span class="detail-label">السبب:</span><span class="detail-val">${reason}</span></div>` : ""}
    </div>

    <p>يرجى إعادة التأكد من العملية البنكية أو تزويدنا بإيصال تحويل واضح عبر الرد المباشر على هذا البريد الإلكتروني أو التواصل مع الدعم عبر الواتساب على الرقم:</p>
    <p style="text-align:center;margin:20px 0;"><a href="https://wa.me/962797020089" style="display:inline-block;padding:12px 24px;border-radius:8px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;">التواصل مع دعم 7Z عبر واتساب</a></p>
  `;

  const html = wrapEmailHtml({
    title: "تحديث بشأن إيصال الدفع | 7Z MAGIC ACADEMY",
    preheader: `إشعار بشأن التحقق من طلب التسجيل ${reg.reference}`,
    contentHtml
  });

  return sendEmail({
    to: reg.email,
    subject: `تحديث بشأن التحقق من إيصال الدفع (${reg.reference}) | 7Z MAGIC`,
    html
  });
}

// 5. Generate Styled 20-Registrations Excel Report & Email to magic7z.ai@gmail.com
export async function trigger20RegistrationExcelReport(allRegistrations, totalCount) {
  try {
    const latest20 = allRegistrations.slice(-20);
    
    const rows = latest20.map((r, idx) => ({
      "م": idx + 1,
      "رقم المقعد": r.seatNumber || idx + 1,
      "رقم المرجع": r.reference,
      "اسم الطالب": r.fullName,
      "البريد الإلكتروني": r.email,
      "رقم الهاتف": r.phone,
      "المدينة / الدولة": r.city,
      "الدورة التدريبية": r.courseName,
      "السعر الأساسي": 250,
      "كود الخصم": r.promoCode || "—",
      "قيمة الخصم": r.discountJod || 0,
      "الصافي المدفوع": r.finalPrice,
      "حالة الدفع": r.paymentStatus,
      "تاريخ التسجيل": new Date(r.createdAt || r.submittedAt).toLocaleString("ar-JO")
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    
    // Auto column widths
    const colWidths = [
      { wch: 4 }, { wch: 10 }, { wch: 16 }, { wch: 25 }, { wch: 26 }, { wch: 18 },
      { wch: 20 }, { wch: 35 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 22 }
    ];
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "آخر 20 تسجيل");

    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const filename = `7Z-Academy-Report-Registrations-${totalCount}.xlsx`;

    const contentHtml = `
      <h2>التقرير الإحصائي الآلي للتسجيلات (إنجاز ${totalCount} تسجيل) 📊</h2>
      <p>وصل إجمالي طلبات التسجيل في أكاديمية 7Z MAGIC إلى <strong>${totalCount}</strong> طالباً.</p>
      <p>مرفق مع هذه الرسالة ملف <strong>Excel (.xlsx)</strong> منسق يتضمن بيانات آخر 20 طالباً مسجلاً ومبالغهم وحالات الدفع والأكواد المستخدمة.</p>
      
      <div class="card-box">
        <div class="detail-row"><span class="detail-label">إجمالي التسجيلات الكلي:</span><span class="detail-val">${totalCount}</span></div>
        <div class="detail-row"><span class="detail-label">حجم الدفعة:</span><span class="detail-val">آخر 20 تسجيلاً</span></div>
        <div class="detail-row"><span class="detail-label">الملف المرفق:</span><span class="detail-val" style="color:#38bdf8;">${filename}</span></div>
      </div>
    `;

    const html = wrapEmailHtml({
      title: `تقرير إكسل الأكاديمية: إنجاز ${totalCount} تسجيل`,
      preheader: `تقرير Excel التلقائي لآخر 20 تسجيلاً في أكاديمية 7Z Magic`,
      contentHtml
    });

    await sendEmail({
      to: REPORT_EMAIL,
      subject: `[7Z Academy Auto-Report] تقرير إكسل لآخر 20 تسجيلاً (الإجمالي: ${totalCount})`,
      html,
      attachments: [
        {
          filename,
          content: excelBuffer,
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
      ]
    });

    console.log(`[EXCEL 20 TRIGGER] Successfully sent 20-registrations report for count ${totalCount} to ${REPORT_EMAIL}`);
  } catch (err) {
    console.error("[EXCEL 20 TRIGGER ERROR]", err);
  }
}
