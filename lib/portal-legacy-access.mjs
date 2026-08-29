import * as legacy from "./private-access.js";

function required(name) {
  const value = legacy[name];

  if (value === undefined) {
    throw new Error(
      `Legacy private access export missing: ${name}`
    );
  }

  return value;
}

export async function getLegacyClientScopes(request) {

  const HUB_PUBLIC_SCOPES =
    required("HUB_PUBLIC_SCOPES");

  const PRIVATE_RESOURCES =
    required("PRIVATE_RESOURCES");

  const readCookie =
    required("readCookie");

  const verifySession =
    required("verifySession");

  const cookieHeader =
    request.headers?.cookie || "";

  const secret =
    process.env.PRIVATE_ACCESS_SESSION_SECRET;

  if (
    typeof secret !== "string" ||
    secret.length < 32
  ) {
    return [];
  }

  const checks =
    await Promise.all(
      HUB_PUBLIC_SCOPES.map(
        async scope => {

          const resource =
            PRIVATE_RESOURCES[scope];

          if (!resource?.cookieName) {
            return null;
          }

          const token =
            readCookie(
              cookieHeader,
              resource.cookieName
            );

          if (!token) {
            return null;
          }

          const valid =
            await verifySession(
              token,
              scope,
              secret
            );

          return valid
            ? scope
            : null;
        }
      )
    );

  return checks.filter(Boolean);
}

export function applyPrivateNoStore(response) {

  response.setHeader(
    "Cache-Control",
    "private, no-store, max-age=0"
  );

  response.setHeader(
    "Pragma",
    "no-cache"
  );

  response.setHeader(
    "X-Content-Type-Options",
    "nosniff"
  );

  response.setHeader(
    "X-Robots-Tag",
    "noindex, nofollow, noarchive"
  );
}
