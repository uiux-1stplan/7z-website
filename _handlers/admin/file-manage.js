import { del } from "@vercel/blob";
import { getSql, requireAdmin, writeAudit } from "../../lib/portal-runtime.mjs";
import { sendJson, toWebRequest, readJson } from "../../lib/vercel-api.mjs";

const namePattern = /[\r\n\\/\0]/;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (!["PATCH", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "PATCH, DELETE");
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  try {
    const gate = await requireAdmin(toWebRequest(req));
    if (!gate.ok) return res.status(gate.response.status || 401).json({ error: "Administrator authorization required." });
    const body = await readJson(req);
    const id = String(body.id || "").trim().slice(0, 80);
    if (!id) return sendJson(res, 400, { error: "Choose a file first." });
    const sql = getSql();
    const [file] = await sql`SELECT id, blob_pathname, original_name FROM portal_files WHERE id::text=${id} AND is_active=TRUE LIMIT 1`;
    if (!file) return sendJson(res, 404, { error: "This file is no longer in the active library." });

    if (req.method === "PATCH") {
      const name = String(body.name || "").trim().slice(0, 180);
      if (!name || namePattern.test(name)) return sendJson(res, 400, { error: "Enter a valid file name without path separators." });
      const [updated] = await sql`UPDATE portal_files SET original_name=${name} WHERE id=${file.id} AND is_active=TRUE RETURNING id,original_name`;
      await writeAudit({ actorUserId: gate.auth.userId, action: "CLIENT_FILE_RENAMED", targetType: "portal_file", targetId: String(file.id), details: { previousName: file.original_name, name } });
      return sendJson(res, 200, { ok: true, file: { id: String(updated.id), name: updated.original_name } });
    }

    await sql`UPDATE portal_files SET is_active=FALSE WHERE id=${file.id}`;
    await sql`DELETE FROM portal_client_file_permissions WHERE file_id=${file.id}`;
    let storageRemoved = true;
    try { await del(file.blob_pathname); } catch (error) { storageRemoved = false; console.error("Private file blob removal failed:", error); }
    await writeAudit({ actorUserId: gate.auth.userId, action: "CLIENT_FILE_REMOVED", targetType: "portal_file", targetId: String(file.id), details: { name: file.original_name, storageRemoved } });
    return sendJson(res, 200, { ok: true, storageRemoved });
  } catch (error) {
    console.error("Admin file management:", error);
    return sendJson(res, 500, { error: "The private file could not be updated." });
  }
}
