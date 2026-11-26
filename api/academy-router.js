/**
 * Vercel Serverless API Router for 7Z Academy & Digital Marketplace
 * Maps /api/academy/* endpoints
 */

import {
  getPublicCatalog,
  handleValidateCode,
  handleReceiptUpload,
  handleRegistration,
  handleWaitlist,
  handleLeadMagnet,
  getAdminData,
  handleAdminAction
} from "./academy-service.mjs";
import { requireAdmin } from "../lib/portal-runtime.mjs";
import { sendWebResponse, toWebRequest } from "../lib/vercel-api.mjs";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb"
    }
  }
};

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body;
  try {
    return JSON.parse(req.body);
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const ALLOWED_ORIGINS = new Set([
    "https://7z-magic.com",
    "https://www.7z-magic.com",
    "http://localhost:3000",
    "http://localhost:4173",
    "http://127.0.0.1:4173"
  ]);
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const url = new URL(req.url, `https://${req.headers.host || "7z-magic.com"}`);
  const pathname = url.pathname.replace(/\/+$/, "");
  const matchedPath = String(req.headers["x-matched-path"] || req.headers["x-vercel-matched-path"] || req.url || "").toLowerCase();
  const rawPath = String(pathname || "").toLowerCase();
  const searchPath = `${rawPath} ${matchedPath}`;

  try {
    if (searchPath.includes("catalog") && req.method === "GET") {
      return res.status(200).json(getPublicCatalog());
    }

    if (searchPath.includes("receipt-upload") && req.method === "POST") {
      const body = parseBody(req);
      const result = await handleReceiptUpload(body);
      return res.status(result.ok ? 200 : result.status || 400).json(result);
    }

    if (searchPath.includes("waitlist") && req.method === "POST") {
      const body = parseBody(req);
      const result = await handleWaitlist(body);
      return res.status(result.ok ? 201 : result.status || 400).json(result);
    }

    if (searchPath.includes("lead-magnet") && req.method === "POST") {
      const body = parseBody(req);
      const result = await handleLeadMagnet(body);
      return res.status(result.ok ? 201 : result.status || 400).json(result);
    }

    if (searchPath.includes("validate-code") || url.searchParams.has("code") || Boolean(req.query?.code) || (Boolean(req.body?.code) && !searchPath.includes("admin"))) {
      const body = parseBody(req);
      const code = body?.code || url.searchParams.get("code") || req.query?.code || "";
      const course = body?.courseId || body?.course || url.searchParams.get("course") || req.query?.course || "all";
      const result = await handleValidateCode(code, course);
      return res.status(200).json(result);
    }

    if ((searchPath.includes("register") || Boolean(req.body?.fullName || req.body?.email)) && req.method === "POST" && !searchPath.includes("admin-action")) {
      const body = parseBody(req);
      const result = await handleRegistration(body);
      return res.status(result.ok ? 201 : result.status || 400).json(result);
    }

    if (searchPath.includes("admin-data") && req.method === "GET") {
      const gate = await requireAdmin(toWebRequest(req));
      if (!gate.ok) return sendWebResponse(res, gate.response);
      const result = await getAdminData();
      return res.status(200).json(result);
    }

    if ((searchPath.includes("admin-action") || Boolean(req.body?.action)) && req.method === "POST") {
      const gate = await requireAdmin(toWebRequest(req));
      if (!gate.ok) return sendWebResponse(res, gate.response);
      const body = parseBody(req);
      const result = await handleAdminAction(body.action, body);
      return res.status(200).json(result);
    }

    return res.status(404).json({ error: "Endpoint not found" });
  } catch (error) {
    console.error("Academy API Error:", error);
    return res.status(500).json({ error: error.message || "Academy API error", ok: false });
  }
}
