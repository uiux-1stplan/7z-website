/**
 * 7Z MAGIC ACADEMY — FULL-STACK ENGINE
 * Neon Postgres Database, Zoho SMTP Email Engine, 20-Milestone Excel Automation via ExcelJS
 */

import { neon } from "@neondatabase/serverless";
import ExcelJS from "exceljs";
import nodemailer from "nodemailer";
import crypto from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BRAND,
  buildAdminRegistrationAlertHtml,
  buildStudentConfirmationHtml,
  buildPaymentApprovedHtml,
  buildPaymentRejectedHtml,
  buildMilestoneReportHtml,
  buildLeadMagnetEmailHtml,
  buildWaitlistEmailHtml,
  buildStudentActivationHtml,
  buildStudentPasswordResetHtml
} from "./_email-templates.mjs";
import {
  OFFICIAL_WHOP_URLS,
  resolveProductPriceUsd
} from "../lib/marketplace-catalog.mjs";

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

export function defaultCourses() {
  return [
    {
      id: "7z-course-cinematic-film",
      slug: "cinematic-film",
      title_ar: "ماستر كلاس صناعة الأفلام السينمائية بالذكاء الاصطناعي",
      title_en: "Cinematic AI Filmmaking Masterclass",
      description_ar: "مسار متكامل يبدأ من بناء السيناريو، تخطيط اللقطات، توليد الإضاءة والبيئات، إلى المونتاج وهندسة الصوت السينمائي بأعلى معايير الإخراج.",
      description_en: "End-to-end masterclass from screenplay generation to cinematic lighting, camera pacing, sound engineering and 4K grading.",
      cover_image: "/media/posters/film/1.webp",
      price_usd: 250,
      drive_folder_url: "https://drive.google.com/drive/folders/7z-cinematic-vault",
      is_published: true,
      created_at: new Date().toISOString()
    },
    {
      id: "7z-course-ai-engineering",
      slug: "ai-engineering",
      title_ar: "هندسة وبناء وكلاء الذكاء الاصطناعي المستقلين",
      title_en: "Autonomous AI Agents & Systems for Engineers",
      description_ar: "بناء وكلاء الذكاء الاصطناعي المستقلين، أتمتة خطوط الإنتاج والشركات، ربط بروتوكول MCP، وتطوير البنى التحتية المتينة.",
      description_en: "Building autonomous agents, multi-agent systems, MCP architecture, tool execution and scalable production pipelines.",
      cover_image: "/media/posters/ai-masterclass/1.webp",
      price_usd: 350,
      drive_folder_url: "https://drive.google.com/drive/folders/7z-ai-agents-vault",
      is_published: true,
      created_at: new Date().toISOString()
    }
  ];
}

export function defaultLessons() {
  return [
    {
      id: "7z-lesson-film-01",
      course_id: "7z-course-cinematic-film",
      module_order: 1,
      module_title: "الوحدة 1: التأسيس والرؤية الإخراجية / Module 1: Foundation & Vision",
      lesson_order: 1,
      title_ar: "مقدمة خط الإنتاج السينمائي 2026",
      title_en: "Introduction to AI Filmmaking Pipeline 2026",
      summary: "استعراض الهيكل العام لصناعة الفيلم باستخدام الذكاء الاصطناعي، من القصة إلى المؤثرات النهائية والمونتاج.",
      source_type: "youtube",
      source_id: "dQw4w9WgXcQ",
      duration_label: "14:20",
      resources_json: [
        { name: "7Z Cinematic Masterclass Roadmap (PDF)", url: "https://7z-magic.com/assets/docs/roadmap.pdf" }
      ],
      is_free_preview: true,
      created_at: new Date().toISOString()
    },
    {
      id: "7z-lesson-film-02",
      course_id: "7z-course-cinematic-film",
      module_order: 1,
      module_title: "الوحدة 1: التأسيس والرؤية الإخراجية / Module 1: Foundation & Vision",
      lesson_order: 2,
      title_ar: "كتابة السيناريو البصري وهندسة الأوامر الحركية",
      title_en: "Visual Screenplay & Motion Prompting",
      summary: "كيفية صياغة توجيهات حركات الكاميرا (Pan, Tilt, Dolly) والتحكم بزوايا العدسات والإضاءة الدرامية.",
      source_type: "youtube",
      source_id: "kJQP7kiw5Fk",
      duration_label: "22:45",
      resources_json: [
        { name: "Motion Prompting Cheat Sheet (Markdown)", url: "https://7z-magic.com/assets/docs/motion-prompts.md" }
      ],
      is_free_preview: false,
      created_at: new Date().toISOString()
    },
    {
      id: "7z-lesson-film-03",
      course_id: "7z-course-cinematic-film",
      module_order: 2,
      module_title: "الوحدة 2: الإخراج والإنتاج المتقدم / Module 2: Production & Realism",
      lesson_order: 1,
      title_ar: "التناسق البصري للشخصيات والبيئات المكانية",
      title_en: "Character & Spatial Consistency",
      summary: "تقنيات الحفاظ على هوية الشخصية والبيئة عبر جميع المشاهد واللقطات دون تشوه.",
      source_type: "youtube",
      source_id: "L_LUpnjgPso",
      duration_label: "31:10",
      resources_json: [],
      is_free_preview: false,
      created_at: new Date().toISOString()
    },
    {
      id: "7z-lesson-eng-01",
      course_id: "7z-course-ai-engineering",
      module_order: 1,
      module_title: "الوحدة 1: المعمارية الأساسية للوكلاء / Module 1: Agent Architecture",
      lesson_order: 1,
      title_ar: "معمارية بروتوكول سياق النماذج MCP والوكلاء الذاتيين",
      title_en: "MCP Architecture & Autonomous Agents Overview",
      summary: "مدخل معماري لفهم بروتوكول MCP، اتخاذ القرار الذاتي، وتوجيه الأدوات في بيئات الإنتاج.",
      source_type: "youtube",
      source_id: "fJ9rUzIMcZQ",
      duration_label: "18:50",
      resources_json: [
        { name: "MCP Architecture Blueprint", url: "https://7z-magic.com/assets/docs/mcp-spec.pdf" }
      ],
      is_free_preview: true,
      created_at: new Date().toISOString()
    }
  ];
}

