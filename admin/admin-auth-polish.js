/* Z7_ADMIN_AUTH_FINAL_V4 */

(() => {

  "use strict";

  if (
    window.__Z7_ADMIN_AUTH_FINAL_V4__
  ) {
    return;
  }

  window.__Z7_ADMIN_AUTH_FINAL_V4__ =
    true;


  const D =
    window.document;


  function cleanText(value) {

    return String(
      value || ""
    )
      .replace(/\\s+/g, " ")
      .trim();
  }


  function hide(element) {

    if (!element) {
      return;
    }

    element.style.setProperty(
      "display",
      "none",
      "important"
    );

    element.setAttribute(
      "aria-hidden",
      "true"
    );
  }


  /*
   * Find ANY foreign element sitting physically above
   * the Clerk inputs/buttons and disable pointer events
   * on that blocker only.
   *
   * This directly fixes the "glass pane" symptom.
   */
  function removePhysicalBlockers(
    root
  ) {

    const controls =
      [
        ...root.querySelectorAll(
          "input,button,a,[role='button']"
        )
      ];


    for (
      const control
      of controls
    ) {

      const rect =
        control.getBoundingClientRect();


      if (
        rect.width < 2 ||
        rect.height < 2
      ) {
        continue;
      }


      const x =
        rect.left +
        rect.width / 2;


      const y =
        rect.top +
        rect.height / 2;


      const stack =
        D.elementsFromPoint(
          x,
          y
        );


      for (
        const element
        of stack
      ) {

        /*
         * Site navigation is intentionally allowed
         * to sit above scrolled Admin content.
         */
        if (
          element.closest?.(
            ".site-header, .main-header, header, nav"
          )
        ) {
          continue;
        }

        if (
          element === control ||
          root.contains(element) ||
          element.contains(root)
        ) {
          continue;
        }


        const style =
          window.getComputedStyle(
            element
          );


        if (
          style.pointerEvents ===
          "none"
        ) {
          continue;
        }


        /*
         * Only disable an element proven to occupy
         * the same physical point as a Clerk control.
         */
        element.style.setProperty(
          "pointer-events",
          "none",
          "important"
        );


        element.dataset
          .z7AdminAuthBlocker =
            "disabled";
      }
    }
  }


  function forceInteractive(
    root
  ) {

    root.style.setProperty(
      "position",
      "relative",
      "important"
    );


    root.style.setProperty(
      "z-index",
      "20",
      "important"
    );


    root.style.setProperty(
      "pointer-events",
      "auto",
      "important"
    );


    let parent =
      root.parentElement;


    let depth =
      0;


    /*
     * Restore pointer events to the local auth container
     * without touching global navigation/header.
     */
    while (
      parent &&
      parent !== D.body &&
      depth < 4
    ) {

      parent.style.setProperty(
        "pointer-events",
        "auto",
        "important"
      );


      if (
        window
          .getComputedStyle(parent)
          .position === "static"
      ) {

        parent.style.setProperty(
          "position",
          "relative",
          "important"
        );
      }


      parent.style.removeProperty("z-index");


      parent =
        parent.parentElement;


      depth +=
        1;
    }


    root
      .querySelectorAll(
        "input,button,a,[role='button'],form"
      )
      .forEach(
        element => {

          element.style.setProperty(
            "pointer-events",
            "auto",
            "important"
          );
        }
      );


    removePhysicalBlockers(
      root
    );
  }


  function hideUnwanted(
    root
  ) {

    root
      .querySelectorAll(
        [
          ".cl-socialButtons",
          ".cl-socialButtonsBlockButton",
          ".cl-dividerRow",
          ".cl-footer",
          ".cl-footerPages",
          ".cl-footerAction",
          ".cl-developmentModeBadge"
        ].join(",")
      )
      .forEach(
        hide
      );


    /*
     * Some Clerk branding nodes can render
     * immediately outside .cl-rootBox.
     */
    D
      .querySelectorAll(
        "body *"
      )
      .forEach(
        element => {

          if (
            element.children.length
          ) {
            return;
          }


          const text =
            cleanText(
              element.textContent
            );


          if (
            /^secured by clerk$/i.test(text) ||
            /^development mode$/i.test(text)
          ) {

            hide(
              element.parentElement ||
              element
            );
          }
        }
      );
  }


  function improveOuterHeading(
    root
  ) {

    const localScope =
      root.parentElement?.parentElement ||
      root.parentElement;


    if (!localScope) {
      return;
    }


    localScope
      .querySelectorAll(
        "h1,h2,h3"
      )
      .forEach(
        heading => {

          if (
            /^sign in$/i.test(
              cleanText(
                heading.textContent
              )
            )
          ) {

            heading.textContent =
              "Admin Access";
          }
        }
      );
  }


  function polish() {

    const root =
      D.querySelector(
        ".cl-rootBox"
      );


    if (!root) {
      return false;
    }


    root.dataset
      .z7AdminAuthReady =
        "true";


    hideUnwanted(
      root
    );


    root.querySelectorAll(".cl-headerTitle").forEach(hide);


    improveOuterHeading(
      root
    );


    forceInteractive(
      root
    );


    return true;
  }


  function boot() {

    polish();


    /*
     * Clerk renders asynchronously.
     * Re-polish whenever its React tree changes.
     */
    const observer =
      new MutationObserver(
        () => {
          polish();
        }
      );


    observer.observe(
      D.body,
      {
        childList:
          true,

        subtree:
          true,

        characterData:
          true
      }
    );


    /*
     * Catch late paint/layout overlays.
     */
    let frame =
      0;


    const settle = () => {

      polish();


      frame +=
        1;


      if (
        frame < 120
      ) {

        requestAnimationFrame(
          settle
        );
      }
    };


    requestAnimationFrame(
      settle
    );


    window.addEventListener(
      "resize",
      polish
    );


    window.addEventListener(
      "focus",
      polish
    );


    /*
     * One last guard exactly when user interacts.
     */
    D.addEventListener(
      "pointerdown",
      () => {
        polish();
      },
      true
    );
  }


  if (
    D.readyState ===
    "loading"
  ) {

    D.addEventListener(
      "DOMContentLoaded",
      boot,
      {
        once:
          true
      }
    );

  } else {

    boot();
  }

})();
