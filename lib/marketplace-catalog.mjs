/**
 * Canonical 7Z Magic Digital Marketplace & Academy Catalog (USD Base Currency)
 * Single source of truth for pricing, product types, aliases, and official Whop links.
 */

export const BASE_CURRENCY = "USD";

export const OFFICIAL_WHOP_URLS = Object.freeze({
  storeMain: "https://whop.com/7z-magic/7z-magic-b0/",
  visualStorytellingBundle:
    "https://whop.com/7z-magic/7z-magic-visual-storytelling-library-5-practical-guides-english/",
  guides: [
    {
      id: "guide-architecture-in-motion",
      titleEn: "Architecture in Motion: Presenting Spaces Through Visual Storytelling",
      titleAr: "العمارة المتحركة: تقديم الفراغات عبر السرد البصري",
      url: "https://whop.com/7z-magic/architecture-in-motion-presenting-spaces-through-visual-storytelling-english/",
    },
    {
      id: "guide-better-brand-content",
      titleEn: "A Simple Guide to Better Brand Content",
      titleAr: "دليل عملي لصناعة محتوى علامة تجارية أفضل",
      url: "https://whop.com/7z-magic/a-simple-guide-to-better-brand-content-english/",
    },
    {
      id: "guide-product-reels",
      titleEn: "Product Reels That Sell: A Short-Form Video Playbook",
      titleAr: "ريلز المنتجات التي تبيع: دليل الفيديو القصير",
      url: "https://whop.com/7z-magic/product-reels-that-sell-a-short-form-video-playbook-english/",
    },
    {
      id: "guide-brand-identity-workbook",
      titleEn: "The Small Brand Identity Workbook",
      titleAr: "كراس بناء الهوية البصرية للمشاريع الناشئة",
      url: "https://whop.com/7z-magic/the-small-brand-identity-workbook-english/",
    },
    {
      id: "guide-ai-visuals-small-brands",
      titleEn: "AI Visuals for Small Brands: A Practical Starter Guide",
      titleAr: "المرئيات بالذكاء الاصطناعي للعلامات التجارية",
      url: "https://whop.com/7z-magic/ai-visuals-for-small-brands-a-practical-starter-guide/",
    },
  ],
  extraProductUrls: [
    "https://whop.com/7z-magic/ace81d97-c3aa-4f95-af90-cf8bf278a8c8/",
    "https://whop.com/7z-magic/b4ab25ad-b0f1-4af6-8412-f8109e03c153/",
    "https://whop.com/7z-magic/a8031cac-2e08-40b0-b167-15bc50f469a8/",
    "https://whop.com/7z-magic/3683a83d-6ed7-4f86-900d-f1aa9e1c81f2/",
    "https://whop.com/7z-magic/2eed5665-77a7-416b-b40d-cf3c01165deb/",
  ],
});

