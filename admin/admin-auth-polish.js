/* Z7_ADMIN_LOGIN_FINAL */

(() => {

  "use strict";

  if (window.__Z7_ADMIN_LOGIN_FINAL__) {
    return;
  }

  window.__Z7_ADMIN_LOGIN_FINAL__ = true;


  function hide(element) {

    if (!element) return;

    element.style.setProperty(
      "display",
      "none",
      "important"
    );
  }


  function cleanText(element) {

    return String(
      element?.textContent || ""
    )
      .replace(/\s+/g," ")
      .trim();
  }


  function polish() {

    const root =
      document.querySelector(
        ".cl-rootBox"
      );


    if (!root) return;


    const title =
      root.querySelector(
        ".cl-headerTitle"
      );


    if (title) {

      title.textContent =
        "Administrator Access";
    }


    const subtitle =
      root.querySelector(
        ".cl-headerSubtitle"
      );


    if (subtitle) {

      subtitle.textContent =
        "Authorized 7Z Magic administrators only.";
    }


    root.querySelectorAll(
      [
        ".cl-socialButtons",
        ".cl-socialButtonsBlockButton",
        ".cl-dividerRow",
        ".cl-footer",
        ".cl-footerPages",
        ".cl-footerAction",
        ".cl-developmentModeBadge"
      ].join(",")
    ).forEach(hide);


    root
      .querySelectorAll("button")
      .forEach(
        button => {

          if (
            /continue with google/i
              .test(
                cleanText(button)
              )
          ) {

            hide(
              button.closest(
                '[class*="socialButtons"]'
              ) || button
            );
          }
        }
      );


    document.body
      .querySelectorAll("*")
      .forEach(
        element => {

          if (element.children.length) {
            return;
          }


          const text =
            cleanText(element);


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


  const start = () => {

    polish();


    new MutationObserver(
      polish
    ).observe(
      document.body,
      {
        childList:true,
        subtree:true,
        characterData:true
      }
    );
  };


  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once:true }
    );

  } else {

    start();
  }

})();
