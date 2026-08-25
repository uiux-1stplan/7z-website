const loaders = {

  "admin-accounts":
    () =>
      import(
        "../_handlers/admin/admin-accounts.js"
      ),

  "all-clients":
    () =>
      import(
        "../_handlers/admin/all-clients.js"
      ),

  "files":
    () =>
      import(
        "../_handlers/admin/files.js"
      ),

  "blob-finalize":
    () =>
      import(
        "../_handlers/admin/blob-finalize.js"
      ),

  "blob-upload":
    () =>
      import(
        "../_handlers/admin/blob-upload.js"
      ),

  "blob-upload-intent":
    () =>
      import(
        "../_handlers/admin/blob-upload-intent.js"
      ),

  "client-file-access":
    () =>
      import(
        "../_handlers/admin/client-file-access.js"
      ),

  "clients":
    () =>
      import(
        "../_handlers/admin/clients.js"
      ),

  "user-password":
    () =>
      import(
        "../_handlers/admin/user-password.js"
      ),

  "user-role":
    () =>
      import(
        "../_handlers/admin/user-role.js"
      ),

  "users":
    () =>
      import(
        "../_handlers/admin/users.js"
      ),

  "user-status":
    () =>
      import(
        "../_handlers/admin/user-status.js"
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
      : String(
          raw || ""
        );


  const load =
    loaders[route];


  if (!load) {

    return res
      .status(404)
      .json({
        error:
          "Admin API route not found."
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
      "Admin router:",
      error
    );


    if (
      !res.headersSent
    ) {

      return res
        .status(500)
        .json({
          error:
            "Admin API temporarily unavailable."
        });
    }


    res.end();
  }
}