// Default Data Storage Fallback
function defaultData() {
  return {
    registrations: [],
    courses: defaultCourses(),
    lessons: defaultLessons(),
    students: [],
    enrollments: [],
    progress: [],
    coupons: [
      { id: "c1", code: "7ZVIP", discountPercent: 20, courseScope: "all", status: "active", createdAt: new Date().toISOString() },
      { id: "c2", code: "MAGIC15", discountPercent: 15, courseScope: "all", status: "active", createdAt: new Date().toISOString() },
      { id: "c3", code: "DIRECT15", discountPercent: 15, courseScope: "all", status: "active", createdAt: new Date().toISOString() },
      { id: "c4", code: "HASSAN25", discountPercent: 25, courseScope: "all", status: "active", createdAt: new Date().toISOString() },
      { id: "c5", code: "SHAAS25", discountPercent: 25, courseScope: "all", status: "active", createdAt: new Date().toISOString() },
      { id: "c6", code: "HASSAN10", discountPercent: 10, courseScope: "all", status: "active", createdAt: new Date().toISOString() },
      { id: "c7", code: "SHAS10", discountPercent: 10, courseScope: "all", status: "active", createdAt: new Date().toISOString() },
      { id: "c8", code: "ABDULRAHMAN10", discountPercent: 10, courseScope: "all", status: "active", createdAt: new Date().toISOString() },
      { id: "c9", code: "7Z10", discountPercent: 10, courseScope: "all", status: "active", createdAt: new Date().toISOString() },
      { id: "c10", code: "ALUMNI15", discountPercent: 15, courseScope: "all", status: "active", createdAt: new Date().toISOString() },
      { id: "c11", code: "ENG7SANZ", discountPercent: 10, courseScope: "all", status: "active", createdAt: new Date().toISOString() }
    ],
    affiliates: [
      { id: "a1", name: "Hasan Rayan", email: "hasan@7z-magic.com", code: "HASSAN25", discountPercent: 25, commissionPercent: 20, status: "active", createdAt: new Date().toISOString() },
      { id: "a2", name: "Shaas Matar", email: "shaas@7z-magic.com", code: "SHAAS25", discountPercent: 25, commissionPercent: 20, status: "active", createdAt: new Date().toISOString() },
      { id: "a3", name: "Abdulrahman Mohammed", email: "abdulrahman@7z-magic.com", code: "ABDULRAHMAN10", discountPercent: 10, commissionPercent: 25, status: "active", createdAt: new Date().toISOString() }
    ],
    waitlist: [],
    leads: [],
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
  let data;
  try {
    data = JSON.parse(readFileSync(storageFile, "utf8"));
  } catch {
    data = defaultData();
  }
  if (!Array.isArray(data.courses) || data.courses.length === 0) data.courses = defaultCourses();
  if (!Array.isArray(data.lessons) || data.lessons.length === 0) data.lessons = defaultLessons();
  if (!Array.isArray(data.students)) data.students = [];
  if (!Array.isArray(data.enrollments)) data.enrollments = [];
  if (!Array.isArray(data.progress)) data.progress = [];
  return data;
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
    // 1. Course Registrations Base Table (Must exist first)
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
        goal TEXT DEFAULT '',
        previous_course_email TEXT DEFAULT '',
        course_id TEXT NOT NULL DEFAULT 'cinematic-film',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        payment_submitted_at TIMESTAMPTZ DEFAULT NOW(),
        payment_status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
        price_jod NUMERIC(10,3) NOT NULL DEFAULT 250,
        discount_jod NUMERIC(10,3) NOT NULL DEFAULT 0,
        coupon_code TEXT DEFAULT '',
        affiliate_name TEXT DEFAULT '',
        commission_percent NUMERIC(5,2) DEFAULT 0,
        commission_jod NUMERIC(10,3) DEFAULT 0,
        commission_status TEXT DEFAULT 'NOT_APPLICABLE',
        payment_provider TEXT DEFAULT 'CliQ / Western Union',
        payment_reference TEXT DEFAULT '',
        receipt_url TEXT DEFAULT '',
        receipt_name TEXT DEFAULT '',
        receipt_base64 TEXT DEFAULT ''
      );
    `;

    // 2. Academy Registrations Table
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
        preferred_language TEXT DEFAULT 'ar',
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

    // 3. Ensure all columns exist in course_registrations
    try {
      await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS seat_number INTEGER;`;
      await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '';`;
      await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS experience TEXT DEFAULT '';`;
      await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'ar';`;
      await sql`ALTER TABLE course_registrations ALTER COLUMN preferred_language SET DEFAULT 'ar';`;
      await sql`UPDATE course_registrations SET preferred_language = 'ar' WHERE preferred_language IS NULL;`;
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
      await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';`;
      await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS price_usd NUMERIC(10,2);`;
      await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS discount_usd NUMERIC(10,2);`;
      await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'course';`;
      await sql`ALTER TABLE academy_registrations ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';`;
      await sql`ALTER TABLE academy_registrations ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'CliQ / Western Union';`;
      await sql`ALTER TABLE academy_registrations ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'course';`;
      await sql`ALTER TABLE academy_registrations ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'ar';`;
    } catch (e) {
      console.warn("Column migration notice:", e.message);
    }

    // 3b. Marketplace Waitlist & Lead Magnet Tables
    await sql`
      CREATE TABLE IF NOT EXISTS marketplace_waitlist (
        id BIGSERIAL PRIMARY KEY,
        reference TEXT NOT NULL UNIQUE,
        product_id TEXT NOT NULL,
        product_title TEXT NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        whatsapp TEXT NOT NULL,
        discipline TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'WAITLISTED',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS marketplace_leads (
        id BIGSERIAL PRIMARY KEY,
        reference TEXT NOT NULL UNIQUE,
        campaign TEXT NOT NULL DEFAULT 'prompt_vault_5000',
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'DELIVERED',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    // 3c. Deleted Registrations Audit Table (prevents resurrection on sync or refresh)
    await sql`
      CREATE TABLE IF NOT EXISTS deleted_registrations (
        id TEXT,
        reference TEXT,
        email TEXT,
        course_id TEXT,
        deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_del_reg_ref ON deleted_registrations(reference);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_del_reg_id ON deleted_registrations(id);`;
    } catch {}

    // 4. Bidirectional Sync from academy_registrations to course_registrations
    try {
      await sql`
        INSERT INTO course_registrations (
          seat_number, full_name, email, phone, location, experience, preferred_language, course_id,
          price_jod, discount_jod, price_usd, discount_usd, currency, coupon_code,
          payment_status, payment_provider, payment_reference,
          receipt_url, receipt_name, receipt_base64, created_at
        )
        SELECT
          ar.seat_number, ar.full_name, ar.email, ar.phone, ar.city, ar.experience,
          COALESCE(NULLIF(ar.preferred_language, ''), 'ar'),
          CASE
            WHEN ar.course_id IN ('ai-engineers', 'course-eng', 'ai-for-engineers') THEN 'ai-engineering'
            WHEN ar.course_id IN ('course-film', 'cinematic-filmmaking-with-ai') THEN 'cinematic-film'
            ELSE ar.course_id
          END,
          ar.final_price, ar.discount_jod, ar.final_price, ar.discount_jod, COALESCE(ar.currency, 'USD'),
          ar.promo_code, ar.payment_status, COALESCE(ar.payment_provider, 'CliQ / Western Union'), ar.reference,
          ar.receipt_url, ar.receipt_name, ar.receipt_base64, ar.created_at
        FROM academy_registrations ar
        WHERE NOT EXISTS (
          SELECT 1 FROM course_registrations cr WHERE cr.payment_reference = ar.reference
        )
        AND NOT EXISTS (
          SELECT 1 FROM deleted_registrations dr
          WHERE (dr.reference IS NOT NULL AND dr.reference = ar.reference)
             OR (dr.id IS NOT NULL AND dr.id = ar.id::text)
        );
      `;
    } catch (e) {
      console.warn("Sync migration notice:", e.message);
    }

    // 5. Coupons Table (academy_coupons)
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

    // 6. Affiliates Table (academy_affiliates)
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

    // 7. System Migrations and Deleted Codes Tracker
    await sql`
      CREATE TABLE IF NOT EXISTS academy_system_migrations (
        migration_key TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS deleted_discount_codes (
        code TEXT PRIMARY KEY,
        deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    // Seed standard default coupons ONCE only, respecting deleted codes
    try {
      const [seedMigration] = await sql`
        INSERT INTO academy_system_migrations (migration_key)
        VALUES ('initial_default_coupons_seed_v1')
        ON CONFLICT (migration_key) DO NOTHING
        RETURNING migration_key;
      `;
      if (seedMigration) {
        const defaultCodes = [
          ["7ZVIP", 20, "all"],
          ["MAGIC15", 15, "all"],
          ["DIRECT15", 15, "all"],
          ["HASSAN25", 25, "all"],
          ["SHAAS25", 25, "all"],
          ["HASSAN10", 10, "all"],
          ["SHAS10", 10, "all"],
          ["ABDULRAHMAN10", 10, "all"],
          ["7Z10", 10, "all"],
          ["ALUMNI15", 15, "all"]
        ];
        for (const [cd, disc, scope] of defaultCodes) {
          await sql`
            INSERT INTO academy_coupons (code, discount_percent, course_scope, status)
            SELECT ${cd}, ${disc}, ${scope}, 'active'
            WHERE NOT EXISTS (SELECT 1 FROM deleted_discount_codes WHERE UPPER(code) = UPPER(${cd}))
            ON CONFLICT (code) DO NOTHING;
          `;
          await sql`
            INSERT INTO course_discount_codes (code, discount_percent, course_id, status)
            SELECT ${cd}, ${disc}, ${scope}, 'active'
            WHERE NOT EXISTS (SELECT 1 FROM deleted_discount_codes WHERE UPPER(code) = UPPER(${cd}))
            ON CONFLICT (code) DO NOTHING;
          `;
        }
      }
    } catch (e) {
      console.warn("Coupon seed notice:", e.message);
    }

    try {
      const [engCouponMig] = await sql`
        INSERT INTO academy_system_migrations (migration_key)
        VALUES ('marketplace_eng7sanz_coupon_v1')
        ON CONFLICT (migration_key) DO NOTHING
        RETURNING migration_key;
      `;
      if (engCouponMig) {
        await sql`
          INSERT INTO academy_coupons (code, discount_percent, course_scope, status)
          SELECT 'ENG7SANZ', 10, 'all', 'active'
          WHERE NOT EXISTS (SELECT 1 FROM deleted_discount_codes WHERE UPPER(code) = 'ENG7SANZ')
          ON CONFLICT (code) DO NOTHING;
        `;
        await sql`
          INSERT INTO course_discount_codes (code, discount_percent, course_id, status)
          SELECT 'ENG7SANZ', 10, 'all', 'active'
          WHERE NOT EXISTS (SELECT 1 FROM deleted_discount_codes WHERE UPPER(code) = 'ENG7SANZ')
          ON CONFLICT (code) DO NOTHING;
        `;
      }
    } catch (e) {
      console.warn("ENG7SANZ coupon seed notice:", e.message);
    }

    // 8. Majara Academy 5-Core Tables Auto-Migration (Zero-Cost Production Schema)
    try {
      await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto;`;
      await sql`
        CREATE TABLE IF NOT EXISTS academy_students (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          full_name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT,
          password_hash TEXT,
          must_set_password BOOLEAN NOT NULL DEFAULT TRUE,
          active_session_token TEXT,
          last_ip TEXT,
          last_login_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_academy_students_email_lower
        ON academy_students (LOWER(TRIM(email)));
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS academy_courses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug TEXT UNIQUE NOT NULL,
          title_ar TEXT NOT NULL,
          title_en TEXT NOT NULL,
          description_ar TEXT,
          description_en TEXT,
          cover_image TEXT,
          price_usd NUMERIC(10,2) DEFAULT 0,
          drive_folder_url TEXT,
          is_published BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS academy_lessons (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          course_id UUID NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
          module_order INT NOT NULL DEFAULT 1,
          module_title TEXT NOT NULL,
          lesson_order INT NOT NULL DEFAULT 1,
          title_ar TEXT NOT NULL,
          title_en TEXT NOT NULL,
          summary TEXT,
          source_type TEXT NOT NULL CHECK (source_type IN ('youtube', 'gdrive')),
          source_id TEXT NOT NULL,
          duration_label TEXT,
          resources_json JSONB DEFAULT '[]'::jsonb,
          is_free_preview BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS student_course_enrollments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id UUID NOT NULL REFERENCES academy_students(id) ON DELETE CASCADE,
          course_id UUID NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
          granted_by TEXT,
          enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT uq_student_course_enrollment UNIQUE (student_id, course_id)
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS student_lesson_progress (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id UUID NOT NULL REFERENCES academy_students(id) ON DELETE CASCADE,
          lesson_id UUID NOT NULL REFERENCES academy_lessons(id) ON DELETE CASCADE,
          completed BOOLEAN NOT NULL DEFAULT FALSE,
          last_position_sec INT NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT uq_student_lesson_progress UNIQUE (student_id, lesson_id)
        );
      `;

      // Seed default courses in Postgres if table is empty
      const [courseCnt] = await sql`SELECT COUNT(*)::int AS count FROM academy_courses;`;
      if (Number(courseCnt?.count || 0) === 0) {
        for (const c of defaultCourses()) {
          const [insC] = await sql`
            INSERT INTO academy_courses (slug, title_ar, title_en, description_ar, description_en, cover_image, price_usd, drive_folder_url, is_published)
            VALUES (${c.slug}, ${c.title_ar}, ${c.title_en}, ${c.description_ar}, ${c.description_en}, ${c.cover_image}, ${c.price_usd}, ${c.drive_folder_url}, ${c.is_published})
            ON CONFLICT (slug) DO NOTHING
            RETURNING id, slug;
          `;
          if (insC) {
            const courseLessons = defaultLessons().filter(l => l.course_id === c.id || l.course_id === insC.slug);
            for (const l of courseLessons) {
              await sql`
                INSERT INTO academy_lessons (course_id, module_order, module_title, lesson_order, title_ar, title_en, summary, source_type, source_id, duration_label, resources_json, is_free_preview)
                VALUES (${insC.id}, ${l.module_order}, ${l.module_title}, ${l.lesson_order}, ${l.title_ar}, ${l.title_en}, ${l.summary}, ${l.source_type}, ${l.source_id}, ${l.duration_label}, ${JSON.stringify(l.resources_json || [])}::jsonb, ${l.is_free_preview});
              `;
            }
          }
        }
      }
    } catch (e) {
      console.warn("Majara schema auto-migration notice:", e.message);
    }
  } catch (err) {
    console.warn("Neon DB schema initialization warning (will use local fallback):", err.message);
  }
}

// Dual-Lookup: Case-insensitive, trimmed, unified status check across Postgres and local JSON
export async function validateAndResolveDiscountCode(codeStr, courseId = "all") {
  const code = String(codeStr || "").trim().toUpperCase();
  if (!code) {
    return { valid: false, message: "يرجى إدخال الكود / Please enter a code" };
  }

  const normalizedCourse = String(courseId || "all").trim().toLowerCase();

  const isStatusActive = (val) => {
    if (typeof val === "boolean") return val;
    const s = String(val || "").trim().toLowerCase();
    return s === "active" || s === "true" || s === "1" || s === "enabled";
  };

  const isCourseScopeMatch = (scope) => {
    if (!scope || scope === "all") return true;
    if (normalizedCourse === "all") return true;
    return scope.toLowerCase() === normalizedCourse;
  };

  // Step 1: Database Dual-Lookup (PostgreSQL)
  const sql = getSqlClient();
  if (sql) {
    try {
      // 1. Check course_discount_codes
      const rows = await sql`
        SELECT 
          c.code, c.affiliate_id, c.course_id, c.discount_percent, c.commission_percent,
          c.status, c.max_redemptions,
          COALESCE(NULLIF(a.name, ''), c.affiliate_name, '') AS affiliate_name,
          a.status AS affiliate_status
        FROM course_discount_codes c
        LEFT JOIN course_admin_affiliates a ON a.id = c.affiliate_id
        WHERE UPPER(TRIM(c.code)) = ${code}
        LIMIT 1;
      `;
      if (rows && rows.length > 0) {
        const item = rows[0];
        if (!isStatusActive(item.status)) {
          return { valid: false, message: "الكود غير مفعّل حالياً / Code is inactive" };
        }
        if (!isCourseScopeMatch(item.course_id)) {
          return { valid: false, message: "هذا الكود غير مخصص لهذه الدورة / Code not valid for this course" };
        }
        if (item.max_redemptions) {
          try {
            const [used] = await sql`SELECT COUNT(*)::int AS count FROM course_registrations WHERE UPPER(TRIM(coupon_code)) = ${code}`;
            if (Number(used?.count || 0) >= Number(item.max_redemptions)) {
              return { valid: false, message: "تم الوصول إلى الحد الأقصى لاستخدام هذا الكود / Code redemption limit reached" };
            }
          } catch {}
        }
        return {
          valid: true,
          code: item.code.toUpperCase(),
          discountPercent: Number(item.discount_percent),
          commissionPercent: Number(item.commission_percent || 0),
          affiliateName: item.affiliate_name || "",
          type: item.affiliate_id ? "affiliate" : "coupon"
        };
      }

      // 2. Check academy_coupons
      const couponRows = await sql`
        SELECT code, discount_percent, course_scope, status
        FROM academy_coupons
        WHERE UPPER(TRIM(code)) = ${code}
        LIMIT 1;
      `;
      if (couponRows && couponRows.length > 0) {
        const item = couponRows[0];
        if (!isStatusActive(item.status)) {
          return { valid: false, message: "الكود غير مفعّل حالياً / Code is inactive" };
        }
        if (!isCourseScopeMatch(item.course_scope)) {
          return { valid: false, message: "هذا الكود غير مخصص لهذه الدورة / Code not valid for this course" };
        }
        return {
          valid: true,
          code: item.code.toUpperCase(),
          discountPercent: Number(item.discount_percent),
          commissionPercent: 0,
          affiliateName: "",
          type: "coupon"
        };
      }

      // 3. Check academy_affiliates
      const affRows = await sql`
        SELECT code, name, discount_percent, commission_percent, status
        FROM academy_affiliates
        WHERE UPPER(TRIM(code)) = ${code}
        LIMIT 1;
      `;
      if (affRows && affRows.length > 0) {
        const item = affRows[0];
        if (!isStatusActive(item.status)) {
          return { valid: false, message: "الكود غير مفعّل حالياً / Code is inactive" };
        }
        return {
          valid: true,
          code: item.code.toUpperCase(),
          discountPercent: Number(item.discount_percent),
          commissionPercent: Number(item.commission_percent || 20),
          affiliateName: item.name || "",
          type: "affiliate"
        };
      }
    } catch (e) {
      console.warn("[Dual-Lookup] SQL lookup notice, falling back to local store:", e.message);
    }
  }

  // Step 2: Local JSON Storage Fallback
  try {
    const local = readLocalData();
    const c = (local.coupons || []).find(
      (x) => String(x.code || "").trim().toUpperCase() === code
    );
    if (c) {
      if (!isStatusActive(c.status)) {
        return { valid: false, message: "الكود غير مفعّل حالياً / Code is inactive" };
      }
      if (!isCourseScopeMatch(c.courseScope)) {
        return { valid: false, message: "هذا الكود غير مخصص لهذه الدورة / Code not valid for this course" };
      }
      return {
        valid: true,
        code: c.code.toUpperCase(),
        discountPercent: Number(c.discountPercent),
        commissionPercent: 0,
        affiliateName: "",
        type: "coupon"
      };
    }

    const a = (local.affiliates || []).find(
      (x) => String(x.code || "").trim().toUpperCase() === code
    );
    if (a) {
      if (!isStatusActive(a.status)) {
        return { valid: false, message: "الكود غير مفعّل حالياً / Code is inactive" };
      }
      return {
        valid: true,
        code: a.code.toUpperCase(),
        discountPercent: Number(a.discountPercent || 15),
        commissionPercent: Number(a.commissionPercent || 20),
        affiliateName: a.name || "",
        type: "affiliate"
      };
    }
  } catch (err) {
    console.warn("[Dual-Lookup] Local store notice:", err.message);
  }

  // Step 3: Hardcoded emergency fallbacks for guaranteed reliability
  const HARDCODED_CODES = {
    HASSAN10: { discountPercent: 10, affiliateName: "حسن ريان", commissionPercent: 25 },
    SHAS10: { discountPercent: 10, affiliateName: "شأس مطر", commissionPercent: 25 },
    ABDULRAHMAN10: { discountPercent: 10, affiliateName: "عبدالرحمن محمد", commissionPercent: 25 },
    "7Z10": { discountPercent: 10, affiliateName: "", commissionPercent: 0 },
    "7ZVIP": { discountPercent: 20, affiliateName: "", commissionPercent: 0 },
    "MAGIC15": { discountPercent: 15, affiliateName: "", commissionPercent: 0 },
    "DIRECT15": { discountPercent: 15, affiliateName: "", commissionPercent: 0 },
    "HASSAN25": { discountPercent: 25, affiliateName: "حسن ريان", commissionPercent: 20 },
    "SHAAS25": { discountPercent: 25, affiliateName: "شأس مطر", commissionPercent: 20 },
    "ALUMNI15": { discountPercent: 15, affiliateName: "", commissionPercent: 0 },
    "ENG7SANZ": { discountPercent: 10, affiliateName: "", commissionPercent: 0 }
  };

  if (HARDCODED_CODES[code]) {
    const item = HARDCODED_CODES[code];
    return {
      valid: true,
      code,
      discountPercent: item.discountPercent,
      commissionPercent: item.commissionPercent,
      affiliateName: item.affiliateName,
      type: item.affiliateName ? "affiliate" : "coupon"
    };
  }

  return { valid: false, message: "الكود المدخل غير صالح أو منتهي الصلاحية / Invalid or expired code" };
}

// Dual Persistence: Saves a coupon to both Postgres tables and local JSON
export async function saveDiscountCodeDual(couponData) {
  const code = String(couponData.code || "").trim().toUpperCase();
  const discountPercent = Number(couponData.discountPercent || 10);
  const courseScope = couponData.courseScope || "all";
  const status = couponData.status || "active";
  const affiliateId = couponData.affiliateId || null;
  const affiliateName = couponData.affiliateName || "";
  const commissionPercent = Number(couponData.commissionPercent || 0);
  const maxRedemptions = couponData.maxRedemptions ? Number(couponData.maxRedemptions) : null;

  const sql = getSqlClient();
  if (sql) {
    try {
      await sql`
        INSERT INTO course_discount_codes (
          code, affiliate_id, affiliate_name, course_id, discount_percent, commission_percent, max_redemptions, status
        ) VALUES (
          ${code}, ${affiliateId}, ${affiliateName}, ${courseScope}, ${discountPercent}, ${commissionPercent}, ${maxRedemptions}, ${status}
        ) ON CONFLICT (code) DO UPDATE SET
          discount_percent = ${discountPercent},
          commission_percent = ${commissionPercent},
          status = ${status},
          max_redemptions = ${maxRedemptions},
          updated_at = NOW();
      `;
      await sql`
        INSERT INTO academy_coupons (code, discount_percent, course_scope, status)
        VALUES (${code}, ${discountPercent}, ${courseScope}, ${status})
        ON CONFLICT (code) DO UPDATE SET
          discount_percent = ${discountPercent},
          course_scope = ${courseScope},
          status = ${status};
      `;
    } catch (e) {
      console.warn("[Dual-Save] SQL coupon notice:", e.message);
    }
  }

  try {
    const local = readLocalData();
    if (!Array.isArray(local.coupons)) local.coupons = [];
    local.coupons = local.coupons.filter(c => String(c.code).toUpperCase() !== code);
    local.coupons.push({
      id: couponData.id || `c_${Date.now()}`,
      code,
      discountPercent,
      courseScope,
      commissionPercent,
      affiliateName,
      status,
      maxRedemptions,
      createdAt: new Date().toISOString()
    });
    saveLocalData(local);
  } catch (e) {
    console.warn("[Dual-Save] Local coupon notice:", e.message);
  }
}

// Dual Persistence: Saves an affiliate to both Postgres tables and local JSON
export async function saveAffiliateDual(affiliateData) {
  const name = String(affiliateData.name || "").trim();
  const email = String(affiliateData.email || "").trim().toLowerCase();
  const company = String(affiliateData.company || "").trim();
  const commissionPercent = Number(affiliateData.commissionPercent || 20);
  const discountPercent = Number(affiliateData.discountPercent || 15);
  const code = affiliateData.code ? String(affiliateData.code).trim().toUpperCase() : `${name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)}15`;
  const status = affiliateData.status || "active";

  const sql = getSqlClient();
  let affiliateId = affiliateData.id || null;
  if (sql) {
    try {
      const [a] = await sql`
        INSERT INTO course_admin_affiliates (name, email, company, commission_percent, status)
        VALUES (${name}, ${email || null}, ${company}, ${commissionPercent}, ${status})
        RETURNING id;
      `;
      if (a) affiliateId = a.id;

      await sql`
        INSERT INTO academy_affiliates (name, email, code, discount_percent, commission_percent, status)
        VALUES (${name}, ${email}, ${code}, ${discountPercent}, ${commissionPercent}, ${status})
        ON CONFLICT (code) DO UPDATE SET
          name = ${name},
          email = ${email},
          discount_percent = ${discountPercent},
          commission_percent = ${commissionPercent},
          status = ${status};
      `;

      await sql`
        INSERT INTO course_discount_codes (
          code, affiliate_id, affiliate_name, course_id, discount_percent, commission_percent, status
        ) VALUES (
          ${code}, ${affiliateId}, ${name}, 'all', ${discountPercent}, ${commissionPercent}, ${status}
        ) ON CONFLICT (code) DO UPDATE SET
          affiliate_name = ${name},
          discount_percent = ${discountPercent},
          commission_percent = ${commissionPercent},
          status = ${status};
      `;
    } catch (e) {
      console.warn("[Dual-Save] SQL affiliate notice:", e.message);
    }
  }

  try {
    const local = readLocalData();
    if (!Array.isArray(local.affiliates)) local.affiliates = [];
    local.affiliates = local.affiliates.filter(a => a.name !== name && a.code !== code);
    local.affiliates.push({
      id: affiliateId || `a_${Date.now()}`,
      name,
      email,
      company,
      code,
      discountPercent,
      commissionPercent,
      status,
      createdAt: new Date().toISOString()
    });
    saveLocalData(local);
  } catch (e) {
    console.warn("[Dual-Save] Local affiliate notice:", e.message);
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

// 5. Send 5000+ Prompt Vault Lead Magnet Access Email
export async function sendLeadMagnetEmail(lead) {
  const vaultUrl = OFFICIAL_WHOP_URLS.visualStorytellingBundle;
  const html = buildLeadMagnetEmailHtml(lead, vaultUrl);
  const adminHtml = `<div style="font-family:Arial,sans-serif;padding:16px;"><h3>New Lead Magnet Unlock (5000+ Vault)</h3><p><b>Name:</b> ${lead.fullName}</p><p><b>Email:</b> ${lead.email}</p><p><b>Ref:</b> ${lead.reference}</p></div>`;
  const [userRes, adminRes] = await Promise.allSettled([
    sendEmail({
      to: lead.email,
      subject: lead.language === "en" ? "Your 5000+ AI Prompts Vault Access | 7Z Magic" : "رابط وصولك إلى بنك البرومبتات الذهبي | 7Z Magic",
      html
    }),
    sendEmail({
      to: ADMIN_EMAIL,
      subject: `[7Z LEAD] تحميل بنك البرومبتات: ${lead.fullName} (${lead.reference})`,
      html: adminHtml
    })
  ]);
  return {
    user: userRes.status === "fulfilled" ? userRes.value : { error: userRes.reason?.message },
    admin: adminRes.status === "fulfilled" ? adminRes.value : { error: adminRes.reason?.message }
  };
}

// 6. Send VIP Waitlist Confirmation & Admin Alert
export async function sendWaitlistEmails(entry) {
  const html = buildWaitlistEmailHtml(entry);
  const adminHtml = `<div style="font-family:Arial,sans-serif;padding:16px;"><h3>New VIP Waitlist Registration</h3><p><b>Product:</b> ${entry.productTitle} (${entry.productId})</p><p><b>Name:</b> ${entry.fullName}</p><p><b>Email:</b> ${entry.email}</p><p><b>WhatsApp:</b> ${entry.whatsapp}</p><p><b>Discipline:</b> ${entry.discipline || "—"}</p><p><b>Ref:</b> ${entry.reference}</p></div>`;
  const [userRes, adminRes] = await Promise.allSettled([
    sendEmail({
      to: entry.email,
      subject: `تأكيد تسجيل VIP | ${entry.productTitle} — ${entry.reference}`,
      html
    }),
    sendEmail({
      to: ADMIN_EMAIL,
      subject: `[7Z WAITLIST] ${entry.productTitle}: ${entry.fullName}`,
      html: adminHtml
    })
  ]);
  return {
    user: userRes.status === "fulfilled" ? userRes.value : { error: userRes.reason?.message },
    admin: adminRes.status === "fulfilled" ? adminRes.value : { error: adminRes.reason?.message }
  };
}

// 7. Generate Styled Excel Report using ExcelJS (USD)
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
    "Enrolled Course / Product",
    "Amount (USD)",
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
    const resolvedFallback = resolveProductPriceUsd(r.courseId || r.course_id, 0);
    const amountUsd = Number(r.finalPrice ?? r.price_usd ?? r.price_jod ?? resolvedFallback);
    const row = worksheet.addRow([
      r.seatNumber || r.seat_number || idx + 1,
      r.reference || `7Z-REG-${r.id}`,
      r.fullName || r.full_name || "—",
      r.email || "—",
      r.phone || "—",
      r.courseName || r.course_id || "7Z Product",
      amountUsd,
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
    row.getCell(7).numFmt = "$#,##0.00";
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

// 8. Trigger 20-Registrations Excel Report (To: magic7z.ai@gmail.com)
export async function trigger20RegistrationExcelReport(allRegistrations, totalCount) {
  try {
    const latest20 = allRegistrations.slice(-20);
    const excelBuffer = await generateStyledExcelReportBuffer(latest20, totalCount);
    const filename = `7Z-Academy-Report-Registrations-${totalCount}.xlsx`;

    const totalRevenue = latest20
      .filter((r) => ["PAID", "APPROVED", "VERIFIED"].includes(r.paymentStatus || r.payment_status))
      .reduce((sum, r) => sum + Number(r.finalPrice ?? r.price_usd ?? r.price_jod ?? 0), 0);

    const html = buildMilestoneReportHtml(totalCount, latest20.length, {
      revenueUsd: totalRevenue.toFixed(2)
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




// =============================================================================
// MAJARA ACADEMY FULL-STACK ENGINE METHODS
// Dual-Stack: PostgreSQL Neon Serverless + Local JSON Fallback Resilience
// Single-Session Lock, Dynamic Forensic Watermark Data, Strict CSP
// =============================================================================

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== "string" || !storedHash.includes(":")) return false;
  try {
    const [salt, key] = storedHash.split(":");
    const testHash = crypto.scryptSync(String(password), salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(key, "hex"), Buffer.from(testHash, "hex"));
  } catch {
    return false;
  }
}

export function extractVideoSource(inputUrlOrId, preferredType = null) {
  const raw = String(inputUrlOrId || "").trim();
  if (!raw) return { sourceType: "youtube", sourceId: "", embedUrl: "" };

  // 1. Google Drive Patterns
  if (preferredType === "gdrive" || raw.includes("drive.google.com")) {
    const dMatch = raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                   raw.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                   raw.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    const gId = dMatch ? dMatch[1] : raw;
    return {
      sourceType: "gdrive",
      sourceId: gId,
      embedUrl: `https://drive.google.com/file/d/${gId}/preview`
    };
  }

  // 2. YouTube Patterns (Watch, Shorts, Embed, youtu.be)
  const ytMatch = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/) ||
                  raw.match(/^([\w-]{11})$/);
  const ytId = ytMatch ? ytMatch[1] : raw;
  return {
    sourceType: "youtube",
    sourceId: ytId,
    embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1&controls=0&disablekb=1&iv_load_policy=3&enablejsapi=1`
  };
}

export async function getMajaraCourses(publishedOnly = false) {
  await ensureDbSchema().catch(() => {});
  const sql = getSqlClient();
  if (sql) {
    try {
      const rows = publishedOnly
        ? await sql`SELECT * FROM academy_courses WHERE is_published = TRUE ORDER BY created_at ASC;`
        : await sql`SELECT * FROM academy_courses ORDER BY created_at ASC;`;
      if (rows && rows.length > 0) return rows;
    } catch (e) {
      console.warn("SQL getMajaraCourses fallback notice:", e.message);
    }
  }

  const local = readLocalData();
  const list = local.courses || [];
  return publishedOnly ? list.filter(c => c.is_published) : list;
}

export async function getMajaraCourseByIdOrSlug(idOrSlug) {
  if (!idOrSlug) return null;
  await ensureDbSchema().catch(() => {});
  const sql = getSqlClient();
  const needle = String(idOrSlug).trim();

  if (sql) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(needle);
      const rows = isUuid
        ? await sql`SELECT * FROM academy_courses WHERE id = ${needle} OR slug = ${needle} LIMIT 1;`
        : await sql`SELECT * FROM academy_courses WHERE slug = ${needle} OR id::text = ${needle} LIMIT 1;`;
      if (rows && rows.length > 0) return rows[0];
    } catch (e) {
      console.warn("SQL getMajaraCourseByIdOrSlug notice:", e.message);
    }
  }

  const local = readLocalData();
  return (local.courses || []).find(c => String(c.id) === needle || String(c.slug) === needle) || null;
}

export async function saveMajaraCourse(courseData) {
  await ensureDbSchema().catch(() => {});
  const sql = getSqlClient();
  const local = readLocalData();

  const id = courseData.id || `course-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
  const slug = String(courseData.slug || courseData.title_en || id).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "");
  const title_ar = String(courseData.title_ar || "").trim() || "دورة تعليمية جديدة";
  const title_en = String(courseData.title_en || "").trim() || "New Masterclass";
  const description_ar = String(courseData.description_ar || "").trim();
  const description_en = String(courseData.description_en || "").trim();
  const cover_image = String(courseData.cover_image || "/media/posters/film/1.webp").trim();
  const price_usd = Number(courseData.price_usd || 0);
  const drive_folder_url = String(courseData.drive_folder_url || "").trim();
  const is_published = Boolean(courseData.is_published);
  const created_at = courseData.created_at || new Date().toISOString();

  let saved = null;
  if (sql) {
    try {
      const [r] = await sql`
        INSERT INTO academy_courses (slug, title_ar, title_en, description_ar, description_en, cover_image, price_usd, drive_folder_url, is_published)
        VALUES (${slug}, ${title_ar}, ${title_en}, ${description_ar}, ${description_en}, ${cover_image}, ${price_usd}, ${drive_folder_url}, ${is_published})
        ON CONFLICT (slug) DO UPDATE SET
          title_ar = EXCLUDED.title_ar,
          title_en = EXCLUDED.title_en,
          description_ar = EXCLUDED.description_ar,
          description_en = EXCLUDED.description_en,
          cover_image = EXCLUDED.cover_image,
          price_usd = EXCLUDED.price_usd,
          drive_folder_url = EXCLUDED.drive_folder_url,
          is_published = EXCLUDED.is_published
        RETURNING *;
      `;
      if (r) saved = r;
    } catch (e) {
      console.warn("SQL saveMajaraCourse fallback notice:", e.message);
    }
  }

  // Local sync
  const item = {
    id: saved?.id || id,
    slug,
    title_ar,
    title_en,
    description_ar,
    description_en,
    cover_image,
    price_usd,
    drive_folder_url,
    is_published,
    created_at
  };
  const idx = local.courses.findIndex(c => String(c.id) === String(item.id) || String(c.slug) === slug);
  if (idx >= 0) local.courses[idx] = item;
  else local.courses.push(item);
  saveLocalData(local);

  return saved || item;
}

export async function deleteMajaraCourse(courseId) {
  await ensureDbSchema().catch(() => {});
  const sql = getSqlClient();
  const needle = String(courseId).trim();

  if (sql) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(needle);
      if (isUuid) {
        await sql`DELETE FROM academy_courses WHERE id = ${needle};`;
      } else {
        await sql`DELETE FROM academy_courses WHERE slug = ${needle} OR id::text = ${needle};`;
      }
    } catch (e) {
      console.warn("SQL deleteMajaraCourse notice:", e.message);
    }
  }

  const local = readLocalData();
  local.courses = (local.courses || []).filter(c => String(c.id) !== needle && String(c.slug) !== needle);
  local.lessons = (local.lessons || []).filter(l => String(l.course_id) !== needle);
  saveLocalData(local);
  return { ok: true, deletedId: needle };
}

