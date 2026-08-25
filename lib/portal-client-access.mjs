import {
  getLegacyClientScopes
} from "./portal-legacy-access.mjs";

import {
  getPortalClientSession
} from "./portal-native-session.mjs";

import {
  getSql
} from "./portal-runtime.mjs";


export async function resolvePortalClientAccess(
  request
) {

  const sql =
    getSql();


  const [
    sessionClient,
    legacyScopes
  ] =
    await Promise.all([
      getPortalClientSession(
        request
      ),

      getLegacyClientScopes(
        request
      )
    ]);


  const clientKeys =
    new Set();


  if (sessionClient?.client_key) {

    clientKeys.add(
      sessionClient.client_key
    );
  }


  /*
   * Compatibility for existing Legacy sessions
   * that were created before this migration.
   */
  if (
    Array.isArray(legacyScopes) &&
    legacyScopes.length
  ) {

    const legacyClients =
      await sql`
        SELECT
          client_key,
          legacy_scope

        FROM portal_clients

        WHERE
          auth_type = 'legacy_scope'
          AND status = 'active'
      `;


    for (const client of legacyClients) {

      if (
        legacyScopes.includes(
          client.legacy_scope
        )
      ) {

        clientKeys.add(
          client.client_key
        );
      }
    }
  }


  let authType = null;


  if (sessionClient) {

    authType =
      sessionClient.auth_type ===
      "legacy_scope"
        ? "legacy"
        : "native";

  } else if (
    legacyScopes.length
  ) {

    authType =
      "legacy";
  }


  return {
    authenticated:
      clientKeys.size > 0,

    authType,

    sessionClient,

    legacyScopes,

    clientKeys:
      [...clientKeys]
  };
}


export async function getAllowedLegacyResourceScopes(
  clientKeys
) {

  if (
    !Array.isArray(clientKeys) ||
    !clientKeys.length
  ) {
    return [];
  }


  const sql =
    getSql();


  const rows =
    await sql`
      SELECT
        client_key,
        resource_scope,
        can_view

      FROM portal_client_resource_permissions

      WHERE
        can_view = TRUE
    `;


  const allowedClients =
    new Set(
      clientKeys
    );


  return [
    ...new Set(
      rows
        .filter(
          row =>
            allowedClients.has(
              row.client_key
            )
        )
        .map(
          row =>
            row.resource_scope
        )
    )
  ];
}
