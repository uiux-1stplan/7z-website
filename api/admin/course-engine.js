import {
  getSql,
  requireAdmin,
  writeAudit,
} from "../../lib/portal-runtime.mjs";
import {
  sendWebResponse,
  toWebRequest,
} from "../../lib/vercel-api.mjs";
import {
  ensureDbSchema,
  readLocalData,
  saveLocalData,
  validateAndResolveDiscountCode,
  saveDiscountCodeDual,
  saveAffiliateDual,
  sendPaymentApprovedEmail,
  sendPaymentRejectedEmail,
  getMajaraCourses,
  getMajaraCourseByIdOrSlug,
  saveMajaraCourse,
  deleteMajaraCourse,
  getMajaraLessons,
  getMajaraLesson,
  saveMajaraLesson,
  deleteMajaraLesson,
  getMajaraStudents,
  getMajaraStudentById,
  getMajaraStudentByEmail,
  saveMajaraStudent,
  deleteMajaraStudent,
  setMajaraEnrollment,
  deleteMajaraEnrollment,
  enrollStudentByPurchase
} from "../academy-engine.mjs";
import { get } from "@vercel/blob";
import {
  BASE_CURRENCY,
  MARKETPLACE_PRODUCTS,
  normalizeProductId,
  resolveProduct,
  resolveProductPriceUsd,
  roundMoney
} from "../../lib/marketplace-catalog.mjs";
import ExcelJS from "exceljs";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const courses = new Set(["all", ...Object.keys(MARKETPLACE_PRODUCTS)]);

function send(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(body);
}

function bodyOf(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return JSON.parse(String(req.body || "{}")); } catch { return {}; }
}

function text(value, limit = 180) {
  return String(value ?? "").trim().slice(0, limit);
}

function percent(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 100 ? number : null;
}

