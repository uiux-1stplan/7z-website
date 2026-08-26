(() => {
  "use strict";

  if (window.__Z7_ISOLATED_FILES_V1__) {
    return;
  }

  window.__Z7_ISOLATED_FILES_V1__ = true;

  const D = window.document;

  const section =
    D.querySelector("#z7-client-private-files");

  const list =
    D.querySelector("#z7cpf-list");

  const policy =
    D.querySelector(".z7pa-policy");

  let serial = 0;


  function hideFiles() {

    if (!section) return;

    section.hidden = true;

    section.setAttribute(
      "aria-hidden",
      "true"
    );

    section.style.setProperty(
      "display",
      "none",
      "important"
    );
  }


  function showFiles() {

    if (!section) return;

    section.hidden = false;

    section.removeAttribute(
      "hidden"
    );

    section.setAttribute(
      "aria-hidden",
      "false"
    );

    section.style.setProperty(
      "display",
      "block",
      "important"
    );

    section.style.setProperty(
      "visibility",
      "visible",
      "important"
    );

    section.style.setProperty(
      "opacity",
      "1",
      "important"
    );
  }


  function formatBytes(value) {

    const bytes = Number(value || 0);

    if (!bytes) return "";

    const units = ["B", "KB", "MB", "GB"];

    const index =
      Math.min(
        Math.floor(
          Math.log(bytes) /
          Math.log(1024)
        ),
        units.length - 1
      );

    return (
      bytes /
      Math.pow(1024, index)
    ).toFixed(index ? 1 : 0) +
      " " +
      units[index];
  }


  function typeOf(file) {

    const name =
      String(file?.name || "")
        .toLowerCase();

    const type =
      String(file?.contentType || "")
        .toLowerCase();

    if (
      type.includes("html") ||
      name.endsWith(".html") ||
      name.endsWith(".htm")
    ) return "HTML";

    if (
      type.includes("pdf") ||
      name.endsWith(".pdf")
    ) return "PDF";

    if (type.startsWith("image/")) return "IMG";
    if (type.startsWith("video/")) return "VIDEO";

    return "FILE";
  }


  function makeFile(file) {

    const article =
      D.createElement("article");

    article.className =
      "z7cpf-file";


    const main =
      D.createElement("div");

    main.className =
      "z7cpf-file-main";


    const icon =
      D.createElement("div");

    icon.className =
      "z7cpf-file-icon";

    icon.textContent =
      typeOf(file);


    const copy =
      D.createElement("div");

    copy.className =
      "z7cpf-file-copy";


    const title =
      D.createElement("strong");

    title.textContent =
      String(file.name || "File");


    const size =
      D.createElement("span");

    size.textContent =
      formatBytes(file.sizeBytes);


    copy.append(
      title,
      size
    );


    main.append(
      icon,
      copy
    );


    const actions =
      D.createElement("div");

    actions.className =
      "z7cpf-actions";


    const id =
      encodeURIComponent(
        String(file.id || "")
      );


    if (file.canView !== false) {

      const open =
        D.createElement("a");

      open.className =
        "z7cpf-open";

      open.href =
        `/api/private-auth/portal-file?id=${id}&mode=view`;

      open.target =
        "_blank";

      open.rel =
        "noopener";

      open.textContent =
        "OPEN ↗";

      actions.appendChild(open);
    }


    if (file.canDownload === true) {

      const download =
        D.createElement("a");

      download.className =
        "z7cpf-download";

      download.href =
        `/api/private-auth/portal-file?id=${id}&mode=download`;

      download.textContent =
        "DOWNLOAD";

      actions.appendChild(download);
    }


    article.append(
      main,
      actions
    );


    return article;
  }


  function render(files) {

    if (
      !section ||
      !list
    ) return;


    list.replaceChildren();


    for (const file of files) {

      list.appendChild(
        makeFile(file)
      );
    }


    showFiles();


    /*
     * Only when actual assigned files exist,
     * hide the irrelevant Access Policy section.
     *
     * Nothing else on the page is touched.
     */
    if (policy) {
      policy.hidden = true;
    }
  }


  async function refresh() {

    const requestId =
      ++serial;


    try {

      const response =
        await window.fetch(
          `/api/private-auth/portal-files?t=${Date.now()}`,
          {
            credentials:
              "same-origin",

            cache:
              "no-store",

            headers: {
              "Cache-Control":
                "no-cache, no-store"
            }
          }
        );


      if (requestId !== serial) {
        return;
      }


      if (
        response.status === 401 ||
        response.status === 403
      ) {

        hideFiles();

        if (policy) {
          policy.hidden = false;
        }

        return;
      }


      if (!response.ok) {

        console.error(
          "7Z file API HTTP",
          response.status
        );

        return;
      }


      const payload =
        await response.json();


      const files =
        Array.isArray(payload?.files)
          ? payload.files
          : [];


      if (
        payload?.authenticated === true &&
        files.length > 0
      ) {

        render(files);

      } else {

        hideFiles();

        if (policy) {
          policy.hidden = false;
        }
      }


    } catch (error) {

      console.error(
        "7Z isolated file delivery:",
        error
      );
    }
  }


  refresh();


  window.addEventListener(
    "pageshow",
    refresh
  );


  window.addEventListener(
    "focus",
    refresh
  );


  D.addEventListener(
    "visibilitychange",
    () => {

      if (!D.hidden) {
        refresh();
      }
    }
  );


  window.setInterval(
    () => {

      if (!D.hidden) {
        refresh();
      }
    },
    2000
  );


  window.__Z7_REFRESH_FILES__ =
    refresh;

})();