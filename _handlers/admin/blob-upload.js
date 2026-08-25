import crypto from "node:crypto";
import { handleUpload } from "@vercel/blob/client";

function verifyIntent(intent) {

  if (
    typeof intent !== "string" ||
    !intent.includes(".")
  ) {
    return null;
  }

  const secret =
    process.env.BLOB_READ_WRITE_TOKEN;

  if (!secret) {
    return null;
  }

  const [
    payload,
    suppliedSignature
  ] = intent.split(".");

  if (
    !payload ||
    !suppliedSignature
  ) {
    return null;
  }

  const expectedSignature =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(payload)
      .digest("base64url");

  const a =
    Buffer.from(
      suppliedSignature
    );

  const b =
    Buffer.from(
      expectedSignature
    );

  if (
    a.length !== b.length ||
    !crypto.timingSafeEqual(a, b)
  ) {
    return null;
  }

  try {

    const decoded =
      JSON.parse(
        Buffer
          .from(
            payload,
            "base64url"
          )
          .toString("utf8")
      );

    if (
      !decoded.uid ||
      !decoded.exp ||
      decoded.exp < Date.now()
    ) {
      return null;
    }

    return decoded;

  } catch {

    return null;
  }
}

function safePortalPath(pathname) {

  if (
    typeof pathname !== "string" ||
    pathname.length < 8 ||
    pathname.length > 500
  ) {
    return false;
  }

  if (
    !pathname.startsWith(
      "portal/"
    )
  ) {
    return false;
  }

  if (
    pathname.includes("..") ||
    pathname.includes("\\")
  ) {
    return false;
  }

  return true;
}

async function readJson(req) {

  if (
    req.body &&
    typeof req.body === "object"
  ) {
    return req.body;
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(
    Buffer
      .concat(chunks)
      .toString("utf8")
  );
}

export default async function handler(
  request,
  response
) {

  if (request.method !== "POST") {

    response.setHeader(
      "Allow",
      "POST"
    );

    return response
      .status(405)
      .json({
        error:
          "Method not allowed."
      });
  }

  try {

    const body =
      await readJson(request);

    const base =
      `http://${
        request.headers.host ||
        "localhost"
      }`;

    const url =
      new URL(
        request.url,
        base
      );

    const intent =
      url.searchParams.get(
        "intent"
      );

    const jsonResponse =
      await handleUpload({

        body,

        request,

        onBeforeGenerateToken:
          async (
            pathname
          ) => {

            const signed =
              verifyIntent(
                intent
              );

            if (!signed) {
              throw new Error(
                "Unauthorized upload request."
              );
            }

            if (
              !safePortalPath(
                pathname
              )
            ) {
              throw new Error(
                "Invalid private file pathname."
              );
            }

            return {

              /*
               * Unique physical Blob path.
               */
              addRandomSuffix: true,

              /*
               * Maximum single file = 5 GB.
               */
              maximumSizeInBytes:
                5 * 1024 * 1024 * 1024,

              /*
               * Client token lifespan.
               */
              validUntil:
                Date.now() +
                (60 * 60 * 1000),

              tokenPayload:
                JSON.stringify({
                  adminUserId:
                    signed.uid
                })
            };
          },

        /*
         * Database finalization is deliberately
         * NOT done here because this callback
         * cannot reach localhost.
         *
         * Browser calls /blob-finalize after
         * upload() succeeds.
         */
        onUploadCompleted:
          async () => {
            return;
          }
      });

    return response
      .status(200)
      .json(
        jsonResponse
      );

  } catch (error) {

    console.error(
      "blob-upload:",
      error
    );

    return response
      .status(400)
      .json({
        error:
          error instanceof Error
            ? error.message
            : "Upload authorization failed."
      });
  }
}
