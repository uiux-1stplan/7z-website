import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from "node:fs";
import { createServer } from "node:http";
import { basename, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import {
  handleValidateCode,
  handleRegistration,
  handleReceiptUpload,
  handleWaitlist,
  handleLeadMagnet,
  getPublicCatalog,
  getAdminData,
  handleAdminAction
} from "./api/academy-service.mjs";
import { resolveProductPriceUsd } from "./lib/marketplace-catalog.mjs";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const port = Number(process.env.PORT || 4173);
const dataDir = join(root, "data");
const uploadDir = join(root, "media", "uploads");
const siteDataPath = join(dataDir, "site-data.json");
const analyticsPath = join(dataDir, "analytics.json");

const adminEmail = "hassankhaled22@gmail.com";
const adminPasswordSalt = "7zmagic-admin-v1";
const adminPasswordHash =
  "d6a0ae206229cd3a41af4c01f8ceb7ce431e9a52bc41bcc0bc10b966171cd9d8af0223dcc3855fb5c6373652c3e36fabd50d70d25821391b711913dc61b3d19b";

const sessions = new Map();

let mockClients = [
  {
    client_key: "acme-luxury",
    username: "acme-luxury",
    display_name: "Acme Luxury Studios",
    company: "Acme Holdings International",
    auth_type: "native",
    status: "active",
    created_at: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    client_key: "apex-cinematics",
    username: "apex-cinematics",
    display_name: "Apex Cinematics",
    company: "Apex Media Production",
    auth_type: "native",
    status: "active",
    created_at: new Date(Date.now() - 86400000 * 12).toISOString()
  },
  {
    client_key: "silla-royal",
    username: "silla-royal",
    display_name: "Silla Royal Experiences",
    company: "Silla Hospitality Ltd.",
    auth_type: "native",
    status: "active",
    created_at: new Date(Date.now() - 86400000 * 20).toISOString()
  }
];

let mockFiles = [
  {
    id: "file-01",
    fileId: "file-01",
    name: "7Z_Cinematic_Showreel_4K_Cut.mp4",
    contentType: "video/mp4",
    sizeBytes: 428000000,
    uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    type: "file"
  },
  {
    id: "file-02",
    fileId: "file-02",
    name: "Spatial_Architecture_3D_Experience.zip",
    contentType: "application/zip",
    sizeBytes: 85000000,
    uploadedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    type: "file"
  },
  {
    id: "file-03",
    fileId: "file-03",
    name: "Executive_VIP_Brand_Architecture.pdf",
    contentType: "application/pdf",
    sizeBytes: 24500000,
    uploadedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    type: "file"
  },
  {
    id: "file-04",
    fileId: "file-04",
    name: "Master_Keyframe_Hero_Lighting.png",
    contentType: "image/png",
    sizeBytes: 18200000,
    uploadedAt: new Date(Date.now() - 86400000 * 9).toISOString(),
    type: "file"
  }
];

let mockPermissions = [
  { client_key: "acme-luxury", resource_key: "file:file-01", can_view: true, can_download: true },
  { client_key: "acme-luxury", resource_key: "file:file-02", can_view: true, can_download: false },
  { client_key: "acme-luxury", resource_key: "file:file-03", can_view: true, can_download: true },
  { client_key: "acme-luxury", resource_key: "file:file-04", can_view: true, can_download: true },
  { client_key: "apex-cinematics", resource_key: "file:file-01", can_view: true, can_download: false },
  { client_key: "silla-royal", resource_key: "file:file-03", can_view: true, can_download: true }
];
const mediaSectionLabels = {
  architectureVideos: "Architectural Design",
  mediaProjects: "Marketing Media Production",
  presentations: "Interactive Presentations"
};

const analyticsSectionLabels = {
  intro: "Home",
  universe: "7Z Magic Universe",
  architecture: "Architectural Design",
  media: "Marketing Media Production",
  websites: "Website Design",
  identity: "Brand Identity",
  "advertising-materials": "Advertising Materials",
  "product-design": "Product Design",
  "advertising-7sanz": "Advertising on 7SANZ",
  presentations: "Interactive Presentations",
  film: "Film Production",
  "ai-masterclass": "AI Masterclass",
  partners: "Partners",
  contact: "Contact"
};

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
};

