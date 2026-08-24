import {
  getLegacyClientScopes
} from "./portal-legacy-access.mjs";

import {
  getNativeClientSession
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
    nativeClient,
    legacyScopes
  ] =
    await Promise.all([
      getNativeClientSession(
        request
      ),

      getLegacyClientScopes(
        request
      )
    ]);


  const clientKeys =
    new Set();


  if (nativeClient?.client_key) {

    clientKeys.add(
      nativeClient.client_key
    );
  }


  if (
    Array.isArray(
      legacyScopes
    ) &&
    legacyScopes.length
  ) {

    const legacyClients =
      await sql`
        SELECT
          client_key,
          legacy_scope

        FROM portal_clients

        WHERE
          auth_type =
            'legacy_scope'
          AND status =
            'active'
      `;


    for (
      const client
      of legacyClients
    ) {

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

  if (
    nativeClient &&
    legacyScopes.length
  ) {

    authType =
      "mixed";

  } else if (
    nativeClient
  ) {

    authType =
      "native";

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

    nativeClient,

    legacyScopes,

    clientKeys:
      [...clientKeys]
  };
}
