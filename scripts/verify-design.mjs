import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const pages = [
  "index.html",
  "services/index.html",
  "websites/index.html",
  "about/index.html",
  "founders/index.html",
  "partners/index.html",
  "contact/index.html",
  "courses/index.html",
  "courses/ai-engineering/index.html",
  "private-access/index.html",
  "admin/index.html",
];
const errors = [];
const tracked = new Set(execFileSync("git", ["ls-files"], { encoding: "utf8" }).split(/\r?\n/));
const publicPages = pages.filter(page => page !== "admin/index.html");
let referenceHeader = "";
let referenceFooter = "";

function normalize(markup) {
  return markup.replace(/\s+/g, " ").trim();
}

function trackedAssetExists(urlPath, page = "") {
  const raw = decodeURIComponent(urlPath.split(/[?#]/, 1)[0]);
  const clean = raw.startsWith("/") ? raw.replace(/^\/+/, "") : path.posix.join(path.posix.dirname(page), raw);
  const candidates = [clean, `${clean.replace(/\/$/, "")}/index.html`];
  return candidates.some(candidate => fs.existsSync(candidate) || tracked.has(candidate));
}

for (const page of pages) {
  if (!fs.existsSync(page)) {
    errors.push(`Missing page: ${page}`);
    continue;
  }
  const html = fs.readFileSync(page, "utf8");
  if (/<style(?:\s|>)/i.test(html)) errors.push(`Inline <style> element found in ${page}`);
  if (!html.includes("/assets/css/app-v2.css") || !html.includes("/assets/js/app-v2.js")) {
    errors.push(`${page} must load shared app-v2.css and app-v2.js`);
  }
  if (/\b(?:jungle|forest|nature)\b/i.test(html)) errors.push(`Legacy nature reference found in ${page}`);

  for (const video of html.match(/<video\b[^>]*>/gi) ?? []) {
    if (/\bcontrols\b/i.test(video)) errors.push(`Native video controls found in ${page}: ${video}`);
    for (const attribute of ["autoplay", "loop", "muted", "playsinline"]) {
      if (!new RegExp(`\\b${attribute}\\b`, "i").test(video)) errors.push(`Video missing ${attribute} in ${page}: ${video}`);
    }
  }

  for (const match of html.matchAll(/\b(?:src|poster|href|data-src|data-poster)\s*=\s*["']([^"']+)["']/gi)) {
    const value = match[1];
    if (/^(?:[a-z]+:|#|data:|\/\/)/i.test(value)) continue;
    if (value.startsWith("/_vercel/")) continue;
    if (/\.(?:mp4|webm|mov|png|jpe?g|webp|svg|gif|woff2?|css|js)(?:[?#]|$)/i.test(value) && !trackedAssetExists(value, page)) {
      errors.push(`Referenced local asset is not present or tracked: ${value} in ${page}`);
    }
  }

  if (page === "admin/index.html") {
    if (!html.includes("site-header-slot") || !html.includes("site-footer-slot")) errors.push("Admin must render the shared shell slots");
    continue;
  }

  const header = normalize(html.match(/<header\b[\s\S]*?<\/header>/i)?.[0] ?? "");
  const footer = normalize(html.match(/<footer\b[\s\S]*?<\/footer>/i)?.[0] ?? "");
  if (!header) errors.push(`Missing shared header in ${page}`);
  if (!footer) errors.push(`Missing shared footer in ${page}`);
  if (!referenceHeader && header) referenceHeader = header;
  else if (header && header !== referenceHeader) errors.push(`Header markup mismatch in ${page}`);
  if (!referenceFooter && footer) referenceFooter = footer;
  else if (footer && footer !== referenceFooter) errors.push(`Footer markup mismatch in ${page}`);
}

if (referenceHeader && !referenceHeader.includes("/private-access/")) errors.push("Shared header is missing Private Access");
if (referenceHeader && referenceHeader.includes("/courses/")) errors.push("Courses must stay out of the header");
if (referenceFooter && (!referenceFooter.includes("Academy") || !referenceFooter.includes("/courses/"))) errors.push("Shared footer is missing its Academy group");
if (referenceFooter && (!referenceFooter.includes("/admin/") || !referenceFooter.includes("/private-access/"))) errors.push("Shared footer must link to both portals");

const privatePage = fs.readFileSync("private-access/index.html", "utf8");
for (const id of ["z7HubClientId", "z7HubAccessKey", "z7HubLoginMessage"]) {
  if (!privatePage.includes(`id="${id}"`)) errors.push(`Private Access auth hook was removed: ${id}`);
}
const adminShell = fs.readFileSync("admin/site-shell.js", "utf8");
if (!adminShell.includes("/assets/css/core-system.css")) errors.push("Admin shell must load the shared core CSS");
const generatedVideoCode = fs.readFileSync("assets/js/home-content.js", "utf8");
if (!generatedVideoCode.includes('video.setAttribute("autoplay"') || !generatedVideoCode.includes('video.setAttribute("playsinline"') || !generatedVideoCode.includes('video.removeAttribute("controls")')) {
  errors.push("Generated homepage videos must autoplay, loop, stay inline, muted, and hide native controls");
}
for (const match of generatedVideoCode.matchAll(/["']((?:\/?(?:assets|media))\/[^"']+)["']/g)) {
  const value = match[1];
  if (/\.(?:mp4|webm|mov|png|jpe?g|webp|svg)(?:[?#]|$)/i.test(value) && !trackedAssetExists(value)) {
    errors.push(`Generated homepage media is not present or tracked: ${value}`);
  }
}
const motionCode = fs.readFileSync("assets/js/core-motion.js", "utf8");
if (/pin\s*:\s*true/.test(motionCode)) errors.push("Unexpected ScrollTrigger pin remains in the shared motion engine");

if (errors.length) {
  console.error(`DESIGN VERIFICATION FAILED:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log("ALL DESIGN CHECKS PASSED!");
