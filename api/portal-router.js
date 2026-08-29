const loaders = {

  config:
    () =>
      import(
        "../_handlers/portal/config.js"
      ),

  me:
    () =>
      import(
        "../_handlers/portal/me.js"
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
          "Portal API route not found."
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
      "Portal router:",
      error
    );

    if (!res.headersSent) {

      return res
        .status(500)
        .json({
          error:
            "Portal API temporarily unavailable."
        });
    }

    res.end();
  }
}
