import {
  ADMIN_COOKIE_NAME,
  HUB_ADMIN_SCOPES,
  HUB_PUBLIC_SCOPES,
  PRIVATE_RESOURCES,
  noStoreHeaders,
  readCookie,
  verifyAdminSession,
  verifySession
} from "../../lib/private-access.js";


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
        authenticated: false,
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
        authenticated: true,
        authType: "admin",
        admin: true,
        native: false,
        allowed:
          HUB_ADMIN_SCOPES
      }
    );
  }


  /*
   * New native 7Z client session.
   * File-only access is still a valid
   * authenticated session.
   */
  try {

    const nativeAuth =
      await import(
        "../../lib/portal-native-session.mjs"
      );


    const nativeClient =
      await nativeAuth
        .getNativeClientSession(
          request
        );


    if (nativeClient) {

      return send(
        response,
        200,
        {
          ok: true,
          authenticated: true,
          authType: "native",
          admin: false,
          native: true,
          allowed: []
        }
      );
    }


  } catch (error) {

    console.error(
      "Native client status:",
      error
    );
  }


  /*
   * Original legacy private-access sessions.
   */
  const checks =
    await Promise.all(
      HUB_PUBLIC_SCOPES.map(
        async scope => {

          const cookieName =
            PRIVATE_RESOURCES[
              scope
            ].cookieName;


          const token =
            readCookie(
              cookieHeader,
              cookieName
            );


          const valid =
            await verifySession(
              token,
              scope,
              process.env
                .PRIVATE_ACCESS_SESSION_SECRET
            );


          return valid
            ? scope
            : null;
        }
      )
    );


  const allowed =
    checks.filter(
      Boolean
    );


  return send(
    response,
    200,
    {
      ok: true,

      authenticated:
        allowed.length > 0,

      authType:
        allowed.length
          ? "legacy"
          : null,

      admin: false,
      native: false,
      allowed
    }
  );
}