function ensureStorage() {
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(uploadDir, { recursive: true });

  if (!existsSync(siteDataPath)) {
    writeJson(siteDataPath, defaultSiteData());
  }

  if (!existsSync(analyticsPath)) {
    writeJson(analyticsPath, defaultAnalytics());
  }
}

function defaultSiteData() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    media: {
      architectureVideos: [
        mediaItem("arch-vertical-interior-film", "media/arch_projects/16-9V/1.mp4", "Vertical Interior Film", "is-tall"),
        mediaItem("arch-architectural-atmosphere", "media/arch_projects/9-16H/1.mp4", "Architectural Atmosphere", "is-wide"),
        mediaItem("arch-residence-walkthrough", "media/arch_projects/9-16H/2.mp4", "Residence Walkthrough", "is-wide"),
        mediaItem("arch-spatial-transformation", "media/arch_projects/9-16H/3.mp4", "Spatial Transformation", "is-wide"),
        mediaItem("arch-luxury-detail-study", "media/arch_projects/9-16H/4.mp4", "Luxury Detail Study", "is-wide")
      ],
      mediaProjects: Array.from({ length: 12 }, (_, index) =>
        mediaItem(
          `media-campaign-film-${String(index + 1).padStart(2, "0")}`,
          `media/media_projects/Media (${index + 1}).mp4`,
          `Campaign Film ${String(index + 1).padStart(2, "0")}`,
          ""
        )
      ),
      presentations: [
        mediaItem("presentation-01", "media/prop/1.mp4", "Interactive Presentation 01", ""),
        mediaItem("presentation-02", "media/prop/2.mp4", "Interactive Presentation 02", "")
      ]
    }
  };
}

function mediaItem(id, src, title, layout = "", poster = "") {
  return { id, src, title, layout, poster };
}

