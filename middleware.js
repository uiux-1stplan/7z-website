import {
  next,
  rewrite
} from "@vercel/functions";

import {
  ADMIN_COOKIE_NAME,
  readCookie,
  scopeForPath,
  verifyAdminSession
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
   * Otherwise permission comes from:
   * Clerk Admin OR unified Neon client access.
   */
  if (!legacyAdmin) {

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


  if (
    (
      scope === "silla" ||
      scope === "elcon"
    ) &&
    (
      url.pathname ===
        "/silla-hall-presentation" ||
      url.pathname ===
        "/elcon-arabia-presentation" ||
      url.pathname ===
        "/silla-hall-presentation/" ||
      url.pathname ===
        "/elcon-arabia-presentation/"
    )
  ) {

    return rewrite(
      new URL(
        `${url.pathname.replace(/\/$/, "")}/index`,
        request.url
      )
    );
  }


  return next();
}


export const config = {

  matcher: [

    "/silla-hall-presentation",
    "/silla-hall-presentation/:path*",

    "/elcon-arabia-presentation",
    "/elcon-arabia-presentation/:path*",

    "/strategic-blueprint",
    "/strategic-blueprint/:path*",

    "/tawjihi-english-quotation",
    "/tawjihi-english-quotation/:path*",

    "/oman-market-partnership",
    "/oman-market-partnership/:path*",

    "/api/private-documents/blueprint"
  ]
};
