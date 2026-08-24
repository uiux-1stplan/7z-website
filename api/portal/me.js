export default async function handler(req, res) {
  const [
    runtime,
    http
  ] = await Promise.all([
    import("../../lib/portal-runtime.mjs"),
    import("../../lib/vercel-api.mjs"),
  ]);

  if (req.method !== "GET") {
    return http.methodNotAllowed(res, ["GET"]);
  }

  const gate = await runtime.requirePortalUser(
    http.toWebRequest(req)
  );

  if (!gate.ok) {
    return http.sendWebResponse(res, gate.response);
  }

  return http.sendJson(res, 200, {
    user: {
      id: gate.auth.portalUser.clerk_user_id,
      email: gate.auth.portalUser.email,
      name: gate.auth.portalUser.display_name,
      company: gate.auth.portalUser.company,
      role: gate.auth.portalUser.role,
      status: gate.auth.portalUser.status,
    },
  });
};

