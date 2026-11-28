import { Readable } from "node:stream";
import { get } from "@vercel/blob";
import { getSql, requireAdmin } from "../../lib/portal-runtime.mjs";
import {
  getLegacyClientScopes,
  applyPrivateNoStore
} from "../../lib/portal-legacy-access.mjs";
import { getNativeClientSession } from "../../lib/portal-native-session.mjs";
import {
  getActiveClientByKey,
  getLegacyClientKeys,
  verifyClientIdentity
} from "../../lib/portal-client-delivery.mjs";
import { verifyViewTicket } from "../../lib/view-ticket.mjs";

function toWebRequest(req) {
  const protocol =
    String(req.headers?.["x-forwarded-proto"] || "http")
      .split(",")[0]
      .trim();
  const host = req.headers?.host || "localhost";
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers || {})) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, String(item));
      }
    } else if (value !== undefined && value !== null) {
      headers.set(key, String(value));
    }
  }

  return new Request(`${protocol}://${host}${req.url || "/"}`, {
    method: req.method || "GET",
    headers
  });
}

async function clientKeys(req) {
  const identity = verifyClientIdentity(req);
  if (identity?.clientKey) {
    const client = await getActiveClientByKey(identity.clientKey);
    if (client?.auth_type === "native") {
      return [String(client.client_key)];
    }
  }

  const nativeClient = await getNativeClientSession(req);
  if (nativeClient?.client_key) {
    return [String(nativeClient.client_key)];
  }

  const legacyScopes = await getLegacyClientScopes(req);
  return getLegacyClientKeys(legacyScopes);
}

function safeFilename(value) {
  return String(value || "presentation")
    .replace(/[\r\n"]/g, "_")
    .slice(0, 180);
}

function sendResponse(res, status, body) {
  if (res.headersSent) return;
  res.statusCode = status;
  if (typeof res.status === "function") {
    try { res.status(status); } catch {}
  }
  if (typeof body === "object") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
  } else {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(String(body || ""));
  }
}

export default async function handler(req, res) {
  applyPrivateNoStore(res);
  res.setHeader("Vary", "Cookie, Authorization");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return sendResponse(res, 405, { ok: false, error: "Method not allowed." });
  }

  try {
    const rawId = req.query?.id;
    let id = Array.isArray(rawId) ? String(rawId[0] || "").trim() : String(rawId || "").trim();

    // Fallback: extract ID from URL path if routed as /view/<id>
    if (!id) {
      const urlPath = String(req.url || "").split("?")[0];
      const segments = urlPath.split("/").filter(Boolean);
      const lastSeg = segments[segments.length - 1];
      if (lastSeg && lastSeg !== "file" && lastSeg !== "view") {
        id = lastSeg.trim();
      }
    }

    if (!id) {
      return sendResponse(res, 400, "File ID required.");
    }

    let isAuthorized = false;

    // Check 1: Admin authorization (Clerk session cookie or Bearer token via query/header)
    try {
      const webReq = toWebRequest(req);
      const gate = await requireAdmin(webReq);
      if (gate.ok) {
        isAuthorized = true;
      }
    } catch {
      // Continue to next authorization check
    }

    // Check 2: Signed view ticket authorization (?ticket=...)
    if (!isAuthorized) {
      const rawTicket = req.query?.ticket;
      const ticketVal = Array.isArray(rawTicket) ? rawTicket[0] : rawTicket;
      if (ticketVal && verifyViewTicket(id, ticketVal)) {
        isAuthorized = true;
      }
    }

    // Check 3: Client portal authorization (native/legacy client session cookies)
    if (!isAuthorized) {
      try {
        const keys = await clientKeys(req);
        if (keys.length > 0) {
          const sql = getSql();
          const permRows = await sql`
            SELECT p.can_view
            FROM portal_client_file_permissions p
            INNER JOIN portal_files f ON f.id = p.file_id
            WHERE f.id::text = ${id}
              AND p.can_view = TRUE
              AND p.client_key = ANY(${keys})
            LIMIT 1
          `;
          if (permRows.length > 0) {
            isAuthorized = true;
          }
        }
      } catch {
        // Continue
      }
    }

    if (!isAuthorized) {
      return sendResponse(
        res,
        401,
        "Unauthorized: Authorized personnel or active client session required to view this file."
      );
    }

    // Retrieve file metadata from database
    const sql = getSql();
    const rows = await sql`
      SELECT
        id,
        blob_pathname,
        original_name,
        content_type
      FROM portal_files
      WHERE id::text = ${id}
        AND is_active = TRUE
      LIMIT 1
    `;

    const file = rows[0];
    if (!file) {
      return sendResponse(res, 404, "File not found.");
    }

    // Fetch stream from Vercel Blob private storage
    const result = await get(file.blob_pathname, {
      access: "private",
      useCache: false
    });

    if (!result || result.statusCode !== 200) {
      return sendResponse(res, 404, "Stored object not found.");
    }

    const filename = safeFilename(file.original_name);
    const encoded = encodeURIComponent(filename);

    const MIME_MAP = {
      pdf: "application/pdf",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ppt: "application/vnd.ms-powerpoint",
      html: "text/html; charset=utf-8",
      htm: "text/html; charset=utf-8",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      svg: "image/svg+xml; charset=utf-8",
      mp4: "video/mp4",
      zip: "application/zip"
    };

    const ext = filename.split(".").pop().toLowerCase();
    let contentType = result.blob?.contentType || file.content_type;
    if (!contentType || contentType === "application/octet-stream") {
      contentType = MIME_MAP[ext] || "application/octet-stream";
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${filename}"; filename*=UTF-8''${encoded}`
    );
    res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");

    // Permanent Scoped Isolated CSP for uploaded client HTML presentations & SVGs:
    // Sandboxed without allow-same-origin to completely isolate cookies & admin session,
    // while permitting inline scripts, inline event handlers, and external CDN assets to execute completely.
    if (
      contentType.includes("text/html") ||
      contentType.includes("application/xhtml") ||
      contentType.includes("image/svg")
    ) {
      res.setHeader(
        "Content-Security-Policy",
        "sandbox allow-scripts allow-forms allow-modals allow-popups allow-downloads allow-presentation; default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval' data: blob:; style-src * 'unsafe-inline' data: blob: https:; img-src * data: blob: https:; media-src * data: blob: https:; font-src * data: https:; connect-src * https: wss: data: blob:; frame-src * data: blob:;"
      );
    }

    if (req.method === "HEAD" || !result.stream) {
      return res.end();
    }

    Readable.fromWeb(result.stream).pipe(res);
  } catch (error) {
    console.error("View file error:", error);
    if (!res.headersSent) {
      return sendResponse(res, 500, "Unable to display file.");
    }
    res.end();
  }
}