function defaultAnalytics() {
  return {
    totalVisits: 0,
    countries: {},
    days: {},
    sectionViews: {},
    referrers: {},
    devices: {},
    lastVisits: []
  };
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function normalizeSiteData(data) {
  const next = data && typeof data === "object" ? data : defaultSiteData();
  next.media = next.media && typeof next.media === "object" ? next.media : {};
  Object.keys(mediaSectionLabels).forEach((section) => {
    next.media[section] = Array.isArray(next.media[section]) ? next.media[section].map(normalizeMediaItem) : [];
  });
  return next;
}

function normalizeMediaItem(item) {
  return {
    id: String(item?.id || crypto.randomUUID()),
    src: String(item?.src || ""),
    title: String(item?.title || "Untitled Media"),
    layout: String(item?.layout || ""),
    poster: String(item?.poster || "")
  };
}

function readSiteData() {
  return normalizeSiteData(readJson(siteDataPath, defaultSiteData()));
}

function saveSiteData(data) {
  data.updatedAt = new Date().toISOString();
  writeJson(siteDataPath, normalizeSiteData(data));
}

function readAnalytics() {
  const data = readJson(analyticsPath, defaultAnalytics());
  return {
    ...defaultAnalytics(),
    ...data,
    countries: data.countries || {},
    days: data.days || {},
    sectionViews: data.sectionViews || {},
    referrers: data.referrers || {},
    devices: data.devices || {},
    lastVisits: Array.isArray(data.lastVisits) ? data.lastVisits : []
  };
}

function saveAnalytics(data) {
  writeJson(analyticsPath, data);
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function sendJson(res, status, payload, headers = {}) {
  send(res, status, JSON.stringify(payload), {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers
  });
}

function readBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => resolveBody(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function readJsonBody(req, limit = 2 * 1024 * 1024) {
  const body = await readBody(req, limit);
  if (!body.length) return {};
  return JSON.parse(body.toString("utf8"));
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return index === -1 ? [part, ""] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function verifyPassword(password) {
  const candidate = crypto.scryptSync(String(password || ""), adminPasswordSalt, 64);
  const expected = Buffer.from(adminPasswordHash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

function createSession() {
  const id = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;
  sessions.set(id, { email: adminEmail, expiresAt });
  return id;
}

function getSession(req) {
  const id = parseCookies(req).z7_admin;
  if (!id) return null;

  const session = sessions.get(id);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(id);
    return null;
  }

  return session;
}

function requireAdmin(req, res) {
  const session = getSession(req);
  if (!session) {
    sendJson(res, 401, { ok: false, error: "Not authenticated" });
    return null;
  }
  return session;
}

function cleanExpiredSessions() {
  const now = Date.now();
  sessions.forEach((session, id) => {
    if (session.expiresAt < now) sessions.delete(id);
  });
}

function detectCountry(req) {
  const headerCountry =
    req.headers["cf-ipcountry"] ||
    req.headers["x-vercel-ip-country"] ||
    req.headers["x-country-code"] ||
    req.headers["cloudfront-viewer-country"];

  if (headerCountry) return String(headerCountry).toUpperCase();

  const acceptLanguage = String(req.headers["accept-language"] || "");
  const match = /[-_]([A-Z]{2})\b/i.exec(acceptLanguage);
  return match ? match[1].toUpperCase() : "LOCAL";
}

function detectDevice(req) {
  const agent = String(req.headers["user-agent"] || "").toLowerCase();
  if (/ipad|tablet/.test(agent)) return "Tablet";
  if (/mobi|android|iphone/.test(agent)) return "Mobile";
  return "Desktop";
}

function bump(map, key) {
  const cleanKey = String(key || "Unknown");
  map[cleanKey] = (map[cleanKey] || 0) + 1;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function trackVisit(req, res) {
  const body = await readJsonBody(req).catch(() => ({}));
  const analytics = readAnalytics();
  const country = detectCountry(req);
  const referrer = String(req.headers.referer || body.referrer || "Direct").slice(0, 180);
  const device = detectDevice(req);

  analytics.totalVisits += 1;
  bump(analytics.countries, country);
  bump(analytics.days, todayKey());
  bump(analytics.referrers, referrer || "Direct");
  bump(analytics.devices, device);
  analytics.lastVisits.unshift({
    at: new Date().toISOString(),
    country,
    device,
    path: String(body.path || "/").slice(0, 160)
  });
  analytics.lastVisits = analytics.lastVisits.slice(0, 30);

  saveAnalytics(analytics);
  sendJson(res, 200, { ok: true });
}

async function trackSection(req, res) {
  const body = await readJsonBody(req).catch(() => ({}));
  const section = String(body.section || "").slice(0, 80);
  if (!section) {
    sendJson(res, 400, { error: "Missing section" });
    return;
  }

  const analytics = readAnalytics();
  bump(analytics.sectionViews, section);
  saveAnalytics(analytics);
  sendJson(res, 200, { ok: true });
}

function analyticsSummary() {
  const analytics = readAnalytics();
  const sortEntries = (map) =>
    Object.entries(map || {})
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => ({ key, label: analyticsSectionLabels[key] || key, value }));

  return {
    totalVisits: analytics.totalVisits,
    countries: sortEntries(analytics.countries),
    days: Object.entries(analytics.days || {})
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({ date, value })),
    sectionViews: sortEntries(analytics.sectionViews),
    devices: sortEntries(analytics.devices),
    referrers: sortEntries(analytics.referrers).slice(0, 8),
    lastVisits: analytics.lastVisits || []
  };
}

function validateMediaSection(section) {
  if (!Object.prototype.hasOwnProperty.call(mediaSectionLabels, section)) {
    throw new Error("Invalid media section");
  }
}

function sanitizeMediaPayload(payload) {
  return {
    id: String(payload.id || crypto.randomUUID()),
    src: String(payload.src || "").trim(),
    title: String(payload.title || "Untitled Media").trim(),
    layout: ["", "is-wide", "is-tall"].includes(payload.layout) ? payload.layout : "",
    poster: String(payload.poster || "").trim()
  };
}

async function handleLogin(req, res) {
  const body = await readJsonBody(req);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (email !== adminEmail || !verifyPassword(password)) {
    sendJson(res, 401, { error: "Invalid email or password" });
    return;
  }

  const sessionId = createSession();
  sendJson(
    res,
    200,
    { ok: true, email: adminEmail },
    {
      "Set-Cookie": `z7_admin=${encodeURIComponent(sessionId)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 7}`
    }
  );
}

function handleLogout(_req, res) {
  sendJson(res, 200, { ok: true }, { "Set-Cookie": "z7_admin=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0" });
}

async function handleMedia(req, res) {
  if (!requireAdmin(req, res)) return;

  if (req.method === "GET") {
    sendJson(res, 200, { media: readSiteData().media, labels: mediaSectionLabels });
    return;
  }

  const body = await readJsonBody(req);
  const section = String(body.section || "");
  validateMediaSection(section);

  const data = readSiteData();
  const list = data.media[section];

  if (req.method === "POST") {
    const item = sanitizeMediaPayload(body);
    if (!item.src) {
      sendJson(res, 400, { error: "Media source is required" });
      return;
    }
    list.push(item);
    saveSiteData(data);
    sendJson(res, 200, { ok: true, item });
    return;
  }

  if (req.method === "PUT") {
    const id = String(body.id || "");
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) {
      sendJson(res, 404, { error: "Media item not found" });
      return;
    }
    list[index] = { ...list[index], ...sanitizeMediaPayload({ ...list[index], ...body, id }) };
    saveSiteData(data);
    sendJson(res, 200, { ok: true, item: list[index] });
    return;
  }

  if (req.method === "DELETE") {
    const id = String(body.id || "");
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) {
      sendJson(res, 404, { error: "Media item not found" });
      return;
    }
    const [removed] = list.splice(index, 1);
    saveSiteData(data);
    sendJson(res, 200, { ok: true, removed });
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
}

function parseMultipart(buffer, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "");
  if (!match) throw new Error("Missing multipart boundary");

  const boundary = `--${match[1] || match[2]}`;
  const body = buffer.toString("latin1");
  const parts = body.split(boundary).slice(1, -1);
  const fields = {};
  const files = {};

  parts.forEach((rawPart) => {
    let part = rawPart;
    if (part.startsWith("\r\n")) part = part.slice(2);
    if (part.endsWith("\r\n")) part = part.slice(0, -2);

    const separator = part.indexOf("\r\n\r\n");
    if (separator === -1) return;

    const rawHeaders = part.slice(0, separator);
    let rawContent = part.slice(separator + 4);
    if (rawContent.endsWith("\r\n")) rawContent = rawContent.slice(0, -2);

    const disposition = rawHeaders.split("\r\n").find((line) => line.toLowerCase().startsWith("content-disposition"));
    if (!disposition) return;

    const nameMatch = /name="([^"]+)"/i.exec(disposition);
    if (!nameMatch) return;

    const filenameMatch = /filename="([^"]*)"/i.exec(disposition);
    const name = nameMatch[1];

    if (filenameMatch && filenameMatch[1]) {
      const contentTypeMatch = /content-type:\s*([^\r\n]+)/i.exec(rawHeaders);
      const file = {
        filename: filenameMatch[1],
        contentType: contentTypeMatch ? contentTypeMatch[1].trim() : "application/octet-stream",
        buffer: Buffer.from(rawContent, "latin1")
      };
      files[name] = files[name] || [];
      files[name].push(file);
      return;
    }

    fields[name] = Buffer.from(rawContent, "latin1").toString("utf8");
  });

  return { fields, files };
}

