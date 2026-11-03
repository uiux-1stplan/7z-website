const COURSES = Object.freeze({
  "cinematic-film": { ar: "صناعة الأفلام والمحتوى السينمائي بالذكاء الاصطناعي", en: "AI Cinematic Filmmaking" },
  "ai-engineering": { ar: "الذكاء الاصطناعي للمهندسين", en: "AI for Engineers" }
});

function esc(value) {
  return String(value ?? "—").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function renderCourseEmail({ kind, courseId, language, student, payment = {} }) {
  const ar = String(language).toLowerCase() !== "english";
  const dir = ar ? "rtl" : "ltr";
  const titleCourse = COURSES[courseId] || COURSES["cinematic-film"];
  const courseName = ar ? titleCourse.ar : titleCourse.en;
  const greeting = ar ? "مرحبًا " + (student.full_name || "") : "Hello " + (student.full_name || "");
  let title, intro, subject, rows = "", cta = "";
  if (kind === "pending") {
    subject = ar ? "استلمنا بيانات التحويل — " + courseName : "Transfer details received — " + courseName;
    title = ar ? "تسجيلك بانتظار التحقق من الدفع" : "Payment is awaiting verification";
    intro = ar
      ? "استلمنا مرجع التحويل وصورة الإيصال. سنراجع وصول المبلغ إلى الحساب يدويًا، وسنرسل إليك رسالة أخرى بعد تأكيد الدفع."
      : "We received your transfer reference and receipt. We will manually verify that the funds reached our account and email you again once payment is confirmed.";
    rows = row(ar ? "الدورة" : "Course", courseName) + row(ar ? "رقم التسجيل" : "Registration number", payment.seat_number) + row(ar ? "طريقة الدفع" : "Payment method", payment.method) + row(ar ? "مرجع التحويل" : "Transfer reference", payment.reference) + row(ar ? "المبلغ المستحق" : "Amount due", payment.amount + " JOD");
  } else {
    subject = ar ? "تم تأكيد الدفع — " + courseName : "Payment confirmed — " + courseName;
    title = ar ? "تم تأكيد دفعك وتسجيلك" : "Your payment and registration are confirmed";
    intro = ar
      ? "تم التحقق من وصول دفعتك واعتماد تسجيلك في الدورة. موعد انعقاد الدورة لم يتحدد بعد، وسنرسل إليك تفاصيل الموعد فور اعتماده."
      : "Your payment has been verified and your course registration is confirmed. The course date has not been set yet; we will email you as soon as it is announced.";
    rows = row(ar ? "الدورة" : "Course", courseName) + row(ar ? "رقم التسجيل" : "Registration number", payment.seat_number) + row(ar ? "المبلغ المؤكد" : "Confirmed amount", payment.amount + " JOD") + row(ar ? "موعد الدورة" : "Course date", ar ? "سيُعلن لاحقًا" : "To be announced");
  }
  function row(label, value) {
    return '<tr><td style="padding:11px 14px;border-bottom:1px solid #e4eaf2;color:#63718a;font-size:13px;width:38%">' + esc(label) + '</td><td style="padding:11px 14px;border-bottom:1px solid #e4eaf2;color:#18263c;font-size:14px;font-weight:600;word-break:break-word">' + esc(value) + "</td></tr>";
  }
  const plain = greeting + "\n\n" + title + "\n" + intro + "\n" + courseName + (payment.seat_number ? "\nRegistration: " + payment.seat_number : "");
  const html = '<!doctype html><html lang="' + (ar ? "ar" : "en") + '" dir="' + dir + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body style="margin:0;padding:28px 12px;background:#eef3f9;font-family:Arial,Helvetica,sans-serif;color:#172338;direction:' + dir + '"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #dce5f0;border-radius:18px;overflow:hidden"><tr><td style="padding:26px 30px;background:#080d16;background-image:linear-gradient(125deg,#080d16,#13233b)"><table role="presentation" width="100%"><tr><td style="width:70px"><img src="https://7z-magic.com/7Z-LogoT.png" width="58" height="58" alt="7Z Magic" style="display:block;width:58px;height:58px;object-fit:cover;border-radius:11px;border:1px solid #33435b"></td><td style="padding-' + (ar ? "right" : "left") + ':14px"><strong style="color:#fff;font-size:20px;letter-spacing:2px">7Z MAGIC</strong><div style="margin-top:6px;color:#9db2d1;font-size:10px;letter-spacing:2px">AI CINEMATIC FILMMAKING</div></td><td align="' + (ar ? "left" : "right") + '" style="color:#8eb4ff;font-size:11px">ACADEMY</td></tr></table></td></tr><tr><td style="padding:30px"><div style="font-size:11px;font-weight:700;letter-spacing:1.3px;color:#487ef7">7Z MAGIC ACADEMY</div><h1 style="margin:10px 0 8px;font-size:25px;line-height:1.35;color:#142238">' + esc(title) + '</h1><p style="margin:0 0 20px;color:#5d6b80;font-size:15px;line-height:1.8">' + esc(greeting) + '<br>' + esc(intro) + '</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e4eaf2;border-radius:10px;overflow:hidden">' + rows + "</table>" + cta + '</td></tr><tr><td style="padding:18px 30px;background:#f5f7fa;border-top:1px solid #e4eaf2;color:#718096;font-size:11px;line-height:1.6">7Z MAGIC · 7z-magic.com<br>' + (ar ? "للاستفسار، تواصل معنا عبر creative@7z-magic.com" : "For assistance, contact creative@7z-magic.com") + "</td></tr></table></body></html>";
  return { subject, body: plain, html };
}
