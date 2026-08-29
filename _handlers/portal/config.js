export default async function handler(req, res) {
  const { sendJson, methodNotAllowed } =
    await import("../../lib/vercel-api.mjs");

  if (req.method !== "GET") {
    return methodNotAllowed(res, ["GET"]);
  }

  const publishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    process.env.CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return sendJson(res, 500, {
      error: "Portal authentication is not configured",
    });
  }

  return sendJson(res, 200, {
    publishableKey,
  });
};

