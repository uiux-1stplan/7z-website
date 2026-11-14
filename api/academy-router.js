/**
 * Vercel Serverless API Router for 7Z Academy
 * Maps /api/academy/* endpoints
 */

import {
  handleValidateCode,
  handleRegistration,
  getAdminData,
  handleAdminAction
} from "./academy-service.mjs";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb"
    }
  }
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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
    if (searchPath.includes("validate-code") || url.searchParams.has("code") || Boolean(req.query?.code) || Boolean(req.body?.code)) {
      let body = {};
      if (req.body) {
        try {
          body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        } catch (_) {}
      }
      const code = body?.code || url.searchParams.get("code") || req.query?.code || "";
      const course = body?.courseId || body?.course || url.searchParams.get("course") || req.query?.course || "all";
      const result = await handleValidateCode(code, course);
      return res.status(200).json(result);
    }

    if ((searchPath.includes("register") || Boolean(req.body?.fullName || req.body?.email)) && req.method === "POST" && !searchPath.includes("admin-action")) {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const result = await handleRegistration(body);
      return res.status(201).json(result);
    }

    if (searchPath.includes("admin-data") && req.method === "GET") {
      const result = await getAdminData();
      return res.status(200).json(result);
    }

    if ((searchPath.includes("admin-action") || Boolean(req.body?.action)) && req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const result = await handleAdminAction(body.action, body);
      return res.status(200).json(result);
    }

    return res.status(404).json({ error: "Endpoint not found" });
  } catch (error) {
    console.error("Academy API Error:", error);
    return res.status(200).json({ error: error.message || "Request handled with fallback", ok: false });
  }
}