export async function getMajaraLessons(courseId) {
  if (!courseId) return [];
  await ensureDbSchema().catch(() => {});
  const sql = getSqlClient();
  const needle = String(courseId).trim();

  if (sql) {
    try {
      const course = await getMajaraCourseByIdOrSlug(needle);
      const cId = course?.id || needle;
      const rows = await sql`
        SELECT * FROM academy_lessons 
        WHERE course_id::text = ${String(cId)} OR course_id::text = ${needle}
        ORDER BY module_order ASC, lesson_order ASC, created_at ASC;
      `;
      if (rows && rows.length > 0) return rows;
    } catch (e) {
      console.warn("SQL getMajaraLessons fallback notice:", e.message);
    }
  }

  const local = readLocalData();
  return (local.lessons || [])
    .filter(l => String(l.course_id) === needle || String(l.course_id).includes(needle))
    .sort((a, b) => (a.module_order - b.module_order) || (a.lesson_order - b.lesson_order));
}

export async function getMajaraLesson(lessonId) {
  if (!lessonId) return null;
  await ensureDbSchema().catch(() => {});
  const sql = getSqlClient();
  const needle = String(lessonId).trim();

  if (sql) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(needle);
      const rows = isUuid
        ? await sql`SELECT * FROM academy_lessons WHERE id = ${needle} LIMIT 1;`
        : await sql`SELECT * FROM academy_lessons WHERE id::text = ${needle} LIMIT 1;`;
      if (rows && rows.length > 0) return rows[0];
    } catch (e) {
      console.warn("SQL getMajaraLesson notice:", e.message);
    }
  }

  const local = readLocalData();
  return (local.lessons || []).find(l => String(l.id) === needle) || null;
}

