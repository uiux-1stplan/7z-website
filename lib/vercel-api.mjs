export function toWebRequest(req) {
  const forwardedProto = req.headers?.["x-forwarded-proto"];
  const forwardedHost = req.headers?.["x-forwarded-host"];

  const proto = String(
    Array.isArray(forwardedProto)
      ? forwardedProto[0]
      : forwardedProto || "https"
  )
    .split(",")[0]
    .trim();

  const host = String(
    Array.isArray(forwardedHost)
      ? forwardedHost[0]
      : forwardedHost || req.headers?.host || "localhost:3000"
  )
    .split(",")[0]
    .trim();

  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers || {})) {
    if (typeof value === "undefined") continue;

    if (Array.isArray(value)) {
      headers.set(key, value.join(", "));
    } else {
      headers.set(key, String(value));
    }
  }

  const pathname = req.url || "/";

  return new Request(`${proto}://${host}${pathname}`, {
    method: req.method || "GET",
    headers,
  });
}

export async function readJson(req) {
  if (!req.body) {
    return {};
  }

  if (
    typeof req.body === "object" &&
    !Buffer.isBuffer(req.body)
  ) {
    return req.body;
  }

  const raw = Buffer.isBuffer(req.body)
    ? req.body.toString("utf8")
    : String(req.body);

  if (!raw.trim()) {
    return {};
  }

  return JSON.parse(raw);
}

export function sendJson(res, status, data) {
  res.statusCode = status;

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  res.end(JSON.stringify(data));
}

export async function sendWebResponse(res, response) {
  res.statusCode = response.status;

  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  res.setHeader("Cache-Control", "no-store");

  const body = await response.text();

  res.end(body);
}

export function methodNotAllowed(res, allowed) {
  res.setHeader("Allow", allowed.join(", "));

  return sendJson(res, 405, {
    error: "Method not allowed",
  });
}

export function validationError(res, parsed) {
  return sendJson(res, 400, {
    error: "Invalid request",
    fields: parsed.error.flatten().fieldErrors,
  });
}

export function clerkPublicError(error, fallback) {
  const first =
    Array.isArray(error?.errors) && error.errors.length
      ? error.errors[0]
      : null;

  return {
    error:
      first?.longMessage ||
      first?.message ||
      fallback,
    code:
      first?.code ||
      "CLERK_REQUEST_FAILED",
  };
}
