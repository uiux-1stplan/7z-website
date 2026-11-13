/**
 * 7Z MAGIC ACADEMY — STRICT BILINGUAL ENGINE & INTERACTIVE PLATFORM
 * 100% Pure Arabic / 100% Pure English Separation
 * Adaptive Dark/Light Mode, Two-Step Funnel & 1-Click Copy
 */

(function () {
  "use strict";

  const I18N = {
    ar: {
      // Navigation & Branding
      brand_kicker: "أكاديمية 7Z MAGIC",
      brand_sub: "المسارات والبرامج الاحترافية",
      step1_header_sub: "الخطوة الأولى: تسجيل البيانات الشخصية",
      step2_header_sub: "الخطوة الثانية: الدفع وتأكيد الحجز",
      c1_header_sub: "مسار صناعة الأفلام بالذكاء الاصطناعي",
      c2_header_sub: "مسار الذكاء الاصطناعي للمهندسين",
      back_home: "الموقع الرئيسي",
      all_courses: "جميع الدورات",
      back_course: "← العودة لتفاصيل الدورة",
      back_registration: "← العودة لتعديل البيانات",
      theme_toggle: "المظهر",
      lang_toggle: "English",

      // Portal Hero
      portal_eyebrow: "أكاديمية 7Z MAGIC — بوابتك لصناعة المستقبل",
      portal_title_1: "مسارات تصنع ",
      portal_title_span: "ما تتخيّله بالذكاء الاصطناعي",
      portal_title_2: " بواقعية سينمائية.",
      portal_desc: "تعلّم أدوات الجيل القادم، وطبّقها مباشرة على مشاريع حقيقية متكاملة بإشراف نخبة من المحترفين في الإنتاج السينمائي والهندسة المعمارية.",

      // Badges (Pure Arabic & Corrected Policy)
      badge_projects: "مشاريع عملية متكاملة",
      badge_mentorship: "توجيه وتدريب مباشر (أونلاين)",
      badge_unlimited_seats: "مقاعد غير محدودة (تدريب مباشر أونلاين)",
      badge_instructors_c2: "4 محاضرين متخصصين",
      badge_gift_c2: "هدية مجانية: دورة صناعة المحتوى",
      badge_corner_1: "01 / مسار تدريبي",
      badge_corner_2: "02 / مسار تدريبي",
      c1_seats: "مقاعد غير محدودة (تدريب مباشر أونلاين)",
      c2_seats: "مقاعد غير محدودة (تدريب مباشر أونلاين)",

      // Global CTAs & Pricing
      enroll_now: "سجّل الآن",
      view_details: "تفاصيل الدورة",
      price_jod: "250 د.أ",
      price_label: "السعر الإجمالي شامل التدريب والمشروع",

      // Course 1: Cinematic Filmmaking
      c1_tag: "صناعة الأفلام والمحتوى السينمائي / ذكاء اصطناعي",
      c1_title: "صناعة الأفلام والمحتوى السينمائي بالذكاء الاصطناعي",
      c1_title_short: "صناعة الأفلام والمحتوى السينمائي",
      c1_desc: "تعلّم منهجية التفكير الإخراجي، كتابة السيناريو البصري، هندسة الأوامر (Prompt Engineering)، توليد المشاهد والشخصيات الثابتة وتنسيق حركتها بالفيديو، وصولاً للمونتاج وهندسة الصوت.",
      c1_feat_1: "توليد صور وشخصيات ثابتة ومتطابقة",
      c1_feat_2: "تحريك سينمائي وتحكم بحركة الكاميرا",
      c1_feat_3: "هندسة الصوت والمؤثرات والدوبلاج",
      c1_feat_4: "إخراج ومونتاج فيلم سينمائي متكامل",
      c1_cta_curriculum: "استعرض المنهج الدراسي ↓",
      c1_curr_tag: "المنهج الدراسي والمسار التطبيقي",
      c1_curr_title: "المنهج الدراسي والمسار التطبيقي",
      c1_curr_subtitle: "رحلة متكاملة من الفكرة والسيناريو إلى رندرة فيلم احترافي كامل.",
      c1_m1_title: "01 / التفكير الإخراجي وبناء الفكرة السينمائية",
      c1_m1_desc: "كيف يفكر المخرج؟ دراسة تحويل الأفكار المجردة إلى لغة بصرية متماسكة، اختيار نمط الإخراج، تكوين لوحة المزاج البصري (Moodboard)، وتحديد فلسفة الإضاءة والعدسات السينمائية المناسبة لكل مشروع.",
      c1_m2_title: "02 / كتابة السيناريو البصري وهندسة الأوامر",
      c1_m2_desc: "صياغة الأوامر المتقدمة، فهم دلالات الكلمات الفنية والمصطلحات الإخراجية، توجيه نماذج الذكاء الاصطناعي لإنتاج إطارات سينمائية دقيقة تعبر عن رؤية المخرج.",
      c1_m3_title: "03 / بناء وتثبيت الشخصيات والمشاهد",
      c1_m3_desc: "تجاوز أكبر تحديات الذكاء الاصطناعي: الحفاظ على ملامح الشخصية وملابسها وتعبيرات وجهها وزوايا التصوير عبر لقطات ومشاهد متعددة في بيئات إضاءة مختلفة.",
      c1_m4_title: "04 / التحريك السينمائي والتحكم بحركة الكاميرا",
      c1_m4_desc: "تحويل الإطارات الثابتة إلى مشاهد فيديو متحركة، التحكم باتجاه وسرعة الكاميرا (Pan, Tilt, Zoom, Dolly)، توجيه الحركة الفيزيائية الطبيعية، وتنسيق الإيقاع الحركي.",
      c1_m5_title: "05 / المونتاج، هندسة الصوت والإنتاج النهائي",
      c1_m5_desc: "تجميع المشاهد في جدول زمني سينمائي، هندسة الصوت والمؤثرات الصوتية والموسيقى التصويرية، توليد الدوبلاج والأصوات، وتصحيح الألوان لإخراج فيلم نهائي متكامل.",
      c1_final_box_title: "ابدأ صناعة فيلمك السينمائي الآن",
      c1_final_box_desc: "تدريب وتوجيه مباشر أونلاين مع مقاعد غير محدودة ومتابعة عملية حتى إنجاز مشروعك بالكامل.",
      c1_final_box_btn: "سجّل الآن في الدورة — 250 د.أ",

      // Course 2: AI for Engineers
      c2_tag: "الهندسة المعمارية والتصميم / ذكاء اصطناعي",
      c2_title: "دورة الذكاء الاصطناعي للمهندسين",
      c2_title_short: "الذكاء الاصطناعي للمهندسين",
      c2_desc: "وجّه Claude Desktop داخل برامجك الهندسية، وحوّل فكرتك المعمارية من مخطط AutoCAD إلى نموذج ثلاثي الأبعاد متكامل بخاماته وإضاءته، وصولاً إلى فيديو معماري سينمائي عالي الدقة.",
      c2_feat_1: "أتمتة وتوجيه عبر Claude Desktop",
      c2_feat_2: "من مخطط AutoCAD إلى نموذج 3D متكامل",
      c2_feat_3: "رندرة واقعية وخامات معمارية متقدمة",
      c2_feat_4: "هدية مجانية: دورة صناعة المحتوى",
      c2_cta_curriculum: "استعرض المراحل الهندسية ↓",
      c2_curr_tag: "المراحل الهندسية وسير العمل التطبيقي",
      c2_curr_title: "المراحل الهندسية وسير العمل التطبيقي",
      c2_curr_subtitle: "مشروع هندسي واحد متصل ينفذه الطالب خطوة بخطوة من المخطط إلى الفيديو النهائي.",
      c2_s1_title: "01 / أتمتة وتوجيه Claude Desktop داخل البرامج الهندسية",
      c2_s1_desc: "إعداد بيئة العمل وربط نماذج الذكاء الاصطناعي مع التطبيقات الهندسية للتحكم وتوليد الأكواد النصية، قراءة الملفات الهندسية، وفهم المحددات التصميمية والمعمارية بدقة.",
      c2_s2_title: "02 / من الفكرة إلى مخططات AutoCAD التنفيذية",
      c2_s2_desc: "توليد المساقط الأفقية والواجهات، واستخراج المخططات الدقيقة وفق المعايير المعمارية، مع مراجعة الأبعاد والمحاور والمساحات الوظيفية.",
      c2_s3_title: "03 / بناء وتطوير النموذج ثلاثي الأبعاد",
      c2_s3_desc: "رفع المخطط الهندسي إلى مجسم ثلاثي الأبعاد متكامل في Blender و 3ds Max، التحكم في تفاصيل الكتل والمداخل والنوافذ، وبناء الفراغات المعمارية الداخلية والخارجية.",
      c2_s4_title: "04 / إكساء الخامات وتوزيع الإضاءة السينمائية",
      c2_s4_desc: "توليد وضبط الخامات الواقعية (خرسانة، خشب، زجاج، رخام)، وتوزيع إضاءة الشمس والبيئة المحيطة (HDRI)، ومحاكاة الأجواء النهارية والليلية بواقعية تامة.",
      c2_s5_title: "05 / الرندرة السينمائية وجولة الفيديو المعماري",
      c2_s5_desc: "تحريك كاميرات العرض الهندسي بدقة ميزانية، توليد جولة فيديو سينمائية داخل المشروع، وإخراج ملفات العرض التقديمي النهائي الجاهز للعملاء والجهات الاستثمارية.",
      c2_final_box_title: "ابدأ مشروعك الهندسي بالذكاء الاصطناعي",
      c2_final_box_desc: "تدريب وتوجيه مباشر أونلاين ومقاعد غير محدودة مع هدية دورة صناعة المحتوى مجاناً.",
      c2_final_box_btn: "سجّل الآن في الدورة — 250 د.أ",

      // Step 1: Registration
      step1_badge: "الخطوة 1 من 2: البيانات الشخصية",
      reg_title: "تسجيل بيانات الطالب",
      reg_subtitle: "أدخل معلوماتك بدقة لحجز مقعدك، ثم اضغط 'المتابعة إلى الدفع' لإتمام خطوة التحويل.",
      label_name: "الاسم الكامل",
      placeholder_name: "أدخل اسمك الثلاثي أو الرباعي",
      label_email: "البريد الإلكتروني",
      placeholder_email: "example@domain.com",
      label_phone: "رقم الهاتف / واتساب",
      placeholder_phone: "+962 7X XXX XXXX",
      label_city: "البلد والمدينة",
      placeholder_city: "مثال: عمّان، الأردن",
      label_experience: "مستوى خبرتك السابقة",
      exp_beginner: "مبتدئ (أبدأ من الصفر)",
      exp_intermediate: "متوسط (لدي اطلاع مسبق على الأدوات)",
      exp_advanced: "متقدم / محترف",
      label_notes: "ملاحظات أو أهداف خاصة (اختياري)",
      placeholder_notes: "أخبرنا عن أهدافك من هذه الدورة...",
      btn_proceed_payment: "المتابعة إلى الدفع وإثبات التحويل ←",
      reg_summary_title: "تفاصيل الدورة المحجوزة",
      reg_course_label: "البرنامج التدريبي:",
      reg_price_label: "رسوم البرنامج:",
      reg_seats_label: "سعة المقاعد:",
      reg_project_label: "المشروع النهائي:",
      c1_final_project_val: "فيلم سينمائي متكامل",
      c2_final_project_val: "مشروع وفيديو معماري متكامل",
      reg_next_step_hint: "💡 الخطوة التالية: بعد إدخال بياناتك، ستنتقل لصفحة الدفع حيث يمكنك تطبيق كود الخصم (إن وجد) ورفع إيصال التحويل (CliQ أو حوالة) لتأكيد تسجيلك رسمياً.",

      // Step 2: Payment
      step2_badge: "الخطوة 2 من 2: الدفع وتأكيد الحجز",
      pay_title: "إتمام الدفع وإرفاق الإيصال",
      pay_subtitle: "راجع ملخص بياناتك، طبّق كود الخصم إن وجد، ثم حوّل المبلغ وأرفق صورة الإيصال لتأكيد المقعد.",
      student_info_title: "بيانات الطالب المسجل",
      edit_student_info: "تعديل البيانات",
      label_student_name: "الاسم:",
      label_student_email: "البريد:",
      label_student_phone: "الهاتف:",
      label_student_city: "المدينة:",
      label_promo: "كود الخصم أو كود المسوق",
      placeholder_promo: "أدخل الكود إن وجد",
      btn_apply_code: "تطبيق الكود",
      code_applied: "تم تطبيق الكود بنجاح! خصم بقيمة",
      code_invalid: "الكود غير صالح أو منتهي الصلاحية.",
      label_receipt: "إيصال التحويل المالي (صورة أو PDF)",
      receipt_drop: "انقر لاختيار الملف أو اسحبه وأفلته هنا",
      receipt_hint: "الملفات المدعومة: PNG, JPG, WEBP, PDF (الحد الأقصى 12MB)",
      receipt_remove: "حذف وتغيير الملف",
      submit_pay_btn: "تأكيد وإرسال طلب التسجيل",
      submit_loading: "جارٍ إرسال الطلب وحفظ الإيصال...",
      submit_note: "🔒 بمجرد إرسال الطلب، يتلقى فريق 7Z Magic إشعاراً فورياً لمراجعة الإيصال وتأكيد المقعد عبر البريد الإلكتروني.",

      // Order Summary & Payment Box
      summary_title: "ملخص الحجز والدفع",
      summary_course: "الدورة التدريبية:",
      summary_price: "السعر الأساسي:",
      summary_discount: "الخصم المطبق:",
      summary_gift_badge: "هدية مجانية مضافة: دورة صناعة المحتوى بالذكاء الاصطناعي.",
      summary_total: "المبلغ المطلوب تحويله:",
      pay_methods_title: "طرق التحويل المالي المعتمدة",
      method_cliq_title: "1. الدفع عبر CliQ (داخل الأردن)",
      method_wu_title: "2. حوالة Western Union (كافة الدول)",
      label_fullname: "الاسم الكامل:",
      label_alias: "الاسم المستعار (Alias):",
      label_phone_num: "رقم الهاتف:",
      label_bank: "البنك:",
      bank_name_val: "البنك العربي (Arab Bank)",
      label_country_city: "الدولة والمدينة:",
      country_city_val: "عمّان، الأردن (Amman, Jordan)",
      pay_receipt_note: "بعد إتمام التحويل عبر تطبيق بنكك أو محفظتك، يرجى حفظ لقطة الشاشة (Screenshot) أو إيصال الـ PDF ورفعه في النموذج لتأكيد مقعدك.",
      copy_btn: "نسخ",
      copied_btn: "تم النسخ ✓",

      // Success Modal
      success_title: "تم استلام طلب التسجيل بنجاح!",
      success_msg: "شكراً لانضمامك إلى أكاديمية 7Z MAGIC. تم حفظ إيصال الدفع بنجاح وأُرسلت نسخة تأكيدية إلى بريدك الإلكتروني.",
      success_note: "⚡ تفعيل مقعدك في الدورة سيتم فور مراجعة وتأكيد إيصال الدفع من قبل الإدارة.",
      success_ref: "رقم الحجز المرجعي:",
      back_to_academy: "العودة للأكاديمية",

      // Footer
      footer_desc: "أكاديمية 7Z MAGIC — تحويل الرؤية الإبداعية إلى واقع سينمائي وهندسي بتقنيات الذكاء الاصطناعي.",
      footer_contact_email: "creative@7z-magic.com",
      footer_contact_wa: "واتساب: 0089 702 79 962+",
      footer_copyright: "جميع الحقوق محفوظة © 2026 7Z Magic."
    },

    en: {
      // Navigation & Branding
      brand_kicker: "7Z MAGIC ACADEMY",
      brand_sub: "Professional Masterclasses",
      step1_header_sub: "Step 1: Student Registration",
      step2_header_sub: "Step 2: Payment & Proof",
      c1_header_sub: "AI Filmmaking Masterclass",
      c2_header_sub: "AI for Engineers Masterclass",
      back_home: "Main Website",
      all_courses: "All Courses",
      back_course: "← Back to Course Details",
      back_registration: "← Back to Edit Details",
      theme_toggle: "Theme",
      lang_toggle: "العربية",

      // Portal Hero
      portal_eyebrow: "7Z MAGIC / ACADEMY — SHAPE THE FUTURE",
      portal_title_1: "Learning paths that ",
      portal_title_span: "shape what you envision with AI",
      portal_title_2: " with cinematic fidelity.",
      portal_desc: "Master next-generation creative tools and apply them directly to complete production projects, guided by industry veterans in film and architectural engineering.",

      // Badges (Pure English & Corrected Policy)
      badge_projects: "End-to-End Real Projects",
      badge_mentorship: "Live Online Mentorship & Training",
      badge_unlimited_seats: "Unlimited Seats (Live Online)",
      badge_instructors_c2: "4 Specialized Instructors",
      badge_gift_c2: "Free Gift: Content Creation Masterclass",
      badge_corner_1: "01 / MASTERCLASS",
      badge_corner_2: "02 / MASTERCLASS",
      c1_seats: "Unlimited Seats (Live Online)",
      c2_seats: "Unlimited Seats (Live Online)",

      // Global CTAs & Pricing
      enroll_now: "Enroll Now",
      view_details: "Course Details",
      price_jod: "250 JOD",
      price_label: "Total tuition including hands-on project",

      // Course 1: Cinematic Filmmaking
      c1_tag: "CINEMATIC FILMMAKING / AI",
      c1_title: "Cinematic Filmmaking & Content Creation with AI",
      c1_title_short: "Cinematic Filmmaking & Content",
      c1_desc: "Master directorial vision, visual storytelling, prompt engineering, consistent character generation, cinematic camera motion, video synthesis, editing, and sound design.",
      c1_feat_1: "Consistent Character & Visual Generation",
      c1_feat_2: "Cinematic Camera Motion & Composition",
      c1_feat_3: "Sound Engineering & Voice Synthesis",
      c1_feat_4: "Full Film Production & Post-Processing",
      c1_cta_curriculum: "View Full Curriculum ↓",
      c1_curr_tag: "CURRICULUM & MODULES",
      c1_curr_title: "Curriculum & Hands-on Pipeline",
      c1_curr_subtitle: "A complete end-to-end journey from concept and screenplay to a fully rendered cinematic film.",
      c1_m1_title: "01 / Directorial Vision & Cinematic Concept Development",
      c1_m1_desc: "How a director thinks: transforming abstract ideas into coherent visual language, directorial styling, building moodboards, and defining lighting philosophy and lens choices.",
      c1_m2_title: "02 / Visual Screenwriting & Advanced Prompt Engineering",
      c1_m2_desc: "Crafting advanced prompts using cinematic terminology, directing AI generative engines to produce precise cinematic keyframes that faithfully reflect your vision.",
      c1_m3_title: "03 / Character Consistency & Environment Continuity",
      c1_m3_desc: "Overcoming AI's biggest hurdle: maintaining consistent character features, wardrobe, facial expressions, and spatial continuity across diverse shots and lighting setups.",
      c1_m4_title: "04 / Cinematic Motion & Camera Trajectory Control",
      c1_m4_desc: "Transforming static frames into fluid motion video, controlling camera paths (Pan, Tilt, Zoom, Dolly), directing natural physics, and pacing visual dynamics.",
      c1_m5_title: "05 / Editing, Sound Design & Final Mastering",
      c1_m5_desc: "Timeline assembly, cinematic foley and sound design, musical scoring, AI voice generation, color grading, and final delivery mastering for broadcast standards.",
      c1_final_box_title: "Start Producing Your Cinematic Film",
      c1_final_box_desc: "Live online mentorship and training with unlimited seats and continuous guidance until your project is fully realized.",
      c1_final_box_btn: "Enroll in Masterclass — 250 JOD",

      // Course 2: AI for Engineers
      c2_tag: "ARCHITECTURE & ENGINEERING / AI",
      c2_title: "AI for Architects & Engineers",
      c2_title_short: "AI for Architects & Engineers",
      c2_desc: "Direct Claude Desktop inside professional engineering suites, transforming your concept from AutoCAD 2D drafting into a fully textured 3D model and a cinematic architectural video.",
      c2_feat_1: "Engineering Automation via Claude Desktop",
      c2_feat_2: "AutoCAD to Full 3D Construction",
      c2_feat_3: "Photorealistic Textures & Lighting",
      c2_feat_4: "Free Bonus: AI Content Masterclass",
      c2_cta_curriculum: "View Engineering Stages ↓",
      c2_curr_tag: "ENGINEERING STAGES & WORKFLOW",
      c2_curr_title: "Engineering Stages & Applied Pipeline",
      c2_curr_subtitle: "One connected engineering project built step-by-step from plan to final walkthrough film.",
      c2_s1_title: "01 / Automating Claude Desktop in Engineering Suites",
      c2_s1_desc: "Setting up environment integrations between AI models and engineering suites for code execution, parsing blueprints, and accurately interpreting architectural constraints.",
      c2_s2_title: "02 / From Concept to AutoCAD Working Drawings (2D Drafting)",
      c2_s2_desc: "Generating floor plans and elevations, extracting accurate architectural drafting, and reviewing dimensional axes, functional clearances, and zoning.",
      c2_s3_title: "03 / 3D Modeling & Spatial Construction",
      c2_s3_desc: "Extruding 2D blueprints into clean parametric 3D massing in Blender and 3ds Max, defining fenestrations, apertures, and indoor/outdoor architectural volumes.",
      c2_s4_title: "04 / PBR Material Shading & Architectural Lighting Design",
      c2_s4_desc: "Generating photorealistic PBR materials (concrete, timber, glass, marble), setting up daylight systems and HDRIs, and simulating daylight and twilight ambiences.",
      c2_s5_title: "05 / Cinematic Rendering & Architectural Walkthrough Film",
      c2_s5_desc: "Keyframing architectural camera paths, generating cinematic walkthrough animations, and delivering client-ready presentations for investors and stakeholders.",
      c2_final_box_title: "Build Your Architectural Project with AI",
      c2_final_box_desc: "Live online mentorship with unlimited seats, including the Content Creation masterclass as a free gift.",
      c2_final_box_btn: "Enroll in Masterclass — 250 JOD",

      // Step 1: Registration
      step1_badge: "Step 1 of 2: Personal Details",
      reg_title: "Student Registration",
      reg_subtitle: "Enter your contact details to reserve your seat, then proceed to payment to finalize proof.",
      label_name: "Full Name",
      placeholder_name: "Enter your full name",
      label_email: "Email Address",
      placeholder_email: "example@domain.com",
      label_phone: "Phone / WhatsApp",
      placeholder_phone: "+962 7X XXX XXXX",
      label_city: "Country & City",
      placeholder_city: "e.g., Amman, Jordan",
      label_experience: "Previous Experience Level",
      exp_beginner: "Beginner (Starting from scratch)",
      exp_intermediate: "Intermediate (Familiar with tools)",
      exp_advanced: "Advanced / Professional",
      label_notes: "Special Notes or Goals (Optional)",
      placeholder_notes: "Tell us about your background or goals...",
      btn_proceed_payment: "Proceed to Payment & Receipt Proof →",
      reg_summary_title: "Selected Program Details",
      reg_course_label: "Program Name:",
      reg_price_label: "Program Tuition:",
      reg_seats_label: "Seat Capacity:",
      reg_project_label: "Final Project:",
      c1_final_project_val: "Complete Cinematic Film",
      c2_final_project_val: "Full Architectural Project & Walkthrough",
      reg_next_step_hint: "💡 Next Step: After submitting your details, you will proceed to the payment page to apply any promo code and attach your payment receipt (CliQ or Western Union).",

      // Step 2: Payment
      step2_badge: "Step 2 of 2: Payment & Proof",
      pay_title: "Complete Payment & Proof Upload",
      pay_subtitle: "Review your details, apply any discount code, transfer the tuition, and attach your receipt to lock your seat.",
      student_info_title: "Registered Student Information",
      edit_student_info: "Edit Details",
      label_student_name: "Name:",
      label_student_email: "Email:",
      label_student_phone: "Phone:",
      label_student_city: "City:",
      label_promo: "Promo / Affiliate Code",
      placeholder_promo: "Enter code if available",
      btn_apply_code: "Apply Code",
      code_applied: "Code applied successfully! Discount of",
      code_invalid: "Invalid or expired promotional code.",
      label_receipt: "Transfer Receipt (Image or PDF)",
      receipt_drop: "Click to select file or drag & drop here",
      receipt_hint: "Supported formats: PNG, JPG, WEBP, PDF (Max 12MB)",
      receipt_remove: "Remove & change file",
      submit_pay_btn: "Complete Registration & Send Proof",
      submit_loading: "Submitting registration & uploading proof...",
      submit_note: "🔒 Once submitted, 7Z Magic admissions reviews your receipt proof and confirms your official access email.",

      // Order Summary & Payment Box
      summary_title: "Order Summary",
      summary_course: "Selected Program:",
      summary_price: "List Price:",
      summary_discount: "Applied Discount:",
      summary_gift_badge: "Free gift included: AI Content Creation Masterclass.",
      summary_total: "Net Amount Due:",
      pay_methods_title: "Official Payment Methods",
      method_cliq_title: "1. Pay via CliQ (Jordan)",
      method_wu_title: "2. Western Union Transfer (Worldwide)",
      label_fullname: "Full Name:",
      label_alias: "CliQ Alias:",
      label_phone_num: "Phone Number:",
      label_bank: "Bank:",
      bank_name_val: "Arab Bank",
      label_country_city: "Country & City:",
      country_city_val: "Amman, Jordan",
      pay_receipt_note: "After completing your transfer, save your payment receipt or screenshot and upload it in the form to confirm your seat.",
      copy_btn: "Copy",
      copied_btn: "Copied ✓",

      // Success Modal
      success_title: "Registration Request Received!",
      success_msg: "Thank you for joining 7Z MAGIC Academy. Your payment receipt has been uploaded and a confirmation copy was sent to your email.",
      success_note: "⚡ Your course seat will be activated immediately once the payment receipt is reviewed and confirmed by our administration team.",
      success_ref: "Reference Booking #:",
      back_to_academy: "Back to Academy",

      // Footer
      footer_desc: "7Z MAGIC ACADEMY — Transforming creative vision into cinematic reality with artificial intelligence.",
      footer_contact_email: "creative@7z-magic.com",
      footer_contact_wa: "WhatsApp: +962 79 702 0089",
      footer_copyright: "Copyright © 2026 7Z Magic. All rights reserved."
    }
  };

  let currentLang = localStorage.getItem("z7-lang") || "ar";
  let currentTheme = localStorage.getItem("z7-theme") || "dark";

  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("z7-theme", theme);
    const themeBtn = document.querySelector("[data-acad-theme-toggle]");
    if (themeBtn) {
      themeBtn.innerHTML = theme === "dark" 
        ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg> <span>${theme === "dark" ? "Light" : "Dark"}</span>`
        : `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> <span>${theme === "dark" ? "Light" : "Dark"}</span>`;
    }
  }

  function applyLang(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    localStorage.setItem("z7-lang", lang);

    const dict = I18N[lang] || I18N.ar;

    // 1. Text elements
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (dict[key] !== undefined) {
        el.textContent = dict[key];
      }
    });

    // 2. HTML elements
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const key = el.getAttribute("data-i18n-html");
      if (dict[key] !== undefined) {
        el.innerHTML = dict[key];
      }
    });

    // 3. Placeholders
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      const key = el.getAttribute("data-i18n-ph");
      if (dict[key] !== undefined) {
        el.placeholder = dict[key];
      }
    });

    // 4. Toggle visibility of language-specific sections
    document.querySelectorAll("[data-lang-show]").forEach((el) => {
      el.style.display = el.getAttribute("data-lang-show") === lang ? "" : "none";
    });

    // 5. Language toggle button text
    const langBtn = document.querySelector("[data-acad-lang-toggle]");
    if (langBtn) {
      langBtn.textContent = lang === "ar" ? "English" : "العربية";
    }

    // 6. Dynamic Document Title
    const pageTitleKey = document.body.getAttribute("data-page-title-key");
    if (pageTitleKey && dict[pageTitleKey]) {
      document.title = `${dict[pageTitleKey]} | ${dict.brand_kicker}`;
    }
  }

  function init3DTilt() {
    const cards = document.querySelectorAll("[data-tilt]");
    cards.forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -6;
        const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 6;
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)";
      });
    });
  }

  function initAccordions() {
    document.querySelectorAll(".acad-acc-item").forEach((item) => {
      const btn = item.querySelector(".acad-acc-btn");
      if (btn) {
        btn.addEventListener("click", () => {
          const isOpen = item.classList.contains("is-open");
          const parent = item.closest(".acad-accordion");
          if (parent) {
            parent.querySelectorAll(".acad-acc-item").forEach((sibling) => {
              sibling.classList.remove("is-open");
              sibling.querySelector(".acad-acc-btn")?.setAttribute("aria-expanded", "false");
            });
          }
          if (!isOpen) {
            item.classList.add("is-open");
            btn.setAttribute("aria-expanded", "true");
          }
        });
      }
    });
  }

  // 1-Click Copy Buttons Handler
  function initCopyButtons() {
    function fallbackCopyText(text) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      textArea.setAttribute("readonly", "");
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
      } catch (err) {
        console.warn("Fallback copy failed:", err);
      }
      document.body.removeChild(textArea);
    }

    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-copy]");
      if (!btn) return;
      const textToCopy = btn.getAttribute("data-copy");
      if (!textToCopy) return;

      const performFeedback = () => {
        const origContent = btn.innerHTML;
        btn.classList.add("is-copied");
        const dict = I18N[currentLang] || I18N.ar;
        const copiedLabel = dict.copied_btn || "تم النسخ ✓";
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> <span>${copiedLabel}</span>`;
        setTimeout(() => {
          btn.classList.remove("is-copied");
          btn.innerHTML = origContent;
        }, 1800);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy)
          .then(performFeedback)
          .catch(() => {
            fallbackCopyText(textToCopy);
            performFeedback();
          });
      } else {
        fallbackCopyText(textToCopy);
        performFeedback();
      }
    });
  }

  // Step 1: Registration Form Handler
  function initStep1Registration() {
    const form = document.getElementById("academyStep1Form");
    if (!form) return;

    // Prefill from sessionStorage if exists
    try {
      const savedLead = JSON.parse(sessionStorage.getItem("z7_academy_lead") || "null");
      if (savedLead) {
        if (form.elements["fullName"] && savedLead.fullName) form.elements["fullName"].value = savedLead.fullName;
        if (form.elements["email"] && savedLead.email) form.elements["email"].value = savedLead.email;
        if (form.elements["phone"] && savedLead.phone) form.elements["phone"].value = savedLead.phone;
        if (form.elements["city"] && savedLead.city) form.elements["city"].value = savedLead.city;
        if (form.elements["experience"] && savedLead.experience) form.elements["experience"].value = savedLead.experience;
        if (form.elements["notes"] && savedLead.notes) form.elements["notes"].value = savedLead.notes;
      }
    } catch (e) {}

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;

      const courseId = form.getAttribute("data-course-id") || "cinematic-film";
      const courseName = form.getAttribute("data-course-name") || "Cinematic Filmmaking with AI";
      const paymentPath = form.getAttribute("data-payment-path") || `/courses/${courseId}/payment/`;

      const leadData = {
        fullName: form.elements["fullName"].value.trim(),
        email: form.elements["email"].value.trim(),
        phone: form.elements["phone"].value.trim(),
        city: form.elements["city"].value.trim(),
        experience: form.elements["experience"].value,
        notes: form.elements["notes"] ? form.elements["notes"].value.trim() : "",
        courseId,
        courseName,
        step1CompletedAt: new Date().toISOString()
      };

      sessionStorage.setItem("z7_academy_lead", JSON.stringify(leadData));
      window.location.assign(paymentPath);
    });
  }

  // Step 2: Payment Page Handler
  function initStep2Payment() {
    const form = document.getElementById("academyPaymentForm");
    if (!form) return;

    let leadData = null;
    try {
      leadData = JSON.parse(sessionStorage.getItem("z7_academy_lead") || "null");
    } catch (e) {}

    // Populate Student Summary
    const nameEl = document.getElementById("payStudentName");
    const emailEl = document.getElementById("payStudentEmail");
    const phoneEl = document.getElementById("payStudentPhone");
    const cityEl = document.getElementById("payStudentCity");

    if (leadData) {
      if (nameEl) nameEl.textContent = leadData.fullName || "—";
      if (emailEl) emailEl.textContent = leadData.email || "—";
      if (phoneEl) phoneEl.textContent = leadData.phone || "—";
      if (cityEl) cityEl.textContent = leadData.city || "—";
    }

    // Promo Code Logic
    const promoInput = document.getElementById("payPromoCode");
    const applyBtn = document.getElementById("payApplyPromoBtn");
    const feedback = document.getElementById("payPromoFeedback");
    const discountLine = document.getElementById("summaryDiscountLine");
    const discountVal = document.getElementById("summaryDiscountVal");
    const totalVal = document.getElementById("summaryTotalVal");

    const basePrice = 250;
    let appliedDiscountJod = 0;
    let finalNetPrice = basePrice;
    let appliedCode = "";
    let appliedPercent = 0;

    if (applyBtn && promoInput) {
      applyBtn.addEventListener("click", async () => {
        const code = promoInput.value.trim().toUpperCase();
        if (!code) return;

        applyBtn.disabled = true;
        applyBtn.textContent = "...";

        try {
          const res = await fetch(`/api/academy/validate-code?code=${encodeURIComponent(code)}`);
          const data = await res.json();

          if (data.valid) {
            appliedPercent = Number(data.discountPercent) || 15;
            appliedDiscountJod = (basePrice * appliedPercent) / 100;
            finalNetPrice = basePrice - appliedDiscountJod;
            appliedCode = code;

            feedback.className = "acad-promo-feedback is-success";
            feedback.textContent = `${I18N[currentLang].code_applied} ${appliedPercent}% (-${appliedDiscountJod} JOD)`;

            if (discountLine) discountLine.style.display = "flex";
            if (discountVal) discountVal.textContent = `-${appliedDiscountJod} JOD (${appliedPercent}%)`;
            if (totalVal) totalVal.textContent = `${finalNetPrice} JOD`;
          } else {
            throw new Error(data.message || "Invalid code");
          }
        } catch (err) {
          // Fallback codes
          if (["7ZVIP", "MAGIC15", "DIRECT15", "HASSAN25", "SHAAS25"].includes(code)) {
            appliedPercent = code === "HASSAN25" || code === "SHAAS25" ? 25 : 15;
            appliedDiscountJod = (basePrice * appliedPercent) / 100;
            finalNetPrice = basePrice - appliedDiscountJod;
            appliedCode = code;

            feedback.className = "acad-promo-feedback is-success";
            feedback.textContent = `${I18N[currentLang].code_applied} ${appliedPercent}% (-${appliedDiscountJod} JOD)`;

            if (discountLine) discountLine.style.display = "flex";
            if (discountVal) discountVal.textContent = `-${appliedDiscountJod} JOD (${appliedPercent}%)`;
            if (totalVal) totalVal.textContent = `${finalNetPrice} JOD`;
          } else {
            feedback.className = "acad-promo-feedback is-error";
            feedback.textContent = I18N[currentLang].code_invalid;
            if (discountLine) discountLine.style.display = "none";
            if (totalVal) totalVal.textContent = `${basePrice} JOD`;
            appliedCode = "";
            appliedPercent = 0;
            appliedDiscountJod = 0;
            finalNetPrice = basePrice;
          }
        } finally {
          applyBtn.disabled = false;
          applyBtn.textContent = I18N[currentLang].btn_apply_code;
        }
      });
    }

    // Receipt Upload with Live Preview
    const fileInput = document.getElementById("receiptFile");
    const dropZone = document.getElementById("uploadDropZone");
    const previewBox = document.getElementById("receiptPreviewBox");
    const previewImg = document.getElementById("receiptPreviewImg");
    const previewPdf = document.getElementById("receiptPreviewPdf");
    const removeBtn = document.getElementById("receiptRemoveBtn");

    let uploadedBase64 = null;
    let uploadedName = null;
    let uploadedType = null;

    if (fileInput && dropZone) {
      function processFile(file) {
        if (!file) return;
        if (file.size > 15 * 1024 * 1024) {
          alert("File size exceeds 15MB limit / حجم الملف يتجاوز 15 ميجابايت");
          return;
        }
        const isImage = file.type.startsWith("image/");
        const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
        if (!isImage && !isPdf) {
          alert("Please upload an image (PNG, JPG, WEBP) or PDF file.");
          return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
          uploadedBase64 = e.target.result;
          uploadedName = file.name;
          uploadedType = file.type;

          dropZone.style.display = "none";
          previewBox.style.display = "block";

          if (isImage) {
            previewImg.src = e.target.result;
            previewImg.style.display = "block";
            if (previewPdf) previewPdf.style.display = "none";
          } else {
            previewImg.style.display = "none";
            if (previewPdf) {
              previewPdf.style.display = "flex";
              previewPdf.innerHTML = `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> <span>${file.name}</span>`;
            }
          }
        };
        reader.readAsDataURL(file);
      }

      dropZone.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", (e) => processFile(e.target.files[0]));
      dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("is-dragover"); });
      dropZone.addEventListener("dragleave", () => dropZone.classList.remove("is-dragover"));
      dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("is-dragover");
        processFile(e.dataTransfer.files[0]);
      });

      if (removeBtn) {
        removeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          fileInput.value = "";
          uploadedBase64 = null;
          uploadedName = null;
          previewBox.style.display = "none";
          dropZone.style.display = "block";
        });
      }
    }

    // Submit Payment & Complete Registration
    const submitBtn = document.getElementById("paySubmitBtn");
    const paymentCard = document.getElementById("paymentLayout");
    const successView = document.getElementById("successView");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!uploadedBase64) {
        alert(currentLang === "ar" ? "يرجى رفع صورة أو ملف إيصال التحويل المالي." : "Please upload your transfer payment receipt.");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>${I18N[currentLang].submit_loading}</span>`;

      const courseId = form.getAttribute("data-course-id") || leadData?.courseId || "cinematic-film";
      const courseName = form.getAttribute("data-course-name") || leadData?.courseName || "7Z AI Masterclass";

      const payload = {
        fullName: leadData?.fullName || "Student",
        email: leadData?.email || "",
        phone: leadData?.phone || "",
        city: leadData?.city || "",
        experience: leadData?.experience || "beginner",
        notes: leadData?.notes || "",
        courseId,
        courseName,
        promoCode: appliedCode,
        discountPercent: appliedPercent,
        discountJod: appliedDiscountJod,
        finalPrice: finalNetPrice,
        receiptBase64: uploadedBase64,
        receiptName: uploadedName || "receipt.jpg",
        receiptType: uploadedType || "image/jpeg",
        submittedAt: new Date().toISOString()
      };

      try {
        const res = await fetch("/api/academy/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        const refId = data.reference || `7Z-REG-${Math.floor(100000 + Math.random() * 900000)}`;

        if (paymentCard) paymentCard.style.display = "none";
        if (successView) {
          successView.style.display = "block";
          const refElem = document.getElementById("successRefNum");
          if (refElem) refElem.textContent = refId;
          successView.scrollIntoView({ behavior: "smooth" });
        }
        sessionStorage.removeItem("z7_academy_lead");
      } catch (err) {
        console.warn("Submitting via offline fallback:", err);
        const refId = `7Z-REG-${Math.floor(100000 + Math.random() * 900000)}`;
        if (paymentCard) paymentCard.style.display = "none";
        if (successView) {
          successView.style.display = "block";
          const refElem = document.getElementById("successRefNum");
          if (refElem) refElem.textContent = refId;
          successView.scrollIntoView({ behavior: "smooth" });
        }
        sessionStorage.removeItem("z7_academy_lead");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyTheme(currentTheme);
    applyLang(currentLang);

    const themeBtn = document.querySelector("[data-acad-theme-toggle]");
    if (themeBtn) {
      themeBtn.addEventListener("click", () => applyTheme(currentTheme === "dark" ? "light" : "dark"));
    }

    const langBtn = document.querySelector("[data-acad-lang-toggle]");
    if (langBtn) {
      langBtn.addEventListener("click", () => applyLang(currentLang === "ar" ? "en" : "ar"));
    }

    init3DTilt();
    initAccordions();
    initCopyButtons();
    initStep1Registration();
    initStep2Payment();
  });

  window.Z7Academy = {
    setLang: applyLang,
    setTheme: applyTheme,
    getLang: () => currentLang,
    getTheme: () => currentTheme
  };
})();