export async function saveMajaraLesson(lessonData) {
  await ensureDbSchema().catch(() => {});
  const sql = getSqlClient();
  const local = readLocalData();

  const id = lessonData.id || `lesson-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
  const course_id = String(lessonData.course_id || "").trim();
  const module_order = Math.max(1, Number(lessonData.module_order || 1));
  const module_title = String(lessonData.module_title || `Module ${module_order}`).trim();
  const lesson_order = Math.max(1, Number(lessonData.lesson_order || 1));
  const title_ar = String(lessonData.title_ar || "").trim() || "درس تعليمي جديد";
  const title_en = String(lessonData.title_en || "").trim() || "New Lesson";
  const summary = String(lessonData.summary || "").trim();

  const videoMeta = extractVideoSource(lessonData.source_id || lessonData.source_url, lessonData.source_type);
  const source_type = videoMeta.sourceType;
  const source_id = videoMeta.sourceId;
  const duration_label = String(lessonData.duration_label || "15:00").trim();
  const resources_json = Array.isArray(lessonData.resources_json)
    ? lessonData.resources_json
    : (typeof lessonData.resources_json === "string" ? JSON.parse(lessonData.resources_json || "[]") : []);
  const is_free_preview = Boolean(lessonData.is_free_preview);
  const created_at = lessonData.created_at || new Date().toISOString();

  let saved = null;
  if (sql) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        const [r] = await sql`
          INSERT INTO academy_lessons (id, course_id, module_order, module_title, lesson_order, title_ar, title_en, summary, source_type, source_id, duration_label, resources_json, is_free_preview)
          VALUES (${id}, ${course_id}, ${module_order}, ${module_title}, ${lesson_order}, ${title_ar}, ${title_en}, ${summary}, ${source_type}, ${source_id}, ${duration_label}, ${JSON.stringify(resources_json)}::jsonb, ${is_free_preview})
          ON CONFLICT (id) DO UPDATE SET
            course_id = EXCLUDED.course_id,
            module_order = EXCLUDED.module_order,
            module_title = EXCLUDED.module_title,
            lesson_order = EXCLUDED.lesson_order,
            title_ar = EXCLUDED.title_ar,
            title_en = EXCLUDED.title_en,
            summary = EXCLUDED.summary,
            source_type = EXCLUDED.source_type,
            source_id = EXCLUDED.source_id,
            duration_label = EXCLUDED.duration_label,
            resources_json = EXCLUDED.resources_json,
            is_free_preview = EXCLUDED.is_free_preview
          RETURNING *;
        `;
        if (r) saved = r;
      } else {
        const [r] = await sql`
          INSERT INTO academy_lessons (course_id, module_order, module_title, lesson_order, title_ar, title_en, summary, source_type, source_id, duration_label, resources_json, is_free_preview)
          VALUES (${course_id}, ${module_order}, ${module_title}, ${lesson_order}, ${title_ar}, ${title_en}, ${summary}, ${source_type}, ${source_id}, ${duration_label}, ${JSON.stringify(resources_json)}::jsonb, ${is_free_preview})
          RETURNING *;
        `;
        if (r) saved = r;
      }
    } catch (e) {
      console.warn("SQL saveMajaraLesson notice:", e.message);
    }
  }

  const item = {
    id: saved?.id || id,
    course_id,
    module_order,
    module_title,
    lesson_order,
    title_ar,
    title_en,
    summary,
    source_type,
    source_id,
    duration_label,
    resources_json,
    is_free_preview,
    created_at
  };
  const idx = local.lessons.findIndex(l => String(l.id) === String(item.id));
  if (idx >= 0) local.lessons[idx] = item;
  else local.lessons.push(item);
  saveLocalData(local);

  return saved || item;
}

export async function deleteMajaraLesson(lessonId) {
  await ensureDbSchema().catch(() => {});
  const sql = getSqlClient();
  const needle = String(lessonId).trim();

  if (sql) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(needle);
      if (isUuid) {
        await sql`DELETE FROM academy_lessons WHERE id = ${needle};`;
      } else {
        await sql`DELETE FROM academy_lessons WHERE id::text = ${needle};`;
      }
    } catch (e) {
      console.warn("SQL deleteMajaraLesson notice:", e.message);
    }
  }

  const local = readLocalData();
  local.lessons = (local.lessons || []).filter(l => String(l.id) !== needle);
  local.progress = (local.progress || []).filter(p => String(p.lesson_id) !== needle);
  saveLocalData(local);
  return { ok: true, deletedId: needle };
}

export async function getMajaraStudents() {
  await ensureDbSchema().catch(() => {});
  const sql = getSqlClient();
  if (sql) {
    try {
      const rows = await sql`
        SELECT 
          s.id, s.full_name, s.email, s.phone, s.must_set_password,
          s.last_ip, s.last_login_at, s.created_at,
          COALESCE(
            json_agg(
              json_build_object(
                'course_id', e.course_id,
                'status', e.status,
                'enrolled_at', e.enrolled_at,
                'course_slug', c.slug,
                'course_title_ar', c.title_ar,
                'course_title_en', c.title_en
              )
            ) FILTER (WHERE e.course_id IS NOT NULL),
            '[]'::json
          ) AS enrollments
        FROM academy_students s
        LEFT JOIN student_course_enrollments e ON e.student_id = s.id
        LEFT JOIN academy_courses c ON c.id = e.course_id
        GROUP BY s.id
        ORDER BY s.created_at DESC;
      `;
      if (rows && rows.length > 0) return rows;
    } catch (e) {
      console.warn("SQL getMajaraStudents fallback notice:", e.message);
    }
  }

  const local = readLocalData();
  return (local.students || []).map(s => {
    const ens = (local.enrollments || [])
      .filter(e => String(e.student_id) === String(s.id))
      .map(e => {
        const c = (local.courses || []).find(course => String(course.id) === String(e.course_id) || String(course.slug) === String(e.course_id));
        return {
          course_id: e.course_id,
          status: e.status,
          enrolled_at: e.enrolled_at,
          course_slug: c?.slug || e.course_id,
          course_title_ar: c?.title_ar || e.course_id,
          course_title_en: c?.title_en || e.course_id
        };
      });
    return {
      ...s,
      enrollments: ens
    };
  });
}

export async function getMajaraStudentByEmail(email) {
  if (!email) return null;
  await ensureDbSchema().catch(() => {});
  const normEmail = String(email).trim().toLowerCase();
  const sql = getSqlClient();

  if (sql) {
    try {
      const rows = await sql`SELECT * FROM academy_students WHERE LOWER(TRIM(email)) = ${normEmail} LIMIT 1;`;
      if (rows && rows.length > 0) return rows[0];
    } catch (e) {
      console.warn("SQL getMajaraStudentByEmail notice:", e.message);
    }
  }

  const local = readLocalData();
  return (local.students || []).find(s => String(s.email).trim().toLowerCase() === normEmail) || null;
}

export async function getMajaraStudentById(id) {
  if (!id) return null;
  await ensureDbSchema().catch(() => {});
  const needle = String(id).trim();
  const sql = getSqlClient();

  if (sql) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(needle);
      const rows = isUuid
        ? await sql`SELECT * FROM academy_students WHERE id = ${needle} LIMIT 1;`
        : await sql`SELECT * FROM academy_students WHERE id::text = ${needle} LIMIT 1;`;
      if (rows && rows.length > 0) return rows[0];
    } catch (e) {
      console.warn("SQL getMajaraStudentById notice:", e.message);
    }
  }

  const local = readLocalData();
  return (local.students || []).find(s => String(s.id) === needle) || null;
}

export async function saveMajaraStudent(studentData) {
  await ensureDbSchema().catch(() => {});
  const sql = getSqlClient();
  const local = readLocalData();

  const id = studentData.id || `student-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
  const full_name = String(studentData.full_name || studentData.fullName || "").trim() || "Student";
  const email = String(studentData.email || "").trim().toLowerCase();
  const phone = String(studentData.phone || "").trim();
  const must_set_password = typeof studentData.must_set_password === "boolean" ? studentData.must_set_password : true;
  let password_hash = studentData.password_hash || null;
  if (studentData.password && !password_hash) {
    password_hash = hashPassword(studentData.password);
  }
  const created_at = studentData.created_at || new Date().toISOString();

  let saved = null;
  if (sql) {
    try {
      const [r] = await sql`
        INSERT INTO academy_students (full_name, email, phone, password_hash, must_set_password)
        VALUES (${full_name}, ${email}, ${phone}, ${password_hash}, ${must_set_password})
        ON CONFLICT (LOWER(TRIM(email))) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone,
          password_hash = COALESCE(EXCLUDED.password_hash, academy_students.password_hash),
          must_set_password = EXCLUDED.must_set_password
        RETURNING *;
      `;
      if (r) saved = r;
    } catch (e) {
      console.warn("SQL saveMajaraStudent notice:", e.message);
    }
  }

  const item = {
    id: saved?.id || id,
    full_name,
    email,
    phone,
    password_hash,
    must_set_password,
    active_session_token: studentData.active_session_token || null,
    last_ip: studentData.last_ip || null,
    last_login_at: studentData.last_login_at || null,
    created_at
  };
  const idx = local.students.findIndex(s => String(s.email).trim().toLowerCase() === email || String(s.id) === String(item.id));
  if (idx >= 0) local.students[idx] = { ...local.students[idx], ...item };
  else local.students.push(item);
  saveLocalData(local);

  return saved || item;
}

