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
  for (const token of ['#hero-constellation', '.hero-bento-tile', '.service-card:hover', '.home-showcase__lane', '.z7-loader__count::after']) {
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
    const bentoTiles = (html.match(/data-hero-bento/g) || []).length;
    if (!html.includes('id="hero-constellation"') || bentoTiles < 3) errors.push(`Home hero must contain its live constellation canvas and three rendered Bento video tiles`);
    if ((html.match(/class="service-card/g) || []).length < 5) errors.push(`Home must contain the five actual interactive service tiles`);
    if (!html.includes('id="homeVideoRail"')) errors.push(`Home must include the live film-strip mount point`);
  }
  if (/jungle|forest/i.test(html)) errors.push(`Forbidden legacy jungle video reference in ${page}`);
  const videos = html.match(/<video[^>]*>/gi) || [];
  for (const video of videos) {
    if (/\bcontrols\b/i.test(video)) errors.push(`Native video controls forbidden in ${page}`);
    for (const attr of ['autoplay', 'loop', 'muted', 'playsinline']) {
      if (!new RegExp(`\\b${attr}\\b`, 'i').test(video)) errors.push(`Video in ${page} missing required attribute: ${attr}`);
    }
  }

  if (publicPages.includes(page)) {
    const header = html.match(/<header[\s\S]*?<\/header>/i)?.[0]?.replace(/\s+/g, ' ').trim();
    const footer = html.match(/<footer[\s\S]*?<\/footer>/i)?.[0]?.replace(/\s+/g, ' ').trim();
    const hero = html.match(/<section[^>]*data-hero-variant="([^"]+)"[\s\S]*?<\/section>/i);
    if (!header) errors.push(`Missing <header> in ${page}`);
    if (!footer) errors.push(`Missing <footer> in ${page}`);
    if (!hero) errors.push(`Page ${page} must have a bespoke hero section with unique data-hero-variant="<variant-name>"`);
    else heroSignatures.add(hero[1]);
    if (!refHeader && header) refHeader = header;
    else if (header && header !== refHeader) errors.push(`Header mismatch in ${page}`);
    if (!refFooter && footer) refFooter = footer;
    else if (footer && footer !== refFooter) errors.push(`Footer mismatch in ${page}`);
  }
}

if (heroSignatures.size < publicPages.length) errors.push(`Each public page must have its own unique bespoke hero variant (found ${heroSignatures.size} unique variants for ${publicPages.length} pages)`);
if (refHeader && (refHeader.includes('/courses/') || !refHeader.includes('/private-access/'))) errors.push(`Header must include /private-access/ and must NOT include /courses/`);
if (refFooter && (!refFooter.includes('Academy') || !refFooter.includes('/admin/') || !refFooter.includes('/private-access/'))) errors.push(`Footer must include independent Academy column + direct links to /admin/ and /private-access/`);

if (errors.length > 0) {
  console.error('❌ AWARD DESIGN AUDIT FAILED:\n- ' + errors.join('\n- '));
  process.exit(1);
}
console.log('✅ ALL AWARD-WINNING DESIGN & MOTION CHECKS PASSED!');
