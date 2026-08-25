import {
  ADMIN_COOKIE_NAME,
  HUB_ADMIN_SCOPES,
  noStoreHeaders,
  readCookie,
  verifyAdminSession
} from "../../lib/private-access.js";

import {
  resolvePortalClientAccess,
  getAllowedLegacyResourceScopes
} from "../../lib/portal-client-access.mjs";


function send(
  response,
  status,
  body
) {

  for (
    const [name, value]
    of Object.entries(
      noStoreHeaders
    )
  ) {

    response.setHeader(
      name,
      value
    );
  }

  return response
    .status(status)
    .json(body);
}


export default async function handler(
  request,
  response
) {

  if (
    request.method !== "GET"
  ) {

    response.setHeader(
      "Allow",
      "GET"
    );

    return send(
      response,
      405,
      {
        ok: false,
        admin: false,
        allowed: []
      }
    );
  }


  const cookieHeader =
    request.headers.cookie;


  const adminToken =
    readCookie(
      cookieHeader,
      ADMIN_COOKIE_NAME
    );


  const admin =
    await verifyAdminSession(
      adminToken,
      process.env
        .PRIVATE_ACCESS_ADMIN_SESSION_SECRET
    );


  if (admin) {

    return send(
      response,
      200,
      {
        ok: true,
        admin: true,
        allowed:
          HUB_ADMIN_SCOPES
      }
    );
  }


  try {

    const access =
      await resolvePortalClientAccess(
        request
      );


    if (!access.authenticated) {

      return send(
        response,
        200,
        {
          ok: true,
          admin: false,
          allowed: []
        }
      );
    }


    const allowed =
      await getAllowedLegacyResourceScopes(
        access.clientKeys
      );


    return send(
      response,
      200,
      {
        ok: true,
        admin: false,

        native:
          access.authType ===
          "native",

        allowed
      }
    );


  } catch (error) {

    console.error(
      "Unified hub status:",
      error
    );


    return send(
      response,
      500,
      {
        ok: false,
        admin: false,
        allowed: []
      }
    );
  }
}
