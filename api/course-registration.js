import tls from "node:tls";
import { createHash, randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const CAPACITY = 60;
const RECIPIENT = "creative@7z-magic.com";
const ALLOWED_ORIGINS = new Set(["https://7z-magic.com", "https://www.7z-magic.com"]);

export function sqlClient() {
  const connection = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connection) throw new Error("DATABASE_URL is not configured");
  return neon(connection);
}

function setHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
}

export async function prepare(sql) {
  await sql`CREATE TABLE IF NOT EXISTS course_registrations (
    id BIGSERIAL PRIMARY KEY,
    seat_number INTEGER NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    location TEXT NOT NULL,
    experience TEXT NOT NULL,
    preferred_language TEXT NOT NULL,
    goal TEXT NOT NULL DEFAULT '',
    previous_course_email TEXT NOT NULL DEFAULT '',
    consent BOOLEAN NOT NULL DEFAULT TRUE,
    payment_status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    payment_provider TEXT NOT NULL DEFAULT 'LEGACY',
    payment_reference TEXT NOT NULL DEFAULT '',
    payment_proof_pathname TEXT NOT NULL DEFAULT '',
    payment_proof_content_type TEXT NOT NULL DEFAULT '',
    coupon_code TEXT NOT NULL DEFAULT '',
    discount_percent INTEGER NOT NULL DEFAULT 0,
    discount_jod NUMERIC(10,3) NOT NULL DEFAULT 0,
    affiliate_name TEXT NOT NULL DEFAULT '',
    commission_percent INTEGER NOT NULL DEFAULT 0,
    commission_jod NUMERIC(10,3) NOT NULL DEFAULT 0,
    commission_status TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
    payment_submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (email)
  )`;
  await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'PENDING_REVIEW'`;
  await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT 'LEGACY'`;
  await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS payment_reference TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS payment_proof_pathname TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS payment_proof_content_type TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS payment_submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS coupon_code TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS discount_percent INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS discount_jod NUMERIC(10,3) NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS affiliate_name TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS commission_percent INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS commission_jod NUMERIC(10,3) NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS commission_status TEXT NOT NULL DEFAULT 'NOT_APPLICABLE'`;
  await sql`ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS previous_course_email TEXT NOT NULL DEFAULT ''`;
  await sql`CREATE TABLE IF NOT EXISTS course_checkout_intents (
    id BIGSERIAL PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    location TEXT NOT NULL,
    experience TEXT NOT NULL,
    preferred_language TEXT NOT NULL,
    goal TEXT NOT NULL DEFAULT '',
    previous_course_email TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'PENDING',
    payment_provider TEXT,
    payment_reference TEXT,
    payment_proof_pathname TEXT NOT NULL DEFAULT '',
    payment_proof_content_type TEXT NOT NULL DEFAULT '',
    payment_proof_provider TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    submitted_at TIMESTAMPTZ,
    registration_seat INTEGER
  )`;
  await sql`ALTER TABLE course_checkout_intents ADD COLUMN IF NOT EXISTS registration_seat INTEGER`;
  await sql`ALTER TABLE course_checkout_intents ADD COLUMN IF NOT EXISTS payment_proof_pathname TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE course_checkout_intents ADD COLUMN IF NOT EXISTS payment_proof_content_type TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE course_checkout_intents ADD COLUMN IF NOT EXISTS payment_proof_provider TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE course_checkout_intents ADD COLUMN IF NOT EXISTS coupon_code TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE course_checkout_intents ADD COLUMN IF NOT EXISTS discount_percent INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE course_checkout_intents ADD COLUMN IF NOT EXISTS discount_jod NUMERIC(10,3) NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE course_checkout_intents ADD COLUMN IF NOT EXISTS affiliate_name TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE course_checkout_intents ADD COLUMN IF NOT EXISTS commission_percent INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE course_checkout_intents ADD COLUMN IF NOT EXISTS commission_jod NUMERIC(10,3) NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE course_checkout_intents ADD COLUMN IF NOT EXISTS commission_status TEXT NOT NULL DEFAULT 'NOT_APPLICABLE'`;
  await sql`ALTER TABLE course_checkout_intents ADD COLUMN IF NOT EXISTS previous_course_email TEXT NOT NULL DEFAULT ''`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS course_checkout_one_pending_per_email ON course_checkout_intents (lower(email)) WHERE status = 'PENDING'`;
  await sql`CREATE OR REPLACE FUNCTION start_course_checkout_intent(p_token_hash text,p_name text,p_email text,p_phone text,p_location text,p_experience text,p_language text,p_goal text)
    RETURNS TABLE(outcome text, expires_at timestamptz)
    LANGUAGE plpgsql VOLATILE AS $$
    DECLARE active_count integer; expires timestamptz;
    BEGIN
      PERFORM pg_advisory_xact_lock(742060);
      UPDATE course_checkout_intents AS i SET status='EXPIRED' WHERE i.status='PENDING' AND i.expires_at <= NOW();
      IF EXISTS (SELECT 1 FROM course_registrations WHERE lower(email)=lower(p_email)) THEN
        RETURN QUERY SELECT 'duplicate'::text,NULL::timestamptz; RETURN;
      END IF;
      IF EXISTS (SELECT 1 FROM course_checkout_intents WHERE lower(email)=lower(p_email) AND status='PENDING') THEN
        RETURN QUERY SELECT 'pending'::text,NULL::timestamptz; RETURN;
      END IF;
      SELECT (SELECT COUNT(*) FROM course_registrations) + (SELECT COUNT(*) FROM course_checkout_intents AS i WHERE i.status='PENDING' AND i.expires_at > NOW()) INTO active_count;
      IF active_count >= 60 THEN
        RETURN QUERY SELECT 'full'::text,NULL::timestamptz; RETURN;
      END IF;
      expires := NOW() + INTERVAL '30 minutes';
      INSERT INTO course_checkout_intents(token_hash,full_name,email,phone,location,experience,preferred_language,goal,expires_at)
      VALUES(p_token_hash,p_name,lower(p_email),p_phone,p_location,p_experience,p_language,p_goal,expires);
      RETURN QUERY SELECT 'created'::text,expires;
    END $$`;
  await sql`CREATE OR REPLACE FUNCTION complete_course_payment(p_token_hash text,p_provider text,p_reference text)
    RETURNS TABLE(outcome text, seat integer, registration_id bigint, registered_at timestamptz)
    LANGUAGE plpgsql VOLATILE AS $$
    DECLARE intent course_checkout_intents%ROWTYPE; next_seat integer; new_id bigint; new_time timestamptz;
    BEGIN
      PERFORM pg_advisory_xact_lock(742060);
      SELECT * INTO intent FROM course_checkout_intents WHERE token_hash=p_token_hash FOR UPDATE;
      IF NOT FOUND THEN
        RETURN QUERY SELECT 'invalid'::text,NULL::integer,NULL::bigint,NULL::timestamptz; RETURN;
      END IF;
      IF intent.status='PAYMENT_SUBMITTED' THEN
        RETURN QUERY SELECT 'submitted'::text,intent.registration_seat,NULL::bigint,NULL::timestamptz; RETURN;
      END IF;
      IF intent.status <> 'PENDING' THEN
        RETURN QUERY SELECT 'invalid'::text,NULL::integer,NULL::bigint,NULL::timestamptz; RETURN;
      END IF;
      IF intent.expires_at <= NOW() THEN
        UPDATE course_checkout_intents SET status='EXPIRED' WHERE id=intent.id;
        RETURN QUERY SELECT 'expired'::text,NULL::integer,NULL::bigint,NULL::timestamptz; RETURN;
      END IF;
      IF EXISTS (SELECT 1 FROM course_registrations WHERE lower(email)=lower(intent.email)) THEN
        RETURN QUERY SELECT 'duplicate'::text,NULL::integer,NULL::bigint,NULL::timestamptz; RETURN;
      END IF;
      SELECT COALESCE(MAX(seat_number),0)+1 INTO next_seat FROM course_registrations;
      IF next_seat > 60 THEN
        RETURN QUERY SELECT 'full'::text,NULL::integer,NULL::bigint,NULL::timestamptz; RETURN;
      END IF;
      IF intent.payment_proof_pathname = '' OR intent.payment_proof_provider <> p_provider THEN
        RETURN QUERY SELECT 'proof_missing'::text,NULL::integer,NULL::bigint,NULL::timestamptz; RETURN;
      END IF;
      INSERT INTO course_registrations(seat_number,full_name,email,phone,location,experience,preferred_language,goal,previous_course_email,consent,payment_status,payment_provider,payment_reference,payment_proof_pathname,payment_proof_content_type,coupon_code,discount_percent,discount_jod,affiliate_name,commission_percent,commission_jod,commission_status,payment_submitted_at)
      VALUES(next_seat,intent.full_name,intent.email,intent.phone,intent.location,intent.experience,intent.preferred_language,intent.goal,intent.previous_course_email,TRUE,'PENDING_REVIEW',p_provider,p_reference,intent.payment_proof_pathname,intent.payment_proof_content_type,intent.coupon_code,intent.discount_percent,intent.discount_jod,intent.affiliate_name,intent.commission_percent,intent.commission_jod,CASE WHEN intent.commission_percent > 0 THEN 'PENDING_PAYMENT_REVIEW' ELSE 'NOT_APPLICABLE' END,NOW())
      RETURNING id,created_at INTO new_id,new_time;
      UPDATE course_checkout_intents SET status='PAYMENT_SUBMITTED',payment_provider=p_provider,payment_reference=p_reference,registration_seat=next_seat,submitted_at=NOW() WHERE id=intent.id;
      RETURN QUERY SELECT 'created'::text,next_seat,new_id,new_time;
    END $$`;
}

function xmlEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]);
}

export function workbook(rows, start, end) {
  const headings = ["Seat", "Full name", "Email", "Phone / WhatsApp", "Country / City", "Experience", "Preferred language", "Course goal", "Payment status", "Payment method", "Transfer reference", "Registered at", "Coupon code", "Discount %", "Discount JOD", "Affiliate", "Commission %", "Commission JOD", "Commission status", "Previous-course email (manual eligibility review)"];
  const columns = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T"];
  const sheetRows = [headings, ...rows.map((row) => [row.seat_number, row.full_name, row.email, row.phone, row.location, row.experience, row.preferred_language, row.goal, row.payment_status ?? "PENDING_REVIEW", row.payment_provider ?? "", row.payment_reference ?? "", new Date(row.created_at).toISOString(), row.coupon_code ?? "", Number(row.discount_percent ?? 0), Number(row.discount_jod ?? 0), row.affiliate_name ?? "", Number(row.commission_percent ?? 0), Number(row.commission_jod ?? 0), row.commission_status ?? "NOT_APPLICABLE", row.previous_course_email ?? ""] )];
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:T${sheetRows.length}"/><sheetViews><sheetView workbookViewId="0" rightToLeft="false"/></sheetViews><cols><col min="1" max="1" width="10" customWidth="1"/><col min="2" max="8" width="25" customWidth="1"/><col min="9" max="11" width="22" customWidth="1"/><col min="12" max="12" width="25" customWidth="1"/><col min="13" max="20" width="22" customWidth="1"/></cols><sheetData>${sheetRows.map((cells, r) => `<row r="${r + 1}">${cells.map((value, c) => typeof value === "number" ? `<c r="${columns[c]}${r + 1}"><v>${value}</v></c>` : `<c r="${columns[c]}${r + 1}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`).join("")}</row>`).join("")}</sheetData><autoFilter ref="A1:T${sheetRows.length}"/></worksheet>`;
  return zipStore({
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Registrations ${start}-${end}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    "xl/worksheets/sheet1.xml": sheet,
  });
}

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, value] of Object.entries(entries)) {
    const filename = Buffer.from(name);
    const contents = Buffer.from(value);
    const checksum = crc32(contents);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6); local.writeUInt16LE(0, 8);
    local.writeUInt32LE(checksum, 14); local.writeUInt32LE(contents.length, 18); local.writeUInt32LE(contents.length, 22); local.writeUInt16LE(filename.length, 26);
    locals.push(local, filename, contents);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x800, 8); central.writeUInt16LE(0, 10);
    central.writeUInt32LE(checksum, 16); central.writeUInt32LE(contents.length, 20); central.writeUInt32LE(contents.length, 24); central.writeUInt16LE(filename.length, 28); central.writeUInt32LE(offset, 42);
    centrals.push(central, filename);
    offset += local.length + filename.length + contents.length;
  }
  const centralSize = centrals.reduce((sum, item) => sum + item.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(entries).length, 8); end.writeUInt16LE(Object.keys(entries).length, 10);
  end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

function base64Lines(value) {
  const encoded = Buffer.from(value).toString("base64");
  return encoded.match(/.{1,76}/g)?.join("\r\n") || "";
}

export async function sendZohoMail({ subject, body, attachment, proofAttachment }) {
  const host = process.env.ZOHO_SMTP_HOST;
  const password = process.env.ZOHO_SMTP_APP_PASSWORD;
  const user = process.env.ZOHO_SMTP_USER || RECIPIENT;
  const port = 465;
  if (!host || !password || !user) throw new Error("Zoho SMTP is not configured");
  const domain = user.split("@")[1] || "7z-magic.com";
  const boundary = `7z-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
  const headers = [
    `From: 7Z Magic <${user}>`, `To: ${RECIPIENT}`, `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0", `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ];
  const parts = [`--${boundary}`, "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", base64Lines(body)];
  const attachments = [
    ...(attachment ? [{ ...attachment, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }] : []),
    ...(proofAttachment ? [proofAttachment] : []),
  ];
  for (const item of attachments) {
    const name = String(item.name).replace(/[\r\n"\\]/g, "_");
    const contentType = /^[\w.+-]+\/[\w.+-]+$/.test(item.contentType || "") ? item.contentType : "application/octet-stream";
    parts.push(`--${boundary}`, `Content-Type: ${contentType}; name="${name}"`, `Content-Disposition: attachment; filename="${name}"`, "Content-Transfer-Encoding: base64", "", base64Lines(item.bytes));
  }
  parts.push(`--${boundary}--`, "");
  const message = [...headers, "", ...parts].join("\r\n").replace(/(^|\r\n)\./g, "$1..");
  await new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port, servername: host, timeout: 18000 });
    let buffer = "";
    let pending = null;
    let closed = false;
    const fail = (error) => { if (!closed) { closed = true; socket.destroy(); reject(error); } };
    const readReply = () => new Promise((ok, bad) => {
      pending = { ok, bad, code: null };
      const complete = () => { if (pending?.code && buffer.includes("\n")) {
        const lines = buffer.split(/\r?\n/); const taken = [];
        for (const line of lines) { if (!line) continue; taken.push(line); if (line.startsWith(`${pending.code} `)) { buffer = lines.slice(taken.length).join("\r\n"); const current = pending; pending = null; current.ok(taken.join("\n")); return; } }
      } };
      pending.complete = complete;
    });
    socket.on("data", (chunk) => { buffer += chunk.toString("utf8"); if (pending) {
      const first = buffer.match(/^(\d{3})[- ]/m); if (first && !pending.code) pending.code = first[1]; pending.complete?.();
    } });
    socket.on("error", fail);
    socket.on("timeout", () => fail(new Error("Zoho SMTP connection timed out")));
    const command = async (line, expected) => {
      socket.write(`${line}\r\n`);
      const reply = await readReply();
      if (!reply.startsWith(String(expected))) throw new Error(`Zoho SMTP rejected command (${reply.slice(0, 3)})`);
    };
    (async () => {
      try {
        const greeting = await readReply();
        if (!greeting.startsWith("220")) throw new Error("Zoho SMTP unavailable");
        await command(`EHLO ${domain}`, 250);
        await command("AUTH LOGIN", 334);
        await command(Buffer.from(user).toString("base64"), 334);
        await command(Buffer.from(password).toString("base64"), 235);
        await command(`MAIL FROM:<${user}>`, 250);
        await command(`RCPT TO:<${RECIPIENT}>`, 250);
        await command("DATA", 354);
        socket.write(`${message}\r\n.\r\n`);
        const accepted = await readReply();
        if (!accepted.startsWith("250")) throw new Error("Zoho SMTP did not accept the message");
        socket.write("QUIT\r\n");
        closed = true; socket.end(); resolve();
      } catch (error) { fail(error); }
    })();
  });
}