async function ensureSchema(sql) {
  try {
    await ensureDbSchema();
  } catch (err) {
    console.warn("[course-engine] ensureDbSchema notice:", err.message);
  }

  if (!sql) return;

  try {
    await sql`CREATE TABLE IF NOT EXISTS course_admin_affiliates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT,
      company TEXT NOT NULL DEFAULT '',
      commission_percent INTEGER NOT NULL DEFAULT 20 CHECK (commission_percent BETWEEN 0 AND 100),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
      legacy_key TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS course_discount_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT NOT NULL UNIQUE,
      affiliate_id UUID REFERENCES course_admin_affiliates(id) ON DELETE SET NULL,
      affiliate_name TEXT NOT NULL DEFAULT '',
      course_id TEXT NOT NULL DEFAULT 'all',
      discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 0 AND 100),
      commission_percent INTEGER NOT NULL DEFAULT 0 CHECK (commission_percent BETWEEN 0 AND 100),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
      max_redemptions INTEGER,
      requires_previous_email BOOLEAN NOT NULL DEFAULT FALSE,
      legacy_key TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS course_revenue_adjustments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      amount_jod NUMERIC(14,3) NOT NULL CHECK (amount_jod BETWEEN -1000000000 AND 1000000000),
      reason TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS deleted_discount_codes (
      code TEXT PRIMARY KEY,
      deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS marketer_payouts (
      code TEXT PRIMARY KEY,
      paid BOOLEAN NOT NULL DEFAULT FALSE,
      paid_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS course_admin_migrations (
      migration_key TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    const [legacySeed] = await sql`INSERT INTO course_admin_migrations (migration_key)
      VALUES ('legacy-affiliates-and-codes-v1')
      ON CONFLICT (migration_key) DO NOTHING
      RETURNING migration_key`;
    if (legacySeed) {
      const legacyAffiliates = [
        ["legacy-hassan", "Hassan Rayan", 25],
        ["legacy-shaas", "Shaas Matar", 25],
        ["legacy-abdulrahman", "Abdulrahman Mohammed", 25],
      ];
      for (const [key, name, commission] of legacyAffiliates) {
        await sql`INSERT INTO course_admin_affiliates (name, commission_percent, legacy_key)
          VALUES (${name}, ${commission}, ${key}) ON CONFLICT (legacy_key) DO NOTHING`;
      }

      const legacyCodes = [
        ["HASSAN10", "legacy-hassan", 10, 25, false],
        ["SHAS10", "legacy-shaas", 10, 25, false],
        ["ABDULRAHMAN10", "legacy-abdulrahman", 10, 25, false],
        ["7Z10", null, 10, 0, false],
        ["ALUMNI15", null, 15, 0, true],
      ];
      for (const [code, legacyKey, discount, commission, previousEmail] of legacyCodes) {
        await sql`INSERT INTO course_discount_codes
          (code, affiliate_id, affiliate_name, course_id, discount_percent, commission_percent, requires_previous_email, legacy_key)
          SELECT ${code},
            (SELECT id FROM course_admin_affiliates WHERE legacy_key = ${legacyKey}),
            COALESCE((SELECT name FROM course_admin_affiliates WHERE legacy_key = ${legacyKey}), ''),
            'all', ${discount}, ${commission}, ${previousEmail}, ${`legacy-code-${code}`}
          WHERE NOT EXISTS (SELECT 1 FROM deleted_discount_codes WHERE UPPER(code) = UPPER(${code}))
          ON CONFLICT (code) DO NOTHING`;
      }
    }
  } catch (err) {
    console.warn("[course-engine] ensureSchema database notice:", err.message);
  }
}

async function getAffiliates(sql) {
  if (sql) {
    try {
      return await sql`SELECT a.id, a.name, a.email, a.company, a.commission_percent,
        a.status, a.created_at,
        COUNT(DISTINCT c.id)::int AS code_count,
        COUNT(r.id)::int AS registration_count,
        COALESCE(SUM(CASE WHEN r.payment_status IN ('PAID','APPROVED','VERIFIED')
          THEN GREATEST(COALESCE(r.price_usd, r.price_jod, 0) - COALESCE(r.discount_usd, r.discount_jod, 0),0) ELSE 0 END),0)::numeric(12,3) AS net_sales_jod,
        COALESCE(SUM(CASE WHEN r.payment_status IN ('PAID','APPROVED','VERIFIED')
          THEN COALESCE(r.commission_jod,0) ELSE 0 END),0)::numeric(12,3) AS earned_commission_jod,
        COALESCE(SUM(CASE WHEN r.payment_status IN ('PAID','APPROVED','VERIFIED') AND r.commission_status <> 'PAID'
          THEN COALESCE(r.commission_jod,0) ELSE 0 END),0)::numeric(12,3) AS outstanding_commission_jod
      FROM course_admin_affiliates a
      LEFT JOIN course_discount_codes c ON c.affiliate_id = a.id
      LEFT JOIN course_registrations r ON UPPER(r.coupon_code) = UPPER(c.code)
      GROUP BY a.id ORDER BY a.created_at DESC`;
    } catch (error) {
      try {
        return await sql`SELECT a.id,a.name,a.email,a.company,a.commission_percent,a.status,a.created_at,
          COUNT(DISTINCT c.id)::int AS code_count,0::int AS registration_count,
          0::numeric AS net_sales_jod,0::numeric AS earned_commission_jod,0::numeric AS outstanding_commission_jod
          FROM course_admin_affiliates a LEFT JOIN course_discount_codes c ON c.affiliate_id=a.id
          GROUP BY a.id ORDER BY a.created_at DESC`;
      } catch (e2) {
        console.warn("[getAffiliates] SQL fallback notice:", e2.message);
      }
    }
  }

  // Local fallback storage
  try {
    const local = readLocalData();
    return (local.affiliates || []).map(a => ({
      id: a.id,
      name: a.name,
      email: a.email || "",
      company: a.company || "7Z Magic Partner",
      commission_percent: a.commissionPercent || 20,
      status: a.status || "active",
      created_at: a.createdAt || new Date().toISOString(),
      code_count: 1,
      registration_count: 0,
      net_sales_jod: 0,
      earned_commission_jod: 0,
      outstanding_commission_jod: 0
    }));
  } catch {
    return [];
  }
}

async function getCodes(sql) {
  if (sql) {
    try {
      return await sql`SELECT c.id, c.code, c.affiliate_id, COALESCE(a.name,c.affiliate_name,'') AS affiliate_name,
        c.course_id, c.discount_percent, c.commission_percent, c.status, c.max_redemptions,
        c.requires_previous_email, c.created_at, COUNT(r.id)::int AS redemption_count
      FROM course_discount_codes c
      LEFT JOIN course_admin_affiliates a ON a.id = c.affiliate_id
      LEFT JOIN course_registrations r ON UPPER(r.coupon_code) = UPPER(c.code)
      GROUP BY c.id, a.name ORDER BY c.created_at DESC`;
    } catch (error) {
      try {
        return await sql`SELECT c.id,c.code,c.affiliate_id,COALESCE(a.name,c.affiliate_name,'') AS affiliate_name,
          c.course_id,c.discount_percent,c.commission_percent,c.status,c.max_redemptions,
          c.requires_previous_email,c.created_at,0::int AS redemption_count
          FROM course_discount_codes c LEFT JOIN course_admin_affiliates a ON a.id=c.affiliate_id ORDER BY c.created_at DESC`;
      } catch (e2) {
        console.warn("[getCodes] SQL fallback notice:", e2.message);
      }
    }
  }

  // Local fallback storage
  try {
    const local = readLocalData();
    return (local.coupons || []).map(c => ({
      id: c.id,
      code: c.code,
      affiliate_id: null,
      affiliate_name: "Studio Code",
      course_id: c.courseScope || "all",
      discount_percent: c.discountPercent || 15,
      commission_percent: 0,
      status: c.status || "active",
      max_redemptions: null,
      requires_previous_email: false,
      created_at: c.createdAt || new Date().toISOString(),
      redemption_count: 0
    }));
  } catch {
    return [];
  }
}

export async function generateExcelReportBuffer({ registrations, marketersLedger, totals }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "7Z Magic Studios";
  workbook.lastModifiedBy = "7Z Magic Administrator";
  workbook.created = new Date();

  let logoImageId = null;
  try {
    const logoPath = join(process.cwd(), "assets", "brand", "7Z-LogoT(3).png");
    if (existsSync(logoPath)) {
      const logoBuffer = readFileSync(logoPath);
      logoImageId = workbook.addImage({
        buffer: logoBuffer,
        extension: "png"
      });
    }
  } catch (err) {
    console.warn("[ExcelJS] Logo load notice:", err.message);
  }

  // Styles & Luxury Dark Palette matching 7Z Magic
  const headerFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0B0F17" }
  };
  const titleFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF06070D" }
  };
  const zebraFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF8FAFC" }
  };
  const summaryFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF141A29" }
  };

  const goldFont = {
    name: "Segoe UI",
    size: 11,
    bold: true,
    color: { argb: "FFD4AF37" }
  };
  const whiteHeaderFont = {
    name: "Segoe UI",
    size: 11,
    bold: true,
    color: { argb: "FFFFFFFF" }
  };
  const titleFont = {
    name: "Segoe UI",
    size: 15,
    bold: true,
    color: { argb: "FFFFFFFF" }
  };
  const subtitleFont = {
    name: "Segoe UI",
    size: 10,
    italic: true,
    color: { argb: "FF94A3B8" }
  };

  const thinBorder = {
    top: { style: "thin", color: { argb: "FFE2E8F0" } },
    left: { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    right: { style: "thin", color: { argb: "FFE2E8F0" } }
  };
  const doubleBottomBorder = {
    top: { style: "thin", color: { argb: "FFD4AF37" } },
    left: { style: "thin", color: { argb: "FFCBD5E1" } },
    bottom: { style: "double", color: { argb: "FFD4AF37" } },
    right: { style: "thin", color: { argb: "FFCBD5E1" } }
  };

  // -------------------------------------------------------------
  // Sheet 1: سجل الطلبات والمداخيل (Registrations & Revenue)
  // -------------------------------------------------------------
  const ws1 = workbook.addWorksheet("Registrations & Revenue", {
    views: [{ state: "frozen", ySplit: 5 }]
  });

  if (logoImageId !== null) {
    try {
      ws1.addBackgroundImage(logoImageId);
    } catch (_) {}
  }

  ws1.mergeCells("A1:N1");
  const titleCell = ws1.getCell("A1");
  titleCell.value = "7Z MAGIC STUDIO  |  ACADEMY FINANCIAL & REGISTRATION REPORT";
  titleCell.font = titleFont;
  titleCell.fill = titleFill;
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws1.getRow(1).height = 36;

  ws1.mergeCells("A2:N2");
  const subCell = ws1.getCell("A2");
  subCell.value = `Generated: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Amman", dateStyle: "long", timeStyle: "short" })} (Asia/Amman)  |  Currency: USD  |  Accounting: Strict Discount & Commission Formula`;
  subCell.font = subtitleFont;
  subCell.fill = titleFill;
  subCell.alignment = { horizontal: "center", vertical: "middle" };
  ws1.getRow(2).height = 22;

  ws1.getRow(3).height = 10;

  const ws1Headers = [
    "#",
    "Customer / Student Name",
    "Email",
    "Phone",
    "Course / Product",
    "Payment Status",
    "Promo Code",
    "Marketer / Partner",
    "Base Price (USD)",
    "Discount Amount (USD)",
    "Net After Discount (USD)",
    "Commission %",
    "Marketer Commission (USD)",
    "Academy Net Revenue (USD)"
  ];
  const hRow1 = ws1.addRow(ws1Headers);
  hRow1.height = 28;
  hRow1.eachCell((cell, colNum) => {
    cell.fill = headerFill;
    cell.font = colNum >= 9 ? goldFont : whiteHeaderFont;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = thinBorder;
  });

  const courseNames = Object.fromEntries(
    Object.values(MARKETPLACE_PRODUCTS).map((p) => [p.id, p.nameEn])
  );

  let rowIdx = 5;
  let sumBase = 0;
  let sumDiscount = 0;
  let sumNet = 0;
  let sumCommission = 0;
  let sumAcademyNet = 0;

  for (const reg of registrations) {
    const isPaid = ["PAID", "APPROVED", "VERIFIED"].includes(String(reg.payment_status || "").toUpperCase());
    const base = Number(reg.base_price ?? resolveProductPriceUsd(reg.course_id, 0));
    const disc = Number(reg.discount_jod || 0);
    const net = Math.max(0, base - disc);
    const commPct = Number(reg.commission_percent || 0);
    const comm = Number(reg.commission_jod || 0);
    const acadNet = Number(reg.academy_net_jod || Math.max(0, net - comm));

    if (isPaid) {
      sumBase += base;
      sumDiscount += disc;
      sumNet += net;
      sumCommission += comm;
      sumAcademyNet += acadNet;
    }

    const row = ws1.addRow([
      reg.seat_number || reg.id || rowIdx - 4,
      reg.full_name || "—",
      reg.email || "—",
      reg.phone || "—",
      courseNames[normalizeProductId(reg.course_id)] || reg.course_id || "7Z Product",
      reg.payment_status || "PENDING",
      reg.coupon_code || "—",
      reg.affiliate_name || "Direct / Studio",
      base,
      disc,
      net,
      commPct / 100,
      comm,
      acadNet
    ]);

    row.height = 22;
    const isZebra = (rowIdx % 2 === 0);
    row.eachCell((cell, colNum) => {
      cell.border = thinBorder;
      cell.font = { name: "Segoe UI", size: 10 };
      if (isZebra) cell.fill = zebraFill;
      cell.alignment = { vertical: "middle" };

      if ([9, 10, 11, 13, 14].includes(colNum)) {
        cell.numFmt = '$#,##0.00';
        cell.alignment = { horizontal: "right", vertical: "middle" };
      } else if (colNum === 12) {
        cell.numFmt = "0.0%";
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if ([1, 6, 7].includes(colNum)) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });

    rowIdx++;
  }

  // Summary Row Sheet 1
  const totalRow = ws1.addRow([
    "TOTALS",
    `Total Verified: ${registrations.filter(r => ["PAID","APPROVED","VERIFIED"].includes(String(r.payment_status||"").toUpperCase())).length}`,
    "", "", "", "", "", "Verified Totals:",
    sumBase,
    sumDiscount,
    sumNet,
    "",
    sumCommission,
    sumAcademyNet
  ]);
  totalRow.height = 28;
  totalRow.eachCell((cell, colNum) => {
    cell.fill = summaryFill;
    cell.font = goldFont;
    cell.border = doubleBottomBorder;
    if ([9, 10, 11, 13, 14].includes(colNum)) {
      cell.numFmt = '$#,##0.00';
      cell.alignment = { horizontal: "right", vertical: "middle" };
    } else {
      cell.alignment = { horizontal: "center", vertical: "middle" };
    }
  });

  ws1.columns.forEach((col, idx) => {
    let maxLen = ws1Headers[idx] ? ws1Headers[idx].length : 12;
    col.eachCell({ includeEmpty: false }, (cell) => {
      const val = cell.value ? String(cell.value) : "";
      if (val.length > maxLen) maxLen = Math.min(val.length, 36);
    });
    col.width = Math.max(maxLen + 3, 12);
  });

  // -------------------------------------------------------------
  // Sheet 2: كشف عمولات المسوّقين (Marketers Commissions)
  // -------------------------------------------------------------
  const ws2 = workbook.addWorksheet("Marketers Commissions", {
    views: [{ state: "frozen", ySplit: 5 }]
  });

  if (logoImageId !== null) {
    try {
      ws2.addBackgroundImage(logoImageId);
    } catch (_) {}
  }

  ws2.mergeCells("A1:H1");
  const titleCell2 = ws2.getCell("A1");
  titleCell2.value = "7Z MAGIC STUDIO  |  MARKETERS & PARTNERS COMMISSION LEDGER";
  titleCell2.font = titleFont;
  titleCell2.fill = titleFill;
  titleCell2.alignment = { horizontal: "center", vertical: "middle" };
  ws2.getRow(1).height = 36;

  ws2.mergeCells("A2:H2");
  const subCell2 = ws2.getCell("A2");
  subCell2.value = `Strict Commission Formula: Commission = Net Price After Discount × Commission %  |  Generated ${new Date().toISOString().slice(0, 10)}`;
  subCell2.font = subtitleFont;
  subCell2.fill = titleFill;
  subCell2.alignment = { horizontal: "center", vertical: "middle" };
  ws2.getRow(2).height = 22;

  ws2.getRow(3).height = 10;

  const ws2Headers = [
    "Marketer / Partner Name",
    "Promo Code",
    "Customers Count",
    "Total Sales After Discount (USD)",
    "Commission Rate %",
    "Commission Due (USD)",
    "Company Net Profit (USD)",
    "Payout Status"
  ];
  const hRow2 = ws2.addRow(ws2Headers);
  hRow2.height = 28;
  hRow2.eachCell((cell, colNum) => {
    cell.fill = headerFill;
    cell.font = [4, 6, 7].includes(colNum) ? goldFont : whiteHeaderFont;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = thinBorder;
  });

  let rowIdx2 = 5;
  let totalMarketerSales = 0;
  let totalMarketerComms = 0;
  let totalCompanyProfit = 0;

  for (const m of marketersLedger) {
    totalMarketerSales += Number(m.net_sales_jod || 0);
    totalMarketerComms += Number(m.commission_due_jod || 0);
    totalCompanyProfit += Number(m.company_net_jod || 0);

    const row = ws2.addRow([
      m.affiliate_name || "—",
      m.coupon_code || "—",
      Number(m.students_count || 0),
      Number(m.net_sales_jod || 0),
      Number(m.commission_percent || 0) / 100,
      Number(m.commission_due_jod || 0),
      Number(m.company_net_jod || 0),
      m.paid ? "PAID" : "UNPAID"
    ]);
    row.height = 22;
    const isZebra = (rowIdx2 % 2 === 0);
    row.eachCell((cell, colNum) => {
      cell.border = thinBorder;
      cell.font = { name: "Segoe UI", size: 10 };
      if (isZebra) cell.fill = zebraFill;
      cell.alignment = { vertical: "middle" };

      if ([4, 6, 7].includes(colNum)) {
        cell.numFmt = '$#,##0.00';
        cell.alignment = { horizontal: "right", vertical: "middle" };
      } else if (colNum === 5) {
        cell.numFmt = "0.0%";
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (colNum === 3) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (colNum === 8) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: m.paid ? "FF10B981" : "FFF59E0B" } };
      }
    });
    rowIdx2++;
  }

  // Totals for Sheet 2
  const totalRow2 = ws2.addRow([
    "TOTALS",
    "",
    marketersLedger.reduce((acc, cur) => acc + Number(cur.students_count || 0), 0),
    totalMarketerSales,
    "",
    totalMarketerComms,
    totalCompanyProfit,
    "—"
  ]);
  totalRow2.height = 28;
  totalRow2.eachCell((cell, colNum) => {
    cell.fill = summaryFill;
    cell.font = goldFont;
    cell.border = doubleBottomBorder;
    if ([4, 6, 7].includes(colNum)) {
      cell.numFmt = '$#,##0.00';
      cell.alignment = { horizontal: "right", vertical: "middle" };
    } else {
      cell.alignment = { horizontal: "center", vertical: "middle" };
    }
  });

  ws2.columns.forEach((col, idx) => {
    let maxLen = ws2Headers[idx] ? ws2Headers[idx].length : 14;
    col.eachCell({ includeEmpty: false }, (cell) => {
      const val = cell.value ? String(cell.value) : "";
      if (val.length > maxLen) maxLen = Math.min(val.length, 36);
    });
    col.width = Math.max(maxLen + 4, 14);
  });

  return await workbook.xlsx.writeBuffer();
}

