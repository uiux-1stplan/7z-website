import { renderCourseEmail } from "../../api/course-email.js";
import { prepare, sendZohoMail, sqlClient } from "../../api/course-registration.js";

const allowedOrigins = new Set(["https://7z-magic.com", "https://www.7z-magic.com"]);

export default async function handler(req, res) {
  const runtime = await import("../../lib/portal-runtime.mjs");
  const http = await import("../../lib/vercel-api.mjs");
  const { z } = await import("zod");
  try {
    const gate = await runtime.requireAdmin(http.toWebRequest(req));
    if (!gate.ok) return http.sendWebResponse(res, gate.response);
    if (req.method === "POST" && !allowedOrigins.has(String(req.headers.origin || ""))) return http.sendJson(res, 403, { error: "Same-origin administrator request required." });
    const sql = sqlClient();
    await prepare(sql);
    if (req.method === "GET") {
      const registrations = await sql`
        SELECT id, seat_number, full_name, email, preferred_language, payment_status,
          payment_provider, payment_reference, price_jod, discount_jod, discount_percent,
          course_id, payment_submitted_at, created_at, pending_student_email_status,
          (SELECT i.registration_email_status FROM course_checkout_intents i WHERE i.course_id=course_registrations.course_id AND i.registration_seat=course_registrations.seat_number ORDER BY i.created_at DESC LIMIT 1) AS registration_email_status,
          confirmation_email_status, confirmation_email_attempted_at, pending_student_email_attempted_at, payment_verified_at
        FROM course_registrations
        ORDER BY payment_submitted_at DESC NULLS LAST, created_at DESC
        LIMIT 200
      `;
      return http.sendJson(res, 200, { registrations });
    }
    if (req.method !== "POST") return http.methodNotAllowed(res, ["GET", "POST"]);
    const parsed = z.object({
      action: z.enum(["confirm-payment", "retry-confirmation-email", "retry-pending-email"]),
      registrationId: z.coerce.number().int().positive()
    }).safeParse(await http.readJson(req));
    if (!parsed.success) return http.validationError(res, parsed);
    const id = parsed.data.registrationId;
    let rows;
    if (parsed.data.action === "confirm-payment") {
      rows = await sql`
        UPDATE course_registrations
        SET payment_status = 'PAID',
            payment_verified_at = NOW(),
            payment_verified_by = ${gate.auth.userId},
            confirmation_email_status = 'SENDING',
            confirmation_email_attempted_at = NOW(),
            confirmation_email_error = ''
        WHERE id = ${id} AND payment_status = 'PENDING_REVIEW'
        RETURNING id, seat_number, full_name, email, preferred_language, course_id,
          price_jod, discount_jod, payment_provider, payment_reference,
          payment_status, confirmation_email_status, payment_verified_at
      `;
      if (!rows[0]) return http.sendJson(res, 409, { error: "This registration is not awaiting payment review. Refresh the list and check its current status." });
    } else if (parsed.data.action === "retry-confirmation-email") {
      rows = await sql`
        UPDATE course_registrations
        SET confirmation_email_status = 'SENDING',
            confirmation_email_attempted_at = NOW(),
            confirmation_email_error = ''
        WHERE id = ${id}
          AND payment_status = 'PAID'
          AND confirmation_email_status <> 'SENT'
          AND (confirmation_email_status IN ('FAILED', 'NOT_SENT') OR (confirmation_email_status = 'SENDING' AND confirmation_email_attempted_at < NOW() - INTERVAL '10 minutes'))
        RETURNING id, seat_number, full_name, email, preferred_language, course_id,
          price_jod, discount_jod, payment_provider, payment_reference,
          payment_status, confirmation_email_status, payment_verified_at
      `;
      if (!rows[0]) return http.sendJson(res, 409, { error: "There is no failed confirmation email to retry, or another send is already in progress." });
    } else {
      rows = await sql`
        UPDATE course_registrations
        SET pending_student_email_status = 'SENDING',
            pending_student_email_attempted_at = NOW(),
            pending_student_email_error = ''
        WHERE id = ${id}
          AND payment_status = 'PENDING_REVIEW'
          AND pending_student_email_status <> 'SENT'
          AND (pending_student_email_status IN ('FAILED', 'NOT_SENT') OR (pending_student_email_status = 'SENDING' AND pending_student_email_attempted_at < NOW() - INTERVAL '10 minutes'))
        RETURNING id, seat_number, full_name, email, preferred_language, course_id,
          price_jod, discount_jod, payment_provider, payment_reference,
          payment_status, pending_student_email_status, payment_verified_at
      `;
      if (!rows[0]) return http.sendJson(res, 409, { error: "There is no failed pending-review email to retry, or another send is already in progress." });
    }
    const registration = rows[0];
    const pendingEmailAction = parsed.data.action === "retry-pending-email";
    let studentEmailSent = false;
    try {
      const amount = (Number(registration.price_jod || 0) - Number(registration.discount_jod || 0)).toFixed(3).replace(/\.?0+$/, "");
      const method = registration.payment_provider === "CLIQ" ? "CliQ" : registration.payment_provider === "WESTERN_UNION" ? "Western Union" : registration.payment_provider;
      const email = renderCourseEmail({
        kind: pendingEmailAction ? "pending" : "confirmed",
        courseId: registration.course_id,
        language: registration.preferred_language,
        student: registration,
        payment: { seat_number: registration.seat_number, amount, method, reference: registration.payment_reference }
      });
      await sendZohoMail({ ...email, to: registration.email });
      if (pendingEmailAction) {
        await sql`UPDATE course_registrations SET pending_student_email_status='SENT', pending_student_email_sent_at=NOW(), pending_student_email_error='' WHERE id=${registration.id}`;
      } else {
        await sql`UPDATE course_registrations SET confirmation_email_status='SENT', confirmation_email_sent_at=NOW(), confirmation_email_error='' WHERE id=${registration.id}`;
      }
      studentEmailSent = true;
    } catch (mailError) {
      console.error("Student course email failed", mailError);
      if (pendingEmailAction) {
        await sql`UPDATE course_registrations SET pending_student_email_status='FAILED', pending_student_email_error='Delivery attempt failed' WHERE id=${registration.id}`;
      } else {
        await sql`UPDATE course_registrations SET confirmation_email_status='FAILED', confirmation_email_error='Delivery attempt failed' WHERE id=${registration.id}`;
      }
    }
    try {
      await runtime.writeAudit({
        actorUserId: gate.auth.userId,
        action: parsed.data.action === "confirm-payment" ? "course_payment_confirmed" : parsed.data.action === "retry-pending-email" ? "course_pending_email_retried" : "course_confirmation_email_retried",
        targetType: "course_registration",
        targetId: String(registration.id),
        details: { seatNumber: Number(registration.seat_number), courseId: registration.course_id, action: parsed.data.action, studentEmailSent }
      });
    } catch (auditError) {
      console.error("Course payment audit write failed", auditError);
    }
    return http.sendJson(res, 200, {
      ok: true,
      registrationId: Number(registration.id),
      paymentStatus: registration.payment_status,
      studentEmailSent,
      confirmationEmailSent: !pendingEmailAction && studentEmailSent
    });
  } catch (error) {
    console.error("Admin course payment action failed", error);
    return http.sendJson(res, 500, { error: "Course payment administration is temporarily unavailable." });
  }
}
