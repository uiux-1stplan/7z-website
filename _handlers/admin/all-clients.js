import {
  getSql,
  requireAdmin
} from "../../lib/portal-runtime.mjs";


function toWebRequest(req) {

  const protocol =
    String(
      req.headers?.["x-forwarded-proto"] ||
      "http"
    )
    .split(",")[0]
    .trim();

  const host =
    req.headers?.host ||
    "localhost";

  const headers =
    new Headers();

  for (
    const [key, value]
    of Object.entries(
      req.headers || {}
    )
  ) {

    if (Array.isArray(value)) {

      for (const item of value) {
        headers.append(
          key,
          String(item)
        );
      }

    } else if (
      value !== undefined &&
      value !== null
    ) {

      headers.set(
        key,
        String(value)
      );
    }
  }


  return new Request(
    `${protocol}://${host}${req.url || "/"}`,
    {
      method:
        req.method || "GET",

      headers
    }
  );
}


export default async function handler(
  req,
  res
) {

  res.setHeader(
    "Cache-Control",
    "no-store"
  );


  if (req.method !== "GET") {

    res.setHeader(
      "Allow",
      "GET"
    );

    return res
      .status(405)
      .json({
        ok: false,
        error:
          "Method not allowed."
      });
  }


  try {

    await requireAdmin(
      toWebRequest(req)
    );


    const sql =
      getSql();


    const clients =
      await sql`
        SELECT
          client_key,
          display_name,
          company,
          auth_type,
          legacy_scope,
          username,
          status

        FROM portal_clients

        ORDER BY
          CASE
            WHEN auth_type = 'legacy_scope'
            THEN 0
            ELSE 1
          END,
          LOWER(display_name)
      `;


    return res
      .status(200)
      .json({
        ok: true,
        clients
      });


  } catch (error) {

    console.error(
      "Admin all clients:",
      error
    );


    const status =
      Number(
        error?.status ||
        error?.statusCode ||
        401
      );


    return res
      .status(
        status === 403
          ? 403
          : 401
      )
      .json({
        ok: false,
        error:
          "Administrator authorization required."
      });
  }
}
