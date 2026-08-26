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

import {
  getNativeClientSession
} from "../../lib/portal-native-session.mjs";

import {
  getActiveClientByKey,
  getFilesForClientKeys,
  getLegacyClientKeys,
  issueClientIdentityCookie,
  verifyClientIdentity
} from "../../lib/portal-client-delivery.mjs";


function send(
  response,
  status,
  body,
  extraHeaders = {}
) {

  for (
    const [
      name,
      value
    ]
    of Object.entries({
      ...noStoreHeaders,
      ...extraHeaders
    })
  ) {
    response.setHeader(
      name,
      value
    );
  }

  response.setHeader(
    "Vary",
    "Cookie"
  );

  return response
    .status(status)
    .json(body);
}


async function nativePayload(
  request,
  clientKey,
  extraHeaders = {}
) {

  const client =
    await getActiveClientByKey(
      clientKey
    );


  if (
    !client ||
    client.auth_type !==
      "native"
  ) {
    return null;
  }


  const files =
    await getFilesForClientKeys(
      [
        String(
          client.client_key
        )
      ]
    );


  return {
    body: {
      ok: true,
      authenticated: true,
      authType:
        "native",
      admin: false,
      native: true,
      allowed: [],
      files,
      client: {
        clientKey:
          String(
            client.client_key
          ),

        username:
          client.username ||
          null,

        displayName:
          client.display_name ||
          null
      },
      source:
        "signed-client-identity"
    },

    headers:
      extraHeaders
  };
}


export default async function handler(
  request,
  response
) {

  if (
    request.method !==
    "GET"
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
        native: false,
        allowed: [],
        files: []
      }
    );
  }


  try {

    /*
     * 1) SIGNED CLIENT IDENTITY — authoritative for native file delivery.
     */
    const identity =
      verifyClientIdentity(
        request
      );


    if (
      identity?.clientKey
    ) {

      const payload =
        await nativePayload(
          request,
          identity.clientKey
        );


      if (
        payload
      ) {

        return send(
          response,
          200,
          payload.body,
          payload.headers
        );
      }
    }


    /*
     * 2) EXISTING NATIVE SESSION — compatibility + automatic upgrade.
     */
    const nativeClient =
      await getNativeClientSession(
        request
      );


    if (
      nativeClient?.client_key
    ) {

      const clientKey =
        String(
          nativeClient.client_key
        );


      const payload =
        await nativePayload(
          request,
          clientKey,
          {
            "Set-Cookie":
              issueClientIdentityCookie(
                request,
                clientKey
              )
          }
        );


      if (
        payload
      ) {

        return send(
          response,
          200,
          payload.body,
          payload.headers
        );
      }
    }


    const cookieHeader =
      request.headers.cookie || "";


    /*
     * 3) LEGACY CLIENT
     */
    const checks =
      await Promise.all(
        HUB_PUBLIC_SCOPES.map(
          async scope => {

            const resource =
              PRIVATE_RESOURCES[
                scope
              ];


            const token =
              readCookie(
                cookieHeader,
                resource.cookieName
              );


            if (
              !token
            ) {
              return null;
            }


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


    if (
      allowed.length
    ) {

      const clientKeys =
        await getLegacyClientKeys(
          allowed
        );


      const files =
        await getFilesForClientKeys(
          clientKeys
        );


      return send(
        response,
        200,
        {
          ok: true,
          authenticated: true,
          authType:
            "legacy",
          admin: false,
          native: false,
          allowed,
          files,
          source:
            "legacy-client"
        }
      );
    }


    /*
     * 4) ADMIN FALLBACK
     */
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


    if (
      admin
    ) {

      return send(
        response,
        200,
        {
          ok: true,
          authenticated: true,
          authType:
            "admin",
          admin: true,
          native: false,
          allowed:
            HUB_ADMIN_SCOPES,
          files: [],
          source:
            "admin"
        }
      );
    }


    return send(
      response,
      200,
      {
        ok: true,
        authenticated: false,
        authType: null,
        admin: false,
        native: false,
        allowed: [],
        files: [],
        source:
          "anonymous"
      }
    );


  } catch (error) {

    console.error(
      "Hub status:",
      error
    );


    return send(
      response,
      500,
      {
        ok: false,
        authenticated: false,
        admin: false,
        native: false,
        allowed: [],
        files: [],
        error:
          "Private access temporarily unavailable."
      }
    );
  }
}
