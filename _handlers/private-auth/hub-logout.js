import {
  PRIVATE_RESOURCES,
  adminSessionCookie,
  noStoreHeaders,
  sessionCookie
} from "../../lib/private-access.js";

import {
  clearPortalClientCookie
} from "../../lib/portal-native-session.mjs";


function send(
  response,
  status,
  body,
  extraHeaders = {}
) {

  for (
    const [name, value]
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


export default async function handler(
  request,
  response
) {

  if (
    request.method !== "POST"
  ) {

    response.setHeader(
      "Allow",
      "POST"
    );

    return send(
      response,
      405,
      {
        ok: false
      }
    );
  }


  const expiredCookies = [

    adminSessionCookie(
      "",
      0
    ),

    clearPortalClientCookie(
      request
    ),

    ...Object
      .keys(
        PRIVATE_RESOURCES
      )
      .map(
        scope =>
          sessionCookie(
            scope,
            "",
            0
          )
      )
      .filter(Boolean)
  ];


  return send(
    response,
    200,
    {
      ok: true
    },
    {
      "Set-Cookie":
        expiredCookies
    }
  );
}
