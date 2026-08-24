(() => {
    "use strict";

    const headerSlot =
        document.getElementById(
            "site-header-slot"
        );

    const footerSlot =
        document.getElementById(
            "site-footer-slot"
        );

    function absoluteUrl(value) {

        if (!value) return value;

        if (
            value.startsWith("#") ||
            value.startsWith("mailto:") ||
            value.startsWith("tel:")
        ) {
            return value;
        }

        try {
            return new URL(
                value,
                location.origin + "/"
            ).href;
        } catch {
            return value;
        }
    }

    function rewriteUrls(root) {

        root
            .querySelectorAll("[href]")
            .forEach(element => {
                element.setAttribute(
                    "href",
                    absoluteUrl(
                        element.getAttribute(
                            "href"
                        )
                    )
                );
            });

        root
            .querySelectorAll("[src]")
            .forEach(element => {
                element.setAttribute(
                    "src",
                    absoluteUrl(
                        element.getAttribute(
                            "src"
                        )
                    )
                );
            });

        root
            .querySelectorAll("[srcset]")
            .forEach(element => {

                const source =
                    element.getAttribute(
                        "srcset"
                    );

                if (!source) return;

                const rewritten =
                    source
                        .split(",")
                        .map(part => {

                            const bits =
                                part
                                    .trim()
                                    .split(/\s+/);

                            bits[0] =
                                absoluteUrl(
                                    bits[0]
                                );

                            return bits.join(" ");
                        })
                        .join(", ");

                element.setAttribute(
                    "srcset",
                    rewritten
                );
            });
    }

    function stripScripts(root) {

        root
            .querySelectorAll("script")
            .forEach(
                script =>
                    script.remove()
            );
    }

    function installMainSiteCss() {

        if (
            document.querySelector(
                'link[data-z7-site-theme]'
            )
        ) {
            return;
        }

        const link =
            document.createElement(
                "link"
            );

        link.rel =
            "stylesheet";

        link.href =
            "/assets/css/styles.css";

        link.dataset.z7SiteTheme =
            "true";

        const adminCss =
            document.querySelector(
                'link[href="/admin/admin.css"]'
            );

        if (adminCss) {
            adminCss.before(link);
        } else {
            document.head.appendChild(
                link
            );
        }
    }

    function measureHeader(header) {

        const update = () => {

            const height =
                Math.ceil(
                    header
                        .getBoundingClientRect()
                        .height
                );

            document
                .documentElement
                .style
                .setProperty(
                    "--z7-admin-header-height",
                    `${height}px`
                );

            const position =
                getComputedStyle(
                    header
                ).position;

            document.body.classList.toggle(
                "z7-admin-fixed-header",
                position === "fixed" ||
                position === "sticky"
            );
        };

        update();

        if (
            "ResizeObserver" in window
        ) {
            new ResizeObserver(
                update
            ).observe(header);
        }
    }

    async function boot() {

        try {

            installMainSiteCss();

            const response =
                await fetch(
                    "/",
                    {
                        cache: "no-store",
                        credentials:
                            "same-origin"
                    }
                );

            if (!response.ok) {
                throw new Error(
                    "Homepage shell unavailable."
                );
            }

            const source =
                await response.text();

            const parsed =
                new DOMParser()
                    .parseFromString(
                        source,
                        "text/html"
                    );

            const originalHeader =
                parsed.querySelector(
                    ".site-header"
                ) ||
                parsed.querySelector(
                    ".main-header"
                ) ||
                parsed.querySelector(
                    "header"
                );

            const originalFooter =
                parsed.querySelector(
                    ".site-footer"
                ) ||
                parsed.querySelector(
                    ".main-footer"
                ) ||
                parsed.querySelector(
                    "footer"
                );

            if (
                originalHeader &&
                headerSlot
            ) {

                const header =
                    originalHeader
                        .cloneNode(true);

                stripScripts(header);
                rewriteUrls(header);

                headerSlot.replaceChildren(
                    header
                );

                measureHeader(header);
            }

            if (footerSlot) {

                footerSlot.innerHTML = `
                  <footer class="z7-admin-footer">

                    <div class="z7-admin-footer-brand">
                      <img
                        src="/media/main_logo/7ZMagic-official-logo-20260822.png"
                        alt="7Z Magic"
                      >

                      <div>
                        <strong>7Z MAGIC</strong>
                        <span>Creative Intelligence & Digital Experiences</span>
                      </div>
                    </div>

                    <nav class="z7-admin-footer-nav">
                      <a href="/">Home</a>
                      <a href="/#services">Services</a>
                      <a href="/#about">About</a>
                      <a href="/#contact">Contact</a>
                      <a href="/private-access/">Private Access</a>
                    </nav>

                    <div class="z7-admin-footer-meta">
                      <span>ADMINISTRATION PORTAL</span>
                      <span>© 7Z Magic</span>
                    </div>

                  </footer>
                `;
            }

            document.body.classList.add(
                "z7-admin-site-shell-ready"
            );

        } catch (error) {

            console.warn(
                "7Z site shell unavailable:",
                error
            );
        }
    }

    boot();

})();

