/**
 * 7Z MAGIC ACADEMY — CINEMATIC BRANDED HTML EMAIL ENGINE
 * Obsidian/Navy Theme (#08090c, #11141c, Cyan/Gold accents)
 * Full RTL Arabic & LTR English Support
 * Compatible with Gmail, Outlook, Apple Mail & Mobile
 */

export const BRAND = {
  name: "7Z MAGIC ACADEMY",
  studio: "7Z MAGIC STUDIOS",
  logoUrl: "https://7z-magic.com/assets/brand/7Z-LogoT(3).png",
  logoFallback: "https://7z-magic.com/assets/images/logo-white.png",
  siteUrl: "https://7z-magic.com/courses/",
  adminEmail: "creative@7z-magic.com",
  reportEmail: "magic7z.ai@gmail.com",
  phone: "+962 79 702 0089",
  whatsappUrl: "https://wa.me/962797020089"
};

/**
 * Base Shell Wrapper for all 7Z Branded Emails
 */
export function wrapCinematicEmail({
  title,
  preheader = "7Z Magic Studios — The Future of Cinematic & Engineering AI",
  bodyHtml,
  isRtl = true
}) {
  const dir = isRtl ? "rtl" : "ltr";
  const align = isRtl ? "right" : "left";
  const fontFamily = isRtl
    ? "'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif"
    : "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  return `<!DOCTYPE html>
<html lang="${isRtl ? "ar" : "en"}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${title}</title>
  <style>
    :root { color-scheme: dark; }
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #08090c; color: #e2e8f0; font-family: ${fontFamily}; }
    .email-container { max-width: 600px; margin: 0 auto; background: #0c0e14; border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.8); }
    .email-header { background: linear-gradient(180deg, #11141c 0%, #0c0e14 100%); padding: 36px 30px 24px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .email-body { padding: 36px 32px; direction: ${dir}; text-align: ${align}; }
    .email-card { background: #131722; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 22px; margin: 24px 0; }
    .email-badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
    .badge-cyan { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.35); }
    .badge-green { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.35); }
    .badge-amber { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.35); }
    .info-row { display: table; width: 100%; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13.5px; }
    .info-label { display: table-cell; color: #94a3b8; font-weight: 600; width: 40%; text-align: ${align}; }
    .info-val { display: table-cell; color: #f8fafc; font-weight: 700; text-align: ${isRtl ? "left" : "right"}; }
    .cta-btn { display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; text-align: center; border: 1px solid rgba(255,255,255,0.2); }
    .email-footer { background: #08090c; padding: 28px 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06); font-size: 12px; color: #64748b; }
    .email-footer a { color: #38bdf8; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; border-radius: 0 !important; }
      .email-body { padding: 24px 18px !important; }
      .email-header { padding: 24px 18px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 10px; background-color: #08090c;">
  <!-- Preheader preview text (hidden) -->
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0; font-size: 1px; line-height: 1px; color: #fff;">
    ${preheader}
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; background-color: #0c0e14; border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 16px;">
          <!-- Header with Logo -->
          <tr>
            <td class="email-header" align="center" style="padding: 34px 24px 24px; border-bottom: 1px solid rgba(255,255,255,0.08); background-color: #11141c;">
              <a href="${BRAND.siteUrl}" target="_blank" style="text-decoration: none; display: inline-block;">
                <img src="${BRAND.logoUrl}" alt="${BRAND.name}" width="150" height="44" style="display: block; border: 0; max-width: 150px; height: auto;" />
              </a>
              <div style="margin-top: 10px; font-size: 11px; letter-spacing: 2.5px; color: #38bdf8; text-transform: uppercase; font-weight: 700;">
                ACADEMY & MASTERCLASSES
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="email-body" style="padding: 34px 30px; font-size: 14.5px; line-height: 1.7; color: #cbd5e1; direction: ${dir}; text-align: ${align};">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="email-footer" align="center" style="padding: 26px 20px; border-top: 1px solid rgba(255,255,255,0.06); background-color: #08090c; color: #64748b; font-size: 12px; line-height: 1.6;">
              <p style="margin: 0 0 6px; font-weight: 600; color: #94a3b8;">${BRAND.studio} · Amman, Jordan</p>
              <p style="margin: 0 0 10px;">
                <a href="mailto:${BRAND.adminEmail}" style="color: #38bdf8; text-decoration: none;">${BRAND.adminEmail}</a> · 
                <a href="${BRAND.whatsappUrl}" target="_blank" style="color: #38bdf8; text-decoration: none;">واتساب: ${BRAND.phone}</a> · 
                <a href="${BRAND.siteUrl}" target="_blank" style="color: #38bdf8; text-decoration: none;">7z-magic.com/academy</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                &copy; 2026 ${BRAND.name}. جميع الحقوق محفوظة.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 1. Admin Alert: New Student Registration
 * Sent to creative@7z-magic.com immediately when a student signs up and submits a receipt.
 */
export function buildAdminRegistrationAlertHtml(record) {
  const receiptLink = record.receiptUrl
    ? `https://7z-magic.com${record.receiptUrl}`
    : record.paymentProofPathname
    ? `https://7z-magic.com${record.paymentProofPathname}`
    : "";

  const receiptHtml = receiptLink
    ? `<div style="margin-top: 12px; text-align: center;">
         <a href="${receiptLink}" target="_blank" style="display: inline-block; padding: 10px 20px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 6px; font-size: 13px; font-weight: bold; text-decoration: none;">
           📎 عرض / تحميل إيصال الدفع المرفق
         </a>
       </div>`
    : `<div style="color: #94a3b8; font-size: 12px; margin-top: 8px;">لم يُرفق إيصال رقمي مباشر.</div>`;

  const bodyHtml = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="email-badge badge-cyan">إشعار إداري جديد</span>
      <h1 style="color: #ffffff; font-size: 22px; margin: 12px 0 6px; font-weight: 700;">تسجيل جديد في الأكاديمية 🎓</h1>
      <p style="color: #94a3b8; font-size: 13.5px; margin: 0;">تم استلام طلب تسجيل جديد وإيصال دفع بانتظار المراجعة والاعتماد.</p>
    </div>

    <div class="email-card">
      <div style="font-size: 12px; color: #38bdf8; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">بيانات الطالب المسجل:</div>
      
      <div class="info-row">
        <div class="info-label">اسم الطالب:</div>
        <div class="info-val" style="color: #38bdf8;">${record.fullName || "—"}</div>
      </div>
      <div class="info-row">
        <div class="info-label">البريد الإلكتروني:</div>
        <div class="info-val"><a href="mailto:${record.email}" style="color: #f8fafc; text-decoration: none;">${record.email}</a></div>
      </div>
      <div class="info-row">
        <div class="info-label">رقم الهاتف / واتساب:</div>
        <div class="info-val" dir="ltr"><a href="https://wa.me/${String(record.phone || "").replace(/[^0-9]/g, "")}" style="color: #38bdf8; text-decoration: none;">${record.phone || "—"}</a></div>
      </div>
      <div class="info-row">
        <div class="info-label">المدينة / الدولة:</div>
        <div class="info-val">${record.city || record.location || "—"}</div>
      </div>
      <div class="info-row">
        <div class="info-label">المنتج / الدورة المختارة:</div>
        <div class="info-val" style="color: #fbbf24;">${record.courseName || record.courseId}</div>
      </div>
      <div class="info-row">
        <div class="info-label">رقم الحجز / المرجع:</div>
        <div class="info-val"><code style="background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; color: #38bdf8;">${record.reference || `7Z-REG-${record.id}`}</code></div>
      </div>
      <div class="info-row">
        <div class="info-label">وسيلة الدفع المختارة:</div>
        <div class="info-val">${record.paymentProvider || "CliQ / Western Union"}</div>
      </div>
      <div class="info-row">
        <div class="info-label">المبلغ المطلوب / المدفوع:</div>
        <div class="info-val" style="color: #10b981; font-size: 15px;">$${Number(record.finalPrice ?? record.price_usd ?? record.price_jod ?? 0).toFixed(2)} USD</div>
      </div>
      <div class="info-row">
        <div class="info-label">كود الخصم المستخدم:</div>
        <div class="info-val">${record.promoCode || record.coupon_code || "بدون كود خصم"}</div>
      </div>
      <div class="info-row" style="border-bottom: none;">
        <div class="info-label">حالة الدفع الحالية:</div>
        <div class="info-val"><span class="email-badge badge-amber">${record.paymentStatus || "PENDING_REVIEW"}</span></div>
      </div>

      ${receiptHtml}
    </div>

    <div style="text-align: center; margin: 30px 0 10px;">
      <a href="https://7z-magic.com/admin/" class="cta-btn" target="_blank">
        الانتقال إلى لوحة الآدمن للاعتماد أو الرفض ←
      </a>
    </div>
  `;

  return wrapCinematicEmail({
    title: `[7Z ACADEMY] تسجيل جديد: ${record.fullName} (${record.reference || record.id})`,
    preheader: `طلب تسجيل جديد من ${record.fullName} لدورة ${record.courseName}`,
    bodyHtml,
    isRtl: true
  });
}

/**
 * 2. Student Confirmation: Registration Received
 * Sent to student immediately upon completing the funnel.
 */
export function buildStudentConfirmationHtml(record) {
  const isEn = record.language === "en" || record.preferred_language === "en";

  if (isEn) {
    const bodyHtml = `
      <div style="text-align: center; margin-bottom: 24px;">
        <span class="email-badge badge-cyan">REGISTRATION RECEIVED</span>
        <h1 style="color: #ffffff; font-size: 24px; margin: 12px 0 6px; font-weight: 700;">Welcome to 7Z Magic Academy</h1>
        <p style="color: #94a3b8; font-size: 14px; margin: 0;">Dear <strong>${record.fullName}</strong>, we are thrilled to welcome you.</p>
      </div>

      <!-- Critical Confirmation Guarantee Box -->
      <div style="background: rgba(37, 99, 235, 0.12); border: 1.5px solid rgba(56, 189, 248, 0.4); border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
        <div style="font-size: 26px; margin-bottom: 8px;">⏳</div>
        <p style="color: #f8fafc; font-size: 15px; font-weight: 700; margin: 0 0 8px; line-height: 1.5;">
          Your registration request and payment receipt have been received successfully!
        </p>
        <p style="color: #94a3b8; font-size: 13.5px; margin: 0; line-height: 1.6;">
          Your seat will be activated and final acceptance confirmation sent immediately once our team reviews and verifies the attached payment proof.
        </p>
      </div>

      <div class="email-card">
        <div style="font-size: 12px; color: #38bdf8; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">Summary of Enrollment:</div>
        
        <div class="info-row">
          <div class="info-label">Reference ID:</div>
          <div class="info-val"><code style="color: #38bdf8;">${record.reference || `7Z-REG-${record.id}`}</code></div>
        </div>
        <div class="info-row">
          <div class="info-label">Selected Course:</div>
          <div class="info-val" style="color: #fbbf24;">${record.courseName || record.courseId}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Course Format:</div>
          <div class="info-val">Fully Recorded Online Course (Anytime Access)</div>
        </div>
        <div class="info-row">
          <div class="info-label">Access Type:</div>
          <div class="info-val">Continuous Access Anytime</div>
        </div>
        <div class="info-row" style="border-bottom: none;">
          <div class="info-label">Total Amount:</div>
          <div class="info-val" style="color: #10b981; font-size: 15px;">$${Number(record.finalPrice ?? record.price_usd ?? record.price_jod ?? 0).toFixed(2)} USD</div>
        </div>
      </div>

      <p style="font-size: 13.5px; color: #94a3b8; line-height: 1.6;">
        If you have any questions or require immediate support, reach out to us at 
        <a href="mailto:${BRAND.adminEmail}" style="color: #38bdf8;">${BRAND.adminEmail}</a> or on WhatsApp at 
        <a href="${BRAND.whatsappUrl}" target="_blank" style="color: #38bdf8;">${BRAND.phone}</a>.
      </p>
    `;

    return wrapCinematicEmail({
      title: `Registration Received | 7Z Magic Academy — ${record.reference}`,
      preheader: `Thank you for registering, ${record.fullName}. Your payment proof is under verification.`,
      bodyHtml,
      isRtl: false
    });
  }

  // Arabic default version
  const bodyHtml = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="email-badge badge-cyan">تم استلام طلب التسجيل بنجاح</span>
      <h1 style="color: #ffffff; font-size: 24px; margin: 12px 0 6px; font-weight: 700;">أهلاً بك في أكاديمية 7Z MAGIC</h1>
      <p style="color: #94a3b8; font-size: 14px; margin: 0;">عزيزنا <strong>${record.fullName}</strong>، سعداء جداً بانضمامك إلينا.</p>
    </div>

    <!-- الصندوق الإلزامي للنص المطلوب حرفياً -->
    <div style="background: rgba(37, 99, 235, 0.12); border: 1.5px solid rgba(56, 189, 248, 0.4); border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
      <div style="font-size: 26px; margin-bottom: 8px;">⏳</div>
      <p style="color: #f8fafc; font-size: 15.5px; font-weight: 700; margin: 0 0 8px; line-height: 1.6;">
        تم استلام طلب تسجيلك وإيصال الدفع بنجاح
      </p>
      <p style="color: #cbd5e1; font-size: 13.5px; margin: 0; line-height: 1.7;">
        سيتم تفعيل مقعدك وإرسال تأكيد القبول النهائي فور مراجعة والتحقق من إيصال الدفع المرفق من قبل فريقنا.
      </p>
    </div>

    <div class="email-card">
      <div style="font-size: 12px; color: #38bdf8; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">تفاصيل الحجز الخاص بك:</div>
      
      <div class="info-row">
        <div class="info-label">رقم الحجز / المرجع:</div>
        <div class="info-val"><code style="color: #38bdf8; background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px;">${record.reference || `7Z-REG-${record.id}`}</code></div>
      </div>
      <div class="info-row">
        <div class="info-label">الدورة التدريبية:</div>
        <div class="info-val" style="color: #fbbf24;">${record.courseName || record.courseId}</div>
      </div>
      <div class="info-row">
        <div class="info-label">طبيعة البرنامج:</div>
        <div class="info-val">دورة أونلاين مسجلة بالكامل (وصول في أي وقت)</div>
      </div>
      <div class="info-row">
        <div class="info-label">طبيعة الوصول:</div>
        <div class="info-val">مشاهدة ووصول مستمر في أي وقت</div>
      </div>
      <div class="info-row" style="border-bottom: none;">
        <div class="info-label">المبلغ المطلوب:</div>
        <div class="info-val" style="color: #10b981; font-size: 15px;">$${Number(record.finalPrice ?? record.price_usd ?? record.price_jod ?? 0).toFixed(2)} USD</div>
      </div>
    </div>

    <p style="font-size: 13.5px; color: #94a3b8; line-height: 1.7;">
      في حال كان لديك أي استفسار أو رغبت في تسريع التحقق، لا تتردد بالتواصل المباشر معنا عبر البريد 
      <a href="mailto:${BRAND.adminEmail}" style="color: #38bdf8; text-decoration: none;">${BRAND.adminEmail}</a> أو عبر الواتساب على الرقم 
      <a href="${BRAND.whatsappUrl}" target="_blank" style="color: #38bdf8; text-decoration: none;">${BRAND.phone}</a>.
    </p>
  `;

  return wrapCinematicEmail({
    title: `تأكيد استلام طلب التسجيل | 7Z Magic Academy — ${record.reference || ""}`,
    preheader: `تم استلام طلب تسجيلك بنجاح عزيزنا ${record.fullName}. إيصال الدفع قيد المراجعة حالياً.`,
    bodyHtml,
    isRtl: true
  });
}

/**
 * 3. Payment Review Outcome: APPROVED / VERIFIED
 * Sent to student when admin clicks "Approve / تأكيد الدفع".
 */
export function buildPaymentApprovedHtml(record) {
  const bodyHtml = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="email-badge badge-green">تم تأكيد الدفع والقبول الرسمي ✓</span>
      <h1 style="color: #ffffff; font-size: 24px; margin: 12px 0 6px; font-weight: 700;">تهانينا! تم تفعيل اشتراكك بنجاح 🎉</h1>
      <p style="color: #94a3b8; font-size: 14px; margin: 0;">عزيزنا <strong>${record.fullName}</strong>، تم التحقق من إيصال الدفع وتأكيد مقعدك رسمياً.</p>
    </div>

    <div style="background: rgba(16, 185, 129, 0.12); border: 1.5px solid rgba(16, 185, 129, 0.4); border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
      <p style="color: #f8fafc; font-size: 15.5px; font-weight: 700; margin: 0 0 6px;">
        أنت الآن مسجل رسمياً في: ${record.courseName || record.courseId}
      </p>
      <p style="color: #a7f3d0; font-size: 13.5px; margin: 0;">
        رقم المرجع المعتمد: <strong>${record.reference || `7Z-REG-${record.id}`}</strong>
      </p>
    </div>

    <div class="email-card">
      <div style="font-size: 12px; color: #10b981; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">الخطوات القادمة للوصول للدورة المسجلة:</div>
      
      <ol style="margin: 0; padding-right: 20px; color: #cbd5e1; font-size: 14px; line-height: 1.8;">
        <li>تم تفعيل وصولك لحقيبة وتسجيلات الدورة بالكامل عبر المنصة، ويمكنك المشاهدة والتعلم في أي وقت بالسرعة التي تناسبك.</li>
        <li>ستتم إضافتك إلى قناة المتابعة والتوجيه للمتدربين لمشاركة التطبيقات العملية والتواصل المستمر مع المدربين وفريق الاستوديو.</li>
        <li>يمكنك البدء فوراً بمتابعة الدروس والتطبيق خطوة بخطوة وإنجاز مشروعك المتكامل.</li>
      </ol>
    </div>

    <div style="text-align: center; margin: 28px 0 10px;">
      <a href="${BRAND.siteUrl}" class="cta-btn" target="_blank" style="background: linear-gradient(135deg, #059669 0%, #047857 100%);">
        استكشف منصة الأكاديمية والموارد ←
      </a>
    </div>

    <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-top: 24px;">
      نحن متحمسون جداً للبدء معك والارتقاء بأعمالك إلى المستوى السينمائي العالمي!
    </p>
  `;

  return wrapCinematicEmail({
    title: `🎉 تهانينا! تم تأكيد وتفعيل تسجيلك رسمياً | 7Z Magic Academy`,
    preheader: `تم اعتماد إيصال الدفع وتفعيل مقعدك في ${record.courseName}`,
    bodyHtml,
    isRtl: true
  });
}

/**
 * 4. Payment Review Outcome: REJECTED / UNVERIFIED
 * Sent to student when admin clicks "Reject / رفض الدفع".
 */
export function buildPaymentRejectedHtml(record, reason = "") {
  const reasonText = reason
    ? String(reason).trim()
    : "تعذر مطابقة بيانات التحويل البنكي أو أن الإيصال المرفق غير مقروء أو غير مكتمل.";

  const bodyHtml = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="email-badge badge-amber">تحديث بشأن إيصال الدفع</span>
      <h1 style="color: #ffffff; font-size: 22px; margin: 12px 0 6px; font-weight: 700;">تعذر تأكيد عملية الدفع ⚠️</h1>
      <p style="color: #94a3b8; font-size: 14px; margin: 0;">عزيزنا <strong>${record.fullName}</strong>، تحية طيبة من فريق 7Z Magic.</p>
    </div>

    <div style="background: rgba(245, 158, 11, 0.12); border: 1.5px solid rgba(245, 158, 11, 0.4); border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="color: #f8fafc; font-size: 14.5px; font-weight: 600; margin: 0 0 8px; line-height: 1.6;">
        بعد مراجعة وتدقيق الإيصال المرفق لطلب تسجيلك برقم المرجع <strong style="color: #fbbf24;">${record.reference || `7Z-REG-${record.id}`}</strong>، نأسف لإعلامك بأنه تعذر تأكيد عملية الدفع.
      </p>
      
      <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px 16px; margin: 12px 0;">
        <span style="color: #f59e0b; font-weight: 700; font-size: 13px;">سبب عدم التأكيد:</span>
        <p style="color: #e2e8f0; font-size: 13.5px; margin: 4px 0 0; line-height: 1.5;">${reasonText}</p>
      </div>
    </div>

    <div class="email-card">
      <div style="font-size: 12px; color: #38bdf8; font-weight: 700; text-transform: uppercase; margin-bottom: 10px;">ما الذي يمكنك فعله الآن؟</div>
      
      <ul style="margin: 0; padding-right: 20px; color: #cbd5e1; font-size: 13.5px; line-height: 1.8;">
        <li>تأكد من إتمام الحوالة بنجاح من حسابك البنكي أو المحفظة الإلكترونية.</li>
        <li>الرد مباشرة على هذا الإيميل مع إرفاق لقطة شاشة واضحة (Screenshot) أو ملف PDF رسمي للحوالة.</li>
        <li>أو التواصل المباشر مع المسؤول المالي عبر الواتساب لحل الموضوع فوراً.</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 26px 0 10px;">
      <a href="${BRAND.whatsappUrl}" class="cta-btn" target="_blank" style="background: #2563eb;">
        تواصل معنا عبر واتساب للمساعدة فوراً ←
      </a>
    </div>
  `;

  return wrapCinematicEmail({
    title: `تحديث بشأن إيصال الدفع لطلب التسجيل | 7Z Magic Academy — ${record.reference || ""}`,
    preheader: `إشعار بشأن مراجعة إيصال الدفع لطلبك في أكاديمية 7Z Magic`,
    bodyHtml,
    isRtl: true
  });
}

/**
 * 5. Automatic 20-Milestone Excel Report Email
 * Sent to magic7z.ai@gmail.com whenever counter % 20 === 0.
 */
export function buildMilestoneReportHtml(totalCount, latestCount, summary = {}) {
  const bodyHtml = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="email-badge badge-cyan">تقرير إحصائي آلي</span>
      <h1 style="color: #ffffff; font-size: 24px; margin: 12px 0 6px; font-weight: 700;">إنجاز ${totalCount} تسجيل في الأكاديمية! 📊</h1>
      <p style="color: #94a3b8; font-size: 14px; margin: 0;">نظام الأتمتة المالي والإحصائي — 7Z MAGIC ACADEMY</p>
    </div>

    <div style="background: rgba(37, 99, 235, 0.12); border: 1.5px solid rgba(56, 189, 248, 0.4); border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
      <p style="color: #f8fafc; font-size: 15px; font-weight: 700; margin: 0 0 6px;">
        تم توليد ملف Excel احترافي (.xlsx) مرفق مع هذه الرسالة
      </p>
      <p style="color: #cbd5e1; font-size: 13px; margin: 0;">
        يحتوي التقرير على تفاصيل آخر ${latestCount} طالباً مسجلاً، بيانات الاتصال، الدورة، المبالغ، الخصومات وحالات الاعتماد.
      </p>
    </div>

    <div class="email-card">
      <div style="font-size: 12px; color: #38bdf8; font-weight: 700; text-transform: uppercase; margin-bottom: 12px;">ملخص الإحصاءات العامة:</div>
      
      <div class="info-row">
        <div class="info-label">إجمالي عدد المسجلين:</div>
        <div class="info-val" style="color: #38bdf8; font-size: 16px;">${totalCount} طالب</div>
      </div>
      <div class="info-row">
        <div class="info-label">التسجيلات المكتملة في هذا التقرير:</div>
        <div class="info-val">${latestCount} تسجيل</div>
      </div>
      <div class="info-row">
        <div class="info-label">إجمالي الإيرادات المحققة:</div>
        <div class="info-val" style="color: #10b981;">$${summary.revenueUsd || summary.revenueJod || "0.00"} USD</div>
      </div>
      <div class="info-row" style="border-bottom: none;">
        <div class="info-label">تاريخ التوليد:</div>
        <div class="info-val" dir="ltr">${new Date().toLocaleString("en-US", { timeZone: "Asia/Amman" })}</div>
      </div>
    </div>

    <div style="text-align: center; margin: 26px 0 10px;">
      <a href="https://7z-magic.com/admin/" class="cta-btn" target="_blank">
        فتح لوحة التحكم المالي في الآدمن ←
      </a>
    </div>
  `;

  return wrapCinematicEmail({
    title: `📊 [تقرير إحصائي آلي] وصول التسجيلات إلى ${totalCount} طالباً — 7Z Magic Academy`,
    preheader: `تقرير Excel التلقائي لآخر ${latestCount} تسجيلاً في أكاديمية 7Z Magic`,
    bodyHtml,
    isRtl: true
  });
}

export function buildLeadMagnetEmailHtml(lead, vaultUrl) {
  const isEn = lead.language === "en";
  const bodyHtml = isEn
    ? `
      <div style="text-align: center; margin-bottom: 24px;">
        <span class="email-badge badge-green">FREE 5000+ AI PROMPT VAULT</span>
        <h1 style="color: #ffffff; font-size: 22px; margin: 12px 0 6px; font-weight: 700;">Your Golden Vault Is Ready</h1>
        <p style="color: #94a3b8; font-size: 14px; margin: 0;">Hello <strong>${lead.fullName}</strong>, thank you for joining 7Z Magic Digital Ecosystem.</p>
      </div>
      <div class="email-card">
        <p style="color: #cbd5e1; font-size: 14px; margin: 0 0 14px; line-height: 1.7;">
          You now have instant access to the 5000+ AI Prompts Vault & Creative Frameworks Library.
        </p>
        <div style="text-align: center; margin: 20px 0 8px;">
          <a href="${vaultUrl}" class="cta-btn" target="_blank">Open Your Golden Vault Now →</a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin: 12px 0 0; text-align: center;">Reference ID: <code>${lead.reference}</code></p>
      </div>
    `
    : `
      <div style="text-align: center; margin-bottom: 24px;">
        <span class="email-badge badge-green">بنك البرومبتات المجاني 5000+</span>
        <h1 style="color: #ffffff; font-size: 22px; margin: 12px 0 6px; font-weight: 700;">تم تفعيل وصولك للمكتبة الذهبية ✨</h1>
        <p style="color: #94a3b8; font-size: 14px; margin: 0;">أهلاً بك <strong>${lead.fullName}</strong> في منظومة 7Z Magic الرقمية.</p>
      </div>
      <div class="email-card">
        <p style="color: #cbd5e1; font-size: 14px; margin: 0 0 14px; line-height: 1.7;">
          شكراً لتسجيلك! يمكنك الآن فتح وتنزيل بنك الأوامر والمكتبة العملية مباشرة عبر الزر التالي:
        </p>
        <div style="text-align: center; margin: 20px 0 8px;">
          <a href="${vaultUrl}" class="cta-btn" target="_blank">فتح وتنزيل بنك البرومبتات الآن ←</a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin: 12px 0 0; text-align: center;">رقم المرجع: <code>${lead.reference}</code></p>
      </div>
    `;
  return wrapCinematicEmail({
    title: isEn ? `Your 5000+ AI Prompt Vault Access | 7Z Magic` : `رابط وصولك إلى بنك البرومبتات الذهبي | 7Z Magic`,
    preheader: `Reference ${lead.reference}`,
    bodyHtml,
    isRtl: !isEn
  });
}

export function buildWaitlistEmailHtml(entry) {
  const bodyHtml = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="email-badge badge-amber">VIP WAITLIST CONFIRMED</span>
      <h1 style="color: #ffffff; font-size: 22px; margin: 12px 0 6px; font-weight: 700;">تم تثبيت مقعدك في قائمة الـ VIP بنجاح</h1>
      <p style="color: #94a3b8; font-size: 14px; margin: 0;">مرحباً <strong>${entry.fullName}</strong>، تم تسجيل طلبك الأولوية بنجاح.</p>
    </div>
    <div class="email-card">
      <div class="info-row"><div class="info-label">النظام / المنتج:</div><div class="info-val" style="color: #fbbf24;">${entry.productTitle}</div></div>
      <div class="info-row"><div class="info-label">التخصص:</div><div class="info-val">${entry.discipline || "—"}</div></div>
      <div class="info-row"><div class="info-label">رقم الواتساب:</div><div class="info-val" dir="ltr">${entry.whatsapp}</div></div>
      <div class="info-row" style="border-bottom: none;"><div class="info-label">مرجع الحجز:</div><div class="info-val"><code>${entry.reference}</code></div></div>
    </div>
  `;
  return wrapCinematicEmail({
    title: `تأكيد التسجيل في قائمة الـ VIP | ${entry.productTitle}`,
    preheader: `تم تسجيلك في قائمة الأولوية - ${entry.reference}`,
    bodyHtml,
    isRtl: true
  });
}

/**
 * 6. Majara Cinema Studio VIP Access Email Wrapper (100% English Avant-Garde Aesthetic)
 */
export function wrapMajaraCinemaEmail({
  title,
  preheader = "VIP Studio Access Pass // Majara Academy & Studios",
  bodyHtml,
  passCode = "Z7-MAJARA-PASS"
}) {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${title}</title>
  <style>
    :root { color-scheme: dark; }
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #07090e; color: #e2e8f0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .studio-container { max-width: 620px; margin: 0 auto; background: #0c1017; border: 1px solid rgba(56, 189, 248, 0.28); border-radius: 20px; overflow: hidden; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.85), 0 0 40px rgba(56, 189, 248, 0.12); }
    .studio-pass-badge { display: inline-block; padding: 5px 14px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #38bdf8; text-transform: uppercase; }
    .studio-header { background: radial-gradient(circle at 50% 0%, #151d2a 0%, #0c1017 80%); padding: 38px 30px 24px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
    .studio-card { background: #111722; border: 1px solid rgba(56, 189, 248, 0.16); border-radius: 14px; padding: 24px; margin: 24px 0; }
    .pass-row { display: table; width: 100%; padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); font-size: 13.5px; }
    .pass-label { display: table-cell; color: #94a3b8; font-weight: 600; width: 38%; text-align: left; text-transform: uppercase; letter-spacing: 0.5px; font-size: 11.5px; }
    .pass-val { display: table-cell; color: #f8fafc; font-weight: 700; text-align: right; }
    .cta-cinema-btn { display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%); color: #ffffff !important; padding: 15px 34px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 14px; letter-spacing: 0.5px; text-align: center; border: 1px solid rgba(255, 255, 255, 0.3); box-shadow: 0 0 24px rgba(56, 189, 248, 0.45); }
    .studio-footer { background: #07090e; padding: 28px 24px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.06); font-size: 12px; color: #64748b; line-height: 1.6; }
    @media only screen and (max-width: 620px) {
      .studio-container { width: 100% !important; border-radius: 0 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 28px 12px; background-color: #07090e;">
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0; font-size: 1px; line-height: 1px; color: #fff;">
    ${preheader}
  </div>
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="studio-container" style="max-width: 620px; background-color: #0c1017; border: 1px solid rgba(56, 189, 248, 0.28); border-radius: 20px;">
          <!-- Studio Header & Holographic VIP Strip -->
          <tr>
            <td class="studio-header" align="center" style="padding: 38px 24px 24px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background-color: #111722;">
              <div style="margin-bottom: 12px;">
                <span class="studio-pass-badge" style="display: inline-block; padding: 5px 14px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #38bdf8; text-transform: uppercase;">
                  ACCESS PASS // MAJARA STUDIO
                </span>
              </div>
              <a href="https://majara.7z-magic.com" target="_blank" style="text-decoration: none; display: inline-block;">
                <img src="${BRAND.logoUrl}" alt="${BRAND.name}" width="140" height="40" style="display: block; border: 0; max-width: 140px; height: auto;" />
              </a>
              <div style="font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 11px; color: #818cf8; letter-spacing: 1.8px; margin-top: 10px; text-transform: uppercase; font-weight: 600;">
                STUDIO CLEARANCE: ${passCode}
              </div>
            </td>
          </tr>

          <!-- Main VIP Body -->
          <tr>
            <td style="padding: 36px 32px; font-size: 14.5px; line-height: 1.7; color: #cbd5e1; direction: ltr; text-align: left;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Studio Footer -->
          <tr>
            <td class="studio-footer" align="center" style="padding: 26px 20px; border-top: 1px solid rgba(255, 255, 255, 0.06); background-color: #07090e; color: #64748b; font-size: 12px; line-height: 1.6;">
              <p style="margin: 0 0 6px; font-weight: 700; color: #94a3b8; letter-spacing: 0.5px;">7Z MAGIC STUDIOS · MAJARA ACADEMY</p>
              <p style="margin: 0 0 8px;">
                <a href="mailto:${BRAND.adminEmail}" style="color: #38bdf8; text-decoration: none;">${BRAND.adminEmail}</a> · 
                <a href="https://majara.7z-magic.com" target="_blank" style="color: #38bdf8; text-decoration: none;">majara.7z-magic.com</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                &copy; 2026 7Z Magic Studios. All rights reserved. Single-Session Forensic Lock Active.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildStudentActivationHtml({ fullName, studentName, email, activationLink, courseTitle }) {
  const name = fullName || studentName || "Student";
  const studentEmail = email || "";
  const bodyHtml = `
    <div style="text-align: center; margin-bottom: 26px;">
      <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px; font-weight: 800; letter-spacing: -0.3px;">Welcome to the Studio, ${name}</h1>
      <p style="color: #94a3b8; font-size: 14px; margin: 0; line-height: 1.6;">Your VIP student clearance has been provisioned. Activate your security keycard to unlock high-definition masterclasses, forensic study environments, and raw production deliverables.</p>
    </div>

    <div class="studio-card">
      <div style="font-size: 11px; color: #38bdf8; font-weight: 800; text-transform: uppercase; margin-bottom: 14px; letter-spacing: 1.2px;">VIP CLEARANCE RECORD</div>
      <div class="pass-row">
        <div class="pass-label">Student Name</div>
        <div class="pass-val" style="color: #38bdf8;">${name}</div>
      </div>
      <div class="pass-row">
        <div class="pass-label">Registered Email</div>
        <div class="pass-val">${studentEmail}</div>
      </div>
      ${courseTitle ? `
      <div class="pass-row">
        <div class="pass-label">Unlocked Masterclass</div>
        <div class="pass-val" style="color: #818cf8;">${courseTitle}</div>
      </div>` : ""}
      <div class="pass-row">
        <div class="pass-label">Access Level</div>
        <div class="pass-val" style="color: #10b981;">Unlimited VIP Studio Access</div>
      </div>
      <div class="pass-row" style="border-bottom: none;">
        <div class="pass-label">Security Architecture</div>
        <div class="pass-val" style="color: #38bdf8;">Single-Session Anti-Piracy Lock</div>
      </div>
    </div>

    <div style="text-align: center; margin: 32px 0 16px;">
      <a href="${activationLink}" class="cta-cinema-btn" target="_blank">
        Enter The Studio →
      </a>
    </div>

    <p style="color: #64748b; font-size: 12px; margin: 16px 0 0; text-align: center; line-height: 1.6;">
      This single-use activation token establishes your personal password and grants immediate access to your cinema classroom.
    </p>
  `;

  return wrapMajaraCinemaEmail({
    title: "VIP Studio Access Pass // Majara Academy",
    preheader: `Welcome to Majara Academy, ${name}. Your VIP Studio pass is active.`,
    bodyHtml,
    passCode: "VIP-KEY-ACTIVATION"
  });
}

export function buildStudentPasswordResetHtml({ fullName, studentName, email, resetLink }) {
  const name = fullName || studentName || "Student";
  const studentEmail = email || "";
  const bodyHtml = `
    <div style="text-align: center; margin-bottom: 26px;">
      <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px; font-weight: 800; letter-spacing: -0.3px;">Security Keycard Reset</h1>
      <p style="color: #94a3b8; font-size: 14px; margin: 0; line-height: 1.6;">Hello <strong>${name}</strong>, an authorization request was initiated to reset your Majara Studio access keycard.</p>
    </div>

    <div class="studio-card">
      <div style="font-size: 11px; color: #fbbf24; font-weight: 800; text-transform: uppercase; margin-bottom: 14px; letter-spacing: 1.2px;">SECURITY DISPATCH DETAILS</div>
      <div class="pass-row">
        <div class="pass-label">Target Account</div>
        <div class="pass-val">${studentEmail}</div>
      </div>
      <div class="pass-row">
        <div class="pass-label">Token Validity</div>
        <div class="pass-val" style="color: #fbbf24;">Expires in 2 Hours</div>
      </div>
      <div class="pass-row" style="border-bottom: none;">
        <div class="pass-label">Target Portal</div>
        <div class="pass-val" style="color: #38bdf8;">majara.7z-magic.com</div>
      </div>
    </div>

    <div style="text-align: center; margin: 32px 0 16px;">
      <a href="${resetLink}" class="cta-cinema-btn" target="_blank" style="background: linear-gradient(135deg, #d97706 0%, #fbbf24 100%); box-shadow: 0 0 24px rgba(251, 191, 36, 0.4);">
        Reset Access Keycard →
      </a>
    </div>

    <p style="color: #64748b; font-size: 12px; margin: 16px 0 0; text-align: center; line-height: 1.6;">
      If you did not request this credentials reset, you may disregard this transmission. Your existing session remains safe and protected.
    </p>
  `;

  return wrapMajaraCinemaEmail({
    title: "Security Keycard Reset // Majara Studio",
    preheader: `Security reset authorization for ${studentEmail || name}`,
    bodyHtml,
    passCode: "SEC-RESET-DISPATCH"
  });
}

export function buildCourseUnlockedHtml({ fullName, studentName, email, courseTitle, portalUrl = "https://majara.7z-magic.com/learn/", classroomLink }) {
  const name = fullName || studentName || "Student";
  const studentEmail = email || "";
  const targetLink = classroomLink || portalUrl;
  const bodyHtml = `
    <div style="text-align: center; margin-bottom: 26px;">
      <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px; font-weight: 800; letter-spacing: -0.3px;">New Masterclass Unlocked</h1>
      <p style="color: #94a3b8; font-size: 14px; margin: 0; line-height: 1.6;">Congratulations <strong>${name}</strong>, new studio clearance has been granted and bound to your student keycard.</p>
    </div>

    <div class="studio-card">
      <div style="font-size: 11px; color: #10b981; font-weight: 800; text-transform: uppercase; margin-bottom: 14px; letter-spacing: 1.2px;">NEW PRODUCTION CLEARANCE</div>
      <div class="pass-row">
        <div class="pass-label">Unlocked Masterclass</div>
        <div class="pass-val" style="color: #38bdf8; font-size: 15px;">${courseTitle}</div>
      </div>
      <div class="pass-row">
        <div class="pass-label">Clearance Tier</div>
        <div class="pass-val" style="color: #10b981;">Unlimited VIP Streaming &amp; Downloads</div>
      </div>
      <div class="pass-row">
        <div class="pass-label">Classroom Studio</div>
        <div class="pass-val">Majara 4K Protected Player</div>
      </div>
      <div class="pass-row" style="border-bottom: none;">
        <div class="pass-label">Student ID</div>
        <div class="pass-val">${studentEmail}</div>
      </div>
    </div>

    <div style="text-align: center; margin: 32px 0 16px;">
      <a href="${targetLink}" class="cta-cinema-btn" target="_blank">
        Enter The Studio →
      </a>
    </div>

    <p style="color: #64748b; font-size: 12px; margin: 16px 0 0; text-align: center; line-height: 1.6;">
      All masterclass modules, video lessons, downloadable slide decks, and code files are now active in your dashboard.
    </p>
  `;

  return wrapMajaraCinemaEmail({
    title: `Masterclass Unlocked // Your VIP Studio Access`,
    preheader: `New masterclass clearance granted: ${courseTitle}`,
    bodyHtml,
    passCode: "VIP-COURSE-UNLOCKED"
  });
}