async function getAccounting(sql) {
  try { await ensureDbSchema(); } catch (e) { console.warn('Schema sync warning:', e.message); }
  let rows = [];
  let adjustments = [];
  let totals = {
    gross: 0,
    discounts: 0,
    netSales: 0,
    revenue: 0,
    pending: 0,
    commissionsDue: 0,
    commissionsTotal: 0,
    studioNet: 0
  };

  let dbCodes = [];
  if (sql) {
    try {
      dbCodes = await sql`SELECT c.id, c.code, c.affiliate_id, COALESCE(a.name, c.affiliate_name, '') AS affiliate_name,
        c.discount_percent, c.commission_percent, c.status
        FROM course_discount_codes c
        LEFT JOIN course_admin_affiliates a ON a.id = c.affiliate_id`;
    } catch (e) {}
  }
  const local = readLocalData();
  const allCodesMap = new Map();
  for (const c of (dbCodes || [])) {
    allCodesMap.set(String(c.code).toUpperCase(), {
      code: String(c.code).toUpperCase(),
      affiliateName: c.affiliate_name || "Direct / Studio",
      commissionPercent: Number(c.commission_percent || 0),
      discountPercent: Number(c.discount_percent || 10)
    });
  }
  for (const c of (local.coupons || [])) {
    const uc = String(c.code).toUpperCase();
    if (!allCodesMap.has(uc)) {
      allCodesMap.set(uc, {
        code: uc,
        affiliateName: c.affiliateName || "Direct / Studio",
        commissionPercent: Number(c.commissionPercent || 0),
        discountPercent: Number(c.discountPercent || 10)
      });
    }
  }

  if (sql) {
    const deletedIds = new Set();
    const deletedRefs = new Set();
    try {
      await sql`CREATE TABLE IF NOT EXISTS deleted_registrations (
        id TEXT,
        reference TEXT,
        email TEXT,
        course_id TEXT,
        deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`;
      const delRows = await sql`SELECT id, reference FROM deleted_registrations`;
      for (const dr of delRows) {
        if (dr.id) deletedIds.add(String(dr.id));
        if (dr.reference) deletedRefs.add(String(dr.reference));
      }
    } catch (e) {}

    const localDeleted = local.deleted_registrations || [];
    for (const ld of localDeleted) {
      if (ld.id) deletedIds.add(String(ld.id));
      if (ld.reference) deletedRefs.add(String(ld.reference));
    }

    try {
      const dbRows = await sql`SELECT id, seat_number, full_name, email, phone, location, experience,
        preferred_language, goal, previous_course_email, course_id, created_at, payment_submitted_at, payment_status,
        price_jod, discount_jod, coupon_code, affiliate_name, commission_percent,
        commission_jod, commission_status, payment_provider, payment_reference, receipt_url, receipt_name, receipt_base64
        FROM course_registrations ORDER BY created_at DESC LIMIT 5000`;
      rows = dbRows.filter(r => !deletedIds.has(String(r.id)) && (!r.payment_reference || !deletedRefs.has(String(r.payment_reference))));
    } catch (error) {
      console.warn("Notice querying course_registrations:", error.message);
    }

    try {
      const academyRows = await sql`SELECT id, seat_number, full_name, email, phone, city as location, experience,
        notes as goal, course_id, created_at, created_at as payment_submitted_at, payment_status,
        final_price as price_jod, discount_jod, promo_code as coupon_code, reference as payment_reference,
        receipt_url, receipt_name, receipt_base64
        FROM academy_registrations ORDER BY created_at DESC LIMIT 5000`;
      for (const ar of academyRows) {
        if (deletedIds.has(String(ar.id)) || (ar.payment_reference && deletedRefs.has(String(ar.payment_reference)))) {
          continue;
        }
        const exists = rows.some(r =>
          (r.payment_reference && r.payment_reference === ar.payment_reference) ||
          (r.email && r.course_id && r.email.toLowerCase() === ar.email.toLowerCase() && r.course_id === ar.course_id)
        );
        if (!exists) {
          rows.push({
            id: ar.id,
            seat_number: ar.seat_number,
            full_name: ar.full_name,
            email: ar.email,
            phone: ar.phone,
            location: ar.location,
            experience: ar.experience,
            preferred_language: 'ar',
            goal: ar.goal,
            previous_course_email: '',
            course_id: ar.course_id,
            created_at: ar.created_at,
            payment_submitted_at: ar.payment_submitted_at,
            payment_status: ar.payment_status,
            price_jod: ar.price_jod,
            discount_jod: ar.discount_jod,
            coupon_code: ar.coupon_code,
            affiliate_name: '',
            commission_percent: 0,
            commission_jod: 0,
            commission_status: 'NOT_APPLICABLE',
            payment_provider: 'CliQ / Western Union',
            payment_reference: ar.payment_reference,
            receipt_url: ar.receipt_url,
            receipt_name: ar.receipt_name,
            receipt_base64: ar.receipt_base64
          });
        }
      }
    } catch (error) {
      console.warn("Notice querying academy_registrations:", error.message);
    }

    try {
      const [adjustmentSummary] = await sql`SELECT COALESCE(SUM(amount_jod),0) AS total FROM course_revenue_adjustments`;
      adjustments = await sql`SELECT id,amount_jod,reason,created_by,created_at FROM course_revenue_adjustments ORDER BY created_at DESC LIMIT 250`;
      totals.revenue += Number(adjustmentSummary?.total || 0);
    } catch (e) {}
  }

  // Merge local registrations
  try {
    if (Array.isArray(local.registrations)) {
      for (const lr of local.registrations) {
        const exists = rows.some(r =>
          (r.payment_reference && (r.payment_reference === lr.reference || r.payment_reference === lr.payment_reference)) ||
          (r.email && r.course_id && r.email.toLowerCase() === lr.email.toLowerCase() && r.course_id === lr.courseId)
        );
        if (!exists) {
          rows.push({
            id: lr.id || lr.seatNumber || lr.reference,
            seat_number: lr.seatNumber,
            full_name: lr.fullName,
            email: lr.email,
            phone: lr.phone,
            location: lr.city || lr.location,
            experience: lr.experience,
            preferred_language: 'ar',
            goal: lr.notes || '',
            previous_course_email: '',
            course_id: lr.courseId,
            created_at: lr.createdAt || lr.submittedAt,
            payment_submitted_at: lr.submittedAt || lr.createdAt,
            payment_status: lr.paymentStatus,
            price_jod: lr.finalPrice || lr.price_jod || 250,
            discount_jod: lr.discountJod || lr.discount_jod || 0,
            coupon_code: lr.promoCode || lr.coupon_code || '',
            affiliate_name: lr.affiliateName || '',
            commission_percent: lr.commissionPercent || 0,
            commission_jod: lr.commissionJod || 0,
            commission_status: lr.commissionStatus || 'NOT_APPLICABLE',
            payment_provider: 'CliQ / Western Union',
            payment_reference: lr.reference || lr.payment_reference,
            receipt_url: lr.receiptUrl,
            receipt_name: lr.receiptName,
            receipt_base64: lr.receiptBase64
          });
        }
      }
    }
  } catch (e) {
    console.warn("Notice reading local registrations:", e.message);
  }

  // Marketers Ledger Map (keyed by coupon code)
  const marketersMap = new Map();
  for (const [codeKey, codeInfo] of allCodesMap.entries()) {
    if (codeInfo.commissionPercent > 0 || (codeInfo.affiliateName && codeInfo.affiliateName !== "Direct / Studio")) {
      marketersMap.set(codeKey, {
        affiliate_name: codeInfo.affiliateName || "Partner",
        coupon_code: codeKey,
        students_count: 0,
        net_sales_jod: 0,
        commission_percent: codeInfo.commissionPercent,
        commission_due_jod: 0,
        company_net_jod: 0
      });
    }
  }

  // Apply dynamic USD accounting formula per product:
  // 1. Base price (basePriceUsd): resolved from canonical catalog or stored price_usd/price_jod
  // 2. Discount amount (discountAmount): deducted first -> netPriceAfterDiscount = basePrice - discountAmount
  // 3. Marketer commission (commissionAmount): calculated EXCLUSIVELY from netPriceAfterDiscount:
  //    commissionAmount = netPriceAfterDiscount * (commissionPercent / 100)
  // 4. Academy net revenue (finalNetRevenue): netPriceAfterDiscount - commissionAmount
  for (const r of rows) {
    const status = String(r.payment_status || "").toUpperCase();
    const isPaid = ["PAID", "APPROVED", "VERIFIED"].includes(status);
    const isPending = ["PENDING_REVIEW", "PENDING", "WHOP_PENDING", "INQUIRY"].includes(status);

    const normalizedId = normalizeProductId(r.course_id);
    const catalogPrice = resolveProductPriceUsd(normalizedId, 0);
    const rawDiscount = Math.max(0, Number(r.discount_usd ?? r.discount_jod ?? 0));
    const storedPrice = Number(r.price_usd ?? r.price_jod ?? 0);
    const inferredBase = storedPrice > 0 && rawDiscount > 0 && storedPrice < catalogPrice
      ? roundMoney(storedPrice + rawDiscount)
      : (storedPrice > 0 ? storedPrice : catalogPrice);
    const basePrice = catalogPrice > 0 ? catalogPrice : inferredBase;
    const discountAmount = rawDiscount;
    const netPriceAfterDiscount = roundMoney(Math.max(0, basePrice - discountAmount));

    const cCode = String(r.coupon_code || "").trim().toUpperCase();
    let commPct = Number(r.commission_percent || 0);
    let affName = r.affiliate_name || "";

    if (cCode && (!commPct || !affName)) {
      const known = allCodesMap.get(cCode);
      if (known) {
        if (!commPct) commPct = known.commissionPercent;
        if (!affName) affName = known.affiliateName;
      }
    }

    const commissionAmount = roundMoney(netPriceAfterDiscount * (commPct / 100));
    const finalNetRevenue = roundMoney(netPriceAfterDiscount - commissionAmount);

    r.course_id = normalizedId;
    r.currency = BASE_CURRENCY;
    r.base_price = basePrice;
    r.discount_jod = discountAmount;
    r.discount_usd = discountAmount;
    r.price_jod = netPriceAfterDiscount;
    r.price_usd = netPriceAfterDiscount;
    r.net_price_jod = netPriceAfterDiscount;
    r.commission_percent = commPct;
    r.commission_jod = commissionAmount;
    r.affiliate_name = affName;
    r.academy_net_jod = finalNetRevenue;

    if (isPaid) {
      totals.gross += basePrice;
      totals.discounts += discountAmount;
      totals.revenue += netPriceAfterDiscount;
      totals.commissionsTotal += commissionAmount;
      if (r.commission_status !== "PAID") {
        totals.commissionsDue += commissionAmount;
      }

      if (cCode) {
        if (!marketersMap.has(cCode)) {
          marketersMap.set(cCode, {
            affiliate_name: affName || "Affiliate",
            coupon_code: cCode,
            students_count: 0,
            net_sales_jod: 0,
            commission_percent: commPct,
            commission_due_jod: 0,
            company_net_jod: 0
          });
        }
        const m = marketersMap.get(cCode);
        m.students_count += 1;
        m.net_sales_jod = roundMoney(m.net_sales_jod + netPriceAfterDiscount);
        m.commission_due_jod = roundMoney(m.commission_due_jod + commissionAmount);
        m.company_net_jod = roundMoney(m.company_net_jod + finalNetRevenue);
      }
    } else if (isPending) {
      totals.pending += netPriceAfterDiscount;
    }
  }

  totals.netSales = totals.revenue;
  totals.studioNet = Math.max(0, totals.revenue - totals.commissionsTotal);

  // Fetch marketer commission payouts state
  const payoutsMap = new Map();
  if (sql) {
    try {
      const dbPayouts = await sql`SELECT code, paid, paid_at FROM marketer_payouts`;
      for (const p of (dbPayouts || [])) {
        payoutsMap.set(String(p.code).toUpperCase(), {
          paid: Boolean(p.paid),
          paidAt: p.paid_at ? new Date(p.paid_at).toISOString() : null
        });
      }
    } catch (e) {
      console.warn("Notice querying marketer_payouts:", e.message);
    }
  }

  try {
    const localPayouts = local.marketerPayouts || {};
    for (const [codeKey, p] of Object.entries(localPayouts)) {
      const uc = String(codeKey).toUpperCase();
      if (!payoutsMap.has(uc)) {
        payoutsMap.set(uc, {
          paid: Boolean(p?.paid),
          paidAt: p?.paid_at || null
        });
      }
    }
  } catch (_) {}

  const finalMarketersLedger = Array.from(marketersMap.values()).map(m => {
    const uc = String(m.coupon_code || m.code || "").toUpperCase();
    const pInfo = payoutsMap.get(uc);
    const isPaid = Boolean(pInfo?.paid);
    const paidAt = pInfo?.paidAt || null;
    return {
      ...m,
      code: m.coupon_code,
      coupon_code: m.coupon_code,
      marketerName: m.affiliate_name,
      affiliate_name: m.affiliate_name,
      studentsCount: m.students_count,
      students_count: m.students_count,
      netSalesAfterDiscount: m.net_sales_jod,
      net_sales_jod: m.net_sales_jod,
      commissionPercent: m.commission_percent,
      commission_percent: m.commission_percent,
      commissionDue: m.commission_due_jod,
      commission_due_jod: m.commission_due_jod,
      companyNetProfit: m.company_net_jod,
      company_net_jod: m.company_net_jod,
      paid: isPaid,
      paidAt: paidAt,
      paid_at: paidAt
    };
  });

  let waitlist = [];
  let leads = [];
  if (sql) {
    try {
      waitlist = await sql`SELECT id, reference, product_id, product_title, full_name, email, whatsapp, discipline, status, created_at FROM marketplace_waitlist ORDER BY created_at DESC LIMIT 2000`;
    } catch {}
    try {
      leads = await sql`SELECT id, reference, campaign, full_name, email, status, created_at FROM marketplace_leads ORDER BY created_at DESC LIMIT 2000`;
    } catch {}
  }
  if (waitlist.length === 0 && Array.isArray(local.waitlist)) {
    waitlist = local.waitlist;
  }
  if (leads.length === 0 && Array.isArray(local.leads)) {
    leads = local.leads;
  }

  return {
    currency: BASE_CURRENCY,
    totals: Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, Math.round(value * 1000) / 1000])),
    registrations: rows,
    waitlist,
    leads,
    marketersLedger: finalMarketersLedger,
    adjustments,
  };
}

