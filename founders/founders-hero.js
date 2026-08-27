/* =========================================================
   Z7 FOUNDERS HERO PHOTO V1
   Runtime affects the Founders hero only.
========================================================= */

(() => {

    "use strict";


    if (window.__Z7_FOUNDERS_HERO_PHOTO_V1__) {
        return;
    }


    window.__Z7_FOUNDERS_HERO_PHOTO_V1__ =
        true;


    const D =
        window.document;


    function locateHero() {

        const main =
            D.querySelector("main");


        if (!main) {
            return null;
        }


        /*
         * The first H1 is the most stable semantic anchor
         * for the existing Founders hero.
         */
        const firstHeading =
            main.querySelector("h1");


        if (firstHeading) {

            const semanticHero =
                firstHeading.closest(
                    "section, [class*='hero']"
                );


            if (semanticHero) {
                return semanticHero;
            }
        }


        /*
         * Safe fallback restricted to MAIN only.
         */
        return (
            main.querySelector(
                "[class*='hero']"
            ) ||
            main.querySelector(
                "section"
            )
        );
    }


    function markExistingHeroMedia(hero) {

        const candidates =
            Array.from(
                hero.querySelectorAll(
                    "picture, img, video"
                )
            );


        for (const node of candidates) {

            if (
                node.closest(
                    ".site-header, .main-header, header, nav"
                )
            ) {
                continue;
            }


            if (
                node.closest(
                    ".z7-founders-hero-media"
                )
            ) {
                continue;
            }


            if (
                node.closest(
                    "[class*='logo'], [class*='icon']"
                )
            ) {
                continue;
            }


            const rect =
                node.getBoundingClientRect();


            /*
             * Hide only meaningful LARGE hero photography.
             * Logos/icons/decorative micro-elements survive.
             */
            if (
                rect.width < 160 ||
                rect.height < 160
            ) {
                continue;
            }


            node.classList.add(
                "z7-founders-old-hero-media"
            );


            /*
             * If it is a picture, its IMG may be the only
             * visible child; mark both without removing layout.
             */
            if (
                node.tagName === "PICTURE"
            ) {

                node
                    .querySelectorAll("img")
                    .forEach(
                        img =>
                            img.classList.add(
                                "z7-founders-old-hero-media"
                            )
                    );
            }
        }
    }


    function install() {

        const hero =
            locateHero();


        if (!hero) {

            console.warn(
                "7Z Founders Hero: hero anchor not found."
            );

            return;
        }


        hero.classList.add(
            "z7-founders-photo-hero"
        );


        hero.setAttribute(
            "data-z7-founders-photo-hero",
            "true"
        );


        let media =
            hero.querySelector(
                ":scope > .z7-founders-hero-media"
            );


        if (!media) {

            media =
                D.createElement("div");


            media.className =
                "z7-founders-hero-media";


            media.setAttribute(
                "aria-hidden",
                "true"
            );


            const image =
                D.createElement("img");


            image.src =
                "/assets/images/founders/7z-founders-hero.jpeg";


            image.alt =
                "";


            image.decoding =
                "async";


            image.fetchPriority =
                "high";


            const motion =
                D.createElement("div");


            motion.className =
                "z7-founders-hero-motion";


            media.append(
                image,
                motion
            );


            hero.prepend(
                media
            );
        }


        /*
         * Run after layout so we can distinguish
         * real Hero photography from small UI graphics.
         */
        requestAnimationFrame(
            () => {

                requestAnimationFrame(
                    () => {

                        markExistingHeroMedia(
                            hero
                        );
                    }
                );
            }
        );


        window.addEventListener(
            "load",
            () =>
                markExistingHeroMedia(
                    hero
                ),
            {
                once:
                    true
            }
        );
    }


    if (
        D.readyState ===
        "loading"
    ) {

        D.addEventListener(
            "DOMContentLoaded",
            install,
            {
                once:
                    true
            }
        );

    } else {

        install();
    }

})();