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
  buildMilestoneReportHtml,
  buildLeadMagnetEmailHtml,
  buildWaitlistEmailHtml
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

// Default Data Storage Fallback
function defaultData() {
  return {
    registrations: [],
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
        asset_id TEXT DEFAULT 'prompt-vault',
        asset_title TEXT DEFAULT '',
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        whatsapp TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'DELIVERED',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    try {
      await sql`ALTER TABLE marketplace_leads ADD COLUMN IF NOT EXISTS asset_id TEXT DEFAULT 'prompt-vault';`;
      await sql`ALTER TABLE marketplace_leads ADD COLUMN IF NOT EXISTS asset_title TEXT DEFAULT '';`;
      await sql`ALTER TABLE marketplace_leads ADD COLUMN IF NOT EXISTS whatsapp TEXT DEFAULT '';`;
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

// 5. Send Lead Magnet Download Email (Video Guide / Company Profile / Prompt Vault)
export async function sendLeadMagnetEmail(lead) {
  const assetLinks = {
    "video-guide": "https://7z-magic.com/courses/assets/7ZOS_AI_Video_Guide.pdf",
    "company-profile": "https://7z-magic.com/courses/assets/7Z_Company_Profile_2026_Landscape_Edition.pdf",
    "prompt-vault": "https://whop.com/7z-magic/7z-magic-b0/"
  };
  const assetId = assetLinks[lead.assetId] ? lead.assetId : "prompt-vault";
  const downloadUrl = assetLinks[assetId];
  const html = buildLeadMagnetEmailHtml({ ...lead, assetId }, downloadUrl);

  const subjectMap = {
    "video-guide": lead.language === "en"
      ? "Your 7Z AI Video Creation Handbook (PDF) + 10% Discount | SEVEN Z STUDIO"
      : "دليلك المجاني لصناعة الفيديو بالذكاء الاصطناعي + كود خصم 10% | SEVEN Z STUDIO",
    "company-profile": lead.language === "en"
      ? "SEVEN Z STUDIO — 2026 Company Profile (PDF)"
      : "البروفايل التعريفي الرسمي لشركة SEVEN Z STUDIO 2026 (PDF)",
    "prompt-vault": lead.language === "en"
      ? "Your 5000+ AI Prompts Golden Vault Access | SEVEN Z STUDIO"
      : "رابط وصولك إلى بنك البرومبتات الذهبي 5000+ | SEVEN Z STUDIO"
  };

  const adminHtml = `<div style="font-family:Arial,sans-serif;padding:16px;"><h3>New Lead Magnet Download Request</h3><p><b>File:</b> ${lead.assetTitle || assetId} (<code>${assetId}</code>)</p><p><b>Name:</b> ${lead.fullName}</p><p><b>Email:</b> ${lead.email}</p><p><b>WhatsApp:</b> ${lead.whatsapp || "—"}</p><p><b>Ref:</b> ${lead.reference}</p></div>`;
  const [userRes, adminRes] = await Promise.allSettled([
    sendEmail({
      to: lead.email,
      subject: subjectMap[assetId] || subjectMap["prompt-vault"],
      html
    }),
    sendEmail({
      to: ADMIN_EMAIL,
      subject: `[7Z LEAD] ${lead.assetTitle || assetId}: ${lead.fullName} (${lead.reference})`,
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




// force discount fix active 1794666890869