export async function deleteMajaraStudent(studentId) {
  await ensureDbSchema().catch(() => {});
  const sql = getSqlClient();
  const needle = String(studentId).trim();

  if (sql) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(needle);
      if (isUuid) {
        await sql`DELETE FROM academy_students WHERE id = ${needle};`;
      } else {
        await sql`DELETE FROM academy_students WHERE id::text = ${needle};`;
      }
    } catch (e) {
      console.warn("SQL deleteMajaraStudent notice:", e.message);
    }
  }

  const local = readLocalData();
  local.students = (local.students || []).filter(s => String(s.id) !== needle);
  local.enrollments = (local.enrollments || []).filter(e => String(e.student_id) !== needle);
  local.progress = (local.progress || []).filter(p => String(p.student_id) !== needle);
  saveLocalData(local);
  return { ok: true, deletedId: needle };
}

export async function setMajaraEnrollment(studentId, courseId, status = "active", grantedBy = "admin") {
  await ensureDbSchema().catch(() => {});
  const sql = getSqlClient();
  const local = readLocalData();

  const student = await getMajaraStudentById(studentId) || (local.students || []).find(s => String(s.id) === String(studentId) || String(s.email) === String(studentId));
  const course = await getMajaraCourseByIdOrSlug(courseId) || (local.courses || []).find(c => String(c.id) === String(courseId) || String(c.slug) === String(courseId));

  if (!student || !course) {
    throw new Error(`Student or Course not found (student: ${studentId}, course: ${courseId})`);
  }

  const sId = student.id;
  const cId = course.id;
  const safeStatus = status === "suspended" ? "suspended" : "active";

  let saved = null;
  if (sql) {
    try {
      const [r] = await sql`
        INSERT INTO student_course_enrollments (student_id, course_id, status, granted_by)
        VALUES (${sId}, ${cId}, ${safeStatus}, ${grantedBy})
        ON CONFLICT (student_id, course_id) DO UPDATE SET
          status = EXCLUDED.status,
          granted_by = EXCLUDED.granted_by
        RETURNING *;
      `;
      if (r) saved = r;
    } catch (e) {
      console.warn("SQL setMajaraEnrollment notice:", e.message);
    }
  }

  const item = {
    id: saved?.id || `enr-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`,
    student_id: sId,
    course_id: cId,
    status: safeStatus,
    granted_by: grantedBy,
    enrolled_at: new Date().toISOString()
  };
  const idx = local.enrollments.findIndex(e => String(e.student_id) === String(sId) && String(e.course_id) === String(cId));
  if (idx >= 0) local.enrollments[idx] = { ...local.enrollments[idx], status: safeStatus, granted_by: grantedBy };
  else local.enrollments.push(item);
  saveLocalData(local);

  return saved || item;
}