function safeUploadName(filename) {
  const cleanBase = basename(filename || "upload").replace(/[^a-zA-Z0-9._-]/g, "-");
  const ext = extname(cleanBase).toLowerCase();
  const allowed = new Set([".mp4", ".webm", ".mov", ".jpg", ".jpeg", ".png", ".webp", ".gif"]);

  if (!allowed.has(ext)) throw new Error("Unsupported file type");

  const stem = cleanBase.slice(0, cleanBase.length - ext.length).slice(0, 80) || "media";
  return `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${stem}${ext}`;
}

async function handleUpload(req, res) {
  if (!requireAdmin(req, res)) return;

  const buffer = await readBody(req, 350 * 1024 * 1024);
  const { files } = parseMultipart(buffer, req.headers["content-type"] || "");
  const file = files.file?.[0];

  if (!file || !file.buffer.length) {
    sendJson(res, 400, { error: "No file uploaded" });
    return;
  }

  const safeName = safeUploadName(file.filename);
  const finalPath = join(uploadDir, safeName);
  writeFileSync(finalPath, file.buffer);

  sendJson(res, 200, {
    ok: true,
    path: `media/uploads/${safeName}`,
    filename: safeName,
    contentType: file.contentType,
    size: file.buffer.length
  });
}

function serveStatic(req, res, url) {
  const decodedPath = decodeURIComponent(url.pathname);
  if (decodedPath === "/_vercel/insights/script.js") {
    res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
    res.end("/* vercel insights mock */");
    return;
  }
  if (decodedPath === "/Marketplace" || decodedPath === "/Marketplace/") {
    res.writeHead(301, { "Location": "/marketplace/" });
    res.end();
    return;
  }
  if (decodedPath.startsWith("/Marketplace/")) {
    res.writeHead(301, { "Location": `/marketplace/${decodedPath.slice("/Marketplace/".length)}` });
    res.end();
    return;
  }
  if (
    decodedPath === "/courses" ||
    decodedPath.startsWith("/courses/") ||
    decodedPath === "/academy" ||
    decodedPath.startsWith("/academy/") ||
    decodedPath === "/academey" ||
    decodedPath.startsWith("/academey/")
  ) {
    res.writeHead(301, { "Location": "/marketplace/" });
    res.end();
    return;
  }
  if (decodedPath === "/marketplace/ai-engineering" || decodedPath === "/marketplace/ai-engineering/") {
    res.writeHead(301, { "Location": "/marketplace/ai-for-engineers/" });
    res.end();
    return;
  }
  const requestedPath = decodedPath === "/" ? "/index.html" : decodedPath === "/admin" ? "/admin/index.html" : decodedPath;
  const safePath = normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = resolve(join(root, safePath));

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    const indexPath = join(filePath, "index.html");
    if (existsSync(indexPath)) {
      filePath = indexPath;
    }
  } else if (!existsSync(filePath) && existsSync(filePath + ".html")) {
    filePath = filePath + ".html";
  }

  if (!filePath.startsWith(root) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  const stat = statSync(filePath);
  const type = types[extname(filePath).toLowerCase()] || "application/octet-stream";
  const range = req.headers.range;
  const extension = extname(filePath).toLowerCase();
  const cacheControl = [".html", ".css", ".js", ".mjs", ".json"].includes(extension)
    ? "no-store"
    : "public, max-age=120";

  if (range && type.startsWith("video/")) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (!match) {
      send(res, 416, "Invalid range", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }

    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Number(match[2]) : stat.size - 1;
    if (start > end || end >= stat.size) {
      send(res, 416, "Invalid range", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }

    const chunkSize = end - start + 1;
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": type
    });
    createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  const isNoIndex = decodedPath.startsWith("/admin") || decodedPath.startsWith("/private-access") || decodedPath.startsWith("/course-registration/form");
  const headers = {
    "Content-Length": stat.size,
    "Content-Type": type,
    "Accept-Ranges": type.startsWith("video/") ? "bytes" : "none",
    "Cache-Control": cacheControl,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'self' https:; script-src 'self' 'sha256-CICeW+tNYPhTGEXMcCTtBoLtiURzJWPD75bvyqBbAdM=' https://cdn.jsdelivr.net https://*.clerk.accounts.dev https://*.clerk.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; connect-src 'self' https: wss: https://vitals.vercel-insights.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self' https:; frame-ancestors 'none';"
  };
  if (isNoIndex) headers["X-Robots-Tag"] = "noindex, nofollow, noarchive";

  res.writeHead(200, headers);
  createReadStream(filePath).pipe(res);
}