export const MARKETPLACE_PRODUCTS = Object.freeze({
  "ai-engineering": {
    id: "ai-engineering",
    aliases: ["course-eng", "ai-engineers", "ai-for-engineers"],
    category: "academy",
    type: "course",
    priceUsd: 149,
    capacity: 40,
    nameEn: "AI for Architects & Engineers Masterclass",
    nameAr: "ماستر كلاس الذكاء الاصطناعي للمهندسين والمعماريين",
    deliveryNoteEn: "Recorded course access activated after admin verification.",
    deliveryNoteAr: "تفعيل الوصول للدورة المسجلة فور اعتماد الإدارة للطلب.",
    detailUrl: "/marketplace/ai-for-engineers/",
    whopUrl: OFFICIAL_WHOP_URLS.storeMain,
  },
  "cinematic-film": {
    id: "cinematic-film",
    aliases: ["course-film", "cinematic-filmmaking-with-ai"],
    category: "academy",
    type: "course",
    priceUsd: 199,
    capacity: 60,
    nameEn: "AI Cinema & Filmmaking Masterclass",
    nameAr: "ماستر كلاس صناعة الأفلام والإعلانات بالـ AI",
    deliveryNoteEn: "Recorded course access activated after admin verification.",
    deliveryNoteAr: "تفعيل الوصول للدورة المسجلة فور اعتماد الإدارة للطلب.",
    detailUrl: "/marketplace/cinematic-filmmaking-with-ai/",
    whopUrl: OFFICIAL_WHOP_URLS.storeMain,
  },
  "course-content": {
    id: "course-content",
    aliases: [],
    category: "academy",
    type: "course",
    priceUsd: 129,
    capacity: 500,
    nameEn: "Content Creation & Monetization Masterclass",
    nameAr: "ماستر كلاس صناعة المحتوى وبناء مصادر الدخل",
    deliveryNoteEn: "Course access credentials sent upon payment verification.",
    deliveryNoteAr: "يتم إرسال بيانات الدخول للدورة فور التحقق من الدفع.",
    whopUrl: OFFICIAL_WHOP_URLS.storeMain,
  },
  "course-web": {
    id: "course-web",
    aliases: [],
    category: "academy",
    type: "course",
    priceUsd: 159,
    capacity: 500,
    nameEn: "AI Web Platforms & SaaS Engineering",
    nameAr: "ماستر كلاس بناء المنصات والمواقع الذكية بالـ AI",
    deliveryNoteEn: "Course access credentials sent upon payment verification.",
    deliveryNoteAr: "يتم إرسال بيانات الدخول للدورة فور التحقق من الدفع.",
    whopUrl: OFFICIAL_WHOP_URLS.storeMain,
  },
  "course-foundations": {
    id: "course-foundations",
    aliases: ["ai-foundations-bundle"],
    category: "academy",
    type: "bundle_manual",
    priceUsd: 35,
    originalPriceUsd: 125,
    capacity: 1000,
    nameEn: "AI Foundations & Complete Masterclass Bundle (1.4GB)",
    nameAr: "الحقيبة التدريبية الكبرى لتأسيس الذكاء الاصطناعي (1.4GB)",
    deliveryNoteEn:
      "After registration & payment review, our team sends your direct 1.4GB bundle download link via Email/WhatsApp.",
    deliveryNoteAr:
      "بعد إتمام التسجيل ومراجعة الدفع، يرسل لك فريقنا رابط تنزيل الحقيبة الكاملة (1.4GB) مباشرة عبر البريد أو الواتساب.",
    whopUrl: OFFICIAL_WHOP_URLS.storeMain,
  },
  "agent-editor": {
    id: "agent-editor",
    aliases: [],
    category: "agents",
    type: "agent",
    billingCycle: "monthly",
    priceUsd: 49,
    capacity: 1000,
    nameEn: "Smart Video Editor AI Assistant",
    nameAr: "المونتير الذكي لصناع المحتوى (Video Editor AI)",
    deliveryNoteEn: "Activation instructions sent via email/WhatsApp after confirmation.",
    deliveryNoteAr: "تُرسل تعليمات التفعيل والوصول عبر البريد والواتساب بعد التأكيد.",
    whopUrl: OFFICIAL_WHOP_URLS.extraProductUrls[0],
  },
  "agent-shorts": {
    id: "agent-shorts",
    aliases: [],
    category: "agents",
    type: "agent",
    billingCycle: "monthly",
    priceUsd: 29,
    capacity: 1000,
    nameEn: "YouTube to Viral Shorts & Reels AI",
    nameAr: "صانع الريلز والشورتات الفيروسي (YouTube to Shorts)",
    deliveryNoteEn: "Activation instructions sent via email/WhatsApp after confirmation.",
    deliveryNoteAr: "تُرسل تعليمات التفعيل والوصول عبر البريد والواتساب بعد التأكيد.",
    whopUrl: OFFICIAL_WHOP_URLS.extraProductUrls[1],
  },
  "agent-prop": {
    id: "agent-prop",
    aliases: [],
    category: "agents",
    type: "agent",
    billingCycle: "one-time",
    priceUsd: 69,
    capacity: 1000,
    nameEn: "Professional Proposal & Pitch Architect",
    nameAr: "صانع عروض الأسعار والصفقات (B2B Proposal Closer)",
    deliveryNoteEn: "License & access setup sent via email/WhatsApp after confirmation.",
    deliveryNoteAr: "يُرسل الترخيص وتفاصيل التفعيل عبر البريد والواتساب بعد التأكيد.",
    whopUrl: OFFICIAL_WHOP_URLS.extraProductUrls[2],
  },
  "digital-vault": {
    id: "digital-vault",
    aliases: ["p12", "whop-books"],
    category: "skills",
    type: "digital",
    priceUsd: 25,
    capacity: 5000,
    nameEn: "The 7Z Digital Vault (5-Handbook Suite)",
    nameAr: "موسوعة الكتب الرقمية الخمسة المعتمدة (The 7Z Vault)",
    deliveryNoteEn: "Instant card checkout on Whop or local transfer registration.",
    deliveryNoteAr: "شراء فوري بالبطاقة عبر Whop أو تسجيل عبر التحويل المحلي.",
    whopUrl: OFFICIAL_WHOP_URLS.storeMain,
  },
  "skill-pack": {
    id: "skill-pack",
    aliases: [],
    category: "skills",
    type: "digital",
    priceUsd: 39,
    capacity: 5000,
    nameEn: "Autonomous Developer Skill Packs",
    nameAr: "حزم المهارات والقواعد البرمجية الجاهزة (Skill Packs)",
    deliveryNoteEn: "Package delivery link sent via email/WhatsApp upon payment verification.",
    deliveryNoteAr: "يُرسل رابط تسليم الحزمة عبر البريد والواتساب فور اعتماد الدفع.",
    whopUrl: OFFICIAL_WHOP_URLS.extraProductUrls[3],
  },
  "acc-fb-monetized": {
    id: "acc-fb-monetized",
    aliases: [],
    category: "accounts",
    type: "account_inquiry",
    priceUsd: 0,
    isInquiry: true,
    capacity: 500,
    nameEn: "Facebook Monetized Accounts",
    nameAr: "حسابات وصفحات فيسبوك مفعّلة الأرباح",
    deliveryNoteEn: "Our advisory team will contact you with available verified inventory and pricing.",
    deliveryNoteAr: "سيتواصل معك فريقنا بتفاصيل الحسابات المتوفرة والأسعار وآلية التسليم الموثقة.",
    whopUrl: OFFICIAL_WHOP_URLS.extraProductUrls[4],
  },
  "acc-yt-monetized": {
    id: "acc-yt-monetized",
    aliases: [],
    category: "accounts",
    type: "account_inquiry",
    priceUsd: 0,
    isInquiry: true,
    capacity: 500,
    nameEn: "YouTube Monetized Channels",
    nameAr: "قنوات يوتيوب مفعّلة الدخل رسمياً (YPP)",
    deliveryNoteEn: "Our advisory team will contact you with available YPP channels and pricing.",
    deliveryNoteAr: "سيتواصل معك فريقنا بتفاصيل القنوات المتاحة والأسعار وآلية نقل الملكية.",
    whopUrl: OFFICIAL_WHOP_URLS.storeMain,
  },
  "acc-tt-monetized": {
    id: "acc-tt-monetized",
    aliases: [],
    category: "accounts",
    type: "account_inquiry",
    priceUsd: 0,
    isInquiry: true,
    capacity: 500,
    nameEn: "TikTok Monetized Accounts",
    nameAr: "حسابات تيكتوك مفعّلة صندوق المبدعين",
    deliveryNoteEn: "Our advisory team will contact you with available accounts and pricing.",
    deliveryNoteAr: "سيتواصل معك فريقنا بتفاصيل الحسابات المتوفرة والأسعار.",
    whopUrl: OFFICIAL_WHOP_URLS.storeMain,
  },
  "agent-architect": {
    id: "agent-architect",
    aliases: [],
    category: "agents",
    type: "waitlist",
    priceUsd: 99,
    originalPriceUsd: 199,
    nameEn: "Smart Architect AI Assistant (AutoCAD & 3D MAX)",
    nameAr: "المهندس المعماري الذكي (AutoCAD & 3D MAX Agent)",
  },
  "agent-fin": {
    id: "agent-fin",
    aliases: [],
    category: "agents",
    type: "waitlist",
    priceUsd: 0,
    nameEn: "Financial Analyst & Feasibility Agent",
    nameAr: "المحلل المالي ومعد دراسات الجدوى الذكي",
  },
  "agent-camera": {
    id: "agent-camera",
    aliases: [],
    category: "agents",
    type: "waitlist",
    priceUsd: 0,
    nameEn: "Smart Camera Surveillance AI Agent",
    nameAr: "حارس الفلل والكمباوندات التنبؤي الذكي",
  },
  "agent-youtube-channel": {
    id: "agent-youtube-channel",
    aliases: [],
    category: "agents",
    type: "waitlist",
    priceUsd: 0,
    nameEn: "Autonomous YouTube Channel AI Agent",
    nameAr: "مدير قنوات يوتيوب التلقائي بالكامل",
  },
  "acc-mass-dist": {
    id: "acc-mass-dist",
    aliases: [],
    category: "accounts",
    type: "waitlist",
    priceUsd: 0,
    nameEn: "Mass Content Distribution Network",
    nameAr: "شبكة النشر والتسويق الفيروسي الشامل (1,500 حساب)",
  },
  "prompt-vault": {
    id: "prompt-vault",
    aliases: [],
    category: "free",
    type: "lead_magnet",
    priceUsd: 0,
    nameEn: "5000+ AI Prompts Master Vault",
    nameAr: "بنك البرومبتات الشامل (المكتبة الذهبية 5000+)",
    whopUrl: OFFICIAL_WHOP_URLS.visualStorytellingBundle,
  },
  "pdf-video-guide": {
    id: "pdf-video-guide",
    aliases: [],
    category: "free",
    type: "direct_pdf",
    priceUsd: 0,
    nameEn: "7Z AI Video Creation Handbook (PDF)",
    nameAr: "دليل صناعة الفيديو والمحتوى بالذكاء الاصطناعي (PDF مجاني)",
  },
});

const ALIAS_LOOKUP = new Map();
for (const product of Object.values(MARKETPLACE_PRODUCTS)) {
  ALIAS_LOOKUP.set(product.id.toLowerCase(), product);
  for (const alias of product.aliases || []) {
    ALIAS_LOOKUP.set(String(alias).toLowerCase(), product);
  }
}

export function normalizeProductId(rawId) {
  const key = String(rawId || "").trim().toLowerCase();
  if (!key) return "cinematic-film";
  const matched = ALIAS_LOOKUP.get(key);
  if (matched) return matched.id;
  if (key.includes("engineer")) return "ai-engineering";
  if (key.includes("film")) return "cinematic-film";
  return key;
}

export function resolveProduct(rawId) {
  const canonicalId = normalizeProductId(rawId);
  return MARKETPLACE_PRODUCTS[canonicalId] || null;
}

export function resolveProductPriceUsd(rawId, fallback = 0) {
  const product = resolveProduct(rawId);
  if (!product) return Number(fallback || 0);
  return Number(product.priceUsd || 0);
}

export function roundMoney(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