export async function deleteMajaraEnrollment(studentId, courseId) {
  await ensureDbSchema().catch(() => {});
  const sql = getSqlClient();
  const local = readLocalData();

  if (sql) {
    try {
      await sql`
        DELETE FROM student_course_enrollments 
        WHERE (student_id::text = ${String(studentId)}) AND (course_id::text = ${String(courseId)});
      `;
    } catch (e) {
      console.warn("SQL deleteMajaraEnrollment notice:", e.message);
    }
  }

  local.enrollments = (local.enrollments || []).filter(e =>
    !(String(e.student_id) === String(studentId) && String(e.course_id) === String(courseId))
  );
  saveLocalData(local);
  return { ok: true };
}

export async function getStudentEnrollments(studentId) {
  if (!studentId) return [];
  await ensureDbSchema().catch(() => {});
  const sql = getSqlClient();
  const needle = String(studentId).trim();

  if (sql) {
    try {
      const rows = await sql`
        SELECT 
          e.id AS enrollment_id, e.status AS enrollment_status, e.enrolled_at,
          c.*,
          COUNT(DISTINCT l.id)::int AS total_lessons,
          COUNT(DISTINCT p.lesson_id) FILTER (WHERE p.completed = TRUE)::int AS completed_lessons
        FROM student_course_enrollments e
        JOIN academy_courses c ON c.id = e.course_id
        LEFT JOIN academy_lessons l ON l.course_id = c.id
        LEFT JOIN student_lesson_progress p ON p.lesson_id = l.id AND p.student_id = e.student_id
        WHERE e.student_id::text = ${needle} AND e.status = 'active'
        GROUP BY e.id, c.id
        ORDER BY e.enrolled_at DESC;
      `;
      if (rows && rows.length > 0) return rows;
    } catch (e) {
      console.warn("SQL getStudentEnrollments fallback notice:", e.message);
    }
  }

  const local = readLocalData();
  const studentEnrollments = (local.enrollments || []).filter(e => String(e.student_id) === needle && e.status === "active");
  return studentEnrollments.map(e => {
    const course = (local.courses || []).find(c => String(c.id) === String(e.course_id) || String(c.slug) === String(e.course_id));
    if (!course) return null;
    const lessons = (local.lessons || []).filter(l => String(l.course_id) === String(course.id) || String(l.course_id) === String(course.slug));
    const completedCount = (local.progress || []).filter(p =>
      String(p.student_id) === needle &&
      p.completed &&
      lessons.some(l => String(l.id) === String(p.lesson_id))
    ).length;

    return {
      enrollment_id: e.id,
      enrollment_status: e.status,
      enrolled_at: e.enrolled_at,
      ...course,
      total_lessons: lessons.length,
      completed_lessons: completedCount
    };
  }).filter(Boolean);
}

