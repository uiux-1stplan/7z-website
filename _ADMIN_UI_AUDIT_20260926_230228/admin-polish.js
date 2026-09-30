(() => {

  function polish() {

    /*
     * Rename old Clerk section so it is not confused
     * with customer/client accounts.
     */
    document
      .querySelectorAll(
        "h1,h2,h3,h4"
      )
      .forEach(
        heading => {

          const text =
            heading.textContent
              .trim()
              .toLowerCase();


          if (
            text ===
            "user management"
          ) {

            heading.textContent =
              "Administrator Management";
          }
        }
      );


    /*
     * The old CREATE ACCOUNT form is not used for
     * native Client ID accounts anymore.
     */
    document
      .querySelectorAll(
        "button"
      )
      .forEach(
        button => {

          const text =
            button.textContent
              .trim()
              .toUpperCase();


          if (
            text ===
            "CREATE ACCOUNT"
          ) {

            const form =
              button.closest(
                "form"
              );


            if (form) {
              form.style.display =
                "none";
            }
          }
        }
      );
  }


  polish();


  new MutationObserver(
    polish
  ).observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

})();