async function handleApi(req, res, url) {
  if (url.pathname === "/api/site-content" && req.method === "GET") {
    sendJson(res, 200, readSiteData());
    return true;
  }

  if (url.pathname === "/api/analytics/visit" && req.method === "POST") {
    await trackVisit(req, res);
    return true;
  }

  if (url.pathname === "/api/analytics/section" && req.method === "POST") {
    await trackSection(req, res);
    return true;
  }

  if (url.pathname === "/api/admin/login" && req.method === "POST") {
    await handleLogin(req, res);
    return true;
  }

  if (url.pathname === "/api/admin/logout" && req.method === "POST") {
    handleLogout(req, res);
    return true;
  }

  if (url.pathname === "/api/admin/me" && req.method === "GET") {
    const session = getSession(req);
    sendJson(res, 200, session ? { authenticated: true, email: session.email } : { authenticated: false });
    return true;
  }

  if (url.pathname === "/api/admin/site-data" && req.method === "GET") {
    if (!requireAdmin(req, res)) return true;
    sendJson(res, 200, { ...readSiteData(), labels: mediaSectionLabels });
    return true;
  }

  if (url.pathname === "/api/admin/media") {
    await handleMedia(req, res);
    return true;
  }

  if (url.pathname === "/api/admin/upload" && req.method === "POST") {
    await handleUpload(req, res);
    return true;
  }

  if (url.pathname === "/api/admin/analytics" && req.method === "GET") {
    if (!requireAdmin(req, res)) return true;
    sendJson(res, 200, analyticsSummary());
    return true;
  }

  // Academy Endpoints
  if (url.pathname === "/api/academy/validate-code") {
    const code = url.searchParams.get("code") || "";
    const course = url.searchParams.get("course") || "all";
    const result = await handleValidateCode(code, course);
    sendJson(res, 200, result);
    return true;
  }

  if (url.pathname === "/api/academy/catalog" && req.method === "GET") {
    const result = getPublicCatalog();
    sendJson(res, 200, result);
    return true;
  }

  if (url.pathname === "/api/academy/receipt-upload" && req.method === "POST") {
    const body = await readJsonBody(req, 15 * 1024 * 1024);
    const result = await handleReceiptUpload(body);
    sendJson(res, result.ok ? 200 : 400, result);
    return true;
  }

  if (url.pathname === "/api/academy/waitlist" && req.method === "POST") {
    const body = await readJsonBody(req, 2 * 1024 * 1024);
    const result = await handleWaitlist(body);
    sendJson(res, result.ok ? 201 : 400, result);
    return true;
  }

  if (url.pathname === "/api/academy/lead-magnet" && req.method === "POST") {
    const body = await readJsonBody(req, 2 * 1024 * 1024);
    const result = await handleLeadMagnet(body);
    sendJson(res, result.ok ? 201 : 400, result);
    return true;
  }

  // --- 7Z Admin & Client Delivery Vault APIs ---
  if (url.pathname === "/api/admin/all-clients" || url.pathname === "/api/admin/clients") {
    if (!requireAdmin(req, res)) return true;
    if (req.method === "GET") {
      sendJson(res, 200, { ok: true, clients: mockClients });
      return true;
    }
    if (req.method === "POST") {
      const body = await readJsonBody(req).catch(() => ({}));
      const newClient = {
        client_key: body.client_key || String(body.username || body.name || `client-${Date.now()}`).toLowerCase().replace(/[^a-z0-9_-]/g, "-"),
        username: String(body.username || body.name || "vip-client"),
        display_name: String(body.display_name || body.name || "VIP Client"),
        company: String(body.company || "VIP Enterprise"),
        auth_type: "native",
        status: "active",
        created_at: new Date().toISOString()
      };
      mockClients.unshift(newClient);
      sendJson(res, 200, { ok: true, client: newClient });
      return true;
    }
  }

  if (url.pathname === "/api/admin/files") {
    if (!requireAdmin(req, res)) return true;
    if (req.method === "GET") {
      sendJson(res, 200, { ok: true, files: mockFiles });
      return true;
    }
  }

  if (url.pathname === "/api/admin/file-manage") {
    if (!requireAdmin(req, res)) return true;
    if (req.method === "POST") {
      const body = await readJsonBody(req).catch(() => ({}));
      if (body.action === "rename") {
        const file = mockFiles.find((f) => f.id === body.id);
        if (file) file.name = body.name || file.name;
      } else if (body.action === "remove") {
        mockFiles = mockFiles.filter((f) => f.id !== body.id);
      }
      sendJson(res, 200, { ok: true });
      return true;
    }
  }

  if (url.pathname === "/api/admin/client-file-access") {
    if (!requireAdmin(req, res)) return true;
    if (req.method === "GET") {
      sendJson(res, 200, {
        ok: true,
        clients: mockClients,
        resources: mockFiles,
        permissions: mockPermissions
      });
      return true;
    }
    if (req.method === "POST") {
      const body = await readJsonBody(req).catch(() => ({}));
      const { clientKey, resourceKey, fileId, canView, canDownload } = body;
      const targetResource = resourceKey || (fileId ? `file:${fileId}` : "");
      let existing = mockPermissions.find(
        (p) => p.client_key === clientKey && (p.resource_key === targetResource || p.file_id === fileId)
      );
      if (existing) {
        existing.can_view = !!canView;
        existing.can_download = !!canDownload;
      } else if (clientKey && targetResource) {
        mockPermissions.push({
          client_key: clientKey,
          resource_key: targetResource,
          file_id: fileId,
          can_view: !!canView,
          can_download: !!canDownload
        });
      }
      sendJson(res, 200, { ok: true, permissions: mockPermissions });
      return true;
    }
  }

  if (url.pathname === "/api/admin/admin-accounts") {
    if (!requireAdmin(req, res)) return true;
    sendJson(res, 200, {
      ok: true,
      currentAdminId: "admin-1",
      admins: [
        {
          clerk_user_id: "admin-1",
          email: adminEmail,
          role: "superadmin",
          created_at: new Date().toISOString()
        }
      ]
    });
    return true;
  }

  if (url.pathname === "/api/portal/me") {
    if (!requireAdmin(req, res)) return true;
    sendJson(res, 200, {
      ok: true,
      user: {
        id: "usr_admin",
        name: "Administrator",
        email: "admin@7zmagic.com",
        role: "admin",
        status: "active",
        company: "7Z Magic Studio"
      }
    });
    return true;
  }

  if (url.pathname === "/api/admin/users" || url.pathname === "/api/portal/users") {
    if (!requireAdmin(req, res)) return true;
    sendJson(res, 200, {
      ok: true,
      users: [
        { id: "usr_1", name: "Administrator", email: "admin@7zmagic.com", role: "admin", status: "active", company: "7Z Magic Studio" },
        { id: "usr_2", name: "Zaid Production", email: "zaid@7zmagic.com", role: "editor", status: "active", company: "7Z Creative Studio" }
      ]
    });
    return true;
  }

  // Client Portal Authentication & Deliverables
  if (url.pathname === "/api/private-auth/hub-status") {
    sendJson(res, 200, {
      ok: true,
      authenticated: false,
      client: null
    });
    return true;
  }

  if (url.pathname === "/api/private-auth/hub-login") {
    sendJson(res, 200, {
      ok: true,
      authenticated: true,
      client: mockClients[0]
    });
    return true;
  }

  if (url.pathname === "/api/private-auth/hub-logout") {
    sendJson(res, 200, {
      ok: true,
      authenticated: false
    });
    return true;
  }

  if (url.pathname === "/api/private-auth/portal-files") {
    if (!requireAdmin(req, res)) return true;
    sendJson(res, 200, {
      ok: true,
      files: mockFiles
    });
    return true;
  }

  if (url.pathname === "/api/academy/register" && req.method === "POST") {
    const body = await readJsonBody(req, 15 * 1024 * 1024);
    const result = await handleRegistration(body);
    sendJson(res, 201, result);
    return true;
  }

  if (url.pathname === "/api/academy/admin-data" && req.method === "GET") {
    if (!requireAdmin(req, res)) return true;
    const result = await getAdminData();
    sendJson(res, 200, result);
    return true;
  }

  if (url.pathname === "/api/academy/admin-action" && req.method === "POST") {
    if (!requireAdmin(req, res)) return true;
    const body = await readJsonBody(req);
    const result = await handleAdminAction(body.action, body);
    sendJson(res, 200, result);
    return true;
  }

  // Course Engine Fallback for Local Server
  if (url.pathname === "/api/admin/course-engine") {
    if (!requireAdmin(req, res)) return true;
    if (req.method === "GET") {
      const adminData = await getAdminData();
      if (url.searchParams.get("action") === "receipt" || url.searchParams.get("view") === "receipt") {
        const id = String(url.searchParams.get("id") || "").trim();
        const found = (adminData.registrations || []).find(
          (r) => String(r.id) === id || r.reference === id || String(r.seatNumber) === id
        );
        const receiptSrc = String(found?.receiptBase64 || found?.receiptUrl || "").trim();
        if (receiptSrc.startsWith("data:")) {
          const m = receiptSrc.match(/^data:([^;]+);base64,(.+)$/i);
          if (m) {
            const buf = Buffer.from(m[2], "base64");
            res.writeHead(200, { "Content-Type": m[1], "Cache-Control": "private, max-age=300" });
            res.end(buf);
            return true;
          }
        }
        if (receiptSrc.startsWith("/data/uploads/")) {
          const safePath = resolve(root, "." + receiptSrc);
          if (existsSync(safePath)) {
            res.writeHead(200, { "Content-Type": receiptSrc.endsWith(".pdf") ? "application/pdf" : "image/jpeg" });
            res.end(readFileSync(safePath));
            return true;
          }
        }
        sendJson(res, 404, { error: "Receipt not found locally." });
        return true;
      }

      if (url.searchParams.get("view") === "accounting") {
        const rawRegs = adminData.registrations || [];
        const mappedRegs = rawRegs.map((r) => {
          const courseId = r.courseId || r.course_id || "cinematic-film";
          const priceUsd = Number(r.priceUsd ?? r.priceJod ?? resolveProductPriceUsd(courseId) ?? 0);
          const discountUsd = Number(r.discountUsd ?? r.discountJod ?? 0);
          const finalPrice = Number(r.finalPrice ?? Math.max(0, priceUsd - discountUsd));
          return {
            id: r.id || r.reference,
            full_name: r.fullName,
            email: r.email,
            phone: r.phone || "",
            location: r.city || r.location || "",
            course_id: courseId,
            created_at: r.createdAt || r.submittedAt,
            coupon_code: r.promoCode || r.coupon_code || "",
            price_jod: priceUsd,
            price_usd: priceUsd,
            discount_jod: discountUsd,
            discount_usd: discountUsd,
            currency: r.currency || "USD",
            commission_percent: 20,
            commission_jod: finalPrice * 0.2,
            commission_status: (r.paymentStatus === "APPROVED" || r.paymentStatus === "PAID") ? "PAYABLE" : "PENDING_PAYMENT_REVIEW",
            payment_status: r.paymentStatus,
            payment_reference: r.reference || r.payment_reference || r.receiptUrl || r.receiptName,
            receipt_url: r.receiptUrl || r.receiptBase64
          };
        });
        const paidRegs = mappedRegs.filter((r) => ["APPROVED", "PAID", "VERIFIED"].includes(String(r.payment_status || "").toUpperCase()));
        const pendingRegs = mappedRegs.filter((r) => !["APPROVED", "PAID", "VERIFIED", "REJECTED"].includes(String(r.payment_status || "").toUpperCase()));
        const gross = paidRegs.reduce((s, r) => s + r.price_usd, 0);
        const discounts = paidRegs.reduce((s, r) => s + r.discount_usd, 0);
        const revenue = paidRegs.reduce((s, r) => s + Math.max(0, r.price_usd - r.discount_usd), 0);
        const pending = pendingRegs.reduce((s, r) => s + Math.max(0, r.price_usd - r.discount_usd), 0);
        sendJson(res, 200, {
          currency: "USD",
          registrations: mappedRegs,
          waitlist: adminData.waitlist || [],
          leads: adminData.leads || [],
          adjustments: [],
          totals: {
            gross,
            revenue,
            pending,
            discounts,
            commissionsDue: (adminData.affiliates || []).reduce((s, x) => s + (x.commissionOwed || 0), 0),
            studioNet: revenue
          }
        });
      } else {
        sendJson(res, 200, {
          affiliates: (adminData.affiliates || []).map((a) => ({
            id: a.id,
            name: a.name,
            email: a.email,
            company: "7Z Partner",
            commission_percent: a.commissionPercent,
            status: a.status,
            code_count: 1,
            registration_count: a.confirmedCount || 0,
            net_sales_jod: a.totalSalesJod || 0,
            outstanding_commission_jod: a.commissionOwed || 0,
            earned_commission_jod: a.commissionOwed || 0
          })),
          codes: (adminData.coupons || []).map((c) => ({
            id: c.id,
            code: c.code,
            affiliate_name: "Studio",
            course_id: c.courseScope || "all",
            discount_percent: c.discountPercent,
            commission_percent: 0,
            redemption_count: 0,
            status: c.status
          }))
        });
      }
      return true;
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      const isApprove = ["PAID", "APPROVED", "VERIFIED"].includes(String(body.status || "").toUpperCase());
      const mappedAction = body.action === "set-payment-status"
        ? (isApprove ? "approve-payment" : "reject-payment")
        : body.action;
      const result = await handleAdminAction(mappedAction, { ...body, reference: body.id, reason: body.reason || "" });
      sendJson(res, 200, result);
      return true;
    }
  }

  return false;
}

export function startServer(customPort = port) {
  ensureStorage();
  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/_vercel/")) {
      res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
      res.end("// Vercel Telemetry Local Dev Stub");
      return;
    }

    handleApi(req, res, url)
      .then((handled) => {
        if (!handled) serveStatic(req, res, url);
      })
      .catch((error) => {
        console.error(error);
        sendJson(res, 500, { error: "Server error" });
      });
  });

  return new Promise((resolveServer) => {
    server.listen(customPort, "0.0.0.0", () => {
      console.log(`7Z Magic local server running at http://localhost:${customPort}`);
      resolveServer(server);
    });
  });
}

ensureStorage();
setInterval(cleanExpiredSessions, 1000 * 60 * 15).unref();

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isDirectRun) {
  startServer(port);
}