export async function updateStudentLessonProgress(studentId, lessonId, completed = true, lastPositionSec = 0) {
  await ensureDbSchema().catch(() => {});
  const sql = getSqlClient();
  const local = readLocalData();

  const sId = String(studentId).trim();
  const lId = String(lessonId).trim();
  const isCompleted = Boolean(completed);
  const posSec = Math.max(0, Number(lastPositionSec || 0));

  let saved = null;
  if (sql) {
    try {
      const isUuidStudent = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sId);
      const isUuidLesson = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lId);
      if (isUuidStudent && isUuidLesson) {
        const [r] = await sql`
          INSERT INTO student_lesson_progress (student_id, lesson_id, completed, last_position_sec, updated_at)
          VALUES (${sId}, ${lId}, ${isCompleted}, ${posSec}, NOW())
          ON CONFLICT (student_id, lesson_id) DO UPDATE SET
            completed = EXCLUDED.completed,
            last_position_sec = EXCLUDED.last_position_sec,
            updated_at = NOW()
          RETURNING *;
        `;
        if (r) saved = r;
      }
    } catch (e) {
      console.warn("SQL updateStudentLessonProgress notice:", e.message);
    }
  }

  const item = {
    id: saved?.id || `prog-${Date.now().toString(36)}`,
    student_id: sId,
    lesson_id: lId,
    completed: isCompleted,
    last_position_sec: posSec,
    updated_at: new Date().toISOString()
  };
  const idx = local.progress.findIndex(p => String(p.student_id) === sId && String(p.lesson_id) === lId);
  if (idx >= 0) local.progress[idx] = item;
  else local.progress.push(item);
  saveLocalData(local);

  return saved || item;
}

