import crypto from "node:crypto";

export default async function handler(req, res) {

  const runtime =
    await import("../../lib/portal-runtime.mjs");

  const http =
    await import("../../lib/vercel-api.mjs");

  try {

    if (req.method !== "POST") {
      return http.methodNotAllowed(
        res,
        ["POST"]
      );
    }

    const gate =
      await runtime.requireAdmin(
        http.toWebRequest(req)
      );

    if (!gate.ok) {
      return http.sendWebResponse(
        res,
        gate.response
      );
    }

    const secret =
      process.env.BLOB_READ_WRITE_TOKEN;

    if (!secret) {

      return http.sendJson(
        res,
        500,
        {
          error:
            "Private Blob storage is not configured."
        }
      );
    }

    /*
     * Very short-lived signed intent.
     * The Blob RW token itself NEVER reaches the browser.
     */
    const payloadObject = {
      uid: gate.auth.userId,
      exp: Date.now() + (5 * 60 * 1000),
      jti: crypto.randomUUID()
    };

    const payload =
      Buffer
        .from(
          JSON.stringify(
            payloadObject
          )
        )
        .toString("base64url");

    const signature =
      crypto
        .createHmac(
          "sha256",
          secret
        )
        .update(payload)
        .digest("base64url");

    const intent =
      `${payload}.${signature}`;

    return http.sendJson(
      res,
      200,
      {
        intent,
        expiresAt:
          payloadObject.exp
      }
    );

  } catch (error) {

    console.error(
      "blob-upload-intent:",
      error
    );

    return http.sendJson(
      res,
      500,
      {
        error:
          "Could not create upload authorization."
      }
    );
  }
}
