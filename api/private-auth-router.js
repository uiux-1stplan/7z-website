const loaders = {

  "admin-login":
    () =>
      import(
        "../_handlers/private-auth/admin-login.js"
      ),

  "admin-logout":
    () =>
      import(
        "../_handlers/private-auth/admin-logout.js"
      ),

  "admin-status":
    () =>
      import(
        "../_handlers/private-auth/admin-status.js"
      ),

  "hub-login":
    () =>
      import(
        "../_handlers/private-auth/hub-login.js"
      ),

  "hub-logout":
    () =>
      import(
        "../_handlers/private-auth/hub-logout.js"
      ),

  "hub-status":
    () =>
      import(
        "../_handlers/private-auth/hub-status.js"
      ),

  login:
    () =>
      import(
        "../_handlers/private-auth/login.js"
      ),

  logout:
    () =>
      import(
        "../_handlers/private-auth/logout.js"
      ),

  "portal-file":
    () =>
      import(
        "../_handlers/private-auth/portal-file.js"
      ),

  "portal-files":
    () =>
      import(
        "../_handlers/private-auth/portal-files.js"
      )
};


export default async function handler(
  req,
  res
) {

  const raw =
    req.query?.__z7route;

  const route =
    Array.isArray(raw)
      ? raw[0]
      : String(raw || "");

  const load =
    loaders[route];

  if (!load) {

    return res
      .status(404)
      .json({
        error:
          "Private API route not found."
      });
  }

  try {

    const module =
      await load();

    return await module.default(
      req,
      res
    );

  } catch (error) {

    console.error(
      "Private auth router:",
      error
    );

    if (!res.headersSent) {

      return res
        .status(500)
        .json({
          error:
            "Private access temporarily unavailable."
        });
    }

    res.end();
  }
}