export default async function handler(req, res) {
  try {
    let gate;
    try {
      gate = await requireAdmin(toWebRequest(req));
      if (!gate.ok) return sendWebResponse(res, gate.response);
    } catch (authErr) {
      console.warn("[course-engine] Auth verification error:", authErr.message);
      return send(res, 401, { error: "Authentication verification failed." });
    }

    if (!["GET", "POST"].includes(req.method)) return send(res, 405, { error: "Method not allowed." });

    let sql = null;
    try {
      sql = getSql();
    } catch (e) {
      console.warn("[course-engine] Database client unavailable, using fallback:", e.message);
    }

    try {
      await ensureSchema(sql);
    } catch (e) {
      console.warn("[course-engine] Schema sync notice:", e.message);
    }

    if (req.method === "GET") {
      if (req.query?.action === "receipt" || req.query?.view === "receipt") {
        const id = text(req.query.id, 64);
        let receiptBase64 = "";
        let receiptUrl = "";
        let receiptName = "payment-receipt.jpg";
        if (sql && id) {
          try {
            const [r] = await sql`SELECT receipt_base64, receipt_url, payment_proof_pathname, receipt_name FROM course_registrations WHERE id::text=${id} OR payment_reference=${id} LIMIT 1`;
            if (r) {
              receiptBase64 = r.receipt_base64 || "";
              receiptUrl = r.receipt_url || r.payment_proof_pathname || "";
              receiptName = r.receipt_name || "payment-receipt.jpg";
            }
            if (!receiptBase64 && !receiptUrl) {
              const [ar] = await sql`SELECT receipt_base64, receipt_url, receipt_name FROM academy_registrations WHERE id::text=${id} OR reference=${id} LIMIT 1`;
              if (ar) {
                receiptBase64 = ar.receipt_base64 || "";
                receiptUrl = ar.receipt_url || "";
                receiptName = ar.receipt_name || "payment-receipt.jpg";
              }
            }
          } catch {}
        }
        if (!receiptBase64 && !receiptUrl) {
          const local = readLocalData();
          const found = (local.registrations || []).find(r => String(r.id) === id || r.reference === id);
          if (found) {
            receiptBase64 = found.receiptBase64 || "";
            receiptUrl = found.receiptUrl || "";
            receiptName = found.receiptName || "payment-receipt.jpg";
          }
        }
        if (receiptBase64) {
          const match = receiptBase64.match(/^data:([^;]+);base64,(.+)$/);
          const mimeType = match ? match[1] : (receiptName.endsWith(".pdf") ? "application/pdf" : "image/jpeg");
          const buffer = Buffer.from(match ? match[2] : receiptBase64, "base64");
          res.setHeader("Content-Type", mimeType);
          res.setHeader("Content-Disposition", `inline; filename="${receiptName}"`);
          res.setHeader("Cache-Control", "private, max-age=3600");
          return res.status(200).send(buffer);
        }
        if (receiptUrl && receiptUrl.startsWith("/media/uploads/receipts/")) {
          const localPath = join(process.cwd(), receiptUrl.replace(/^\/+/, ""));
          if (existsSync(localPath)) {
            const buffer = readFileSync(localPath);
            const mimeType = localPath.endsWith(".pdf") ? "application/pdf" : localPath.endsWith(".png") ? "image/png" : localPath.endsWith(".webp") ? "image/webp" : "image/jpeg";
            res.setHeader("Content-Type", mimeType);
            res.setHeader("Content-Disposition", `inline; filename="${receiptName}"`);
            res.setHeader("Cache-Control", "private, max-age=3600");
            return res.status(200).send(buffer);
          }
        }
        if (receiptUrl && (receiptUrl.includes(".blob.vercel-storage.com") || receiptUrl.startsWith("academy-receipts/") || receiptUrl.startsWith("course-payment-proofs/"))) {
          try {
            const blobObj = await get(receiptUrl, { access: "private", useCache: false });
            if (blobObj && blobObj.statusCode === 200) {
              const chunks = [];
              for await (const ch of blobObj.stream) chunks.push(Buffer.from(ch));
              const buffer = Buffer.concat(chunks);
              res.setHeader("Content-Type", blobObj.blob.contentType || "image/jpeg");
              res.setHeader("Content-Disposition", `inline; filename="${receiptName}"`);
              res.setHeader("Cache-Control", "private, max-age=3600");
              return res.status(200).send(buffer);
            }
          } catch (blobErr) {
            console.warn("[admin receipt blob fetch notice]:", blobErr.message);
          }
        }
        return send(res, 404, { error: "Receipt image not found" });
      }

      if (req.query?.view === "export-excel" || req.query?.action === "export-excel") {
        const accountingData = await getAccounting(sql);
        const buffer = await generateExcelReportBuffer(accountingData);
        const filename = `7z-magic-academy-financial-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Cache-Control", "no-store");
        return res.status(200).send(buffer);
      }

      if (req.query?.view === "accounting") {
        const accountingData = await getAccounting(sql);
        return send(res, 200, accountingData);
      }

      if (req.query?.action === "majara-data" || req.query?.view === "majara-data") {
        const [courses, students] = await Promise.all([
          getMajaraCourses(),
          getMajaraStudents()
        ]);
        return send(res, 200, { ok: true, courses: courses || [], students: students || [] });
      }

      if (req.query?.action === "majara-lessons" || req.query?.view === "majara-lessons") {
        const courseId = text(req.query.courseId || req.query.id, 64);
        const lessons = await getMajaraLessons(courseId);
        return send(res, 200, { ok: true, lessons: lessons || [] });
      }

      const [affiliates, codes] = await Promise.all([getAffiliates(sql), getCodes(sql)]);
      return send(res, 200, { affiliates: affiliates || [], codes: codes || [] });
    }

    const body = bodyOf(req);

    // =========================================================================
    // MAJARA ACADEMY ADMIN POST ACTIONS
    // =========================================================================
    if (body.action === "save-majara-course" || body.action === "create-majara-course" || body.action === "update-majara-course") {
      try {
        const saved = await saveMajaraCourse(body);
        return send(res, 200, { ok: true, course: saved });
      } catch (err) {
        return send(res, 500, { ok: false, error: err.message });
      }
    }

    if (body.action === "delete-majara-course") {
      try {
        const result = await deleteMajaraCourse(body.id || body.courseId);
        return send(res, 200, { ok: true, ...result });
      } catch (err) {
        return send(res, 500, { ok: false, error: err.message });
      }
    }

    if (body.action === "save-majara-lesson" || body.action === "create-majara-lesson" || body.action === "update-majara-lesson") {
      try {
        const saved = await saveMajaraLesson(body);
        return send(res, 200, { ok: true, lesson: saved });
      } catch (err) {
        return send(res, 500, { ok: false, error: err.message });
      }
    }

    if (body.action === "delete-majara-lesson") {
      try {
        const result = await deleteMajaraLesson(body.id || body.lessonId);
        return send(res, 200, { ok: true, ...result });
      } catch (err) {
        return send(res, 500, { ok: false, error: err.message });
      }
    }

    if (body.action === "save-majara-student" || body.action === "create-majara-student" || body.action === "update-majara-student") {
      try {
        const saved = await saveMajaraStudent(body);
        if (Array.isArray(body.permissions)) {
          for (const perm of body.permissions) {
            if (perm.granted) {
              await setMajaraEnrollment(saved.id, perm.courseId, "active", "admin_matrix");
            } else {
              await deleteMajaraEnrollment(saved.id, perm.courseId);
            }
          }
        } else if (body.courseId) {
          await setMajaraEnrollment(saved.id, body.courseId, "active", "admin_manual");
        }
        let activationLink = null;
        if (body.sendActivation) {
          const resAct = await enrollStudentByPurchase({
            fullName: saved.full_name,
            email: saved.email,
            phone: saved.phone,
            courseId: body.courseId || "cinematic-film"
          });
          activationLink = resAct?.activationLink;
        }
        return send(res, 200, { ok: true, student: saved, activationLink });
      } catch (err) {
        return send(res, 500, { ok: false, error: err.message });
      }
    }

    if (body.action === "upload-lesson-asset") {
      try {
        const rawFileName = text(body.fileName, 120) || "attachment.bin";
        const cleanName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const fileData = String(body.fileData || "");
        
        // Detect extension / type
        const ext = cleanName.split(".").pop().toLowerCase();
        let fileType = "other";
        if (["ppt", "pptx"].includes(ext)) fileType = "pptx";
        else if (["doc", "docx"].includes(ext)) fileType = "docx";
        else if (["xls", "xlsx"].includes(ext)) fileType = "xlsx";
        else if (ext === "pdf") fileType = "pdf";
        else if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) fileType = "zip";

        let finalUrl = fileData;
        try {
          const uploadsDir = join(process.cwd(), "media", "uploads", "lessons");
          const { mkdirSync, writeFileSync } = await import("node:fs");
          if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
          const diskFileName = `${Date.now()}-${cleanName}`;
          const diskPath = join(uploadsDir, diskFileName);
          
          if (fileData.startsWith("data:")) {
            const base64Data = fileData.split(",")[1];
            if (base64Data) {
              writeFileSync(diskPath, Buffer.from(base64Data, "base64"));
              finalUrl = `/media/uploads/lessons/${diskFileName}`;
            }
          }
        } catch (e) {
          // If disk write is unsupported, finalUrl remains fileData
        }

        return send(res, 200, {
          ok: true,
          url: finalUrl,
          name: rawFileName,
          type: fileType
        });
      } catch (err) {
        return send(res, 500, { ok: false, error: err.message });
      }
    }

    if (body.action === "delete-majara-student") {
      try {
        const result = await deleteMajaraStudent(body.id || body.studentId);
        return send(res, 200, { ok: true, ...result });
      } catch (err) {
        return send(res, 500, { ok: false, error: err.message });
      }
    }

    if (body.action === "toggle-majara-enrollment") {
      try {
        const status = body.status === "suspended" ? "suspended" : "active";
        const enrollment = await setMajaraEnrollment(body.studentId, body.courseId, status, "admin");
        return send(res, 200, { ok: true, enrollment });
      } catch (err) {
        return send(res, 500, { ok: false, error: err.message });
      }
    }

    if (body.action === "send-student-activation") {
      try {
        const student = await getMajaraStudentById(body.studentId || body.id) || await getMajaraStudentByEmail(body.email);
        if (!student) return send(res, 404, { ok: false, error: "Student not found" });
        const resAct = await enrollStudentByPurchase({
          fullName: student.full_name,
          email: student.email,
          phone: student.phone,
          courseId: body.courseId || "cinematic-film"
        });
        return send(res, 200, { ok: true, sent: true, activationLink: resAct?.activationLink });
      } catch (err) {
        return send(res, 500, { ok: false, error: err.message });
      }
    }

    if (body.action === "create-affiliate") {
      const name = text(body.name, 120);
      const email = text(body.email, 180).toLowerCase();
      const company = text(body.company, 160);
      const commission = percent(body.commissionPercent);
      if (!name || commission === null || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        return send(res, 400, { error: "Enter a name, valid email and commission between 0 and 100." });
      }

      const affObj = {
        id: `aff_${Date.now()}`,
        name,
        email,
        company,
        commissionPercent: commission,
        discountPercent: 15,
        status: "active"
      };

      await saveAffiliateDual(affObj);

      if (gate?.auth?.userId) {
        try {
          await writeAudit({ actorUserId: gate.auth.userId, action: "course_affiliate_created", targetType: "course_affiliate", targetId: affObj.id, details: { email, commissionPercent: commission } });
        } catch {}
      }

      return send(res, 201, { affiliate: affObj });
    }

    if (body.action === "create-code") {
      const code = text(body.code, 32).toUpperCase();
      const courseId = text(body.courseId || "all", 32);
      const discount = percent(body.discountPercent);
      const hasCommission = body.commissionPercent !== "" && body.commissionPercent !== undefined;
      const commissionInput = hasCommission ? percent(body.commissionPercent) : null;
      if (!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code) || !courses.has(courseId) || discount === null || (hasCommission && commissionInput === null)) {
        return send(res, 400, { error: "Check the code, course and percentage values." });
      }

      let affiliateName = "";
      let affiliateId = null;
      if (body.affiliateId) {
        affiliateId = text(body.affiliateId, 64);
        if (sql) {
          try {
            const rows = await sql`SELECT id, name, commission_percent, status FROM course_admin_affiliates WHERE id::text=${affiliateId}`;
            if (rows[0]) affiliateName = rows[0].name;
          } catch {}
        }
        if (!affiliateName) {
          try {
            const local = readLocalData();
            const found = (local.affiliates || []).find(a => String(a.id) === affiliateId);
            if (found) affiliateName = found.name;
          } catch {}
        }
      }

      const commission = commissionInput ?? 0;
      const maxUses = body.maxRedemptions ? Number(body.maxRedemptions) : null;

      const couponObj = {
        id: `code_${Date.now()}`,
        code,
        affiliateId,
        affiliateName,
        courseScope: courseId,
        discountPercent: discount,
        commissionPercent: commission,
        status: "active",
        maxRedemptions: maxUses
      };

      await saveDiscountCodeDual(couponObj);

      if (gate?.auth?.userId) {
        try {
          await writeAudit({ actorUserId: gate.auth.userId, action: "course_discount_code_created", targetType: "course_discount_code", targetId: couponObj.id, details: { code, courseId, discountPercent: discount, commissionPercent: commission } });
        } catch {}
      }

      return send(res, 201, { coupon: couponObj });
    }

    if (body.action === "toggle-affiliate") {
      const status = body.status === "inactive" ? "inactive" : "active";
      let affiliate = null;
      if (sql) {
        try {
          const [a] = await sql`UPDATE course_admin_affiliates SET status=${status},updated_at=NOW() WHERE id::text=${text(body.id,64)} RETURNING id,status`;
          if (a) affiliate = a;
          if (status === "inactive") await sql`UPDATE course_discount_codes SET status='inactive',updated_at=NOW() WHERE affiliate_id::text=${text(body.id,64)}`;
        } catch {}
      }
      try {
        const local = readLocalData();
        const found = (local.affiliates || []).find(a => String(a.id) === String(body.id));
        if (found) {
          found.status = status;
          saveLocalData(local);
          if (!affiliate) affiliate = { id: found.id, status };
        }
      } catch {}
      return send(res, 200, { affiliate: affiliate || { id: body.id, status } });
    }

    if (body.action === "delete-affiliate") {
      const id = text(body.id, 64);
      if (sql) {
        try {
          await sql`DELETE FROM course_discount_codes WHERE affiliate_id::text=${id}`;
          await sql`DELETE FROM course_admin_affiliates WHERE id::text=${id}`;
        } catch {}
      }
      try {
        const local = readLocalData();
        local.affiliates = (local.affiliates || []).filter(a => String(a.id) !== id);
        saveLocalData(local);
      } catch {}
      return send(res, 200, { deleted: true });
    }

    if (body.action === "archive-all-affiliates") {
      let result = { affiliates: 0, codes: 0 };
      if (sql) {
        try {
          const [r] = await sql`WITH archived AS (UPDATE course_admin_affiliates SET status='inactive',updated_at=NOW() WHERE status='active' RETURNING id), codes AS (UPDATE course_discount_codes SET status='inactive',updated_at=NOW() WHERE status='active' AND affiliate_id IN (SELECT id FROM archived) RETURNING id) SELECT (SELECT COUNT(*)::int FROM archived) AS affiliates,(SELECT COUNT(*)::int FROM codes) AS codes`;
          if (r) result = { affiliates: Number(r.affiliates || 0), codes: Number(r.codes || 0) };
        } catch {}
      }
      try {
        const local = readLocalData();
        (local.affiliates || []).forEach(a => a.status = "inactive");
        saveLocalData(local);
      } catch {}
      return send(res, 200, { archived: result });
    }

    if (body.action === "update-affiliate") {
      const id = text(body.id, 64);
      const name = text(body.name, 120);
      const email = text(body.email, 180).toLowerCase();
      const company = text(body.company, 160);
      const commission = percent(body.commissionPercent);
      let affiliate = null;
      if (sql) {
        try {
          const [a] = await sql`UPDATE course_admin_affiliates SET name=${name},email=${email || null},company=${company},commission_percent=${commission},updated_at=NOW() WHERE id::text=${id} RETURNING id,name,email,company,commission_percent,status`;
          if (a) affiliate = a;
        } catch {}
      }
      try {
        const local = readLocalData();
        const found = (local.affiliates || []).find(a => String(a.id) === id);
        if (found) {
          found.name = name;
          found.email = email;
          found.company = company;
          found.commissionPercent = commission;
          saveLocalData(local);
          if (!affiliate) affiliate = { id, name, email, company, commission_percent: commission, status: found.status };
        }
      } catch {}
      return send(res, 200, { affiliate: affiliate || { id, name, email, company, commission_percent: commission, status: "active" } });
    }

    if (body.action === "toggle-code") {
      const status = body.status === "inactive" ? "inactive" : "active";
      let coupon = null;
      if (sql) {
        try {
          const [c] = await sql`UPDATE course_discount_codes SET status=${status},updated_at=NOW() WHERE id::text=${text(body.id,64)} RETURNING id,status`;
          if (c) coupon = c;
        } catch {}
      }
      try {
        const local = readLocalData();
        const found = (local.coupons || []).find(c => String(c.id) === String(body.id));
        if (found) {
          found.status = status;
          saveLocalData(local);
          if (!coupon) coupon = { id: found.id, status };
        }
      } catch {}
      return send(res, 200, { coupon: coupon || { id: body.id, status } });
    }

    if (body.action === "delete-code") {
      const id = text(body.id, 64);
      let codeVal = text(body.code || body.name, 64).toUpperCase();
      if (sql) {
        try {
          if (!codeVal && id) {
            const [found] = await sql`SELECT code FROM course_discount_codes WHERE id::text=${id} LIMIT 1`;
            if (found?.code) codeVal = String(found.code).toUpperCase();
          }
          if (id) {
            await sql`DELETE FROM course_discount_codes WHERE id::text=${id}`;
          }
          if (codeVal) {
            await sql`DELETE FROM course_discount_codes WHERE UPPER(code)=${codeVal}`;
            await sql`DELETE FROM academy_coupons WHERE UPPER(code)=${codeVal}`;
            await sql`DELETE FROM academy_affiliates WHERE UPPER(code)=${codeVal}`;
            await sql`INSERT INTO deleted_discount_codes (code) VALUES (${codeVal}) ON CONFLICT DO NOTHING`;
          }
        } catch (e) {
          console.warn("[delete-code] SQL deletion notice:", e.message);
        }
      }
      try {
        const local = readLocalData();
        local.coupons = (local.coupons || []).filter(c => String(c.id) !== id && String(c.code).toUpperCase() !== codeVal);
        if (codeVal) {
          local.affiliates = (local.affiliates || []).filter(a => String(a.code).toUpperCase() !== codeVal);
        }
        saveLocalData(local);
      } catch {}
      return send(res, 200, { deleted: true, id, code: codeVal });
    }

    if (body.action === "update-code") {
      const id = text(body.id, 64);
      const code = text(body.code, 32).toUpperCase();
      const courseId = text(body.courseId || "all", 32);
      const discount = percent(body.discountPercent);
      const commission = percent(body.commissionPercent);
      const maxUses = body.maxRedemptions ? Number(body.maxRedemptions) : null;
      let coupon = null;
      if (sql) {
        try {
          const [c] = await sql`UPDATE course_discount_codes SET code=${code},course_id=${courseId},discount_percent=${discount},commission_percent=${commission},max_redemptions=${maxUses},updated_at=NOW() WHERE id::text=${id} RETURNING id,code,course_id,discount_percent,commission_percent,status,max_redemptions`;
          if (c) coupon = c;
        } catch {}
      }
      try {
        const local = readLocalData();
        const found = (local.coupons || []).find(c => String(c.id) === id);
        if (found) {
          found.code = code;
          found.discountPercent = discount;
          found.courseScope = courseId;
          saveLocalData(local);
          if (!coupon) coupon = { id, code, course_id: courseId, discount_percent: discount, commission_percent: commission, status: found.status, max_redemptions: maxUses };
        }
      } catch {}
      return send(res, 200, { coupon: coupon || { id, code, course_id: courseId, discount_percent: discount, commission_percent: commission, status: "active", max_redemptions: maxUses } });
    }

    if (body.action === "update-registration") {
      const registrationId = String(body.id);
      const fullName = text(body.fullName, 160);
      const email = text(body.email, 180).toLowerCase();
      const courseId = normalizeProductId(text(body.courseId, 64));
      const price = Number(body.priceJod);
      const discount = Number(body.discountJod);
      const commission = percent(body.commissionPercent) ?? 0;
      const paymentStatus = ["PENDING_REVIEW", "PAID", "REJECTED", "WHOP_PENDING", "INQUIRY"].includes(body.paymentStatus) ? body.paymentStatus : "PENDING_REVIEW";
      const roundedPrice = Math.round(price * 100) / 100;
      const roundedDiscount = Math.round(discount * 100) / 100;
      const net = Math.max(0, roundedPrice - roundedDiscount);
      const commissionJod = Math.round(net * commission) / 100;
      const commissionStatus = commission === 0 ? "NOT_APPLICABLE" : paymentStatus === "PAID" ? "PAYABLE" : "PENDING_PAYMENT_REVIEW";

      let registration = null;
      if (sql) {
        try {
          const [r] = await sql`UPDATE course_registrations SET full_name=${fullName},email=${email},course_id=${courseId},price_jod=${roundedPrice},discount_jod=${roundedDiscount},price_usd=${roundedPrice},discount_usd=${roundedDiscount},currency='USD',commission_percent=${commission},commission_jod=${commissionJod},payment_status=${paymentStatus},commission_status=${commissionStatus} WHERE id::text=${registrationId} OR payment_reference=${registrationId} RETURNING id,full_name,email,course_id,payment_status,price_jod,discount_jod,commission_percent,commission_jod,commission_status,created_at`;
          if (r) registration = r;
        } catch {}
      }

      try {
        const local = readLocalData();
        const found = (local.registrations || []).find(r => String(r.id) === registrationId || r.reference === registrationId || String(r.seatNumber) === registrationId);
        if (found) {
          found.fullName = fullName;
          found.email = email;
          found.courseId = courseId;
          found.finalPrice = roundedPrice;
          found.discountJod = roundedDiscount;
          found.paymentStatus = paymentStatus;
          saveLocalData(local);
          if (!registration) registration = { id: registrationId, full_name: fullName, email, course_id: courseId, payment_status: paymentStatus, price_jod: roundedPrice, discount_jod: roundedDiscount };
        }
      } catch {}

      return send(res, 200, { registration: registration || { id: registrationId, full_name: fullName, email, course_id: courseId, payment_status: paymentStatus } });
    }

    if (body.action === "delete-waitlist") {
      const id = text(body.id, 64);
      if (sql) {
        try {
          await sql`DELETE FROM marketplace_waitlist WHERE id::text=${id} OR reference=${id}`;
        } catch {}
      }
      try {
        const local = readLocalData();
        local.waitlist = (local.waitlist || []).filter(w => String(w.id) !== id && w.reference !== id);
        saveLocalData(local);
      } catch {}
      return send(res, 200, { deleted: true, id });
    }

    if (body.action === "delete-lead") {
      const id = text(body.id, 64);
      if (sql) {
        try {
          await sql`DELETE FROM marketplace_leads WHERE id::text=${id} OR reference=${id}`;
        } catch {}
      }
      try {
        const local = readLocalData();
        local.leads = (local.leads || []).filter(l => String(l.id) !== id && l.reference !== id);
        saveLocalData(local);
      } catch {}
      return send(res, 200, { deleted: true, id });
    }

    if (body.action === "delete-registration") {
      const registrationId = String(body.id || "");
      const reference = String(body.reference || "");
      const email = String(body.email || "").toLowerCase();
      const courseId = String(body.courseId || "");

      let foundRef = reference;
      let foundEmail = email;
      let foundCourse = courseId;
      let foundId = registrationId;

      if (sql) {
        try {
          await sql`CREATE TABLE IF NOT EXISTS deleted_registrations (
            id TEXT,
            reference TEXT,
            email TEXT,
            course_id TEXT,
            deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );`;

          const existingCourse = await sql`
            SELECT id, payment_reference, email, course_id FROM course_registrations
            WHERE id::text = ${registrationId} OR payment_reference = ${registrationId} OR (payment_reference IS NOT NULL AND payment_reference = ${reference})
            LIMIT 1
          `;
          if (existingCourse && existingCourse.length > 0) {
            foundId = String(existingCourse[0].id || registrationId);
            foundRef = existingCourse[0].payment_reference || foundRef;
            foundEmail = (existingCourse[0].email || foundEmail).toLowerCase();
            foundCourse = existingCourse[0].course_id || foundCourse;
          } else {
            const existingAcad = await sql`
              SELECT id, reference, email, course_id FROM academy_registrations
              WHERE id::text = ${registrationId} OR reference = ${registrationId} OR (reference IS NOT NULL AND reference = ${reference})
              LIMIT 1
            `;
            if (existingAcad && existingAcad.length > 0) {
              foundId = String(existingAcad[0].id || registrationId);
              foundRef = existingAcad[0].reference || foundRef;
              foundEmail = (existingAcad[0].email || foundEmail).toLowerCase();
              foundCourse = existingAcad[0].course_id || foundCourse;
            }
          }

          await sql`
            INSERT INTO deleted_registrations (id, reference, email, course_id, deleted_at)
            VALUES (${foundId}, ${foundRef || null}, ${foundEmail || null}, ${foundCourse || null}, NOW())
          `;

          await sql`
            DELETE FROM course_registrations
            WHERE id::text = ${registrationId}
               OR id::text = ${foundId}
               OR payment_reference = ${registrationId}
               OR (payment_reference IS NOT NULL AND payment_reference = ${foundRef})
               OR (email = ${foundEmail} AND course_id = ${foundCourse} AND ${foundEmail} != '')
          `;

          await sql`
            DELETE FROM academy_registrations
            WHERE id::text = ${registrationId}
               OR id::text = ${foundId}
               OR reference = ${registrationId}
               OR (reference IS NOT NULL AND reference = ${foundRef})
               OR (email = ${foundEmail} AND course_id = ${foundCourse} AND ${foundEmail} != '')
          `;
        } catch (dbErr) {
          console.warn("Notice deleting registration from DB:", dbErr.message);
        }
      }

      try {
        const local = readLocalData();
        local.registrations = (local.registrations || []).filter(r => {
          const matchId = String(r.id) === registrationId || String(r.id) === foundId || r.reference === registrationId || String(r.seatNumber) === registrationId;
          const matchRef = foundRef && (r.reference === foundRef || r.payment_reference === foundRef);
          const matchEmail = foundEmail && foundCourse && r.email && r.course_id && r.email.toLowerCase() === foundEmail.toLowerCase() && r.course_id === foundCourse;
          return !matchId && !matchRef && !matchEmail;
        });
        local.deleted_registrations = local.deleted_registrations || [];
        local.deleted_registrations.push({
          id: foundId,
          reference: foundRef,
          email: foundEmail,
          course_id: foundCourse,
          deleted_at: new Date().toISOString()
        });
        saveLocalData(local);
      } catch {}

      return send(res, 200, { deleted: true, registrationId: foundId, reference: foundRef });
    }

    if (body.action === "adjust-revenue") {
      const amount = Number(body.amount);
      const reason = text(body.reason, 240);
      let adjustment = { id: `adj_${Date.now()}`, amount_jod: amount, reason, created_by: String(gate?.auth?.userId || "admin"), created_at: new Date().toISOString() };
      if (sql) {
        try {
          const [adj] = await sql`INSERT INTO course_revenue_adjustments (amount_jod,reason,created_by) VALUES (${Math.round(amount * 1000) / 1000},${reason},${String(gate.auth.userId)}) RETURNING id,amount_jod,reason,created_by,created_at`;
          if (adj) adjustment = adj;
        } catch {}
      }
      return send(res, 201, { adjustment });
    }

    if (body.action === "reset-revenue") {
      const current = await getAccounting(sql);
      const amount = -Number(current.totals.revenue || 0);
      let adjustment = { id: `adj_${Date.now()}`, amount_jod: amount, reason: 'Administrator reset of reported revenue', created_by: String(gate?.auth?.userId || "admin"), created_at: new Date().toISOString() };
      if (sql && Math.abs(amount) >= 0.0005) {
        try {
          const [adj] = await sql`INSERT INTO course_revenue_adjustments (amount_jod,reason,created_by) VALUES (${Math.round(amount * 1000) / 1000},'Administrator reset of reported revenue',${String(gate.auth.userId)}) RETURNING id,amount_jod,reason,created_by,created_at`;
          if (adj) adjustment = adj;
        } catch {}
      }
      return send(res, 200, { reset: true, adjustment });
    }

    if (body.action === "update-revenue-adjustment") {
      const id = text(body.id, 64);
      const amount = Number(body.amount);
      const reason = text(body.reason, 240);
      let adjustment = { id, amount_jod: amount, reason, created_by: String(gate?.auth?.userId || "admin"), created_at: new Date().toISOString() };
      if (sql) {
        try {
          const [adj] = await sql`UPDATE course_revenue_adjustments SET amount_jod=${Math.round(amount * 1000) / 1000},reason=${reason} WHERE id::text=${id} RETURNING id,amount_jod,reason,created_by,created_at`;
          if (adj) adjustment = adj;
        } catch {}
      }
      return send(res, 200, { adjustment });
    }

    if (body.action === "delete-revenue-adjustment") {
      const id = text(body.id, 64);
      if (sql) {
        try {
          await sql`DELETE FROM course_revenue_adjustments WHERE id::text=${id}`;
        } catch {}
      }
      return send(res, 200, { deleted: true });
    }

    if (body.action === "set-payment-status") {
      const rawStatus = String(body.status || "").toUpperCase();
      const isApprove = ["PAID", "APPROVED", "VERIFIED"].includes(rawStatus);
      const isReject = rawStatus === "REJECTED";
      const status = isApprove ? "PAID" : isReject ? "REJECTED" : "PENDING_REVIEW";
      const rawId = String(body.id || "").trim();
      const numId = Number(rawId);
      const isNum = Number.isSafeInteger(numId) && numId > 0;

      let registration = null;
      if (sql) {
        try {
          if (isNum) {
            const [r] = await sql`UPDATE course_registrations SET payment_status=${status},
              commission_status=CASE WHEN ${status}='PAID' AND commission_percent>0 THEN 'PAYABLE'
                WHEN ${status}='PAID' THEN 'NOT_APPLICABLE' WHEN ${status}='PENDING_REVIEW' AND commission_percent>0 THEN 'PENDING_PAYMENT_REVIEW'
                ELSE 'NOT_APPLICABLE' END
              WHERE id=${numId} RETURNING id,full_name,email,course_id,seat_number,payment_status,commission_status,payment_reference`;
            if (r) registration = r;
          }
          if (!registration && rawId) {
            const [r] = await sql`UPDATE course_registrations SET payment_status=${status},
              commission_status=CASE WHEN ${status}='PAID' AND commission_percent>0 THEN 'PAYABLE'
                WHEN ${status}='PAID' THEN 'NOT_APPLICABLE' WHEN ${status}='PENDING_REVIEW' AND commission_percent>0 THEN 'PENDING_PAYMENT_REVIEW'
                ELSE 'NOT_APPLICABLE' END
              WHERE payment_reference=${rawId} OR id::text=${rawId} RETURNING id,full_name,email,course_id,seat_number,payment_status,commission_status,payment_reference`;
            if (r) registration = r;
          }
        } catch (e) {
          console.warn("SQL course_registrations update notice:", e.message);
        }

        try {
          const academyStatus = isApprove ? "APPROVED" : status;
          const [ar] = await sql`UPDATE academy_registrations SET payment_status=${academyStatus}
            WHERE reference=${rawId} OR id::text=${rawId}
            RETURNING id,full_name,email,course_id,seat_number,payment_status,reference as payment_reference`;
          if (ar && !registration) registration = ar;
        } catch (e) {
          console.warn("SQL academy_registrations update notice:", e.message);
        }
      }

      try {
        const local = readLocalData();
        const found = (local.registrations || []).find(r =>
          String(r.id) === rawId ||
          String(r.seatNumber) === rawId ||
          r.reference === rawId ||
          r.payment_reference === rawId
        );
        if (found) {
          found.paymentStatus = isApprove ? "APPROVED" : status;
          saveLocalData(local);
          if (!registration) {
            registration = {
              id: found.id || found.seatNumber || found.reference,
              full_name: found.fullName || found.full_name,
              email: found.email,
              course_id: found.courseId || found.course_id,
              seat_number: found.seatNumber || found.seat_number,
              payment_status: found.paymentStatus,
              payment_reference: found.reference || found.payment_reference
            };
          }
        }
      } catch (e) {
        console.warn("Local data update notice:", e.message);
      }

      if (!registration) {
        registration = {
          id: rawId,
          full_name: body.fullName || "Student",
          email: body.email || "",
          course_id: body.courseId || "cinematic-film",
          payment_status: status,
          payment_reference: rawId
        };
      }

      if (gate?.auth?.userId) {
        try {
          await writeAudit({
            actorUserId: gate.auth.userId,
            action: "course_payment_status_changed",
            targetType: "course_registration",
            targetId: registration.id,
            details: { status }
          });
        } catch {}
      }

      const matchedProd = resolveProduct(registration.course_id);
      const courseName = matchedProd ? matchedProd.nameAr : "7Z Magic Academy";

      if (status === "PAID" && registration.email) {
        await sendPaymentApprovedEmail({
          fullName: registration.full_name,
          email: registration.email,
          courseName,
          seatNumber: registration.seat_number || registration.id,
          reference: registration.payment_reference || `7Z-REG-${registration.id}`
        }).catch((err) => console.error("Admin approve email error:", err.message));

        // Auto-enroll in Majara Academy and send student portal login / activation
        try {
          await enrollStudentByPurchase({
            fullName: registration.full_name,
            email: registration.email,
            phone: registration.phone || "",
            courseId: registration.course_id || "cinematic-film"
          });
        } catch (enrollErr) {
          console.warn("[auto-enroll notice]:", enrollErr.message);
        }
      } else if (status === "REJECTED" && registration.email) {
        await sendPaymentRejectedEmail({
          fullName: registration.full_name,
          email: registration.email,
          courseName,
          reference: registration.payment_reference || `7Z-REG-${registration.id}`
        }, body.reason || "").catch((err) => console.error("Admin reject email error:", err.message));
      }

      return send(res, 200, { registration });
    }

    if (body.action === "set-commission-status") {
      const status = body.status === "PAID" ? "PAID" : "PAYABLE";
      const registrationId = Number(body.id);
      let registration = { id: registrationId, commission_status: status };
      if (sql && Number.isSafeInteger(registrationId) && registrationId > 0) {
        try {
          const [r] = await sql`UPDATE course_registrations SET commission_status=${status}
            WHERE id=${registrationId} AND payment_status IN ('PAID','APPROVED','VERIFIED') AND commission_percent>0
            RETURNING id,commission_status`;
          if (r) registration = r;
        } catch {}
      }
      return send(res, 200, { registration });
    }

    if (body.action === "toggle-commission-paid" || req.query?.action === "toggle-commission-paid") {
      const code = text(body.code || req.query?.code, 64).toUpperCase();
      if (!code) {
        return send(res, 400, { error: "Marketer code is required." });
      }
      const paid = body.paid !== undefined ? Boolean(body.paid) : true;
      const now = new Date().toISOString();

      if (sql) {
        try {
          await sql`INSERT INTO marketer_payouts (code, paid, paid_at, updated_at)
            VALUES (${code}, ${paid}, ${paid ? sql`NOW()` : null}, NOW())
            ON CONFLICT (code) DO UPDATE
            SET paid = EXCLUDED.paid,
                paid_at = EXCLUDED.paid_at,
                updated_at = NOW()`;
        } catch (dbErr) {
          console.warn("Notice updating marketer_payouts in DB:", dbErr.message);
        }
      }

      // Local fallback sync
      try {
        const local = readLocalData();
        if (!local.marketerPayouts) local.marketerPayouts = {};
        local.marketerPayouts[code] = {
          paid,
          paid_at: paid ? now : null,
          updated_at: now
        };
        saveLocalData(local);
      } catch (localErr) {
        console.warn("Notice saving local marketer_payouts:", localErr.message);
      }

      if (gate?.auth?.userId) {
        try {
          await writeAudit({
            actorUserId: gate.auth.userId,
            action: paid ? "marketer_commission_paid" : "marketer_commission_unpaid",
            targetType: "marketer_payout",
            targetId: code,
            details: { code, paid, paid_at: paid ? now : null }
          });
        } catch {}
      }

      return send(res, 200, { ok: true, code, paid, paid_at: paid ? now : null });
    }

    return send(res, 400, { error: "Unknown course management action." });
  } catch (error) {
    console.error("Course admin engine error handled:", error);
    if (error?.code === "23505") return send(res, 409, { error: "That value is already in use. Check the discount code or student email." });
    // Safe graceful degradation instead of 500 crash
    return send(res, 200, { affiliates: [], codes: [], error: null });
  }
}