export async function getStudentCourseProgress(studentId, courseId) {
  await ensureDbSchema().catch(() => {});
  const sql = getSqlClient();
  const sId = String(studentId).trim();

  if (sql) {
    try {
      const rows = await sql`
        SELECT p.*
        FROM student_lesson_progress p
        JOIN academy_lessons l ON l.id = p.lesson_id
        WHERE p.student_id::text = ${sId} AND (l.course_id::text = ${String(courseId)} OR l.course_id::text IN (SELECT id::text FROM academy_courses WHERE slug = ${String(courseId)}));
      `;
      if (rows) return rows;
    } catch (e) {
      console.warn("SQL getStudentCourseProgress notice:", e.message);
    }
  }

  const local = readLocalData();
  const lessons = (local.lessons || []).filter(l => String(l.course_id) === String(courseId));
  return (local.progress || []).filter(p =>
    String(p.student_id) === sId && lessons.some(l => String(l.id) === String(p.lesson_id))
  );
}

// Single-Session Lock Engine: Generates unique active_session_token and invalidates prior devices
export async function generateStudentSession(studentId, ip = "") {
  await ensureDbSchema().catch(() => {});
  const sql = getSqlClient();
  const local = readLocalData();

  const token = `z7_sess_${crypto.randomBytes(32).toString("hex")}`;
  const now = new Date().toISOString();
  const needle = String(studentId).trim();

  if (sql) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(needle);
      if (isUuid) {
        await sql`
          UPDATE academy_students 
          SET active_session_token = ${token}, last_ip = ${ip}, last_login_at = NOW()
          WHERE id = ${needle};
        `;
      } else {
        await sql`
          UPDATE academy_students 
          SET active_session_token = ${token}, last_ip = ${ip}, last_login_at = NOW()
          WHERE id::text = ${needle} OR LOWER(email) = ${needle.toLowerCase()};
        `;
      }
    } catch (e) {
      console.warn("SQL generateStudentSession notice:", e.message);
    }
  }

  const idx = local.students.findIndex(s => String(s.id) === needle || String(s.email).toLowerCase() === needle.toLowerCase());
  if (idx >= 0) {
    local.students[idx].active_session_token = token;
    local.students[idx].last_ip = ip;
    local.students[idx].last_login_at = now;
    saveLocalData(local);
  }

  return token;
}

// Single-Session Lock Verifier: Fails immediately if token was superseded by a newer login
export async function verifyStudentSession(studentId, sessionToken) {
  if (!studentId || !sessionToken) return null;
  const student = await getMajaraStudentById(studentId) || (readLocalData().students || []).find(s => String(s.id) === String(studentId));
  if (!student) return null;

  if (String(student.active_session_token) !== String(sessionToken)) {
    return null; // Session revoked / locked out on this device!
  }

  return student;
}

// Auto-enrollment from /marketplace/ purchase or admin approval
export async function enrollStudentByPurchase({ fullName, email, phone, courseId, language = "ar" }) {
  if (!email) return null;
  const normEmail = String(email).trim().toLowerCase();
  const isEn = language === "en";

  let student = await getMajaraStudentByEmail(normEmail);
  const isNew = !student;

  if (!student) {
    student = await saveMajaraStudent({
      full_name: fullName || "Valued Student",
      email: normEmail,
      phone: phone || "",
      must_set_password: true
    });
  }

  // Resolve matching course
  const course = await getMajaraCourseByIdOrSlug(courseId) ||
                 await getMajaraCourseByIdOrSlug("cinematic-film") ||
                 (await getMajaraCourses())[0];

  if (course && student) {
    await setMajaraEnrollment(student.id, course.id, "active", "purchase_auto");
  }

  // Generate activation/reset token for student
  const activationToken = crypto.randomBytes(24).toString("hex");
  const local = readLocalData();
  const sIdx = local.students.findIndex(s => String(s.id) === String(student.id));
  if (sIdx >= 0) {
    local.students[sIdx].activation_token = activationToken;
    saveLocalData(local);
  }

  // Dispatch Welcome/Activation Email via Zoho SMTP
  const activationLink = `https://majara.7z-magic.com/learn/?activate=${activationToken}&email=${encodeURIComponent(normEmail)}`;
  const courseTitle = isEn ? (course?.title_en || courseId) : (course?.title_ar || courseId);
  const html = buildStudentActivationHtml({
    fullName: student.full_name || fullName,
    email: normEmail,
    activationLink,
    courseTitle,
    isRtl: !isEn
  });

  await sendEmail({
    to: normEmail,
    subject: isEn
      ? `Welcome to Majara Academy — Your Portal Access is Ready`
      : `مرحباً بك في أكاديمية مجرة — تم تفعيل حسابك التعليمي بنجاح`,
    html
  });

  return { student, course, activationLink };
}
