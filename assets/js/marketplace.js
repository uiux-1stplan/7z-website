/**
 * 7Z MAGIC DIGITAL MARKETPLACE & ACADEMY (/courses/)
 * Strict CSP-compliant external controller: zero inline scripts, zero inline event attributes.
 * Integrates USD canonical backend pricing, FX display converter (JOD = 0.708 / 2 decimals),
 * @vercel/blob transfer receipt uploads, Whop direct checkout, Waitlist & Lead Magnet persistence.
 */
(() => {
  "use strict";

  const OFFICIAL_WA_NUMBER = "962797020089";
  const WHOP_URLS = {
    storeMain: "https://whop.com/7z-magic/7z-magic-b0/",
    visualStorytellingBundle:
      "https://whop.com/7z-magic/7z-magic-visual-storytelling-library-5-practical-guides-english/",
    guides: {
      archMotion:
        "https://whop.com/7z-magic/architecture-in-motion-presenting-spaces-through-visual-storytelling-english/",
      brandContent:
        "https://whop.com/7z-magic/a-simple-guide-to-better-brand-content-english/",
      productReels:
        "https://whop.com/7z-magic/product-reels-that-sell-a-short-form-video-playbook-english/",
      brandWorkbook:
        "https://whop.com/7z-magic/the-small-brand-identity-workbook-english/",
      aiVisuals:
        "https://whop.com/7z-magic/ai-visuals-for-small-brands-a-practical-starter-guide/"
    },
    extra: [
      "https://whop.com/7z-magic/ace81d97-c3aa-4f95-af90-cf8bf278a8c8/",
      "https://whop.com/7z-magic/b4ab25ad-b0f1-4af6-8412-f8109e03c153/",
      "https://whop.com/7z-magic/a8031cac-2e08-40b0-b167-15bc50f469a8/",
      "https://whop.com/7z-magic/3683a83d-6ed7-4f86-900d-f1aa9e1c81f2/",
      "https://whop.com/7z-magic/2eed5665-77a7-416b-b40d-cf3c01165deb/"
    ]
  };

  const PRODUCT_META = {
    "ai-engineering": {
      id: "ai-engineering",
      priceUsd: 149,
      detailUrl: "/marketplace/ai-for-engineers/",
      whopUrl: WHOP_URLS.storeMain
    },
    "course-eng": {
      id: "ai-engineering",
      priceUsd: 149,
      detailUrl: "/marketplace/ai-for-engineers/",
      whopUrl: WHOP_URLS.storeMain
    },
    "cinematic-film": {
      id: "cinematic-film",
      priceUsd: 199,
      detailUrl: "/marketplace/cinematic-filmmaking-with-ai/",
      whopUrl: WHOP_URLS.storeMain
    },
    "course-film": {
      id: "cinematic-film",
      priceUsd: 199,
      detailUrl: "/marketplace/cinematic-filmmaking-with-ai/",
      whopUrl: WHOP_URLS.storeMain
    },
    "course-content": {
      id: "course-content",
      priceUsd: 129,
      whopUrl: WHOP_URLS.storeMain
    },
    "course-web": {
      id: "course-web",
      priceUsd: 159,
      whopUrl: WHOP_URLS.storeMain
    },
    "course-foundations": {
      id: "course-foundations",
      priceUsd: 35,
      bundleManualDelivery: true,
      whopUrl: WHOP_URLS.storeMain
    },
    "agent-editor": {
      id: "agent-editor",
      priceUsd: 49,
      whopUrl: WHOP_URLS.extra[0]
    },
    "agent-shorts": {
      id: "agent-shorts",
      priceUsd: 29,
      whopUrl: WHOP_URLS.extra[1]
    },
    "agent-prop": {
      id: "agent-prop",
      priceUsd: 69,
      whopUrl: WHOP_URLS.extra[2]
    },
    "digital-vault": {
      id: "digital-vault",
      priceUsd: 25,
      whopUrl: WHOP_URLS.storeMain
    },
    "skill-pack": {
      id: "skill-pack",
      priceUsd: 39,
      whopUrl: WHOP_URLS.extra[3]
    },
    "acc-fb-monetized": {
      id: "acc-fb-monetized",
      priceUsd: 0,
      isInquiry: true,
      whopUrl: WHOP_URLS.extra[4]
    },
    "acc-yt-monetized": {
      id: "acc-yt-monetized",
      priceUsd: 0,
      isInquiry: true,
      whopUrl: WHOP_URLS.storeMain
    },
    "acc-tt-monetized": {
      id: "acc-tt-monetized",
      priceUsd: 0,
      isInquiry: true,
      whopUrl: WHOP_URLS.storeMain
    }
  };

  // Multi-currency display converter (Canonical backend is always USD)
  const currencyConfig = {
    USD: { symbol: "$", rate: 1.0, prefix: true, decimals: 0, code: "USD", name: "US Dollar" },
    JOD: { symbol: " د.أ", rate: 0.708, prefix: false, decimals: 2, code: "JOD", name: "Jordanian Dinar" },
    SAR: { symbol: " ر.س", rate: 3.75, prefix: false, decimals: 0, code: "SAR", name: "Saudi Riyal" },
    AED: { symbol: " د.إ", rate: 3.6725, prefix: false, decimals: 0, code: "AED", name: "UAE Dirham" },
    QAR: { symbol: " ر.ق", rate: 3.64, prefix: false, decimals: 0, code: "QAR", name: "Qatari Riyal" },
    KWD: { symbol: " د.ك", rate: 0.308, prefix: false, decimals: 1, code: "KWD", name: "Kuwaiti Dinar" },
    BHD: { symbol: " د.ب", rate: 0.376, prefix: false, decimals: 1, code: "BHD", name: "Bahraini Dinar" },
    OMR: { symbol: " ر.ع", rate: 0.3845, prefix: false, decimals: 1, code: "OMR", name: "Omani Rial" },
    EGP: { symbol: " ج.م", rate: 49.5, prefix: false, decimals: 0, code: "EGP", name: "Egyptian Pound" },
    IQD: { symbol: " د.ع", rate: 1310, prefix: false, decimals: 0, code: "IQD", name: "Iraqi Dinar" },
    SYP: { symbol: " ل.س", rate: 13000, prefix: false, decimals: 0, code: "SYP", name: "Syrian Pound" },
    LBP: { symbol: " ل.ل", rate: 89500, prefix: false, decimals: 0, code: "LBP", name: "Lebanese Pound" }
  };

  const i18nData = {
    en: {
      ribbon_free_pdf_notice: "Free Video Creation Guide PDF link available at the bottom of the page",
      pdf_instant_note: "Instant email delivery upon quick registration",
      cat_all_mob: "All",
      cat_agents_mob: "Agents",
      cat_academy_mob: "Academy",
      cat_skills_mob: "Skills",
      cat_free_mob: "Free",
      badge_free_pdf: "100% Free · Direct PDF Guide",
      p14_title: "7Z AI Video Creation Handbook (PDF)",
      p14_desc:
        "A complete field guide for modern creators: reference-to-motion prompting, consistent character generation, multi-track CapCut assembly, and audio sync. Includes an exclusive 10% discount code (ENG7SANZ) on the AI for Architects & Engineers Masterclass.",
      btn_download_pdf: "Download Free PDF (4.7MB)",
      kinetic_prefix: "Architecting the Future with",
      sec2_badge: "Architectural Precision & Turnkey Automation",
      sec2_title_part1: "From Concept to Complete Execution",
      sec2_title_part2: "Accelerate Delivery 10X",
      sec2_desc:
        "Seven Z Studio bridges generative intelligence with rigorous production workflows. Deploy autonomous agents capable of 3D MAX modeling, AutoCAD detailing, and video post-production, or master these systems firsthand through our masterclasses.",
      bento_badge: "AUTONOMOUS SPATIAL CORE",
      bento_cta: "Request Preview",
      badge_new_release: "New 2026 Release",
      announcement_text: "Claim the Free 5000+ AI Prompt Vault for Architects, Creators & Builders today!",
      announcement_cta: "Download Free",
      brand_sub: "DIGITAL MARKETPLACE",
      nav_store: "Catalog (28)",
      nav_agents: "AI Agents",
      nav_academy: "Academy",
      nav_books: "Handbooks",
      nav_enterprise: "Custom Enterprise",
      nav_main_home: "Main Site ↗",
      btn_consult: "Book Advisory",
      hero_pill: "Autonomous AI Agents · Production Studio · Masterclasses",
      hero_subtitle:
        "Your unified ecosystem: acquire specialized AI agents that draft complete AutoCAD and 3D MAX architectural sets in minutes, automate video editing, or enroll in world-class AI cinema and software masterclasses.",
      hero_cta_browse: "Explore Digital Store & Agents",
      hero_cta_vault: "Free 5000+ AI Prompt Vault",
      metric_1: "Turnaround Speed",
      metric_2: "Guaranteed Delivery SLA",
      metric_3: "Cinema Color Science",
      metric_4: "Architects & Creators",
      floating_pill_title: "Autonomous Agents & Academy",
      floating_pill_sub: "1-Click Full Project Turnkey Delivery",
      view_agents_link: "Explore",
      store_badge: "Digital Marketplace & Solutions",
      store_title: "Explore Autonomous Tools & Courses",
      store_sub: "Filter by autonomous agents, professional certification masterclasses, or ready-to-install toolkits.",
      cat_all: "All Products",
      cat_agents: "Autonomous AI Agents",
      cat_academy: "Academy & Masterclasses",
      cat_skills: "Skill Packs & Books ($25)",
      cat_free: "Free Guides & Vault",
      cat_accounts: "Monetized Accounts",
      cat_accounts_mob: "Accounts",
      badge_verified_account: "Available · Verified Account",
      badge_mass_dist: "Mass Distribution · Available Now",
      price_vip_access: "VIP Early Access",
      price_waitlist_free: "Join Waitlist",
      price_per_account: "Price Per Account",
      price_per_channel: "Price Per Channel",
      price_custom_project: "Custom Project Pricing",
      price_contact_us: "Contact / Request Inventory",
      btn_inquire: "Inquire & Reserve ->",
      btn_start_campaign: "Start Campaign ->",
      p15_title: "Smart Camera Surveillance AI Agent",
      p15_desc:
        "Predictive theft detection for homes, villas, and gated compounds. AI analyzes camera feeds in real-time, detects suspicious behavior patterns, alerts security, and auto-logs incidents with evidence clips.",
      p15_f1: "Real-Time Analysis",
      p15_f2: "Theft Prediction",
      p15_f3: "Instant Alerts",
      p15_f4: "Evidence Clips",
      p16_title: "Autonomous YouTube Channel AI Agent",
      p16_desc:
        "Fully autonomous YouTube channel operator: creates content, edits and uploads videos, analyzes performance data, trains on what works, adapts strategy, and grows your channel without human intervention.",
      p16_f1: "Auto Content Creation",
      p16_f2: "Auto Upload & Schedule",
      p16_f3: "Analytics & Self-Training",
      p16_f4: "Strategy Adaptation",
      p17_title: "Facebook Monetized Accounts",
      p17_desc:
        "Fully verified Facebook accounts with Stars & in-stream ads monetization already activated. Ready to publish and earn from day one.",
      p18_title: "YouTube Monetized Channels",
      p18_desc:
        "YouTube Partner Program (YPP) enabled channels with 1,000+ subscribers and 4,000+ watch hours. Full monetization active — ready to upload and earn from day one.",
      p19_title: "TikTok Monetized Accounts",
      p19_desc:
        "TikTok Creator Fund & Series enabled aged accounts. Full monetization activated — ready to publish and earn immediately with an established audience base.",
      p20_title: "Mass Content Distribution Network",
      p20_desc:
        "Blast your content across 500 Facebook + 500 Instagram + 500 TikTok accounts simultaneously. Maximum organic reach, zero bottlenecks — 1,500 simultaneous posts in a single execution.",
      p20_f1: "1,500 Simultaneous Posts",
      p20_f2: "Maximum Organic Reach",
      p20_f3: "Zero Bottlenecks",
      p20_f4: "Custom Scheduling",
      badge_waitlist: "Coming Soon · VIP Early Access",
      badge_waitlist_short: "Coming Soon · Waitlist",
      badge_available: "Available Now",
      badge_top_demand: "Most Popular",
      badge_free_vault: "100% Free · Lead Magnet",
      badge_available_license: "Available · Full License",
      badge_academy_cert: "Certified Masterclass",
      badge_aces_cinema: "ACES Cinema Standard",
      badge_monetization: "Audience & Monetization",
      badge_fullstack: "Full-Stack AI Speed",
      early_access_sub: "Expected Launch Pricing",
      lifetime_perk: "(Lifetime 50% for VIPs)",
      btn_join_waitlist: "Join VIP Waitlist & Claim 50% ->",
      plan_monthly: "Monthly Subscription",
      btn_demo: "Order / Details ->",
      btn_start_now: "Start Converting ->",
      price_public: "Public Price",
      btn_instant_download: "Instant Free Download",
      license_onetime: "One-Time License",
      btn_get_tool: "Get License ->",
      vip_seats: "Limited Seats",
      btn_waitlist_action: "Join Waitlist ->",
      course_fee: "Enrollment Tuition",
      btn_details_enroll: "Register & Enroll ->",
      btn_full_syllabus: "Full Syllabus",
      bundle_all: "Full Suite",
      btn_whop_buy: "Instant Access on Whop ->",
      btn_toggle_guides: "View 5 Practical Guides on Whop",
      license_dev: "Developer License",
      btn_download_pack: "Get Pack & Enroll ->",
      no_results_title: "No Matching Products Found",
      no_results_sub: "Try searching with other terms or clear your category filter.",
      btn_reset_filters: "Reset Filters",
      ent_title: "Looking for Custom AI Deployments for Your Firm?",
      ent_desc:
        "Beyond our digital products, Seven Z Studio architects private enterprise deployments: multi-agent AI swarms, Odoo ERP 18 business automation, and Hollywood-grade 3D ACES commercial campaigns.",
      ent_col1_title: "Private AI Swarms",
      ent_col1_desc: "On-premise LLMs with complete data sovereignty and enterprise privacy.",
      ent_col2_title: "Odoo ERP Automation",
      ent_col2_desc: "Automated inventory, invoicing, and CRM pipelines with zero human latency.",
      ent_col3_title: "3D Cinema & VFX",
      ent_col3_desc: "Broadcast-ready commercial campaigns for architectural and luxury brands.",
      btn_consult_exec: "Request Consultation & Scope",
      free_prompts_link: "Free Prompt Vault",
      waitlist_modal_sub:
        "Register now to be among the first 50 verified professionals to receive full complimentary access upon release + lifetime 50% discount.",
      form_name: "Full Name",
      form_email: "Email Address",
      form_whatsapp: "WhatsApp Number",
      form_city: "Country / City",
      form_role: "Professional Discipline",
      btn_confirm_vip: "Confirm VIP Seat & 50% Discount",
      lead_modal_title: "Free 5000+ AI Prompts Golden Vault",
      lead_modal_sub:
        "Enter your details to register your access and immediately receive the golden prompt vault link via email.",
      btn_instant_dl_action: "Unlock & Send Access Link",
      mob_catalog: "Catalog",
      mob_free_vault: "Free Prompts",
      mob_consult: "WhatsApp",
      p1_title: "Smart Architect AI Assistant (AutoCAD & 3D MAX)",
      p1_desc:
        "Autonomous AI agent that receives your hand-drawn architectural sketches or project brief, generates complete production-grade AutoCAD .DWG sets, lifts 3D masses in 3ds Max and SketchUp, and renders photorealistic visuals with BOQ schedules in minutes.",
      p1_status_tag: "Architectural Intelligence",
      p1_discount_tag: "50% Off Early Bird",
      p2_title: "Smart Video Editor AI Assistant",
      p2_desc:
        "Automates silence trimming, contextually inserts B-Roll, layers sound effects, color grades footage, and exports full editable timelines for Premiere Pro and DaVinci Resolve.",
      p3_title: "YouTube to Viral Shorts & Reels AI",
      p3_desc:
        "Paste any YouTube URL; the agent analyzes transcript semantics, extracts the top 5 high-retention viral moments, reframes to vertical 9:16, and burns animated subtitles.",
      p4_title: "5000+ AI Prompts Master Vault",
      p4_desc:
        "Over 5000 tested engineering, cinema, and coding prompts: generate photorealistic architectural renders, write full-stack code, build feasibility plans, and rank SEO articles.",
      p5_title: "Professional Proposal & Pitch Architect",
      p5_desc:
        "Drafts persuasive client proposals and technical bids that maximize closing rates with dynamic pricing calculators and certified executive PDF exports.",
      p6_title: "Financial Analyst & Feasibility Agent",
      p6_desc:
        "Synthesizes discounted cash flow (DCF) models, calculates projected ROI, and outputs comprehensive feasibility disclosures for founders and institutional investors.",
      p7_title: "AI for Architects & Engineers Masterclass",
      p7_desc:
        "Generate architectural schemes, render photorealistic 3D perspectives in 10 seconds, and fine-tune proprietary LoRA styles tailored to your firm's signature aesthetic.",
      p8_title: "AI Cinema & Filmmaking Masterclass",
      p8_desc:
        "Master virtual camera direction, multi-shot character consistency, ACEScc color science, and cinematic orchestration using Runway Gen-3 and Kling.",
      p9_title: "Content Creation & Monetization Masterclass",
      p9_desc:
        "Actionable frameworks to build personal authority, scale viral audience reach, and convert impressions into recurring client contracts and brand deals.",
      p10_title: "AI Web Platforms & SaaS Engineering",
      p10_desc:
        "Ship full-stack reactive web applications, API integrations, and checkout platforms within days leveraging Cursor and Claude code synthesis.",
      p11_title: "AI Foundations & Complete Masterclass Bundle (1.4GB)",
      p11_desc:
        "Complete 1.4 GB offline masterclass: 8 HD video lectures covering prompt engineering, idea generation, character consistency, camera dynamics, voice cloning, and commercial delivery. Includes 7 executive PDF field manuals, prompt bibles, and practice kit.",
      badge_discount_72: "Save 72%",
      footer_currency_label: "Display Currency:",
      p12_title: "The 7Z Digital Vault (5-Handbook Suite)",
      p12_desc:
        "Seven Z Studio's official field-tested handbooks: Prompt Engineering, AI Cinema, Autonomous Agents, SaaS Architecture, and Odoo ERP implementation.",
      p13_title: "Autonomous Developer Skill Packs",
      p13_desc:
        "Drop-in configuration rules and skill packages for Claude Code and Cursor to automate unit tests, code reviews, and UI scaffolding effortlessly.",
      profile_btn_eyebrow: "2026 Portfolio · 12.3 MB",
      profile_btn_title: "Download 7Z Company Profile",
      tour_replay_btn: "Interactive Tour",
      badge_whop_vault: "Whop Store · 5 Handbooks",
      badge_skillpacks: "Ready-to-Install Skills",
      pm_badge: "Official Registration & Checkout (USD Base)",
      pm_promo_label: "Discount / Affiliate Code",
      pm_promo_ph: "e.g. ENG7SANZ",
      pm_promo_apply: "Apply",
      pm_method_cliq: "Local Transfer (CliQ / Western Union)",
      pm_method_whop: "Card / Instant Access (Whop)",
      pm_cliq_heading: "CliQ (Jordan) / Western Union Transfer Details",
      pm_receipt_label: "Upload Transfer Receipt (PNG, JPG, WEBP, PDF · Max 5MB)",
      pm_submit_cliq: "Confirm Registration & Submit Receipt",
      pm_submit_whop: "Save Registration & Continue to Whop Checkout",
      pm_submit_inquiry: "Submit Account Inquiry Request",
      pm_success_title: "Request Registered Successfully!",
      pm_success_desc:
        "Your registration has been recorded in our system and a confirmation email has been sent. Our team will verify and activate your access shortly.",
      pm_open_wa: "Confirm via WhatsApp (+962 79 702 0089)"
    },
    ar: {
      ribbon_free_pdf_notice: "رابط تحميل الدليل العملي المجاني متاح في أسفل الصفحة",
      pdf_instant_note: "يُرسل رابط التحميل المباشر إلى بريدك الإلكتروني فوراً بعد التسجيل",
      cat_all_mob: "الكل",
      cat_agents_mob: "الأتمتة",
      cat_academy_mob: "الدورات",
      cat_skills_mob: "المهارات",
      cat_free_mob: "المجاني",
      badge_free_pdf: "هدية مجانية 100% · دليل عملي مباشر",
      p14_title: "دليل صناعة الفيديو والمحتوى بالذكاء الاصطناعي (PDF مجاني)",
      p14_desc:
        "دليل تطبيقي شامل لصناع المحتوى: من صياغة أوامر الفيديو وتحريك الصور الثابتة، إلى مونتاج CapCut وتوحيد الألوان والتصدير، مع كود خصم 10% (ENG7SANZ) لبرامج الأكاديمية.",
      btn_download_pdf: "تحميل الدليل مجاناً الآن (4.7MB)",
      kinetic_prefix: "هندسة المستقبل عبر",
      sec2_badge: "دقة هندسية مطلقة وأتمتة شاملة للمشاريع",
      sec2_title_part1: "من الفكرة المبدئية إلى التسليم النهائي الكامل",
      sec2_title_part2: "تسريع إنجاز أعمالك ومشاريعك 10 أضعاف",
      sec2_desc:
        "نجمع في استوديو SEVEN Z بين قوة الذكاء الاصطناعي التوليدي والخبرة الهندسية الصارمة. أطلق وكلاء مستقلين لتسليم مخططات الأوتوكاد والمونتاج والتحليل المالي، أو طوّر مهاراتك عبر ماستر كلاس الأكاديمية.",
      bento_badge: "محرك التصميم المعماري الذكي",
      bento_cta: "طلب معاينة حية",
      badge_new_release: "إصدار 2026 الرسمي المعتمد",
      announcement_text: "هدية مجانية: حمّل الآن بنك الأوامر الشامل (أكثر من 5,000 برومبت هندسي وسينمائي) فوراً!",
      announcement_cta: "تحميل مجاناً",
      brand_sub: "المتجر الرقمي",
      nav_store: "الكتالوج (28)",
      nav_agents: "وكلاء الأتمتة",
      nav_academy: "الأكاديمية",
      nav_books: "الأدلة الرقمية",
      nav_enterprise: "خدمات الشركات",
      nav_main_home: "الموقع الرئيسي ↗",
      btn_consult: "احجز استشارة",
      hero_pill: "وكلاء الأتمتة الذاتية · استوديو الإنتاج · أكاديمية المحتوى",
      hero_subtitle:
        "منصتك العربية المتكاملة: امتلك أنظمة ذكاء اصطناعي ترسم مخططات AutoCAD و 3D MAX في دقائق، وتمنتج فيديوهاتك تلقائياً، أو احترف أدوات العصر عبر أكاديميتنا لتضاعف أرباحك وإنتاجيتك.",
      hero_cta_browse: "تصفح الأنظمة والحلول",
      hero_cta_vault: "بنك البرومبتات المجاني (5000+)",
      metric_1: "تسريع إنجاز المشاريع 10X",
      metric_2: "تسليم فوري ومضمون",
      metric_3: "معايير هوليوودية للألوان",
      metric_4: "عميل ومهندس وصانع محتوى",
      floating_pill_title: "أنظمة مستقلة + تدريب احترافي متقدم",
      floating_pill_sub: "تسليم مشاريع متكاملة بنقرة واحدة",
      view_agents_link: "اكتشف الأنظمة",
      store_badge: "المتجر والحلول المعتمدة",
      store_title: "استكشف الأنظمة، الحسابات، والدورات التدريبية",
      store_sub: "تصفح وكلاء الأتمتة الذاتية، قنوات الدخل الجاهزة، أو انضم لدورات الأكاديمية لنقل أعمالك لمستوى جديد.",
      cat_all: "جميع المنتجات والحلول",
      cat_agents: "وكلاء الأتمتة والذكاء الاصطناعي",
      cat_academy: "دورات الأكاديمية والماستر كلاس",
      cat_skills: "حزم المهارات والكتب ($25)",
      cat_free: "الأدوات والكتيبات المجانية",
      cat_accounts: "قنوات وحسابات جاهزة للربح",
      cat_accounts_mob: "الحسابات",
      badge_verified_account: "متوفر للتسليم الفوري · حساب موثّق",
      badge_mass_dist: "نشر واسع · متاح للحجز الفوري",
      price_vip_access: "عرض الحجز المبكر VIP",
      price_waitlist_free: "احجز مقعدك بخصم 50%",
      price_per_account: "سعر الحساب الجاهز",
      price_per_channel: "سعر القناة المفعّلة",
      price_custom_project: "تسعير الحملة التسويقية",
      price_contact_us: "تواصل وطلب تسعير مخصص",
      btn_inquire: "استفسر واحجز الحساب ←",
      btn_start_campaign: "أطلق حملتك الفيروسية الآن ←",
      p15_title: "حارس الفلل والكمباوندات التنبؤي الذكي",
      p15_desc:
        "نظام أمني ذكي يحلل بث الكاميرات لحظة بلحظة، يتوقع محاولات التسلل والسرقة قبل حدوثها، يطلق الإنذار فوراً، ويوثق مقاطع الفيديو كأدلة رسمية مؤكدة.",
      p15_f1: "رصد وتحليل فوري 24/7",
      p15_f2: "توقع التسلل والسرقة",
      p15_f3: "تنبيهات فورية على الهاتف",
      p15_f4: "توثيق فيديوهات الإدانة",
      p16_title: "مدير قنوات يوتيوب التلقائي بالكامل",
      p16_desc:
        "وكيل مستقل يدير قناتك على يوتيوب من الألف إلى الياء: يبتكر الأفكار، يكتب السكربتات، يمنتج ويرفع الفيديوهات، يحلل تفاعل الجمهور، ويدرّب خوارزمياته ذاتياً.",
      p16_f1: "إنتاج الفيديوهات ذاتياً",
      p16_f2: "رفع وجدولة تلقائية",
      p16_f3: "تحليل وتدريب ذاتي مستمر",
      p16_f4: "تطوير استراتيجية المشاهدات",
      p17_title: "حسابات وصفحات فيسبوك مفعّلة الأرباح",
      p17_desc:
        "صفحات وحسابات فيسبوك جاهزة ومستوفية للشروط بالكامل، مع تفعيل ميزة النجوم والإعلانات المضمّنة (In-Stream Ads). جاهزة للنشر واستلام الأرباح فوراً.",
      p18_title: "قنوات يوتيوب مفعّلة الدخل رسمياً (YPP)",
      p18_desc:
        "قنوات جاهزة ومقبولة رسمياً في برنامج شركاء يوتيوب (تجاوزت 1,000 مشترك و4,000 ساعة مشاهدة). مربوطة بأدسنس ومستعدة لتحقيق الأرباح من أول يوم.",
      p19_title: "حسابات تيكتوك مفعّلة صندوق المبدعين",
      p19_desc:
        "حسابات تيكتوك مؤهلة لبرنامج مكافآت المبدعين (Creator Rewards Program) وسلاسل الفيديوهات المدفوعة. جاهزة لتحقيق دخل فوري مع قاعدة متابعين نشطة.",
      p20_title: "شبكة النشر والتسويق الفيروسي الشامل (1,500 حساب)",
      p20_desc:
        "انشر محتواك وحملتك الترويجية في نفس اللحظة عبر 500 حساب فيسبوك + 500 حساب إنستغرام + 500 حساب تيكتوك. حقق أعلى وصول طبيعي وانتشار فيروسي بدون قيود.",
      p20_f1: "1,500 منشور متزامن",
      p20_f2: "وصول فيروسي هائل",
      p20_f3: "بدون أي حظر أو قيود",
      p20_f4: "جدولة زمنية مخصصة",
      badge_waitlist: "قريباً · أولوية الحجز لعملاء VIP",
      badge_waitlist_short: "قريباً · حجز مسبق",
      badge_available: "متاح للبدء الفوري",
      badge_top_demand: "الأكثر طلباً وتفضيلاً",
      badge_free_vault: "هدية مجانية 100% · تحميل فوري",
      badge_available_license: "ترخيص استخدام دائم",
      badge_academy_cert: "برنامج تدريبي مكثف ومعتمد",
      badge_aces_cinema: "معايير الإخراج السينمائي",
      badge_monetization: "بناء الجمهور والدخل السلبي",
      badge_fullstack: "سرعة البرمجة بالـ AI",
      early_access_sub: "السعر الرسمي المتوقع بعد الإطلاق",
      lifetime_perk: "(خصم 50% دائم مدى الحياة للمسجلين الآن)",
      btn_join_waitlist: "احجز مقعدك بخصم 50% ←",
      plan_monthly: "اشتراك شهري",
      btn_demo: "سجّل واطلب الآن ←",
      btn_start_now: "ابدأ التحويل الآن ←",
      price_public: "السعر للجمهور",
      btn_instant_download: "تحميل فوري مجاناً",
      license_onetime: "دفعة واحدة لمرة واحدة",
      btn_get_tool: "شراء الترخيص الدائم ←",
      vip_seats: "مقاعد محدودة للمسجلين",
      btn_waitlist_action: "احجز مقعدك بالخصم ←",
      course_fee: "رسوم التسجيل والاستثمار",
      btn_details_enroll: "التسجيل والدفع الآن ←",
      btn_full_syllabus: "المنهج الكامل",
      bundle_all: "الحزمة المتكاملة",
      btn_whop_buy: "شراء فوري من منصة Whop ←",
      btn_toggle_guides: "عرض الأدلة الـ 5 على Whop",
      license_dev: "ترخيص للمطورين والشركات",
      btn_download_pack: "طلب وشراء الحزمة ←",
      no_results_title: "لم نجد نتائج مطابقة لبحثك",
      no_results_sub: "جرب البحث بكلمات أخرى أو أعد تعيين الفلاتر لعرض كافة المنتجات.",
      btn_reset_filters: "إعادة عرض جميع الحلول",
      ent_title: "هل تبحث عن أنظمة ذكاء اصطناعي وأتمتة مخصصة لشركتك أو مكتبك؟",
      ent_desc:
        "إلى جانب المنتجات الجاهزة، ينفذ فريق Seven Z Studio حلولاً هندسية وبرمجية متكاملة للمؤسسات: بناء شبكات وكلاء AI مستقلة داخلية، أتمتة نظام إدارة الشركات Odoo ERP، وإنتاج حملات سينمائية 3D فائقة الدقة بمعايير ACES العالمية.",
      ent_col1_title: "أنظمة وكلاء AI خاصة بشركتك",
      ent_col1_desc: "برمجيات ذكية تعمل داخل خوادمك السحابية الخاصة بأعلى درجات السرية والخصوصية.",
      ent_col2_title: "أتمتة نظام الشركات Odoo ERP",
      ent_col2_desc: "ربط العمليات والمخازن مع مساعدين أذكياء لإدخال ومعالجة البيانات آلياً.",
      ent_col3_title: "إنتاج سينمائي ثلاثي الأبعاد (3D/ACES)",
      ent_col3_desc: "إعلانات تجارية للمشاريع العقارية الضخمة بجودة ودقة هوليوودية متطورة.",
      btn_consult_exec: "تحدث مع خبيرنا واطلب عرض سعر لمشروعك",
      free_prompts_link: "بنك البرومبتات المجاني",
      waitlist_modal_sub:
        "سجّل بياناتك لتكون من بين أول 50 عميلاً يحصلون على تجربة مجانية كاملة للنظام فور إطلاقه بالإضافة إلى خصم 50% دائم مدى الحياة.",
      form_name: "الاسم الكريم",
      form_email: "البريد الإلكتروني",
      form_whatsapp: "رقم الواتساب (مع مفتاح الدولة)",
      form_city: "البلد والمدينة",
      form_role: "المجال أو التخصص",
      btn_confirm_vip: "تأكيد حجز مقعدي بالـ VIP وتثبيت الخصم",
      lead_modal_title: "بنك البرومبتات الشامل (المكتبة الذهبية)",
      lead_modal_sub:
        "أدخل بياناتك لتسجيل وصولك وإرسال رابط المكتبة الذهبية مباشرة إلى بريدك الإلكتروني.",
      btn_instant_dl_action: "تفعيل الوصول وإرسال الرابط",
      mob_catalog: "الكتالوج",
      mob_free_vault: "البرومبتات",
      mob_consult: "واتساب",
      p1_title: "المهندس المعماري الذكي (AutoCAD & 3D MAX Agent)",
      p1_desc:
        "وكيل مستقل يستلم مخططاتك أو أفكارك المبدئية، يرسم مخططات AutoCAD تنفيذية تفصيلية بالكامل (.DWG)، يرفع الكتل ثلاثية الأبعاد على 3D MAX و SketchUp، ويخرج رندرات سينمائية وجداول كميات خلال دقائق.",
      p1_status_tag: "أتمتة معمارية مستقلة",
      p1_discount_tag: "خصم 50% للأوائل",
      p2_title: "المونتير الذكي لصناع المحتوى (Video Editor AI)",
      p2_desc:
        "مساعدك الشخصي في المونتاج: يقص الصمت والوقفات تلقائياً، يدرج المشاهد التوضيحية (B-Roll) المناسبة، يضيف مؤثرات صوتية وتلوين سينمائي، ويصدّر خط زمني (Timeline) كامل متوافق مع Premiere و DaVinci Resolve.",
      p3_title: "صانع الريلز والشورتات الفيروسي (YouTube to Shorts)",
      p3_desc:
        "حوّل أي فيديو يوتيوب طويل إلى 5 مقاطع ريلز وشورتس فائقة الجاذبية بنقرة واحدة؛ يتعرف تلقائياً على اللحظات الحماسية، يقص بنسبة 9:16، ويضيف نصوصاً ملونة متحركة تجذب المشاهد.",
      p4_title: "بنك البرومبتات الشامل (المكتبة الذهبية 5000+)",
      p4_desc:
        "أكبر أرشيف لأوامر الذكاء الاصطناعي المختبرة: توليد لقطات وتصاميم معمارية سينمائية، كتابة كود برمجي احترافي، إعداد دراسات جدوى مالية، وصياغة مقالات متوافقة مع محركات البحث SEO.",
      p5_title: "صانع عروض الأسعار والصفقات (B2B Proposal Closer)",
      p5_desc:
        "يصيغ عروض أسعار هندسية وتجارية متكاملة تقنع العميل وتضاعف نسبة إغلاق العقود، مع تسعير مدروس وتوليد مستندات PDF تنفيذية جاهزة للتوقيع.",
      p6_title: "المحلل المالي ومعد دراسات الجدوى الذكي",
      p6_desc:
        "يبني نماذج التدفقات النقدية المخصومة (DCF)، يحسب العائد على الاستثمار (ROI) بدقة، ويستخرج تقارير دراسات جدوى تفصيلية جاهزة لتقديمها للشركاء والمستثمرين.",
      p7_title: "ماستر كلاس الذكاء الاصطناعي للمهندسين والمعماريين",
      p7_desc:
        "تعلّم توليد المخططات التنفيذية، وإخراج رندرات ثلاثية الأبعاد فائقة الواقعية في 10 ثوانٍ، وتدريب نماذج لورا (LoRA) خاصة بطراز وهوية مكتبك الهندسي.",
      p8_title: "ماستر كلاس صناعة الأفلام والإعلانات بالـ AI",
      p8_desc:
        "احترف الإخراج السينمائي الافتراضي: ضبط زوايا الكاميرا، تثبيت ملامح الشخصيات عبر المشاهد، المعالجة اللونية ACEScc، واستخدام Runway Gen-3 و Kling لإنتاج إعلانات سينمائية هوليوودية.",
      p9_title: "ماستر كلاس صناعة المحتوى وبناء مصادر الدخل",
      p9_desc:
        "خارطة طريق عملية لبناء براند شخصي يحصد ملايين المشاهدات، وتحويل المتابعين إلى مبيعات وعقود رعاية وشراكات تجارية مربحة بأقل مجهود.",
      p10_title: "ماستر كلاس بناء المنصات والمواقع الذكية بالـ AI",
      p10_desc:
        "ابنِ منصات وتطبيقات ويب سريعة واربط قواعد البيانات وبوابات الدفع الإلكتروني باستخدام Cursor و Claude خلال أيام معدودة دون الحاجة لسنوات من دراسة البرمجة.",
      p11_title: "الحقيبة التدريبية الكبرى لتأسيس الذكاء الاصطناعي (1.4GB)",
      p11_desc:
        "أشمل حقيبة تعليمية عملية: 8 محاضرات فيديو عالية الدقة تشمل كتابة السيناريو، هندسة البرومبت، توليد الحركة، واستنساخ الصوت، بالإضافة إلى 7 كتيبات تنفيذية PDF وبنك الأوامر وملفات التطبيق العملي.",
      badge_discount_72: "وفر 72% اليوم",
      footer_currency_label: "العملة المعروضة:",
      p12_title: "موسوعة الكتب الرقمية الخمسة المعتمدة (The 7Z Vault)",
      p12_desc:
        "المرجع التنفيذي المعتمد من استوديو 7Z: هندسة الأوامر المتقدمة، الإخراج السينمائي بالـ AI، وكلاء الأتمتة، بناء المنصات، وتطبيقات نظام Odoo ERP في كتيبات حصرية فاخرة.",
      p13_title: "حزم المهارات والقواعد البرمجية الجاهزة (Skill Packs)",
      p13_desc:
        "ملفات قواعد وأوامر ذكية جاهزة للتثبيت الفوري في Claude Code و Cursor لرفع كفاءة البرمجة، وفحص الأخطاء، وبناء واجهات المستخدم أوتوماتيكياً.",
      profile_btn_eyebrow: "الملف التعريفي الرسمي 2026 · حجم 12.3 MB",
      profile_btn_title: "حمّل البروفايل التعريفي الرسمي لـ 7Z",
      tour_replay_btn: "استعراض الأوضاع",
      badge_whop_vault: "متجر Whop · 5 أدلة عملية",
      badge_skillpacks: "أدوات جاهزة للتثبيت الفوري",
      pm_badge: "بوابة التسجيل والدفع الرسمية (USD)",
      pm_promo_label: "كود الخصم أو المسوّق",
      pm_promo_ph: "مثال: ENG7SANZ",
      pm_promo_apply: "تطبيق",
      pm_method_cliq: "تحويل محلي (CliQ / Western Union)",
      pm_method_whop: "دفع بالبطاقة / Whop المباشر",
      pm_cliq_heading: "بيانات التحويل الرسمية (CliQ الأردن / Western Union)",
      pm_receipt_label: "رفع صورة أو ملف إيصال التحويل (PNG, JPG, WEBP, PDF · حد 5MB)",
      pm_submit_cliq: "تأكيد التسجيل وإرسال الإيصال للمراجعة",
      pm_submit_whop: "حفظ الطلب والانتقال للدفع على Whop",
      pm_submit_inquiry: "إرسال طلب الاستفسار والحجز",
      pm_success_title: "تم تسجيل طلبك وحفظ بياناتك بنجاح!",
      pm_success_desc:
        "تم تسجيل طلبك في قاعدة بيانات الموقع وإرسال رسالة تأكيد لبريدك الإلكتروني. سيتولى فريقنا المراجعة وتفعيل الوصول فوراً.",
      pm_open_wa: "تأكيد ومتابعة عبر واتساب (+962 79 702 0089)"
    }
  };

  let currentLang = readSavedLang();
  let currentTheme = readSavedTheme();
  let currentCategory = "all";
  let currentCurrency = readSavedCurrency();
  let currentModalProduct = null;
  let activePayMethod = "cliq";
  let appliedPromo = { code: "", discountPercent: 0, discountUsd: 0 };
  let uploadedReceipt = { url: "", name: "", type: "", base64: "" };

  function readSavedLang() {
    try {
      const v = localStorage.getItem("z7-lang") || localStorage.getItem("7z-course-lang");
      return v === "en" || v === "ar" ? v : "ar";
    } catch {
      return "ar";
    }
  }

  function readSavedTheme() {
    try {
      const v = localStorage.getItem("z7-theme") || localStorage.getItem("7z-course-theme");
      return v === "light" || v === "dark" ? v : "dark";
    } catch {
      return "dark";
    }
  }

  function readSavedCurrency() {
    try {
      const v = localStorage.getItem("7z_currency");
      return v && currencyConfig[v] ? v : "USD";
    } catch {
      return "USD";
    }
  }

  function dict(key) {
    return (i18nData[currentLang] && i18nData[currentLang][key]) || i18nData.en[key] || key;
  }

  function formatCurrency(amountUSD, curr = currentCurrency) {
    const conf = currencyConfig[curr] || currencyConfig.USD;
    const converted = Number(amountUSD || 0) * conf.rate;
    const factor = Math.pow(10, conf.decimals);
    const rounded = Math.round((converted + Number.EPSILON) * factor) / factor;
    const valStr = rounded.toLocaleString("en-US", {
      minimumFractionDigits: conf.decimals,
      maximumFractionDigits: conf.decimals
    });
    return conf.prefix ? `${conf.symbol}${valStr}` : `${valStr}${conf.symbol}`;
  }

  function updateModalPricingUI() {
    if (!currentModalProduct) return;
    const baseUsd = Number(currentModalProduct.priceUsd || 0);
    const discUsd =
      baseUsd > 0 && appliedPromo.discountPercent > 0
        ? Math.round(((baseUsd * appliedPromo.discountPercent) / 100) * 100) / 100
        : 0;
    const netUsd = Math.round(Math.max(0, baseUsd - discUsd) * 100) / 100;
    appliedPromo.discountUsd = discUsd;

    const modalPriceEl = document.getElementById("productModalPrice");
    const modalFxEl = document.getElementById("productModalFxPrice");
    const summaryWrap = document.getElementById("pmSummaryBox");
    const baseEl = document.getElementById("pmBasePriceVal");
    const discRow = document.getElementById("pmDiscountRow");
    const discValEl = document.getElementById("pmDiscountVal");
    const netEl = document.getElementById("pmNetPriceVal");

    if (currentModalProduct.isInquiry) {
      if (modalPriceEl) modalPriceEl.textContent = currentLang === "ar" ? "تسعير مخصص حسب الحساب" : "Custom Pricing";
      if (modalFxEl) modalFxEl.textContent = "";
      if (summaryWrap) summaryWrap.classList.add("hidden");
      return;
    }

    if (modalPriceEl) modalPriceEl.textContent = `$${netUsd.toFixed(discUsd > 0 ? 2 : 0)} USD`;
    if (modalFxEl) {
      modalFxEl.textContent =
        currentCurrency !== "USD"
          ? `(${currentLang === "ar" ? "تقريباً:" : "approx."} ${formatCurrency(netUsd, currentCurrency)})`
          : "";
    }
    if (summaryWrap) summaryWrap.classList.remove("hidden");
    if (baseEl) baseEl.textContent = `$${baseUsd.toFixed(2)} USD`;
    if (discRow && discValEl) {
      if (discUsd > 0) {
        discRow.classList.remove("hidden");
        discValEl.textContent = `-$${discUsd.toFixed(2)} USD (${appliedPromo.discountPercent}%)`;
      } else {
        discRow.classList.add("hidden");
      }
    }
    if (netEl) {
      netEl.textContent =
        currentCurrency !== "USD"
          ? `$${netUsd.toFixed(2)} USD · ${formatCurrency(netUsd, currentCurrency)}`
          : `$${netUsd.toFixed(2)} USD`;
    }
  }

  function changeCurrency(curr) {
    if (!currencyConfig[curr]) curr = "USD";
    currentCurrency = curr;
    try {
      localStorage.setItem("7z_currency", curr);
    } catch {}

    const selector = document.getElementById("currencySelector");
    if (selector && selector.value !== curr) selector.value = curr;

    document.querySelectorAll("[data-currency-price]").forEach((el) => {
      const usd = parseFloat(el.getAttribute("data-currency-price"));
      if (!Number.isNaN(usd)) el.textContent = formatCurrency(usd, curr);
    });

    document.querySelectorAll("[data-currency-original]").forEach((el) => {
      const usd = parseFloat(el.getAttribute("data-currency-original"));
      if (!Number.isNaN(usd)) el.textContent = formatCurrency(usd, curr);
    });

    updateModalPricingUI();
  }

  const kineticWords = {
    en: [
      "Autonomous AI Agents",
      "Full Turnkey Engineering",
      "Virtual Cinema Production",
      "Enterprise Software Engines",
      "Generative 3D Architecture"
    ],
    ar: [
      "وكلاء الذكاء الاصطناعي",
      "الحلول الهندسية المتكاملة",
      "الإنتاج السينمائي الذكي",
      "محركات البرمجيات المؤسسية",
      "الهندسة المعمارية التوليدية"
    ]
  };
  let kineticIndex = 0;

  function switchLanguage(lang, persist = true) {
    currentLang = lang === "en" ? "en" : "ar";
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";
    if (persist) {
      try {
        localStorage.setItem("z7-lang", currentLang);
        localStorage.setItem("7z-course-lang", currentLang);
      } catch {}
    }

    const btnEn = document.getElementById("btnLangEn");
    const btnAr = document.getElementById("btnLangAr");
    const mobileLabel = document.getElementById("mobileFloatLangLabel");
    const soundLbl = document.getElementById("soundLabel");
    const vidLight = document.getElementById("heroCinemaPlayerLight");
    const isMuted = vidLight ? vidLight.muted : true;

    if (soundLbl) {
      soundLbl.textContent =
        currentLang === "ar"
          ? isMuted
            ? "🔇 كتم الصوت"
            : "🔊 تشغيل الصوت"
          : isMuted
          ? "🔇 Muted"
          : "🔊 Audio On";
    }

    const searchInput = document.getElementById("searchInput");
    if (currentLang === "en") {
      if (btnEn)
        btnEn.className =
          "px-2.5 py-1 rounded-full transition text-[11px] bg-white dark:bg-azure text-slate-900 dark:text-white shadow-sm font-bold whitespace-nowrap";
      if (btnAr)
        btnAr.className =
          "px-2.5 py-1 rounded-full transition text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold";
      if (mobileLabel) mobileLabel.textContent = "العربية";
      if (searchInput) searchInput.placeholder = "Search agents, courses, tools...";
    } else {
      if (btnAr)
        btnAr.className =
          "px-2.5 py-1 rounded-full transition text-[11px] bg-white dark:bg-azure text-slate-900 dark:text-white shadow-sm font-bold whitespace-nowrap";
      if (btnEn)
        btnEn.className =
          "px-2.5 py-1 rounded-full transition text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold";
      if (mobileLabel) mobileLabel.textContent = "English";
      if (searchInput) searchInput.placeholder = "ابحث عن أداة، كورس، وكيل...";
    }

    const kineticEl = document.getElementById("kineticWord");
    if (kineticEl && kineticWords[currentLang]) {
      kineticEl.textContent = kineticWords[currentLang][kineticIndex % kineticWords[currentLang].length];
    }

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (i18nData[currentLang] && i18nData[currentLang][key] !== undefined) {
        el.textContent = i18nData[currentLang][key];
      }
    });

    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      const key = el.getAttribute("data-i18n-ph");
      if (i18nData[currentLang] && i18nData[currentLang][key] !== undefined) {
        el.placeholder = i18nData[currentLang][key];
      }
    });

    if (window.innerWidth < 640) updateMobile3DCarousel();
    updateModalPricingUI();
    updateSubmitButtonLabel();
  }

  function setTheme(theme, persist = true) {
    currentTheme = theme === "light" ? "light" : "dark";
    const html = document.documentElement;
    html.dataset.theme = currentTheme;
    html.classList.toggle("dark", currentTheme === "dark");
    if (persist) {
      try {
        localStorage.setItem("z7-theme", currentTheme);
        localStorage.setItem("7z-course-theme", currentTheme);
      } catch {}
    }

    const mesh = document.getElementById("ambientMesh");
    const header = document.getElementById("mainHeader");
    const sunIcon = document.getElementById("sunIcon");
    const moonIcon = document.getElementById("moonIcon");

    if (currentTheme === "dark") {
      if (mesh) mesh.className = "fixed inset-0 pointer-events-none -z-10 bg-mesh-dark transition-all duration-500";
      if (header) header.className = "sticky top-0 z-40 transition-colors duration-300 glass-nav-dark";
      if (sunIcon) {
        sunIcon.classList.remove("hidden");
        sunIcon.classList.add("block");
      }
      if (moonIcon) {
        moonIcon.classList.remove("block");
        moonIcon.classList.add("hidden");
      }
    } else {
      if (mesh) mesh.className = "fixed inset-0 pointer-events-none -z-10 bg-mesh-light transition-all duration-500";
      if (header) header.className = "sticky top-0 z-40 transition-colors duration-300 glass-nav-light";
      if (sunIcon) {
        sunIcon.classList.remove("block");
        sunIcon.classList.add("hidden");
      }
      if (moonIcon) {
        moonIcon.classList.remove("hidden");
        moonIcon.classList.add("block");
      }
    }
  }

  function toggleTheme() {
    setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark");
  }

  function toggleVideoSound() {
    const vidLight = document.getElementById("heroCinemaPlayerLight");
    const vidDark = document.getElementById("heroCinemaPlayerDark");
    const lbl = document.getElementById("soundLabel");
    const isMuted = vidLight ? vidLight.muted : vidDark ? vidDark.muted : true;
    const newMuted = !isMuted;
    if (vidLight) vidLight.muted = newMuted;
    if (vidDark) vidDark.muted = newMuted;
    if (lbl) {
      lbl.textContent =
        currentLang === "ar"
          ? newMuted
            ? "🔇 كتم الصوت"
            : "🔊 تشغيل الصوت"
          : newMuted
          ? "🔇 Muted"
          : "🔊 Audio On";
    }
  }

  function normalizeSearch(str) {
    if (!str) return "";
    return str
      .toLowerCase()
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/[\u064B-\u065F]/g, "")
      .trim();
  }

  function setCategory(cat) {
    currentCategory = cat || "all";

    document.querySelectorAll(".cat-pill").forEach((pill) => {
      const isTarget = pill.getAttribute("data-cat") === currentCategory;
      const isFree = pill.getAttribute("data-cat") === "free";
      const isAccounts = pill.getAttribute("data-cat") === "accounts";
      if (isTarget) {
        if (isFree) {
          pill.className =
            "cat-pill active flex-shrink-0 px-5 py-2.5 rounded-full text-xs font-bold transition flex items-center gap-2 bg-emerald-600 text-white shadow-md active:scale-95";
        } else if (isAccounts) {
          pill.className =
            "cat-pill active flex-shrink-0 px-5 py-2.5 rounded-full text-xs font-bold transition flex items-center gap-2 bg-violet-600 text-white shadow-md active:scale-95";
        } else {
          pill.className =
            "cat-pill active flex-shrink-0 px-5 py-2.5 rounded-full text-xs font-bold transition flex items-center gap-2 bg-slate-950 text-white dark:bg-azure dark:text-white shadow-md active:scale-95";
        }
      } else if (isFree) {
        pill.className =
          "cat-pill flex-shrink-0 px-5 py-2.5 rounded-full text-xs font-bold transition flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 active:scale-95";
      } else if (isAccounts) {
        pill.className =
          "cat-pill flex-shrink-0 px-5 py-2.5 rounded-full text-xs font-bold transition flex items-center gap-2 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border border-violet-500/30 active:scale-95";
      } else {
        pill.className =
          "cat-pill flex-shrink-0 px-5 py-2.5 rounded-full text-xs font-bold transition flex items-center gap-2 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-black/5 dark:border-white/10 active:scale-95";
      }
    });

    document.querySelectorAll(".mob-cat-btn").forEach((btn) => {
      const isTarget = btn.getAttribute("data-cat") === currentCategory;
      const isFree = btn.getAttribute("data-cat") === "free";
      const iconBox = btn.querySelector(".mob-cat-icon");
      const badge = btn.querySelector(".mob-cat-badge");
      const label = btn.querySelector(".mob-cat-label");

      if (isTarget) {
        btn.classList.add("active");
        if (isFree) {
          if (iconBox)
            iconBox.className =
              "mob-cat-icon w-9 h-9 sm:w-10 sm:h-10 mx-auto rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 relative bg-emerald-600 text-white shadow-md dark:bg-emerald-500 scale-105";
          if (badge)
            badge.className =
              "mob-cat-badge absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-white/30 text-white border border-white/30";
          if (label)
            label.className =
              "mob-cat-label text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 text-center mt-1.5 transition-colors line-clamp-1";
        } else {
          if (iconBox)
            iconBox.className =
              "mob-cat-icon w-9 h-9 sm:w-10 sm:h-10 mx-auto rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 relative bg-slate-950 text-white shadow-md dark:bg-azure dark:text-white scale-105 dark:shadow-[0_0_15px_rgba(0,113,227,0.35)]";
          if (badge)
            badge.className =
              "mob-cat-badge absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-white/20 text-white border border-white/20";
          if (label)
            label.className =
              "mob-cat-label text-[10px] font-extrabold text-slate-950 dark:text-white text-center mt-1.5 transition-colors line-clamp-1";
        }
      } else {
        btn.classList.remove("active");
        if (isFree) {
          if (iconBox)
            iconBox.className =
              "mob-cat-icon w-9 h-9 sm:w-10 sm:h-10 mx-auto rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 relative bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400";
          if (badge)
            badge.className =
              "mob-cat-badge absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30";
          if (label)
            label.className =
              "mob-cat-label text-[10px] font-medium text-emerald-700 dark:text-emerald-400 text-center mt-1.5 transition-colors line-clamp-1";
        } else {
          if (iconBox)
            iconBox.className =
              "mob-cat-icon w-9 h-9 sm:w-10 sm:h-10 mx-auto rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 relative bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 text-slate-600 dark:text-slate-400";
          if (badge)
            badge.className =
              "mob-cat-badge absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-black/5 dark:border-white/10";
          if (label)
            label.className =
              "mob-cat-label text-[10px] font-medium text-slate-500 dark:text-slate-400 text-center mt-1.5 transition-colors line-clamp-1";
        }
      }
    });

    applyProductFilters();
  }

  function applyProductFilters() {
    const searchEl = document.getElementById("searchInput");
    const searchVal = normalizeSearch(searchEl ? searchEl.value : "");
    const cards = document.querySelectorAll(".product-item");
    let visible = 0;

    cards.forEach((card) => {
      const cat = card.getAttribute("data-category");
      const tags = normalizeSearch(card.getAttribute("data-tags") || "");
      const title = normalizeSearch(card.querySelector("h3")?.innerText || "");
      const desc = normalizeSearch(card.querySelector("p")?.innerText || "");

      const matchCat = currentCategory === "all" || cat === currentCategory;
      const matchSearch =
        !searchVal || tags.includes(searchVal) || title.includes(searchVal) || desc.includes(searchVal);

      if (matchCat && matchSearch) {
        card.classList.remove("hidden");
        visible++;
      } else {
        card.classList.add("hidden");
      }
    });

    const noRes = document.getElementById("noResults");
    if (noRes) {
      noRes.classList.toggle("hidden", visible > 0);
    }

    if (window.innerWidth < 640) {
      const grid3d = document.getElementById("productsGrid");
      if (grid3d) grid3d.scrollTo({ left: 0, behavior: "smooth" });
      setTimeout(updateMobile3DCarousel, 80);
    }
  }

  // Mobile 3D Coverflow Carousel
  let currentMobileCardIndex = 0;
  let mobile3DTicking = false;

  function getVisibleCards() {
    const grid = document.getElementById("productsGrid");
    return grid ? Array.from(grid.querySelectorAll(".product-item:not(.hidden)")) : [];
  }

  function updateMobile3DCarousel() {
    if (window.innerWidth >= 640) return;
    const grid = document.getElementById("productsGrid");
    if (!grid) return;
    const visibleCards = getVisibleCards();
    if (!visibleCards.length) return;

    const gridRect = grid.getBoundingClientRect();
    const gridCenter = gridRect.left + gridRect.width / 2;
    let closestIndex = 0;
    let minDistance = Infinity;

    visibleCards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      const cardCenter = rect.left + rect.width / 2;
      const dist = Math.abs(gridCenter - cardCenter);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = index;
      }
    });

    currentMobileCardIndex = closestIndex;
    visibleCards.forEach((card, index) => {
      card.classList.remove("card-active", "card-prev", "card-next");
      if (index === closestIndex) card.classList.add("card-active");
      else if (index < closestIndex) card.classList.add("card-prev");
      else card.classList.add("card-next");
    });

    const counterEl = document.getElementById("mobileCardCounter");
    if (counterEl) {
      const total = visibleCards.length;
      const current = closestIndex + 1;
      counterEl.textContent = currentLang === "ar" ? `بطاقة ${current} من ${total}` : `Card ${current} of ${total}`;
    }
  }

  function prevMobileCard() {
    if (window.innerWidth >= 640) return;
    const cards = getVisibleCards();
    if (cards.length && currentMobileCardIndex > 0) {
      currentMobileCardIndex--;
      cards[currentMobileCardIndex].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }

  function nextMobileCard() {
    if (window.innerWidth >= 640) return;
    const cards = getVisibleCards();
    if (cards.length && currentMobileCardIndex < cards.length - 1) {
      currentMobileCardIndex++;
      cards[currentMobileCardIndex].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }

  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("hidden");
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  }

  let toastTimer = null;
  function showToast(title, desc, isError = false) {
    const toast = document.getElementById("toastNotification");
    if (!toast) return;
    const titleEl = document.getElementById("toastTitle");
    const descEl = document.getElementById("toastDesc");
    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;
    toast.classList.toggle("border-red-500", isError);
    toast.classList.toggle("border-emerald-500", !isError);
    toast.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.add("hidden");
    }, 5200);
  }

  function setPayMethod(method) {
    activePayMethod = method === "whop" ? "whop" : "cliq";
    const tabCliq = document.getElementById("pmTabCliq");
    const tabWhop = document.getElementById("pmTabWhop");
    const cliqBox = document.getElementById("pmCliqPanel");
    const whopBox = document.getElementById("pmWhopPanel");

    const activeCls =
      "flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition border bg-azure text-white border-azure shadow-sm";
    const idleCls =
      "flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition border bg-slate-50 dark:bg-black/30 text-slate-700 dark:text-slate-300 border-black/10 dark:border-white/10";

    if (tabCliq) tabCliq.className = activePayMethod === "cliq" ? activeCls : idleCls;
    if (tabWhop) tabWhop.className = activePayMethod === "whop" ? activeCls : idleCls;
    if (cliqBox) cliqBox.classList.toggle("hidden", activePayMethod !== "cliq");
    if (whopBox) whopBox.classList.toggle("hidden", activePayMethod !== "whop");

    updateSubmitButtonLabel();
  }

  function updateSubmitButtonLabel() {
    const labelEl = document.getElementById("pmSubmitBtnLabel");
    if (!labelEl || !currentModalProduct) return;
    if (currentModalProduct.isInquiry) {
      labelEl.textContent = dict("pm_submit_inquiry");
    } else if (activePayMethod === "whop") {
      labelEl.textContent = dict("pm_submit_whop");
    } else {
      labelEl.textContent = dict("pm_submit_cliq");
    }
  }

  function resetProductModalState() {
    appliedPromo = { code: "", discountPercent: 0, discountUsd: 0 };
    uploadedReceipt = { url: "", name: "", type: "", base64: "" };

    const form = document.getElementById("productCheckoutForm");
    if (form) form.reset();

    const successPanel = document.getElementById("pmSuccessView");
    const formWrap = document.getElementById("pmFormContainer");
    if (successPanel) successPanel.classList.add("hidden");
    if (formWrap) formWrap.classList.remove("hidden");

    const feedback = document.getElementById("pmPromoFeedback");
    if (feedback) {
      feedback.textContent = "";
      feedback.className = "text-[11px] font-semibold mt-1 hidden";
    }

    const receiptStatus = document.getElementById("pmReceiptStatus");
    if (receiptStatus) {
      receiptStatus.textContent = "";
      receiptStatus.classList.add("hidden");
    }

    const fileInput = document.getElementById("pmReceiptFile");
    if (fileInput) fileInput.value = "";
  }

  function openProductModal(title, rawId, fallbackUsd) {
    resetProductModalState();
    const meta = PRODUCT_META[rawId] || {
      id: rawId,
      priceUsd: Number(fallbackUsd || 0),
      whopUrl: WHOP_URLS.storeMain
    };

    currentModalProduct = {
      title,
      id: meta.id,
      priceUsd: meta.priceUsd,
      isInquiry: Boolean(meta.isInquiry),
      bundleManualDelivery: Boolean(meta.bundleManualDelivery),
      detailUrl: meta.detailUrl || "",
      whopUrl: meta.whopUrl || WHOP_URLS.storeMain
    };

    const titleEl = document.getElementById("productModalTitle");
    if (titleEl) titleEl.textContent = title;

    const noteBox = document.getElementById("pmDeliveryNote");
    if (noteBox) {
      if (currentModalProduct.bundleManualDelivery) {
        noteBox.textContent =
          currentLang === "ar"
            ? "ملاحظة التسليم: بعد إتمام التسجيل ومراجعة الدفع، سيرسل فريقنا رابط تنزيل الحقيبة الكاملة (1.4GB) مباشرة إلى بريدك الإلكتروني والواتساب."
            : "Delivery Notice: After submitting your registration & payment proof, our team delivers the direct 1.4GB bundle download link to your email & WhatsApp.";
        noteBox.classList.remove("hidden");
      } else {
        noteBox.classList.add("hidden");
      }
    }

    const syllabusLink = document.getElementById("pmFullSyllabusLink");
    if (syllabusLink) {
      if (currentModalProduct.detailUrl) {
        syllabusLink.href = currentModalProduct.detailUrl;
        syllabusLink.classList.remove("hidden");
      } else {
        syllabusLink.classList.add("hidden");
      }
    }

    const paymentMethodSection = document.getElementById("pmPaymentSection");
    if (paymentMethodSection) {
      paymentMethodSection.classList.toggle("hidden", currentModalProduct.isInquiry);
    }

    setPayMethod("cliq");
    updateModalPricingUI();
    openModal("productModal");
  }

  function openWaitlistModal(title, id) {
    const titleEl = document.getElementById("waitlistProductTitle");
    const idEl = document.getElementById("waitlistProductId");
    if (titleEl) titleEl.textContent = title;
    if (idEl) idEl.value = id;
    openModal("waitlistModal");
  }

  const LEAD_MAGNET_ASSETS = {
    "video-guide": {
      badgeEn: "FREE PDF HANDBOOK · 4.7 MB",
      badgeAr: "كتيب PDF مجاني · 4.7 ميجابايت",
      titleEn: "7Z AI Video Creation Handbook (PDF)",
      titleAr: "دليل صناعة الفيديو بالذكاء الاصطناعي (PDF)",
      subEn: "Enter your details to receive the direct PDF download link and your 10% discount code (ENG7SANZ) via email.",
      subAr: "أدخل بياناتك لإرسال رابط التحميل المباشر للدليل مع كود الخصم الحصري (ENG7SANZ) إلى بريدك الإلكتروني."
    },
    "company-profile": {
      badgeEn: "SEVEN Z STUDIO · COMPANY PROFILE",
      badgeAr: "SEVEN Z STUDIO · البروفايل التعريفي",
      titleEn: "7Z Company Profile 2026 (PDF)",
      titleAr: "البروفايل التعريفي لشركة 7Z Magic 2026 (PDF)",
      subEn: "Enter your details to receive the direct download link for our 2026 Landscape Company Profile via email.",
      subAr: "أدخل بياناتك لإرسال رابط التحميل المباشر للبروفايل التعريفي الرسمي عبر البريد الإلكتروني."
    },
    "prompt-vault": {
      badgeEn: "5000+ AI PROMPTS MASTER VAULT",
      badgeAr: "بنك البرومبتات الشامل · 5000+ أمر",
      titleEn: "Free 5000+ AI Prompts Golden Vault",
      titleAr: "بنك البرومبتات الشامل (المكتبة الذهبية)",
      subEn: "Enter your details to register your access and immediately receive the golden prompt vault link via email.",
      subAr: "أدخل بياناتك لتفعيل وصولك واستلام رابط بنك البرومبتات الذهبي مباشرة عبر البريد الإلكتروني."
    }
  };

  function openLeadMagnetModal(assetId = "prompt-vault", customTitle = "") {
    const key = LEAD_MAGNET_ASSETS[assetId] ? assetId : "prompt-vault";
    const meta = LEAD_MAGNET_ASSETS[key];
    const isAr = currentLang === "ar";
    const assetTitle = customTitle || (isAr ? meta.titleAr : meta.titleEn);

    const idInput = document.getElementById("leadAssetId");
    const titleInput = document.getElementById("leadAssetTitle");
    const badgeEl = document.getElementById("leadModalBadge");
    const titleEl = document.getElementById("leadModalTitle");
    const subEl = document.getElementById("leadModalSub");
    const formEl = document.getElementById("leadMagnetForm");
    const successEl = document.getElementById("leadModalSuccess");

    if (idInput) idInput.value = key;
    if (titleInput) titleInput.value = meta.titleEn;
    if (badgeEl) badgeEl.textContent = isAr ? meta.badgeAr : meta.badgeEn;
    if (titleEl) titleEl.textContent = assetTitle;
    if (subEl) subEl.textContent = isAr ? meta.subAr : meta.subEn;
    if (formEl) formEl.classList.remove("hidden");
    if (successEl) successEl.classList.add("hidden");

    openModal("leadMagnetModal");
  }

  async function applyPromoCode() {
    if (!currentModalProduct) return;
    const input = document.getElementById("pmPromoInput");
    const btn = document.getElementById("pmApplyPromoBtn");
    const feedback = document.getElementById("pmPromoFeedback");
    const code = String(input?.value || "").trim().toUpperCase();
    if (!code) return;

    if (btn) {
      btn.disabled = true;
      btn.textContent = "...";
    }

    try {
      const res = await fetch(
        `/api/academy/validate-code?code=${encodeURIComponent(code)}&course=${encodeURIComponent(currentModalProduct.id)}`
      );
      const data = await res.json();
      if (data.valid) {
        appliedPromo = {
          code: data.code || code,
          discountPercent: Number(data.discountPercent || 0),
          discountUsd: Number(data.discountUsd || 0)
        };
        if (feedback) {
          feedback.textContent =
            currentLang === "ar"
              ? `تم تفعيل الكود (${appliedPromo.code}) بخصم ${appliedPromo.discountPercent}%`
              : `Code (${appliedPromo.code}) applied: ${appliedPromo.discountPercent}% OFF`;
          feedback.className = "text-[11px] font-semibold mt-1 text-emerald-600 dark:text-emerald-400";
          feedback.classList.remove("hidden");
        }
      } else {
        appliedPromo = { code: "", discountPercent: 0, discountUsd: 0 };
        if (feedback) {
          feedback.textContent =
            data.message ||
            (currentLang === "ar" ? "كود الخصم غير صالح أو منتهي الصلاحية" : "Invalid or expired promo code");
          feedback.className = "text-[11px] font-semibold mt-1 text-red-500";
          feedback.classList.remove("hidden");
        }
      }
      updateModalPricingUI();
    } catch {
      if (feedback) {
        feedback.textContent =
          currentLang === "ar" ? "تعذر التحقق من الكود حالياً" : "Unable to verify code right now";
        feedback.className = "text-[11px] font-semibold mt-1 text-red-500";
        feedback.classList.remove("hidden");
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = dict("pm_promo_apply");
      }
    }
  }

  function handleReceiptFileSelected(file) {
    const statusEl = document.getElementById("pmReceiptStatus");
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast(
        currentLang === "ar" ? "حجم الملف كبير جداً" : "File too large",
        currentLang === "ar" ? "الحد الأقصى للإيصال 5 ميجابايت" : "Maximum allowed size is 5MB",
        true
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = String(ev.target?.result || "");
      uploadedReceipt = {
        url: "",
        name: file.name || "receipt.jpg",
        type: file.type || "image/jpeg",
        base64: dataUrl
      };

      if (statusEl) {
        statusEl.textContent =
          currentLang === "ar" ? `جاري رفع الإيصال: ${file.name}...` : `Uploading receipt: ${file.name}...`;
        statusEl.className = "text-[11px] font-semibold mt-1.5 text-azure";
        statusEl.classList.remove("hidden");
      }

      try {
        const upRes = await fetch("/api/academy/receipt-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            fileBase64: dataUrl
          })
        });
        const upData = await upRes.json();
        if (upRes.ok && upData.ok && upData.receiptUrl) {
          uploadedReceipt.url = upData.receiptUrl;
          uploadedReceipt.type = upData.contentType || uploadedReceipt.type;
          if (statusEl) {
            statusEl.textContent =
              currentLang === "ar"
                ? `✓ تم رفع الإيصال بنجاح: ${file.name}`
                : `✓ Receipt uploaded securely: ${file.name}`;
            statusEl.className = "text-[11px] font-semibold mt-1.5 text-emerald-600 dark:text-emerald-400";
          }
        } else {
          throw new Error(upData.error || "Upload failed");
        }
      } catch (err) {
        if (statusEl) {
          statusEl.textContent =
            currentLang === "ar"
              ? `✓ تم تجهيز الملف (${file.name}) وسيُرفق مع الطلب`
              : `✓ File staged (${file.name}) for submission`;
          statusEl.className = "text-[11px] font-semibold mt-1.5 text-amber-600 dark:text-amber-400";
        }
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleCheckoutSubmit(event) {
    event.preventDefault();
    if (!currentModalProduct) return;

    const form = event.currentTarget;
    const submitBtn = document.getElementById("pmSubmitBtn");
    const fullName = form.elements.fullName?.value.trim() || "";
    const email = form.elements.email?.value.trim() || "";
    const whatsapp = form.elements.whatsapp?.value.trim() || "";
    const city = form.elements.city?.value.trim() || "";

    const isInquiry = currentModalProduct.isInquiry;
    const paymentProvider = isInquiry
      ? "Inquiry"
      : activePayMethod === "whop"
      ? "Whop"
      : "CliQ / Western Union";

    if (!isInquiry && activePayMethod === "cliq" && !uploadedReceipt.url && !uploadedReceipt.base64) {
      showToast(
        currentLang === "ar" ? "الإيصال مطلوب" : "Receipt Required",
        currentLang === "ar"
          ? "يرجى إرفاق صورة أو ملف إيصال التحويل البنكي أولاً"
          : "Please upload your transfer receipt first",
        true
      );
      return;
    }

    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await fetch("/api/academy/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone: whatsapp,
          city,
          courseId: currentModalProduct.id,
          courseName: currentModalProduct.title,
          promoCode: appliedPromo.code,
          paymentProvider,
          receiptUrl: uploadedReceipt.url,
          receiptName: uploadedReceipt.name,
          receiptType: uploadedReceipt.type,
          receiptBase64: uploadedReceipt.url ? "" : uploadedReceipt.base64,
          language: currentLang
        })
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Unable to complete registration");
      }

      const formWrap = document.getElementById("pmFormContainer");
      const successPanel = document.getElementById("pmSuccessView");
      const refEl = document.getElementById("pmSuccessRef");
      const waConfirmEl = document.getElementById("pmSuccessWaLink");

      if (refEl) refEl.textContent = data.reference;
      if (waConfirmEl) {
        const waText =
          currentLang === "ar"
            ? `مرحباً فريق 7Z، أتممت التسجيل برقم المرجع (${data.reference}) للمنتج: ${currentModalProduct.title} | المبلغ: $${data.finalPriceUsd} USD | البريد: ${email}`
            : `Hello 7Z Team, I completed registration Ref (${data.reference}) for: ${currentModalProduct.title} | Amount: $${data.finalPriceUsd} USD | Email: ${email}`;
        waConfirmEl.href = `https://wa.me/${OFFICIAL_WA_NUMBER}?text=${encodeURIComponent(waText)}`;
      }

      if (formWrap) formWrap.classList.add("hidden");
      if (successPanel) successPanel.classList.remove("hidden");

      if (activePayMethod === "whop" && !isInquiry) {
        const targetWhop = data.whopUrl || currentModalProduct.whopUrl || WHOP_URLS.storeMain;
        window.open(targetWhop, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      showToast(
        currentLang === "ar" ? "تعذر إرسال الطلب" : "Submission Error",
        err.message || (currentLang === "ar" ? "تأكد من البيانات وحاول مجدداً" : "Check details and try again"),
        true
      );
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  async function handleWaitlistSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitBtn = form.querySelector('button[type="submit"]');
    const payload = {
      productId: document.getElementById("waitlistProductId")?.value || "agent-architect",
      productTitle: document.getElementById("waitlistProductTitle")?.textContent || "",
      fullName: form.elements.fullName?.value.trim() || "",
      email: form.elements.email?.value.trim() || "",
      whatsapp: form.elements.whatsapp?.value.trim() || "",
      discipline: form.elements.discipline?.value || ""
    };

    if (submitBtn) submitBtn.disabled = true;
    try {
      const res = await fetch("/api/academy/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to register waitlist");
      }
      form.reset();
      closeModal("waitlistModal");
      showToast(
        currentLang === "ar" ? `تم تسجيلك بنجاح (${data.reference})` : `VIP Registration Confirmed (${data.reference})`,
        currentLang === "ar"
          ? "تم حفظ بياناتك وإرسال تأكيد لبريدك الإلكتروني وظهورك في قائمة الانتظار."
          : "Your seat is saved in our system and confirmation was sent to your email."
      );
    } catch (err) {
      showToast(
        currentLang === "ar" ? "تعذر حفظ التسجيل" : "Waitlist Error",
        err.message || "Please try again.",
        true
      );
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  async function handleLeadMagnetSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitBtn = form.querySelector('button[type="submit"]');
    const payload = {
      assetId: form.elements.assetId?.value.trim() || "prompt-vault",
      assetTitle: form.elements.assetTitle?.value.trim() || "",
      fullName: form.elements.fullName?.value.trim() || "",
      email: form.elements.email?.value.trim() || "",
      whatsapp: form.elements.whatsapp?.value.trim() || "",
      language: currentLang
    };

    if (submitBtn) submitBtn.disabled = true;
    try {
      const res = await fetch("/api/academy/lead-magnet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to send download link");
      }
      form.reset();
      const successBox = document.getElementById("leadModalSuccess");
      const successMsg = document.getElementById("leadModalSuccessMsg");
      const successRef = document.getElementById("leadModalSuccessRef");
      const confirmTextAr = "تم إرسال رابط التحميل المباشر إلى بريدك الإلكتروني بنجاح! يرجى تفقد صندوق الوارد (أو الرسائل غير المرغوب فيها).";
      const confirmTextEn = "The direct download link has been sent to your email! Please check your inbox (or spam/junk folder).";

      if (successBox && successMsg) {
        form.classList.add("hidden");
        successMsg.textContent = currentLang === "ar" ? confirmTextAr : confirmTextEn;
        if (successRef) successRef.textContent = data.reference ? `REF: ${data.reference}` : "";
        successBox.classList.remove("hidden");
      } else {
        closeModal("leadMagnetModal");
      }

      showToast(
        currentLang === "ar" ? `تم الإرسال بنجاح (${data.reference})` : `Download Link Sent (${data.reference})`,
        currentLang === "ar" ? confirmTextAr : confirmTextEn
      );
    } catch (err) {
      showToast(
        currentLang === "ar" ? "تعذر تفعيل الرابط" : "Request Error",
        err.message || "Please try again.",
        true
      );
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  // Interactive Mode Tour (Manual Trigger ONLY — zero auto-run on page load)
  let tourActive = false;
  let tourStepTimeouts = [];
  let preTourState = null;

  const tourSteps = [
    {
      theme: "dark",
      lang: "ar",
      badge: "🌙 الوضع الداكن · عربي",
      title: "تجربة الوضع الداكن السينمائي 🌙",
      desc: "ألوان أوبسيديان فخمة مع توهج نيوني جليدي وانعكاسات زجاجية فائقة العمق.",
      ticker: "استعراض الدارك مود السينمائي..."
    },
    {
      theme: "dark",
      lang: "en",
      badge: "🌐 English · Dark Mode",
      title: "Global English Luxury Interface 🌐",
      desc: "Precision bilingual typography and international layout with real-time currency conversion.",
      ticker: "Switching language to English..."
    },
    {
      theme: "light",
      lang: "en",
      badge: "☀️ Light Mode · English",
      title: "Pure Crystal Light Mode ☀️",
      desc: "High-key architectural clarity, frosted platinum glass caustics, and crisp daylight contrast.",
      ticker: "Switching theme to Light Mode..."
    },
    {
      theme: "light",
      lang: "ar",
      badge: "✨ الوضع المضيء · عربي",
      title: "تم استعراض جميع الأوضاع ✨",
      desc: "استعدنا لك الآن إعداداتك المفضلة لتتصفح المتجر والدورات براحة تامة.",
      ticker: "اكتملت الجولة الاستعراضية بنجاح!"
    }
  ];

  function clearTourTimeouts() {
    tourStepTimeouts.forEach((t) => clearTimeout(t));
    tourStepTimeouts = [];
  }

  function runTourStep(stepIdx) {
    if (!tourActive) return;
    const step = tourSteps[stepIdx];
    if (!step) return;
    setTheme(step.theme, false);
    switchLanguage(step.lang, false);

    const badgeEl = document.getElementById("tourPillBadge");
    const counterEl = document.getElementById("tourStepCounter");
    const titleEl = document.getElementById("tourTitle");
    const descEl = document.getElementById("tourDesc");
    const tickerEl = document.getElementById("tourStatusTicker");

    if (badgeEl) badgeEl.textContent = step.badge;
    if (counterEl) counterEl.textContent = `خطوة ${stepIdx + 1} من 4`;
    if (titleEl) titleEl.textContent = step.title;
    if (descEl) descEl.textContent = step.desc;
    if (tickerEl) tickerEl.textContent = step.ticker;

    for (let i = 1; i <= 4; i++) {
      const seg = document.querySelector(`#tourSeg${i} > div`);
      if (seg) seg.style.width = i <= stepIdx + 1 ? "100%" : "0%";
    }
  }

  function finishTour() {
    tourActive = false;
    clearTourTimeouts();
    if (preTourState) {
      setTheme(preTourState.theme, false);
      switchLanguage(preTourState.lang, false);
      preTourState = null;
    }
    const modal = document.getElementById("tourShowcaseModal");
    const capsule = document.getElementById("tourCapsule");
    if (modal && capsule) {
      capsule.classList.remove("scale-100");
      capsule.classList.add("scale-95");
      modal.classList.remove("opacity-100", "pointer-events-auto");
      modal.classList.add("opacity-0", "pointer-events-none");
    }
  }

  function startTour() {
    if (tourActive) return;
    preTourState = { theme: currentTheme, lang: currentLang };
    tourActive = true;
    const modal = document.getElementById("tourShowcaseModal");
    const capsule = document.getElementById("tourCapsule");
    if (!modal || !capsule) return;

    modal.classList.remove("opacity-0", "pointer-events-none");
    modal.classList.add("opacity-100", "pointer-events-auto");
    capsule.classList.remove("scale-95");
    capsule.classList.add("scale-100");
    clearTourTimeouts();

    tourStepTimeouts.push(setTimeout(() => runTourStep(0), 600));
    tourStepTimeouts.push(setTimeout(() => runTourStep(1), 2800));
    tourStepTimeouts.push(setTimeout(() => runTourStep(2), 5000));
    tourStepTimeouts.push(setTimeout(() => runTourStep(3), 7200));
    tourStepTimeouts.push(setTimeout(() => finishTour(), 9500));
  }

  function bindAllEvents() {
    document.addEventListener("click", (e) => {
      const catEl = e.target.closest("[data-cat-trigger]");
      if (catEl) {
        setCategory(catEl.getAttribute("data-cat-trigger"));
        return;
      }

      const langEl = e.target.closest("[data-lang-trigger]");
      if (langEl) {
        const targetLang = langEl.getAttribute("data-lang-trigger");
        switchLanguage(targetLang === "toggle" ? (currentLang === "ar" ? "en" : "ar") : targetLang);
        return;
      }

      const prodEl = e.target.closest("[data-open-product]");
      if (prodEl) {
        const id = prodEl.getAttribute("data-open-product");
        const title = prodEl.getAttribute("data-product-title") || id;
        const price = Number(prodEl.getAttribute("data-product-price") || 0);
        openProductModal(title, id, price);
        return;
      }

      const waitEl = e.target.closest("[data-open-waitlist]");
      if (waitEl) {
        const id = waitEl.getAttribute("data-open-waitlist");
        const title = waitEl.getAttribute("data-waitlist-title") || id;
        openWaitlistModal(title, id);
        return;
      }

      const leadBtn = e.target.closest("[data-open-lead-magnet]");
      if (leadBtn) {
        e.preventDefault();
        const rawAsset = leadBtn.getAttribute("data-open-lead-magnet") || "prompt-vault";
        const assetId = rawAsset === "true" ? "prompt-vault" : rawAsset;
        const assetTitle = leadBtn.getAttribute("data-lead-title") || "";
        openLeadMagnetModal(assetId, assetTitle);
        return;
      }

      const closeEl = e.target.closest("[data-close-modal]");
      if (closeEl) {
        closeModal(closeEl.getAttribute("data-close-modal"));
        return;
      }

      const copyBtn = e.target.closest("[data-copy-text]");
      if (copyBtn) {
        const val = copyBtn.getAttribute("data-copy-text") || "";
        navigator.clipboard?.writeText(val).then(() => {
          showToast(currentLang === "ar" ? "تم النسخ ✓" : "Copied ✓", val);
        }).catch(() => {});
        return;
      }

      if (e.target.closest("[data-toggle-whop-guides]")) {
        const panel = document.getElementById("whopGuidesDrawer");
        if (panel) panel.classList.toggle("hidden");
        return;
      }
    });

    document.getElementById("themeToggleBtn")?.addEventListener("click", toggleTheme);
    document.getElementById("soundToggleBtn")?.addEventListener("click", toggleVideoSound);
    document.getElementById("btnTourReplay")?.addEventListener("click", startTour);
    document.getElementById("mobileTourBtn")?.addEventListener("click", () => {
      const drawer = document.getElementById("mobileNavDrawer");
      const toggle = document.getElementById("mobileMenuToggle");
      if (drawer) {
        drawer.classList.add("hidden");
        drawer.setAttribute("aria-hidden", "true");
      }
      if (toggle) toggle.setAttribute("aria-expanded", "false");
      startTour();
    });
    const mobileToggle = document.getElementById("mobileMenuToggle");
    const mobileDrawer = document.getElementById("mobileNavDrawer");
    if (mobileToggle && mobileDrawer) {
      mobileToggle.addEventListener("click", () => {
        const isOpen = !mobileDrawer.classList.contains("hidden");
        mobileDrawer.classList.toggle("hidden", isOpen);
        mobileDrawer.setAttribute("aria-hidden", String(isOpen));
        mobileToggle.setAttribute("aria-expanded", String(!isOpen));
      });
      mobileDrawer.querySelectorAll("a, button").forEach((el) => {
        el.addEventListener("click", () => {
          mobileDrawer.classList.add("hidden");
          mobileDrawer.setAttribute("aria-hidden", "true");
          mobileToggle.setAttribute("aria-expanded", "false");
        });
      });
    }
    document.querySelectorAll("[data-skip-tour]").forEach((el) => el.addEventListener("click", finishTour));
    document.getElementById("searchInput")?.addEventListener("input", applyProductFilters);
    document.getElementById("resetFiltersBtn")?.addEventListener("click", () => {
      const inp = document.getElementById("searchInput");
      if (inp) inp.value = "";
      setCategory("all");
    });
    document.getElementById("currencySelector")?.addEventListener("change", (e) => changeCurrency(e.currentTarget.value));
    document.getElementById("prevMobileCardBtn")?.addEventListener("click", prevMobileCard);
    document.getElementById("nextMobileCardBtn")?.addEventListener("click", nextMobileCard);

    document.getElementById("pmTabCliq")?.addEventListener("click", () => setPayMethod("cliq"));
    document.getElementById("pmTabWhop")?.addEventListener("click", () => setPayMethod("whop"));
    document.getElementById("pmApplyPromoBtn")?.addEventListener("click", applyPromoCode);
    document.getElementById("pmReceiptFile")?.addEventListener("change", (e) => {
      const file = e.currentTarget.files?.[0];
      if (file) handleReceiptFileSelected(file);
    });

    document.getElementById("productCheckoutForm")?.addEventListener("submit", handleCheckoutSubmit);
    document.getElementById("waitlistForm")?.addEventListener("submit", handleWaitlistSubmit);
    document.getElementById("leadMagnetForm")?.addEventListener("submit", handleLeadMagnetSubmit);

    ["productModal", "waitlistModal", "leadMagnetModal"].forEach((id) => {
      const modalEl = document.getElementById(id);
      if (modalEl) {
        modalEl.addEventListener("click", (e) => {
          if (e.target === modalEl) closeModal(id);
        });
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeModal("waitlistModal");
        closeModal("leadMagnetModal");
        closeModal("productModal");
      }
    });

    const pGrid = document.getElementById("productsGrid");
    if (pGrid) {
      pGrid.addEventListener(
        "scroll",
        () => {
          if (window.innerWidth >= 640 || mobile3DTicking) return;
          mobile3DTicking = true;
          window.requestAnimationFrame(() => {
            updateMobile3DCarousel();
            mobile3DTicking = false;
          });
        },
        { passive: true }
      );
    }
    window.addEventListener("resize", () => {
      if (window.innerWidth < 640) updateMobile3DCarousel();
    });
  }

  function boot() {
    setTheme(currentTheme, false);
    switchLanguage(currentLang, false);
    changeCurrency(currentCurrency);
    setCategory("all");
    bindAllEvents();

    const vLight = document.getElementById("heroCinemaPlayerLight");
    const vDark = document.getElementById("heroCinemaPlayerDark");
    if (vLight && vLight.paused) vLight.play().catch(() => {});
    if (vDark && vDark.paused) vDark.play().catch(() => {});

    if (window.innerWidth < 640) {
      setTimeout(updateMobile3DCarousel, 180);
    }

    setInterval(() => {
      const el = document.getElementById("kineticWord");
      if (!el || !kineticWords[currentLang]) return;
      el.style.opacity = "0";
      el.style.transform = "translateY(16px)";
      setTimeout(() => {
        kineticIndex = (kineticIndex + 1) % kineticWords[currentLang].length;
        el.textContent = kineticWords[currentLang][kineticIndex];
        el.style.opacity = "1";
        el.style.transform = "translateY(0px)";
      }, 300);
    }, 2800);

    setTimeout(() => {
      const ribbon = document.getElementById("topNotificationRibbon");
      if (ribbon) {
        ribbon.classList.remove("opacity-100", "translate-y-0");
        ribbon.classList.add("opacity-0", "-translate-y-4");
        setTimeout(() => ribbon.remove(), 700);
      }
    }, 3000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
