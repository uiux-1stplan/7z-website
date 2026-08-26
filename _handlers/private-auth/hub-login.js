import {
  HUB_ADMIN_SCOPES,
  HUB_PUBLIC_SCOPES,
  adminSessionCookie,
  issueAdminSession,
  issueSession,
  noStoreHeaders,
  sessionCookie,
  validAdminCredentials,
  validCredentials
} from "../../lib/private-access.js";

import {
  tryNativeClientLogin
} from "../../lib/portal-native-session.mjs";

import {
  getFilesForClientKeys,
  issueClientIdentityCookie
} from "../../lib/portal-client-delivery.mjs";


const MAX_BODY_BYTES =
  2048;

const MAX_FIELD_LENGTH =
  256;

const FAILURE_DELAY_MS =
  450;


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

  return response
    .status(status)
    .json(body);
}


function validText(
  value
) {

  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <=
      MAX_FIELD_LENGTH
  );
}


async function fail(
  response
) {

  await new Promise(
    resolve =>
      setTimeout(
        resolve,
        FAILURE_DELAY_MS
      )
  );

  return send(
    response,
    401,
    {
      ok: false,
      authenticated: false,
      admin: false,
      native: false,
      allowed: [],
      files: [],
      error:
        "Login To Explore"
    }
  );
}


export default async function handler(
  request,
  response
) {

  if (
    request.method !==
    "POST"
  ) {

    response.setHeader(
      "Allow",
      "POST"
    );

    return send(
      response,
      405,
      {
        ok: false,
        authenticated: false,
        admin: false,
        allowed: [],
        files: []
      }
    );
  }


  const mediaType =
    String(
      request.headers[
        "content-type"
      ] || ""
    )
      .split(
        ";",
        1
      )[0]
      .trim()
      .toLowerCase();


  if (
    mediaType !==
    "application/json"
  ) {

    return send(
      response,
      415,
      {
        ok: false,
        authenticated: false,
        admin: false,
        allowed: [],
        files: []
      }
    );
  }


  const declaredSize =
    Number(
      request.headers[
        "content-length"
      ] || 0
    );


  if (
    !Number.isFinite(
      declaredSize
    ) ||
    declaredSize < 0 ||
    declaredSize >
      MAX_BODY_BYTES
  ) {

    return send(
      response,
      413,
      {
        ok: false,
        authenticated: false,
        admin: false,
        allowed: [],
        files: []
      }
    );
  }


  let body =
    request.body;


  if (
    typeof body ===
    "string"
  ) {

    if (
      Buffer.byteLength(
        body,
        "utf8"
      ) >
      MAX_BODY_BYTES
    ) {

      return send(
        response,
        413,
        {
          ok: false,
          authenticated: false,
          admin: false,
          allowed: [],
          files: []
        }
      );
    }

    try {

      body =
        JSON.parse(
          body
        );

    } catch {

      return send(
        response,
        400,
        {
          ok: false,
          authenticated: false,
          admin: false,
          allowed: [],
          files: []
        }
      );
    }
  }


  if (
    !body ||
    typeof body !==
      "object" ||
    Array.isArray(
      body
    )
  ) {

    return send(
      response,
      400,
      {
        ok: false,
        authenticated: false,
        admin: false,
        allowed: [],
        files: []
      }
    );
  }


  const clientId =
    String(
      body.clientId || ""
    )
      .trim();


  const accessKey =
    typeof body.accessKey ===
      "string"
      ? body.accessKey
      : "";


  if (
    !validText(
      clientId
    ) ||
    !validText(
      accessKey
    )
  ) {

    return fail(
      response
    );
  }


  /*
   * NATIVE CLIENT FIRST.
   *
   * Successful login creates:
   * 1) existing database-backed native session
   * 2) signed client identity cookie
   *
   * The second cookie removes all ambiguity when
   * retrieving current file permissions.
   */
  try {

    const nativeLogin =
      await tryNativeClientLogin(
        request,
        clientId,
        accessKey
      );


    if (
      nativeLogin.ok
    ) {

      const clientKey =
        String(
          nativeLogin.client
            .clientKey
        );


      const files =
        await getFilesForClientKeys(
          [clientKey]
        );


      return send(
        response,
        200,
        {
          ok: true,
          authenticated: true,
          authType:
            "native",
          admin: false,
          native: true,
          allowed: [],
          files,
          client: {
            clientKey,

            username:
              nativeLogin.client
                .username,

            displayName:
              nativeLogin.client
                .displayName
          }
        },
        {
          "Set-Cookie": [
            nativeLogin.cookie,

            issueClientIdentityCookie(
              request,
              clientKey
            )
          ]
        }
      );
    }

  } catch (error) {

    console.error(
      "Native client login:",
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


  /*
   * ADMIN LOGIN
   */
  const adminSecret =
    process.env
      .PRIVATE_ACCESS_ADMIN_SESSION_SECRET;


  const adminValid =
    await validAdminCredentials(
      clientId,
      accessKey,
      process.env
    );


  if (
    adminValid &&
    typeof adminSecret ===
      "string" &&
    adminSecret.length >= 32
  ) {

    const session =
      await issueAdminSession(
        adminSecret
      );


    if (
      !session
    ) {

      return send(
        response,
        503,
        {
          ok: false,
          authenticated: false,
          admin: false,
          allowed: [],
          files: []
        }
      );
    }


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
        files: []
      },
      {
        "Set-Cookie":
          adminSessionCookie(
            session
          )
      }
    );
  }


  /*
   * LEGACY CLIENT LOGIN
   */
  const secret =
    process.env
      .PRIVATE_ACCESS_SESSION_SECRET;


  if (
    typeof secret !==
      "string" ||
    secret.length < 32
  ) {

    return send(
      response,
      503,
      {
        ok: false,
        authenticated: false,
        admin: false,
        allowed: [],
        files: []
      }
    );
  }


  for (
    const scope
    of HUB_PUBLIC_SCOPES
  ) {

    const valid =
      await validCredentials(
        scope,
        clientId,
        accessKey,
        process.env
      );


    if (
      !valid
    ) {
      continue;
    }


    const session =
      await issueSession(
        scope,
        secret
      );


    if (
      !session
    ) {

      return send(
        response,
        503,
        {
          ok: false,
          authenticated: false,
          admin: false,
          allowed: [],
          files: []
        }
      );
    }


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
        allowed:
          [scope],
        files: []
      },
      {
        "Set-Cookie":
          sessionCookie(
            scope,
            session
          )
      }
    );
  }


  return fail(
    response
  );
}