export default async function handler(req, res) {
  setHeaders(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "GET") {
    try {
      const sql = sqlClient(); await prepare(sql);
      await sql`UPDATE course_checkout_intents SET status='EXPIRED' WHERE status='PENDING' AND expires_at <= NOW()`;
      const counts = await sql`SELECT
        (SELECT COUNT(*)::int FROM course_registrations) AS registrations,
        (SELECT COUNT(*)::int FROM course_checkout_intents WHERE status='PENDING' AND expires_at > NOW()) AS pending`;
      const registered = Number(counts[0]?.registrations || 0) + Number(counts[0]?.pending || 0);
      const configured = Boolean(process.env.ZOHO_SMTP_HOST && process.env.ZOHO_SMTP_APP_PASSWORD);
      const paymentConfigured = Boolean(Number(process.env.COURSE_PRICE_JOD) > 0 && (process.env.COURSE_CLIQ_ALIAS?.trim() && process.env.COURSE_CLIQ_PHONE?.trim() && process.env.COURSE_CLIQ_INSTRUCTIONS?.trim() || process.env.COURSE_WU_BENEFICIARY?.trim() && process.env.COURSE_WU_INSTRUCTIONS?.trim()));
      return res.status(200).json({ capacity: CAPACITY, registered, open: registered < CAPACITY && configured && paymentConfigured, configured: configured && paymentConfigured });
    } catch {
      return res.status(503).json({ error: "Registration is temporarily unavailable.", open: false, configured: false });
    }
  }
  if (req.method !== "POST") { res.setHeader("Allow", "GET, POST, OPTIONS"); return res.status(405).json({ error: "Method not allowed." }); }
  if (!ALLOWED_ORIGINS.has(req.headers.origin)) return res.status(403).json({ error: "Origin not allowed." });
  try {
    if (!process.env.ZOHO_SMTP_HOST || !process.env.ZOHO_SMTP_APP_PASSWORD) return res.status(503).json({ error: "Registration is not open yet." });
    const input = req.body && typeof req.body === "object" ? req.body : {};
    if (JSON.stringify(input).length > 8000) return res.status(413).json({ error: "Request too large." });
    const clean = (value, max) => String(value || "").trim().slice(0, max);
    const name = clean(input.name, 120), email = clean(input.email, 254).toLowerCase(), phone = clean(input.phone, 40);
    const location = clean(input.country, 120), experience = clean(input.experience, 30), language = clean(input.language, 30), goal = clean(input.goal, 2000);
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length < 6 || location.length < 2 || !["beginner", "some", "pro"].includes(experience.toLowerCase()) || !["arabic", "english"].includes(language.toLowerCase()) || input.consent !== true) return res.status(400).json({ error: "Please complete the required fields and consent." });
    const sql = sqlClient(); await prepare(sql);
    const hour = await sql`SELECT COUNT(*)::int AS count FROM course_checkout_intents WHERE lower(email)=${email} AND created_at > NOW() - INTERVAL '1 hour'`;
    if (Number(hour[0]?.count || 0) >= 5) return res.status(429).json({ error: "Too many attempts. Please retry later." });
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const intent = (await sql`SELECT * FROM start_course_checkout_intent(${tokenHash},${name},${email},${phone},${location},${experience.toLowerCase()},${language.toLowerCase()},${goal})`)[0];
    if (intent.outcome === "full") return res.status(409).json({ error: "Course is full.", full: true });
    if (intent.outcome === "duplicate" || intent.outcome === "pending") return res.status(409).json({ error: intent.outcome === "duplicate" ? "This email is already registered." : "A checkout is already open for this email.", duplicate: true });
    if (intent.outcome !== "created") return res.status(503).json({ error: "Registration is temporarily unavailable." });
    return res.status(201).json({ ok: true, checkoutToken: token, expiresAt: new Date(intent.expires_at).toISOString() });
  } catch (error) {
    console.error("Course checkout start failed", error);
    return res.status(503).json({ error: "Registration is temporarily unavailable." });
  }
}
