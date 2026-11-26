import {
  next,
  rewrite
} from "@vercel/functions";

import {
  ADMIN_COOKIE_NAME,
  PRIVATE_RESOURCES,
  readCookie,
  scopeForPath,
  verifyAdminSession,
  verifySession
} from "./lib/private-access.js";


function accessRedirect(
  request,
  scope,
  url
) {

  const destination =
    new URL(
      "/private-access/",
      request.url
    );

  destination
    .searchParams
    .set(
      "resource",
      scope
    );

  return new Response(
    null,
    {
      status: 302,

      headers: {
        Location:
          destination.toString(),

        "Cache-Control":
          "no-store, max-age=0",

        Pragma:
          "no-cache"
      }
    }
  );
}


async function databaseAuthorized(
  request,
  scope
) {

  try {

    const url =
      new URL(
        "/api/private-auth/resource-check",
        request.url
      );


    url.searchParams.set(
      "scope",
      scope
    );


    const headers =
      new Headers();


    const cookie =
      request.headers.get(
        "cookie"
      );


    const authorization =
      request.headers.get(
        "authorization"
      );


    const origin =
      request.headers.get(
        "origin"
      );


    if (cookie) {
      headers.set(
        "cookie",
        cookie
      );
    }


    if (authorization) {
      headers.set(
        "authorization",
        authorization
      );
    }


    if (origin) {
      headers.set(
        "origin",
        origin
      );
    }

    const bypass =
      request.headers.get(
        "x-vercel-protection-bypass"
      );

    if (bypass) {
      headers.set(
        "x-vercel-protection-bypass",
        bypass
      );
    }


    const response =
      await fetch(
        url,
        {
          method: "GET",
          headers,
          cache: "no-store"
        }
      );


    if (!response.ok) {
      return false;
    }


    const payload =
      await response.json();


    return Boolean(
      payload?.authorized
    );


  } catch (error) {

    console.error(
      "Protected resource authorization:",
      error
    );

    return false;
  }
}


export default async function middleware(
  request
) {

  const url =
    new URL(
      request.url
    );


  const scope =
    scopeForPath(
      url.pathname
    );


  if (!scope) {
    return next();
  }


  /*
   * Preserve old PRIVATE ACCESS admin sessions.
   */
  const cookieHeader =
    request.headers.get(
      "cookie"
    );


  const adminToken =
    readCookie(
      cookieHeader,
      ADMIN_COOKIE_NAME
    );


  const legacyAdmin =
    await verifyAdminSession(
      adminToken,
      process.env
        .PRIVATE_ACCESS_ADMIN_SESSION_SECRET
    );


  /*
   * 1. Check direct scoped HMAC session cookie.
   */
  const resource =
    PRIVATE_RESOURCES[scope];

  const sessionSecret =
    process.env
      .PRIVATE_ACCESS_SESSION_SECRET;

  const sessionToken =
    resource?.cookieName
      ? readCookie(
          cookieHeader,
          resource.cookieName
        )
      : null;

  let directSessionValid =
    false;

  if (
    resource?.cookieName &&
    sessionSecret &&
    sessionToken
  ) {

    directSessionValid =
      await verifySession(
        sessionToken,
        scope,
        sessionSecret
      );
  }


  /*
   * 2. Otherwise permission comes from:
   * Legacy Admin, Clerk Admin, OR unified Neon client access.
   */
  if (
    !legacyAdmin &&
    !directSessionValid
  ) {

    const authorized =
      await databaseAuthorized(
        request,
        scope
      );


    if (!authorized) {

      return accessRedirect(
        request,
        scope,
        url
      );
    }
  }


  return next();
}


export const config = {

  matcher: [
    "/api/private-documents/blueprint"
  ]
};
