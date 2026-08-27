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
   * Replace dynamic Clerk project-name text
   * at TEXT-NODE level.
   *
   * This avoids destroying Clerk's React DOM.
   */
  function replaceClerkText(scope) {

    const walker =
      D.createTreeWalker(
        scope,
        NodeFilter.SHOW_TEXT
      );


    const nodes = [];

    while (walker.nextNode()) {
      nodes.push(
        walker.currentNode
      );
    }


    for (
      const node
      of nodes
    ) {

      const original =
        String(
          node.nodeValue || ""
        );


      if (
        /clerk-claret-mirror/i
          .test(original)
      ) {

        node.nodeValue =
          original.replace(
            /continue\s+to\s+clerk-claret-mirror/gi,
            "Administrator Access"
          )
          .replace(
            /clerk-claret-mirror/gi,
            "7Z Magic Admin"
          );
      }
    }
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
      "10000",
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


      parent.style.setProperty(
        "z-index",
        String(
          1000 - depth
        ),
        "important"
      );


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


    root
      .querySelectorAll(
        "button"
      )
      .forEach(
        button => {

          if (
            /continue with google/i
              .test(
                cleanText(
                  button.textContent
                )
              )
          ) {

            hide(
              button.closest(
                '[class*="socialButtons"]'
              ) ||
              button
            );
          }
        }
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


    replaceClerkText(
      root
    );


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
