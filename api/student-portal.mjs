/**
 * 7Z MAGIC — MAJARA ACADEMY STUDENT PORTAL BACKEND
 * Endpoint: /api/student-portal
 * Single-Session Lock, Secure Authentication, Dynamic Forensic Watermark, Course Progress
 */

import {
  ensureDbSchema,
  hashPassword,
  verifyPassword,
  getMajaraCourses,
  getMajaraCourseByIdOrSlug,
  getMajaraLessons,
  getMajaraLesson,
  getMajaraStudentById,
  getMajaraStudentByEmail,
  saveMajaraStudent,
  getStudentEnrollments,
  updateStudentLessonProgress,
  getStudentCourseProgress,
  generateStudentSession,
  verifyStudentSession,
  sendEmail
} from "./academy-engine.mjs";
import { buildStudentPasswordResetHtml } from "./_email-templates.mjs";
import crypto from "node:crypto";

function sendJson(res, status, data) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(data);
}

function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try {
    return JSON.parse(String(req.body || "{}"));
  } catch {
    return {};
  }
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return req.headers["x-real-ip"] || req.socket?.remoteAddress || "127.0.0.1";
}

export default async function handler(req, res) {
  // CORS configuration
  const origin = req.headers.origin || "";
  const ALLOWED_ORIGINS = new Set([
    "https://7z-magic.com",
    "https://www.7z-magic.com",
    "https://majara.7z-magic.com",
    "http://localhost:3000",
    "http://localhost:4173",
    "http://127.0.0.1:4173"
  ]);
  if (origin && (ALLOWED_ORIGINS.has(origin) || origin.endsWith(".7z-magic.com"))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "https://majara.7z-magic.com");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Student-Token,X-Student-Id");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  await ensureDbSchema().catch(() => {});

  const url = new URL(req.url, `https://${req.headers.host || "majara.7z-magic.com"}`);
  const body = parseBody(req);
  const action = body.action || url.searchParams.get("action") || "";
  const ip = getClientIp(req);

  // Authentication extraction (Case-insensitive header lookup)
  const getHeader = (name) => {
    const lower = name.toLowerCase();
    for (const [k, v] of Object.entries(req.headers || {})) {
      if (k.toLowerCase() === lower) return v;
    }
    return "";
  };

  const authHeader = getHeader("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const sessionToken = getHeader("x-student-token") || bearerToken || body.sessionToken || url.searchParams.get("token") || "";
  const studentId = getHeader("x-student-id") || body.studentId || url.searchParams.get("studentId") || "";

  // Helper: Require valid student session (Single-Session Lock verification)
  async function requireStudent() {
    if (!studentId || !sessionToken) {
      return { ok: false, status: 401, error: "Authentication required" };
    }
    const student = await verifyStudentSession(studentId, sessionToken);
    if (!student) {
      return {
        ok: false,
        status: 401,
        code: "SESSION_SUPERSEDED",
        error: "Your session has expired or your account was logged in from another device."
      };
    }
    return { ok: true, student };
  }

  try {
    // -------------------------------------------------------------------------
    // 1. PUBLIC ACTIONS (No Login Required)
    // -------------------------------------------------------------------------

    // 1.1 Student Login (Single-Session Lock: Revokes previous session token immediately)
    if (action === "login") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "").trim();

      if (!email || !password) {
        return sendJson(res, 400, { ok: false, error: "Please enter your email and password." });
      }

      const student = await getMajaraStudentByEmail(email);
      if (!student) {
        return sendJson(res, 401, { ok: false, error: "Invalid email or password. Please verify your credentials." });
      }

      if (student.must_set_password || !student.password_hash) {
        return sendJson(res, 403, {
          ok: false,
          code: "MUST_ACTIVATE",
          error: "Your account requires first-time password setup. Please use the activation link sent to your email or click Activate Account."
        });
      }

      const isValid = verifyPassword(password, student.password_hash);
      if (!isValid) {
        return sendJson(res, 401, { ok: false, error: "Invalid email or password." });
      }

      // Generate NEW session token in DB -> invalidates any existing session on other devices
      const newSessionToken = await generateStudentSession(student.id, ip);
      const enrollments = await getStudentEnrollments(student.id);

      return sendJson(res, 200, {
        ok: true,
        sessionToken: newSessionToken,
        student: {
          id: student.id,
          fullName: student.full_name,
          email: student.email,
          phone: student.phone,
          lastIp: ip,
          lastLoginAt: new Date().toISOString()
        },
        enrollments
      });
    }

    // 1.2 First-Time Account Activation / Password Setup
    if (action === "activate" || action === "set-password") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "").trim();

      if (!email || !password || password.length < 6) {
        return sendJson(res, 400, { ok: false, error: "Password must be at least 6 characters long." });
      }

      let student = await getMajaraStudentByEmail(email);
      if (!student) {
        return sendJson(res, 404, { ok: false, error: "Student account not found for this email address." });
      }

      // Hash and update password
      const passwordHash = hashPassword(password);
      student = await saveMajaraStudent({
        id: student.id,
        full_name: student.full_name,
        email: student.email,
        phone: student.phone,
        password_hash: passwordHash,
        must_set_password: false
      });

      // Automatically log the student in with a fresh single-session token
      const newSessionToken = await generateStudentSession(student.id, ip);
      const enrollments = await getStudentEnrollments(student.id);

      return sendJson(res, 200, {
        ok: true,
        activated: true,
        sessionToken: newSessionToken,
        student: {
          id: student.id,
          fullName: student.full_name,
          email: student.email,
          phone: student.phone,
          lastIp: ip
        },
        enrollments
      });
    }

    // 1.3 Request Password Reset Link via Zoho SMTP
    if (action === "request-reset") {
      const email = String(body.email || "").trim().toLowerCase();
      if (!email) return sendJson(res, 400, { ok: false, error: "Please enter your email." });

      const student = await getMajaraStudentByEmail(email);
      if (student) {
        const resetToken = crypto.randomBytes(24).toString("hex");
        const resetLink = `https://majara.7z-magic.com/learn/?reset=${resetToken}&email=${encodeURIComponent(email)}`;
        const html = buildStudentPasswordResetHtml({
          fullName: student.full_name,
          email: student.email,
          resetLink,
          isRtl: true
        });

        await sendEmail({
          to: email,
          subject: "استعادة كلمة المرور — أكاديمية مجرة | 7Z Magic",
          html
        }).catch(err => console.error("[Password Reset Email Error]:", err.message));
      }

      // Always return success to prevent email enumeration
      return sendJson(res, 200, {
        ok: true,
        message: "If your email is registered in Majara Academy, password reset instructions have been sent."
      });
    }

    // 1.4 Public Catalog / Preview Courses
    if (action === "public-courses") {
      const courses = await getMajaraCourses(true);
      return sendJson(res, 200, { ok: true, courses });
    }

    // -------------------------------------------------------------------------
    // 2. AUTHENTICATED ACTIONS (Strict Single-Session Lock Required)
    // -------------------------------------------------------------------------

    const authCheck = await requireStudent();
    if (!authCheck.ok) {
      return sendJson(res, authCheck.status, authCheck);
    }
    const student = authCheck.student;

    // 2.1 Verify Auth Status & Get Dashboard Data
    if (action === "auth-status" || action === "dashboard") {
      const enrollments = await getStudentEnrollments(student.id);
      return sendJson(res, 200, {
        ok: true,
        student: {
          id: student.id,
          fullName: student.full_name,
          email: student.email,
          phone: student.phone,
          lastIp: ip,
          sessionTimestamp: new Date().toISOString()
        },
        enrollments
      });
    }

    // 2.2 Get Course Details & Curriculum
    if (action === "course-curriculum") {
      const courseId = body.courseId || url.searchParams.get("courseId") || "";
      const course = await getMajaraCourseByIdOrSlug(courseId);
      if (!course) {
        return sendJson(res, 404, { ok: false, error: "Course not found" });
      }

      const lessons = await getMajaraLessons(course.id);
      const progressList = await getStudentCourseProgress(student.id, course.id);
      const progressMap = {};
      progressList.forEach(p => {
        progressMap[p.lesson_id] = {
          completed: p.completed,
          lastPositionSec: p.last_position_sec || 0
        };
      });

      return sendJson(res, 200, {
        ok: true,
        course,
        lessons,
        progressMap
      });
    }

    // 2.3 Get Lesson Details (Verifies course enrollment or free preview)
    if (action === "lesson-view") {
      const lessonId = body.lessonId || url.searchParams.get("lessonId") || "";
      const lesson = await getMajaraLesson(lessonId);
      if (!lesson) {
        return sendJson(res, 404, { ok: false, error: "Lesson not found" });
      }

      // Check if student is actively enrolled in course
      const enrollments = await getStudentEnrollments(student.id);
      const isEnrolled = enrollments.some(e => String(e.id) === String(lesson.course_id) || String(e.slug) === String(lesson.course_id));

      if (!isEnrolled && !lesson.is_free_preview) {
        return sendJson(res, 403, {
          ok: false,
          error: "You are not actively enrolled in this masterclass. Please complete registration to unlock all lessons."
        });
      }

      const progressList = await getStudentCourseProgress(student.id, lesson.course_id);
      const prog = progressList.find(p => String(p.lesson_id) === String(lesson.id));

      return sendJson(res, 200, {
        ok: true,
        lesson,
        progress: prog || { completed: false, last_position_sec: 0 },
        // Forensic Watermark Payload (Tamper-evident identity data)
        watermark: {
          fullName: student.full_name,
          email: student.email,
          phone: student.phone || "",
          ip: ip,
          timestamp: new Date().toISOString()
        }
      });
    }

    // 2.4 Update Lesson Progress (Mark Completed / Save Position)
    if (action === "update-progress") {
      const lessonId = String(body.lessonId || "").trim();
      const completed = typeof body.completed === "boolean" ? body.completed : true;
      const lastPositionSec = Math.max(0, Number(body.lastPositionSec || 0));

      if (!lessonId) {
        return sendJson(res, 400, { ok: false, error: "lessonId is required" });
      }

      const result = await updateStudentLessonProgress(student.id, lessonId, completed, lastPositionSec);
      return sendJson(res, 200, { ok: true, progress: result });
    }

    // 2.5 Update Student Profile
    if (action === "update-profile") {
      const fullName = String(body.fullName || "").trim();
      const phone = String(body.phone || "").trim();

      if (!fullName) {
        return sendJson(res, 400, { ok: false, error: "Full name is required." });
      }

      const updated = await saveMajaraStudent({
        id: student.id,
        full_name: fullName,
        email: student.email,
        phone: phone,
        password_hash: student.password_hash,
        must_set_password: false
      });

      return sendJson(res, 200, {
        ok: true,
        student: {
          id: updated.id,
          fullName: updated.full_name,
          email: updated.email,
          phone: updated.phone
        }
      });
    }

    // 2.6 Change Password
    if (action === "change-password") {
      const currentPassword = String(body.currentPassword || "").trim();
      const newPassword = String(body.newPassword || "").trim();

      if (!currentPassword || !newPassword || newPassword.length < 6) {
        return sendJson(res, 400, { ok: false, error: "New password must be at least 6 characters long." });
      }

      const validOld = verifyPassword(currentPassword, student.password_hash);
      if (!validOld) {
        return sendJson(res, 401, { ok: false, error: "Current password is incorrect." });
      }

      const newHash = hashPassword(newPassword);
      await saveMajaraStudent({
        id: student.id,
        full_name: student.full_name,
        email: student.email,
        phone: student.phone,
        password_hash: newHash,
        must_set_password: false
      });

      return sendJson(res, 200, { ok: true, message: "Password updated successfully." });
    }

    // 2.7 Student Logout
    if (action === "logout") {
      // Invalidate session in DB
      await generateStudentSession(student.id, "");
      return sendJson(res, 200, { ok: true, loggedOut: true });
    }

    return sendJson(res, 400, { ok: false, error: `Unknown action: "${action}"` });
  } catch (err) {
    console.error("[Student Portal API Error]:", err);
    return sendJson(res, 500, { ok: false, error: err.message || "Internal server error" });
  }
}
