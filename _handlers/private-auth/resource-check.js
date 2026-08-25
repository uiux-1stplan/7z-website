import {
  isResource,
  ADMIN_ONLY_SCOPES
} from "../../lib/private-access.js";

import {
  resolvePortalClientAccess,
  getAllowedLegacyResourceScopes
} from "../../lib/portal-client-access.mjs";

import {
  requireAdmin
} from "../../lib/portal-runtime.mjs";

import {
  toWebRequest
} from "../../lib/vercel-api.mjs";


export default async function handler(
  req,
  res
) {

  res.setHeader(
    "Cache-Control",
    "no-store"
  );


  if (
    req.method !== "GET"
  ) {

    res.setHeader(
      "Allow",
      "GET"
    );

    return res
      .status(405)
      .json({
        authorized: false
      });
  }


  const scope =
    String(
      req.query?.scope || ""
    );


  if (!isResource(scope)) {

    return res
      .status(400)
      .json({
        authorized: false
      });
  }


  /*
   * Clerk administrator:
   * direct access to every protected route.
   */
  try {

    const gate =
      await requireAdmin(
        toWebRequest(req)
      );


    if (gate.ok) {

      return res
        .status(200)
        .json({
          authorized: true,
          admin: true
        });
    }

  } catch {}


  /*
   * Blueprint remains admin-only.
   */
  if (
    ADMIN_ONLY_SCOPES.includes(
      scope
    )
  ) {

    return res
      .status(200)
      .json({
        authorized: false
      });
  }


  try {

    const access =
      await resolvePortalClientAccess(
        req
      );


    if (!access.authenticated) {

      return res
        .status(200)
        .json({
          authorized: false
        });
    }


    const allowed =
      await getAllowedLegacyResourceScopes(
        access.clientKeys
      );


    return res
      .status(200)
      .json({
        authorized:
          allowed.includes(
            scope
          )
      });


  } catch (error) {

    console.error(
      "Resource permission check:",
      error
    );


    return res
      .status(500)
      .json({
        authorized: false
      });
  }
}
