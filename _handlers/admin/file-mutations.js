import { del } from "@vercel/blob";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const runtime = await import("../../lib/portal-runtime.mjs");
  const http = await import("../../lib/vercel-api.mjs");
  try {
    const gate = await runtime.requireAdmin(http.toWebRequest(req));
    if (!gate.ok) return http.sendWebResponse(res, gate.response);
    if (!["PATCH", "DELETE"].includes(req.method)) return http.methodNotAllowed(res, ["PATCH", "DELETE"]);
    const body = await http.readJson(req);
    const id = String(body?.id || "").trim();
    if (!id || id.length > 300) return http.sendJson(res, 400, { error:"A valid file ID is required." });
    const sql = runtime.getSql();
    if (req.method === "PATCH") {
      const name = String(body?.name || "").normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/[\\/]/g, "-").trim();
      if (!name || name.length > 500) return http.sendJson(res, 400, { error:"Enter a file name between 1 and 500 characters." });
      const [file] = await sql`UPDATE portal_files SET original_name=${name} WHERE id::text=${id} AND is_active=TRUE RETURNING id,original_name`;
      if (!file) return http.sendJson(res, 404, { error:"File not found." });
      await runtime.writeAudit({ actorUserId:gate.auth.userId, action:"PRIVATE_FILE_RENAMED", targetType:"file", targetId:String(file.id), details:{ name:file.original_name } });
      return http.sendJson(res, 200, { ok:true, file });
    }
    const [file] = await sql`SELECT id,blob_pathname,original_name FROM portal_files WHERE id::text=${id} AND is_active=TRUE LIMIT 1`;
    if (!file) return http.sendJson(res, 404, { error:"File not found." });
    await del(file.blob_pathname);
    await sql`DELETE FROM portal_client_file_permissions WHERE file_id::text=${id}`;
    await sql`UPDATE portal_files SET is_active=FALSE, updated_at=NOW() WHERE id::text=${id}`;
    await runtime.writeAudit({ actorUserId:gate.auth.userId, action:"PRIVATE_FILE_DELETED", targetType:"file", targetId:String(file.id), details:{ name:file.original_name, blobRemoved:true } });
    return http.sendJson(res, 200, { ok:true, deleted:true, id:String(file.id) });
  } catch (error) {
    console.error("Admin file mutation:", error);
    if (!res.headersSent) return http.sendJson(res, 500, { error:error?.message || "File change could not be saved." });
    res.end();
  }
}