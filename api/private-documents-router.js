const loaders = {

  blueprint:
    () =>
      import(
        "../_handlers/private-documents/blueprint.js"
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
      .end(
        "Private document route not found."
      );
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
      "Private document router:",
      error
    );

    if (!res.headersSent) {

      return res
        .status(500)
        .end(
          "Private document temporarily unavailable."
        );
    }

    res.end();
  }
}
