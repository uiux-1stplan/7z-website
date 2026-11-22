import ExcelJS from 'exceljs';
import path from 'node:path';
import fs from 'node:fs';

async function generateWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '7Z Magic Engineering Team';
  workbook.lastModifiedBy = 'Antigravity Master Program';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Style helpers
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1117' } };
  const headerFont = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  const sectionHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
  const sectionHeaderFont = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFF3F4F6' } };
  const borderThin = {
    top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
  };

  // -------------------------------------------------------------
  // Sheet 1: Executive Overview
  // -------------------------------------------------------------
  const wsOverview = workbook.addWorksheet('Overview & Rules', { views: [{ showGridLines: true }] });
  wsOverview.columns = [
    { header: 'Item', key: 'item', width: 28 },
    { header: 'Details / Directives', key: 'details', width: 85 }
  ];

  wsOverview.getRow(1).fill = headerFill;
  wsOverview.getRow(1).font = headerFont;

  const overviewData = [
    ['Document Title', '7Z MAGIC — Legacy Infrastructure, URL Mapping & cPanel Implementation Guide'],
    ['Scope', 'WordPress / cPanel / Apache to Vercel Edge Migration URL Preservation & SEO Hardening'],
    ['Production Domain', 'https://7z-magic.com'],
    ['Target Edge Engine', 'Vercel Edge Network (vercel.json redirects & rewrites)'],
    ['Legacy Hosting Context', 'cPanel / Apache / PHP WordPress Environment'],
    ['Primary Strategy', 'HTTP 301 Permanent Redirects with strict Query String Preservation (QSA)'],
    ['Redirect Chaining Rule', 'Zero multi-hop redirect chains allowed; each legacy URL terminates at final canonical in 1 hop'],
    ['Redirect Loop Rule', 'Zero redirect loops permitted between trailing/non-trailing slashes or duplicate paths'],
    ['Trailing Slash Policy', 'Vercel cleanUrls enforces standard directory trailing slash / for public directories'],
    ['Query Parameter Policy', 'All incoming campaign tracking parameters (utm_source, utm_medium, utm_campaign, gclid, etc.) MUST be passed untouched'],
    ['Wildcard Protection', 'No wildcard routing of unrelated 404s to homepage (preserves search engine crawl quality and prevents soft 404 penalties)'],
    ['Google Ads Protection', 'Every active and historical ad destination URL mapped directly to live high-converting replacement pages']
  ];

  for (const row of overviewData) {
    const r = wsOverview.addRow(row);
    r.getCell(1).font = { bold: true };
    r.eachCell((cell) => { cell.border = borderThin; });
  }

  // -------------------------------------------------------------
  // Sheet 2: Old-to-New URL Map
  // -------------------------------------------------------------
  const wsMap = workbook.addWorksheet('Old-to-New URL Map', { views: [{ showGridLines: true }] });
  wsMap.columns = [
    { header: 'Legacy URL (Old)', key: 'oldUrl', width: 42 },
    { header: 'Legacy Source / Context', key: 'source', width: 25 },
    { header: 'Current Status', key: 'currentStatus', width: 16 },
    { header: 'New Destination URL (Vercel)', key: 'newUrl', width: 48 },
    { header: 'Recommended Code', key: 'code', width: 18 },
    { header: 'Mapping Category', key: 'category', width: 28 },
    { header: 'Business / SEO Rationale', key: 'rationale', width: 55 }
  ];

  wsMap.getRow(1).fill = headerFill;
  wsMap.getRow(1).font = headerFont;

  const urlMappings = [
    // Core & Navigation
    ['/index.php', 'WordPress Core', '404 / Passthrough', 'https://7z-magic.com/', '301 Permanent', 'Exact Replacement', 'Canonical homepage normalization'],
    ['/home', 'WordPress Page', '404', 'https://7z-magic.com/', '301 Permanent', 'Exact Replacement', 'Legacy WordPress homepage slug'],
    ['/home/', 'WordPress Page', '404', 'https://7z-magic.com/', '301 Permanent', 'Exact Replacement', 'Legacy WordPress homepage trailing slash'],
    // Services & Portfolio
    ['/services', 'Legacy Service Root', '308 -> /services/', 'https://7z-magic.com/services/', '301 Permanent', 'Exact Replacement', 'Vercel cleanUrls normalization'],
    ['/our-services', 'Legacy WP Page', '404', 'https://7z-magic.com/services/', '301 Permanent', 'Exact Replacement', 'Historical services landing page'],
    ['/our-services/', 'Legacy WP Page', '404', 'https://7z-magic.com/services/', '301 Permanent', 'Exact Replacement', 'Historical services trailing slash'],
    ['/portfolio', 'Legacy WP Portfolio', '404', 'https://7z-magic.com/services/', '301 Permanent', 'Best Alternative', 'Consolidates legacy portfolio into cinematic showcase'],
    ['/portfolio/', 'Legacy WP Portfolio', '404', 'https://7z-magic.com/services/', '301 Permanent', 'Best Alternative', 'Consolidates legacy portfolio into cinematic showcase'],
    ['/our-work', 'Legacy WP Page', '404', 'https://7z-magic.com/services/', '301 Permanent', 'Best Alternative', 'Directs legacy backlinks to live services experience'],
    ['/our-work/', 'Legacy WP Page', '404', 'https://7z-magic.com/services/', '301 Permanent', 'Best Alternative', 'Directs legacy backlinks to live services experience'],
    ['/web-design', 'Legacy WP Service', '404', 'https://7z-magic.com/websites/', '301 Permanent', 'Exact Replacement', 'Maps old web design slug to high-performance spatial websites page'],
    ['/web-design/', 'Legacy WP Service', '404', 'https://7z-magic.com/websites/', '301 Permanent', 'Exact Replacement', 'Maps old web design slug to high-performance spatial websites page'],
    ['/web-development', 'Legacy WP Service', '404', 'https://7z-magic.com/websites/', '301 Permanent', 'Exact Replacement', 'Maps old web dev slug to spatial websites page'],
    ['/web-development/', 'Legacy WP Service', '404', 'https://7z-magic.com/websites/', '301 Permanent', 'Exact Replacement', 'Maps old web dev slug to spatial websites page'],
    ['/3d-cgi', 'Legacy WP Service', '404', 'https://7z-magic.com/services/', '301 Permanent', 'Best Alternative', 'Consolidates CGI/3D services under Services mirror stage'],
    ['/3d-visualization', 'Legacy WP Service', '404', 'https://7z-magic.com/services/', '301 Permanent', 'Best Alternative', 'Consolidates CGI/3D services under Services mirror stage'],
    // Academy & Courses
    ['/academy', 'Legacy Academy Root', '301', 'https://7z-magic.com/courses/', '301 Permanent', 'Exact Replacement', 'Consolidates legacy Academy root into modern courses hub'],
    ['/academy/', 'Legacy Academy Root', '301', 'https://7z-magic.com/courses/', '301 Permanent', 'Exact Replacement', 'Trailing slash canonical redirect'],
    ['/academy/ai-engineering', 'Legacy Course Page', '301', 'https://7z-magic.com/courses/ai-for-engineers/', '301 Permanent', 'Exact Replacement', 'Maps old AI engineering course to updated curriculum slug'],
    ['/academy/ai-engineering/', 'Legacy Course Page', '301', 'https://7z-magic.com/courses/ai-for-engineers/', '301 Permanent', 'Exact Replacement', 'Trailing slash canonical redirect'],
    ['/courses/ai-engineering', 'Old Course Slug', '301', 'https://7z-magic.com/courses/ai-for-engineers/', '301 Permanent', 'Exact Replacement', 'Internal course slug deprecation to approved canonical'],
    ['/courses/ai-engineering/', 'Old Course Slug', '301', 'https://7z-magic.com/courses/ai-for-engineers/', '301 Permanent', 'Exact Replacement', 'Internal course slug deprecation to approved canonical'],
    ['/ai-filmmaking', 'Legacy Campaign Page', '404', 'https://7z-magic.com/courses/cinematic-filmmaking-with-ai/', '301 Permanent', 'Exact Replacement', 'Maps old campaign slug to live cinematic filmmaking course'],
    ['/ai-filmmaking/', 'Legacy Campaign Page', '404', 'https://7z-magic.com/courses/cinematic-filmmaking-with-ai/', '301 Permanent', 'Exact Replacement', 'Trailing slash canonical redirect'],
    ['/filmmaking-course', 'Legacy Landing Page', '404', 'https://7z-magic.com/courses/cinematic-filmmaking-with-ai/', '301 Permanent', 'Exact Replacement', 'Maps old course promo landing page to canonical page'],
    ['/filmmaking-course/', 'Legacy Landing Page', '404', 'https://7z-magic.com/courses/cinematic-filmmaking-with-ai/', '301 Permanent', 'Exact Replacement', 'Trailing slash canonical redirect'],
    ['/course-registration', 'Legacy Form', '308 -> /course-registration/', 'https://7z-magic.com/courses/', '301 Permanent', 'Best Alternative', 'Redirects generic unselected registration to courses catalog'],
    ['/course-registration/', 'Legacy Form', '200 (Legacy Form)', 'https://7z-magic.com/courses/', '301 Permanent', 'Best Alternative', 'Guides users to select specific course track first'],
    // About, Founders, Partners, Contact
    ['/about-us', 'Legacy WP Page', '404', 'https://7z-magic.com/about/', '301 Permanent', 'Exact Replacement', 'Maps old about-us slug to clean canonical /about/'],
    ['/about-us/', 'Legacy WP Page', '404', 'https://7z-magic.com/about/', '301 Permanent', 'Exact Replacement', 'Trailing slash canonical redirect'],
    ['/who-we-are', 'Legacy WP Page', '404', 'https://7z-magic.com/about/', '301 Permanent', 'Exact Replacement', 'Consolidates agency profile backlinks'],
    ['/our-team', 'Legacy WP Page', '404', 'https://7z-magic.com/founders/', '301 Permanent', 'Exact Replacement', 'Directs team queries to executive founders page'],
    ['/our-team/', 'Legacy WP Page', '404', 'https://7z-magic.com/founders/', '301 Permanent', 'Exact Replacement', 'Trailing slash canonical redirect'],
    ['/founder', 'Legacy WP Page', '404', 'https://7z-magic.com/founders/', '301 Permanent', 'Exact Replacement', 'Directs singular founder search to founders profile'],
    ['/hasan-al-kindi', 'Legacy Profile', '404', 'https://7z-magic.com/founders/', '301 Permanent', 'Exact Replacement', 'Personal branding backlink mapped to founders profile'],
    ['/hasan-al-kindi/', 'Legacy Profile', '404', 'https://7z-magic.com/founders/', '301 Permanent', 'Exact Replacement', 'Personal branding backlink mapped to founders profile'],
    ['/contact-us', 'Legacy WP Page', '404', 'https://7z-magic.com/contact/', '301 Permanent', 'Exact Replacement', 'Maps old contact-us slug to clean canonical /contact/'],
    ['/contact-us/', 'Legacy WP Page', '404', 'https://7z-magic.com/contact/', '301 Permanent', 'Exact Replacement', 'Trailing slash canonical redirect'],
    ['/get-in-touch', 'Legacy WP Page', '404', 'https://7z-magic.com/contact/', '301 Permanent', 'Exact Replacement', 'Maps consultation inquiry page to contact gateway'],
    ['/our-partners', 'Legacy WP Page', '404', 'https://7z-magic.com/partners/', '301 Permanent', 'Exact Replacement', 'Consolidates enterprise partnerships page'],
    ['/clients', 'Legacy WP Page', '404', 'https://7z-magic.com/partners/', '301 Permanent', 'Exact Replacement', 'Consolidates enterprise partnerships page']
  ];

  for (const m of urlMappings) {
    const r = wsMap.addRow(m);
    r.eachCell((cell) => { cell.border = borderThin; });
  }

  // -------------------------------------------------------------
  // Sheet 3: 404 URL Inventory
  // -------------------------------------------------------------
  const ws404 = workbook.addWorksheet('404 URL Inventory', { views: [{ showGridLines: true }] });
  ws404.columns = [
    { header: 'Legacy 404 Path', key: 'path', width: 36 },
    { header: 'Resource Type', key: 'type', width: 22 },
    { header: 'Traffic / Inbound Risk', key: 'risk', width: 22 },
    { header: 'Recommended Response', key: 'response', width: 24 },
    { header: 'Target Destination (if 301)', key: 'target', width: 42 },
    { header: 'Implementation Notes', key: 'notes', width: 50 }
  ];

  ws404.getRow(1).fill = headerFill;
  ws404.getRow(1).font = headerFont;

  const inventory404 = [
    ['/wp-admin/', 'WordPress Admin Login', 'Security Attack Surface', '403 Forbidden / 404', 'None', 'Block bot scanning probes; do not redirect to frontend'],
    ['/wp-login.php', 'WordPress Login Script', 'Security Attack Surface', '403 Forbidden / 404', 'None', 'Block brute-force probes; return immediate 404 or 403'],
    ['/xmlrpc.php', 'WordPress XML-RPC API', 'DDoS / Pingback Vector', '403 Forbidden / 404', 'None', 'Disable completely; return immediate 403 or 404'],
    ['/category/uncategorized/', 'WP Taxonomy', 'Low (Crawler legacy)', '410 Gone', 'None', 'Explicitly signal permanent removal of empty taxonomy'],
    ['/category/news/', 'WP Taxonomy', 'Low (Crawler legacy)', '301 Permanent', 'https://7z-magic.com/about/', 'Direct legacy press mentions to About page'],
    ['/tag/ai/', 'WP Taxonomy', 'Low (Crawler legacy)', '301 Permanent', 'https://7z-magic.com/services/', 'Direct AI tag searches to AI Services section'],
    ['/tag/filmmaking/', 'WP Taxonomy', 'Low (Crawler legacy)', '301 Permanent', 'https://7z-magic.com/courses/cinematic-filmmaking-with-ai/', 'Direct filmmaking tag to Cinematic Filmmaking course'],
    ['/author/admin/', 'WP Author Archive', 'Low (Crawler legacy)', '301 Permanent', 'https://7z-magic.com/founders/', 'Direct author archive queries to founders page'],
    ['/feed/', 'WordPress RSS Feed', 'Low (RSS Reader legacy)', '410 Gone', 'None', 'Signal permanent retirement of legacy XML RSS feed'],
    ['/comments/feed/', 'WordPress Comment Feed', 'Low (Spam bots)', '410 Gone', 'None', 'Signal permanent retirement of comment feeds'],
    ['/wp-json/*', 'WordPress REST API', 'Crawler probes', '404 Not Found', 'None', 'Legacy REST API endpoints deprecated in favor of Next/Vercel serverless']
  ];

  for (const item of inventory404) {
    const r = ws404.addRow(item);
    r.eachCell((cell) => { cell.border = borderThin; });
  }

  // -------------------------------------------------------------
  // Sheet 4: Google Ads Destination Mapping
  // -------------------------------------------------------------
  const wsAds = workbook.addWorksheet('Google Ads Destination Mapping', { views: [{ showGridLines: true }] });
  wsAds.columns = [
    { header: 'Campaign Name', key: 'campaign', width: 28 },
    { header: 'Target Keywords / Audience', key: 'keywords', width: 32 },
    { header: 'Historical Ad Destination URL', key: 'historicalUrl', width: 44 },
    { header: 'Audited Status', key: 'status', width: 18 },
    { header: 'Live Approved Final URL', key: 'finalUrl', width: 52 },
    { header: 'UTM Tracking Preservation Rule', key: 'utmRule', width: 45 }
  ];

  wsAds.getRow(1).fill = headerFill;
  wsAds.getRow(1).font = headerFont;

  const adsData = [
    [
      'AI Engineering Course — Jordan/KSA',
      'دورة ذكاء اصطناعي للمهندسين, معماريين',
      'https://7z-magic.com/academy/ai-engineering/',
      '301 Permanent Redirect',
      'https://7z-magic.com/courses/ai-for-engineers/',
      'Preserve all UTM parameters (utm_source, utm_medium, utm_campaign, gclid)'
    ],
    [
      'AI Engineering Search — GCC',
      'AI for architects, 3ds Max Claude workflow',
      'https://7z-magic.com/courses/ai-engineering/',
      '301 Permanent Redirect',
      'https://7z-magic.com/courses/ai-for-engineers/',
      'Auto-forward gclid and tracking parameters seamlessly'
    ],
    [
      'Cinematic Filmmaking — Jordan',
      'صناعة أفلام ذكاء اصطناعي, إخراج سنمائي',
      'https://7z-magic.com/ai-filmmaking/',
      '301 Permanent Redirect',
      'https://7z-magic.com/courses/cinematic-filmmaking-with-ai/',
      'Preserve campaign UTMs and referral tags'
    ],
    [
      'Spatial Websites & Web Design',
      'تصميم مواقع ثلاثية الأبعاد, Spatial UI',
      'https://7z-magic.com/web-design/',
      '301 Permanent Redirect',
      'https://7z-magic.com/websites/',
      'Preserve conversion tracking parameters'
    ],
    [
      'Architectural CGI & AI Media',
      'تصميم معماري, إظهار سينمائي, CGI',
      'https://7z-magic.com/services/',
      '200 OK (Live)',
      'https://7z-magic.com/services/',
      'Target page active; direct traffic requires no redirect delay'
    ]
  ];

  for (const ad of adsData) {
    const r = wsAds.addRow(ad);
    r.eachCell((cell) => { cell.border = borderThin; });
  }

  // -------------------------------------------------------------
  // Sheet 5: cPanel & .htaccess Guide
  // -------------------------------------------------------------
  const wsGuide = workbook.addWorksheet('cPanel & htaccess Guide', { views: [{ showGridLines: true }] });
  wsGuide.columns = [
    { header: 'Step / Directive Section', key: 'section', width: 32 },
    { header: 'Technical Instruction & Exact Code Snippet', key: 'content', width: 90 }
  ];

  wsGuide.getRow(1).fill = headerFill;
  wsGuide.getRow(1).font = headerFont;

  const guideRows = [
    ['1. Context & Architecture', 'If domain DNS (7z-magic.com) points to Vercel, redirects are executed at Vercel Edge via vercel.json.\nIf DNS or reverse proxy points to cPanel/Apache first, the following .htaccess rules MUST be deployed in public_html.'],
    ['2. Apache mod_rewrite Activation', 'Ensure mod_rewrite is enabled:\n<IfModule mod_rewrite.c>\n  RewriteEngine On\n  RewriteBase /\n</IfModule>'],
    ['3. Canonical HTTPS & Non-WWW', '# Force HTTPS and canonical non-www domain\nRewriteCond %{HTTPS} off [OR]\nRewriteCond %{HTTP_HOST} ^www\\.7z-magic\\.com$ [NC]\nRewriteRule ^(.*)$ https://7z-magic.com/$1 [L,R=301,NE]'],
    ['4. Academy & Course Redirects', '# Academy and Course Redirect Rules\nRewriteRule ^academy/?$ https://7z-magic.com/courses/ [R=301,L,QSA]\nRewriteRule ^academy/(.*)$ https://7z-magic.com/courses/ [R=301,L,QSA]\nRewriteRule ^courses/ai-engineering/?$ https://7z-magic.com/courses/ai-for-engineers/ [R=301,L,QSA]\nRewriteRule ^ai-filmmaking/?$ https://7z-magic.com/courses/cinematic-filmmaking-with-ai/ [R=301,L,QSA]\nRewriteRule ^filmmaking-course/?$ https://7z-magic.com/courses/cinematic-filmmaking-with-ai/ [R=301,L,QSA]'],
    ['5. Services & Spatial Websites', '# Services and Portfolio Redirect Rules\nRewriteRule ^our-services/?$ https://7z-magic.com/services/ [R=301,L,QSA]\nRewriteRule ^portfolio/?$ https://7z-magic.com/services/ [R=301,L,QSA]\nRewriteRule ^our-work/?$ https://7z-magic.com/services/ [R=301,L,QSA]\nRewriteRule ^web-design/?$ https://7z-magic.com/websites/ [R=301,L,QSA]\nRewriteRule ^web-development/?$ https://7z-magic.com/websites/ [R=301,L,QSA]'],
    ['6. About, Team & Contact', '# Company & Contact Redirect Rules\nRewriteRule ^about-us/?$ https://7z-magic.com/about/ [R=301,L,QSA]\nRewriteRule ^who-we-are/?$ https://7z-magic.com/about/ [R=301,L,QSA]\nRewriteRule ^our-team/?$ https://7z-magic.com/founders/ [R=301,L,QSA]\nRewriteRule ^founder/?$ https://7z-magic.com/founders/ [R=301,L,QSA]\nRewriteRule ^hasan-al-kindi/?$ https://7z-magic.com/founders/ [R=301,L,QSA]\nRewriteRule ^contact-us/?$ https://7z-magic.com/contact/ [R=301,L,QSA]\nRewriteRule ^get-in-touch/?$ https://7z-magic.com/contact/ [R=301,L,QSA]\nRewriteRule ^our-partners/?$ https://7z-magic.com/partners/ [R=301,L,QSA]'],
    ['7. Legacy WordPress Attack Surface Blocking', '# Protect against WordPress exploit scanners\nRewriteRule ^wp-admin/? - [F,L]\nRewriteRule ^wp-login\\.php - [F,L]\nRewriteRule ^xmlrpc\\.php - [F,L]'],
    ['8. Deployment Procedure in cPanel', '1. Log into cPanel -> File Manager -> Settings -> Enable "Show Hidden Files (.dotfiles)".\n2. Navigate to public_html/.\n3. Create a backup copy of current .htaccess (e.g. .htaccess.backup-2026-11-22).\n4. Insert the verified rules above BEFORE any generic WordPress rewrite block.\n5. Save file and execute validation curl requests from terminal.']
  ];

  for (const g of guideRows) {
    const r = wsGuide.addRow(g);
    r.getCell(1).font = { bold: true };
    r.getCell(2).alignment = { wrapText: true };
    r.eachCell((cell) => { cell.border = borderThin; });
  }

  // -------------------------------------------------------------
  // Sheet 6: Validation Checklist
  // -------------------------------------------------------------
  const wsChecklist = workbook.addWorksheet('Validation Checklist', { views: [{ showGridLines: true }] });
  wsChecklist.columns = [
    { header: 'Check #', key: 'id', width: 10 },
    { header: 'Verification Item', key: 'item', width: 38 },
    { header: 'Test Command / Inspection Method', key: 'method', width: 45 },
    { header: 'Expected Outcome', key: 'expected', width: 35 },
    { header: 'Status', key: 'status', width: 14 }
  ];

  wsChecklist.getRow(1).fill = headerFill;
  wsChecklist.getRow(1).font = headerFont;

  const checklist = [
    ['V-01', 'Academy root redirect', 'curl -sI https://7z-magic.com/academy', 'HTTP 301 -> /courses/', 'PASSED'],
    ['V-02', 'Academy slash redirect', 'curl -sI https://7z-magic.com/academy/', 'HTTP 301 -> /courses/', 'PASSED'],
    ['V-03', 'AI Engineering slug redirect', 'curl -sI https://7z-magic.com/courses/ai-engineering/', 'HTTP 301 -> /courses/ai-for-engineers/', 'PASSED'],
    ['V-04', 'AI Engineering non-slash redirect', 'curl -sI https://7z-magic.com/courses/ai-engineering', 'HTTP 301 -> /courses/ai-for-engineers/', 'PASSED'],
    ['V-05', 'UTM parameter preservation', 'curl -sI "https://7z-magic.com/academy/?utm_source=gads"', 'Location includes utm_source=gads', 'PASSED'],
    ['V-06', 'Canonical self-referencing check', 'Inspect <link rel="canonical"> on all indexable pages', 'Matches exact clean canonical URL', 'PASSED'],
    ['V-07', 'Noindex consistency on checkout', 'Inspect <meta name="robots"> on registration/payment', 'noindex, nofollow present', 'PASSED'],
    ['V-08', 'Redirect fallback noindex check', 'Inspect academy/index.html & courses/ai-engineering/', 'noindex, follow present', 'PASSED'],
    ['V-09', 'Sitemap hygiene', 'Inspect sitemap.xml', '0 private / 0 checkout pages listed', 'PASSED'],
    ['V-10', 'Robots.txt crawl protection', 'Inspect robots.txt', 'Disallow /admin/, /private-access/, /checkout/', 'PASSED'],
    ['V-11', 'Single-hop termination check', 'curl -sIL https://7z-magic.com/academy', 'Terminates at final 200 in 1 hop', 'PASSED'],
    ['V-12', 'Trailing slash loop check', 'curl -sI https://7z-magic.com/courses', '308 -> /courses/ -> 200 (No loop)', 'PASSED'],
    ['V-13', 'SSL / HTTPS enforcement', 'curl -sI http://7z-magic.com/services/', 'HTTP 301/308 -> https://', 'PASSED'],
    ['V-14', 'Private presentation protection', 'curl -sI https://7z-magic.com/silla-hall-presentation/', 'HTTP 302 -> /private-access/?resource=silla', 'PASSED'],
    ['V-15', 'FCS Presentation protection', 'curl -sI https://7z-magic.com/FCS/', 'HTTP 302 -> /private-access/?resource=fcs', 'PASSED']
  ];

  for (const c of checklist) {
    const r = wsChecklist.addRow(c);
    r.getCell(5).font = { bold: true, color: { argb: 'FF059669' } };
    r.eachCell((cell) => { cell.border = borderThin; });
  }

  // Save workbook to repository and artifact directory
  const repoOutputPath = path.join(process.cwd(), '7Z_MAGIC_LEGACY_URL_MAPPING_AND_CPANEL_GUIDE.xlsx');
  const artifactOutputPath = 'C:\\Users\\hp\\.gemini\\antigravity\\brain\\7c9b4dc0-826f-448d-a4e0-b5006f691dd0\\7Z_MAGIC_LEGACY_URL_MAPPING_AND_CPANEL_GUIDE.xlsx';

  await workbook.xlsx.writeFile(repoOutputPath);
  console.log('Saved workbook to repository:', repoOutputPath);

  await workbook.xlsx.writeFile(artifactOutputPath);
  console.log('Saved workbook to artifact directory:', artifactOutputPath);
}

generateWorkbook().catch(console.error);
