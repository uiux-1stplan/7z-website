import fs from 'node:fs';

const publicPages = [
  'index.html',
  'services/index.html',
  'websites/index.html',
  'about/index.html',
  'founders/index.html',
  'partners/index.html',
  'contact/index.html',
  'courses/index.html',
  'courses/ai-engineering/index.html'
];

const systemPages = ['private-access/index.html', 'admin/index.html'];
const allPages = [...publicPages, ...systemPages];
const academyPages = ['courses/index.html', 'courses/ai-engineering/index.html'];
let errors = [];
let refHeader = null;
let refFooter = null;
let heroSignatures = new Set();

const cssPath = 'assets/css/app-v2.css';
if (!fs.existsSync(cssPath)) {
  errors.push(`Missing unified stylesheet: ${cssPath}`);
} else {
  const css = fs.readFileSync(cssPath, 'utf8');
  if (/border-radius\s*:\s*0(px|rem|em|%)?\s*;/i.test(css)) {
    errors.push(`Forbidden sharp corners (border-radius: 0) found in ${cssPath}`);
  }
  if (!css.includes('[data-theme="light"]') || !css.includes('[data-theme="dark"]')) {
    errors.push(`Both [data-theme="dark"] and [data-theme="light"] tokens must be fully defined in ${cssPath}`);
  }
  for (const token of ['#hero-constellation', '.home-metrics', '.service-card:hover', '.home-showcase__lane', '.z7-loader__count::after']) {
    if (!css.includes(token)) errors.push(`Missing implemented visual system selector in ${cssPath}: ${token}`);
  }
  if (!/radial-gradient\(450px circle at var\(--mouse-x/.test(css)) {
    errors.push(`Spotlight must use a visible pointer-following radial field in ${cssPath}`);
  }
  if (!css.includes('--mouse-x') || !css.includes('--mouse-y')) {
    errors.push(`Missing interactive cursor spotlight CSS variables (--mouse-x, --mouse-y) in ${cssPath}`);
  }
}

const jsPath = 'assets/js/app-v2.js';
if (!fs.existsSync(jsPath)) {
  errors.push(`Missing unified motion engine: ${jsPath}`);
} else {
  const js = fs.readFileSync(jsPath, 'utf8');
  for (const token of ['Lenis', 'ScrollTrigger', 'gsap', 'localStorage', 'data-theme', 'initConstellation', 'bindHeroStage', 'animateFilmLanes', 'scrub: .5']) {
    if (!js.includes(token)) errors.push(`Motion engine ${jsPath} is missing required interactive implementation for: ${token}`);
  }
}

for (const page of allPages) {
  if (!fs.existsSync(page)) {
    errors.push(`Missing page file: ${page}`);
    continue;
  }
  const html = fs.readFileSync(page, 'utf8');
  if (/<style[\s>]/i.test(html)) errors.push(`Forbidden inline <style> in ${page} — all styles must live in ${cssPath}`);
  if (page === 'index.html') {
    if (!html.includes('id="hero-constellation"') || !html.includes('class="home-metrics"')) errors.push(`Home must contain the live text hero and capability metrics`);
    const heroHtml = html.match(/<section class="logo-hero"[\s\S]*?<\/section>/)?.[0] || '';
    if (/logo-hero__reel/.test(heroHtml) || !heroHtml.includes('data-seamless-backdrop')) errors.push(`Home hero must use a background reel without a video container`);
    if (html.includes('data-follow-preview')) errors.push('Home services must not use a hover video preview');
    if ((html.match(/class="service-card/g) || []).length < 5) errors.push(`Home must contain the five actual interactive service tiles`);
    if (!html.includes('id="homeVideoRail"')) errors.push(`Home must include the live film-strip mount point`);
  }
  if (!html.includes('/assets/brand/7Z-LogoT(3).png') || html.includes('/assets/brand/7z-official.png')) errors.push(`Old or missing logo reference in ${page}`);
  if (page === 'services/index.html' && !html.includes('class="comparison-stage before-after"')) errors.push('Services before-after slider missing');
  if (page === 'websites/index.html') {
    if (!html.includes('class="website-work__media device-showcase"')) errors.push('Websites device showcase missing');
    for (const project of ['ERCAN','ELCON Arabia','Smile Care']) if (!html.includes(project)) errors.push(`Websites project missing: ${project}`);
  }
  if (/jungle|forest/i.test(html)) errors.push(`Forbidden legacy jungle video reference in ${page}`);
  const videos = html.match(/<video[^>]*>/gi) || [];
  for (const video of videos) {
    if (/\bcontrols\b/i.test(video)) errors.push(`Native video controls forbidden in ${page}`);
    for (const attr of ['autoplay', 'loop', 'muted', 'playsinline']) {
      if (!new RegExp(`\\b${attr}\\b`, 'i').test(video)) errors.push(`Video in ${page} missing required attribute: ${attr}`);
    }
  }

  {
    const header = html.match(/<header[\s\S]*?<\/header>/i)?.[0]?.replace(/\s+/g, ' ').trim();
    const footer = html.match(/<footer[\s\S]*?<\/footer>/i)?.[0]?.replace(/\s+/g, ' ').trim();
    const hero = html.match(/<section[^>]*data-hero-variant="([^"]+)"[\s\S]*?<\/section>/i);
    if (!header && !academyPages.includes(page)) errors.push(`Missing <header> in ${page}`);
    if (header && academyPages.includes(page)) errors.push(`Academy should have a focused local navigation, not the public header in ${page}`);
    if (!footer) errors.push(`Missing <footer> in ${page}`);
    if (!hero && publicPages.includes(page) && !academyPages.includes(page)) errors.push(`Page ${page} must have a bespoke hero section with unique data-hero-variant="<variant-name>"`);
    if (hero && publicPages.includes(page)) heroSignatures.add(hero[1]);
    if (!refHeader && header) refHeader = header;
    else if (header && header !== refHeader) errors.push(`Header mismatch in ${page}`);
    if (!refFooter && footer) refFooter = footer;
    else if (footer && footer !== refFooter) errors.push(`Footer mismatch in ${page}`);
  }
}

for (const path of ['admin/admin.css','assets/css/private-access-control.css','founders/index.html']) {
  const source = fs.readFileSync(path, 'utf8');
  if (/(?:#000(?:000)?|#111(?:111)?)(?![0-9a-f])/i.test(source)) errors.push(`Hardcoded black in ${path}`);
}
const themeCss = fs.readFileSync(cssPath, 'utf8');
if (!themeCss.includes('html[data-z7-core][data-theme="light"] .z7p-partner__media img')) errors.push('Light partner logo contrast rule missing');

if (heroSignatures.size < publicPages.length - academyPages.length) errors.push(`Each non-academy public page must have a bespoke hero variant`);
if (refHeader && (refHeader.includes('/courses/') || !refHeader.includes('/private-access/'))) errors.push(`Header must include /private-access/ and must NOT include /courses/`);
if (refFooter && (!refFooter.includes('Academy') || !refFooter.includes('/admin/') || !refFooter.includes('/private-access/'))) errors.push(`Footer must include independent Academy column + direct links to /admin/ and /private-access/`);
for (const [name,href] of [['Facebook','https://web.facebook.com/7z.magic'],['Instagram','https://www.instagram.com/7z.magic'],['WhatsApp','https://wa.me/962797020089'],['Email','mailto:creative@7z-magic.com']]) {
  if (!refHeader?.includes(href) || !refFooter?.includes(href)) errors.push(`Shared header/footer missing ${name}`);
}

if (errors.length > 0) {
  console.error('❌ AWARD DESIGN AUDIT FAILED:\n- ' + errors.join('\n- '));
  process.exit(1);
}
console.log('✅ ALL AWARD-WINNING DESIGN & MOTION CHECKS PASSED!');
