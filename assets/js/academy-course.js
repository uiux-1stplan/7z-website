(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targets = document.querySelectorAll(
    '.academy-hero .academy-copy, .academy-art, .hero .copy, .hero-art, .section-heading, .section-head, .course-card, .stage, .outcome, .person, .bonus, .offer-item, .price-card, .step, .final > *'
  );
  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach((element) => element.classList.add('is-visible'));
    return;
  }
  document.body.classList.add('academy-motion-ready');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });
  targets.forEach((element, index) => {
    element.classList.add('academy-reveal');
    element.style.setProperty('--academy-delay', Math.min(index % 4, 3) * 55 + 'ms');
    observer.observe(element);
  });
})();

(() => {
  const root = document.documentElement;
  if (!root.hasAttribute('data-academy-ui')) return;
  const translations = {
    'الموقع الرئيسي':'Main website','كل الدورات':'All courses','الدورات':'Courses','ابدأ التسجيل':'Start enrollment','المظهر':'Appearance',
    'مسارات تصنع':'Learning paths for','ما تتخيّله.':'what you imagine.',
    'تعلّم أدوات جديدة، وطبّقها على مشروع حقيقي من البداية للنهاية. اختر المسار الذي يطوّر شغلك الإبداعي أو الهندسي.':'Learn new tools by applying them to a real project from start to finish. Choose the path that advances your creative or engineering work.',
    'اكتشف الدورات':'Explore the courses','عن 7Z MAGIC':'About 7Z MAGIC','أي فكرة تريد أن تحوّلها إلى واقع؟':'Which idea will you bring to life?',
    'الفيلم وصناعة المحتوى':'FILM & CONTENT CREATION','صناعة الأفلام والمحتوى السينمائي بالذكاء الاصطناعي':'AI Filmmaking & Cinematic Content',
    'من الفكرة إلى فيلم متكامل':'From idea to finished film','تعلّم بناء الفكرة وكتابة السيناريو والإخراج وتوليد الصور والفيديو والمونتاج ضمن مسار تدريبي متكامل.':'Learn concept development, screenwriting, directing, image and video generation, and editing in one complete learning path.',
    'دروس مسجلة':'Recorded lessons','سيناريو وإخراج':'Screenwriting & directing','إنتاج ومونتاج':'Production & editing','اكتشف الدورة وتفاصيل التسجيل':'Explore the course and enrollment',
    'العمارة والذكاء الاصطناعي':'ARCHITECTURE & AI','دورة الذكاء الاصطناعي للمهندسين':'AI for Engineers','من الفكرة إلى الواقع السينمائي':'From idea to cinematic reality',
    'وجّه Claude Desktop عبر برامجك الهندسية، وطوّر مشروعًا من مخطط AutoCAD إلى نموذج ثلاثي الأبعاد وفيديو معماري.':'Guide Claude Desktop through your engineering software and take a project from an AutoCAD plan to a 3D model and architectural film.',
    '4 محاضرين متخصصين':'4 expert instructors','مشروع تطبيقي':'Hands-on project','اكتشف المسار الهندسي':'Explore the engineering course',
    'تعلّم كيف توجّه Claude Desktop للعمل داخل برامجك الهندسية، وتحول فكرتك إلى مخطط AutoCAD، ثم نموذج ثلاثي الأبعاد بخاماته وتفاصيله، وصولًا إلى فيديو معماري بواقعية سينمائية عالية.':'Learn to guide Claude Desktop inside your engineering software, turning your idea into an AutoCAD plan, a detailed 3D model, and a cinematic architectural film.',
    'دورة تطبيقية تعمل خلالها على مشروع واحد من البداية للنهاية، مع أربعة محاضرين متخصصين. تعلّم كيف تنفّذ وتراجع وتعدّل كل مرحلة وفق رؤيتك ومتطلبات مشروعك.':'Build one project from beginning to end with four expert instructors. Learn to execute, review, and refine every stage to match your vision and project requirements.',
    'سجّل في الدورة — 200 دينار أردني':'Enroll now — JOD 200','يشمل التسجيل هدية دورة «صناعة المحتوى الاحترافي بالذكاء الاصطناعي» مجانًا.':'Enrollment includes the AI Professional Content Creation course as a free bonus.',
    '01 / مسار التعلّم':'01 / LEARNING PATH','من لغة المهندس إلى الفيلم المعماري.':'From engineering language to architectural film.',
    'خمس مراحل مترابطة تنفّذ خلالها مشروعًا واحدًا وتراجع نتائجه في كل خطوة.':'Five connected stages take one project from start to finish, with a review at every step.',
    'وجّه الذكاء الاصطناعي بلغة المهندس':'Direct AI with an engineer’s language',
    'ابدأ بفهم الأدوات وطريقة استخدامها. تعلّم كيف تصف مشروعك وتحدد احتياجاته وأبعاده وقيوده، وتصيغ أوامر واضحة تقودك إلى النتيجة المطلوبة.':'Understand the tools and how to use them. Describe your project, define its needs, dimensions, and constraints, then write clear prompts that guide the result.',
    'نفّذ مخططات 2D داخل AutoCAD عبر Claude Desktop':'Create 2D AutoCAD plans with Claude Desktop',
    'تعلّم إعداد الربط بين Claude Desktop وAutoCAD، وتوجيهه لتنفيذ المخطط وتعديله، مع مراجعة التوزيع والوحدات والمقياس والأبعاد. تعمل على ملف هندسي يمكنك فتحه وتحريره واستكماله.':'Connect Claude Desktop to AutoCAD and guide it through drafting and revisions. Review layout, units, scale, and dimensions, then continue editing the project file yourself.',
    'طوّر المخطط إلى مشروع ثلاثي الأبعاد':'Turn the plan into a 3D project',
    'تعرّف على ربط Claude ببرنامجي Blender و3ds Max، واستخدام المخطط لبناء الكتل والجدران والفتحات والعناصر المعمارية. نظّم المشهد ليبقى قابلًا للتطوير والتعديل.':'Connect Claude with Blender and 3ds Max, then use the plan to build masses, walls, openings, and architectural elements in a scene designed for future edits.',
    'أضف الخامات وجهّز تفاصيل المشهد':'Add materials and refine the scene',
    'طوّر الاتجاه التصميمي، واختر المواد والألوان والإضاءة والأثاث المناسب. حسّن النتائج وصحّح التفاصيل حتى يعبّر المشهد عن فكرتك.':'Develop the design direction and select materials, colors, lighting, and furnishings. Refine the results until the scene expresses your idea.',
    'أخرج فيديو المشروع وارفع واقعيته عبر Omni':'Render the project film and enhance it with Omni',
    'تعلّم إعداد الكاميرا واختيار الزوايا والتكوين والحركة داخل 3ds Max، ثم استخراج فيديو للمكان واستخدامه في Omni لرفع الواقعية البصرية. راجع مطابقة الفيديو للمشهد الأصلي، من الكتل والفتحات والخامات إلى مسار الكاميرا.':'Set up the camera, choose angles, composition, and movement in 3ds Max, then export the footage and enhance its visual realism in Omni. Check that geometry, openings, materials, and camera movement remain faithful to the original scene.',
    'هدية إضافية مع اشتراكك':'A bonus with your enrollment','تحصل على دورة «صناعة المحتوى الاحترافي بالذكاء الاصطناعي» مجانًا.':'Get the AI Professional Content Creation course for free.','بدلًا من':'Instead of','89 دينارًا أردنيًا':'JOD 89',
    '02 / مخرجاتك':'02 / YOUR OUTCOMES','ماذا تنجز خلال الدورة؟':'What will you create?','تخرج بملفات ومخرجات مشروعك، وبطريقة عمل تستطيع تكرارها وتطويرها على مشاريعك القادمة.':'Leave with editable project files and a workflow you can repeat and improve on future projects.',
    'مخطط معماري ثنائي الأبعاد قابل للتعديل':'An editable 2D architectural plan','مشروع ثلاثي الأبعاد منظّم بخاماته وعناصره':'An organized 3D project with materials and details',
    'لقطات كاميرا وحركة مدروسة لعرض المكان':'Purposeful camera shots and movement','فيديو معماري قصير بواقعية بصرية عالية':'A short architectural film with high visual realism','سير عمل قابل للتكرار والتطوير على مشاريعك القادمة':'A repeatable workflow to build on in future projects',
    '03 / فريق التدريب':'03 / INSTRUCTORS','مع فريق التدريب':'Meet your instructors','أربعة محاضرين متخصصين يرافقون المشروع عبر مراحله.':'Four expert instructors guide the project through every stage.',
    'المحاضر':'Instructor','المحاضرة':'Instructor','المهندس حسن':'Engineer Hassan','المهندس خالد':'Engineer Khaled','المهندسة آية':'Engineer Aya','المهندس أنس':'Engineer Anas',
    '04 / لمن هذه الدورة':'04 / WHO IT’S FOR','للمهتمين بإدخال الذكاء الاصطناعي إلى عملهم الهندسي.':'For engineers bringing AI into their practice.',
    'لطلاب العمارة والتصميم الداخلي، والمهندسين المعماريين، ومصممي الديكور والتصور ثلاثي الأبعاد، الراغبين في تطوير طريقة عملهم وعرض مشاريعهم.':'For architecture and interior design students, architects, interior designers, and 3D visualization artists looking to improve their workflow and project presentations.',
    'الفكرة منك، والقرار بإيدك، وأدواتك تشتغل بتوجيهك.':'The idea is yours. The decisions are yours. Your tools follow your direction.',
    'ابدأ مشروعك الهندسي من الفكرة.':'Start your engineering project with an idea.',
    'أكمل نموذج التسجيل وأرسل إثبات الدفع بالطريقة نفسها المتاحة في الدورة الأولى.':'Complete the enrollment form and submit payment proof using the same methods offered for the first course.',
    'سجّل الآن · 200 دينار أردني ↗':'Enroll now · JOD 200 ↗',
    'مشهد معماري من أعمال 7Z':'Architecture by 7Z','مشهد سينمائي':'Cinematic scene','تصميم معماري':'Architectural design','مشهد من عالم صناعة الأفلام':'A cinematic filmmaking scene','تصميم معماري ثلاثي الأبعاد':'3D architectural visualization'
  };
  const page = root.dataset.academyPage;
  const titles = {
    catalog: { ar:'أكاديمية 7Z MAGIC | الدورات', en:'7Z MAGIC Academy | Courses', descriptionAr:'استكشف برامج 7Z MAGIC التدريبية في صناعة الأفلام والذكاء الاصطناعي للمهندسين.', descriptionEn:'Explore 7Z MAGIC courses in AI filmmaking and engineering.' },
    'ai-engineering': { ar:'دورة الذكاء الاصطناعي للمهندسين | 7Z MAGIC', en:'AI for Engineers | 7Z MAGIC', descriptionAr:'دورة الذكاء الاصطناعي للمهندسين من 7Z MAGIC: مشروع هندسي تطبيقي من مخطط AutoCAD إلى نموذج ثلاثي الأبعاد وفيديو معماري.', descriptionEn:'A hands-on AI engineering course: take one project from an AutoCAD plan to a detailed 3D model and architectural film.' }
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement?.closest('script,style')) continue;
    nodes.push({ node, original: node.nodeValue });
  }
  const langButton = document.getElementById('lang');
  const themeButton = document.getElementById('theme');
  function apply() {
    const lang = localStorage.getItem('7z-course-lang') === 'en' ? 'en' : 'ar';
    const theme = (localStorage.getItem('z7-theme') || localStorage.getItem('7z-course-theme')) === 'light' ? 'light' : 'dark';
    root.lang = lang; root.dir = lang === 'ar' ? 'rtl' : 'ltr'; root.dataset.theme = theme;
    for (const { node, original } of nodes) {
      const key = original.trim();
      if (!translations[key]) continue;
      const start = original.indexOf(key);
      node.nodeValue = original.slice(0, start) + (lang === 'en' ? translations[key] : key) + original.slice(start + key.length);
    }
    if (langButton) { langButton.textContent = lang === 'ar' ? 'EN' : 'عربي'; langButton.setAttribute('aria-label', lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'); }
    if (themeButton) { themeButton.textContent = lang === 'ar' ? (theme === 'dark' ? 'فاتح' : 'داكن') : (theme === 'dark' ? 'Light' : 'Dark'); themeButton.setAttribute('aria-pressed', String(theme === 'light')); }
    const pageCopy = titles[page];
    if (pageCopy) {
      document.title = pageCopy[lang];
      const description = document.querySelector('meta[name="description"]');
      if (description) description.content = lang === 'ar' ? pageCopy.descriptionAr : pageCopy.descriptionEn;
    }
    document.querySelectorAll('a[href^="/course-registration/form/"]').forEach((a) => {
      const url = new URL(a.href, location.origin); url.searchParams.set('lang', lang); a.href = url.pathname + url.search + url.hash;
    });
  }
  langButton?.addEventListener('click', () => { localStorage.setItem('7z-course-lang', root.lang === 'ar' ? 'en' : 'ar'); apply(); });
  themeButton?.addEventListener('click', () => { localStorage.setItem('7z-course-theme', root.dataset.theme === 'dark' ? 'light' : 'dark'); localStorage.setItem('z7-theme', root.dataset.theme === 'dark' ? 'light' : 'dark'); apply(); });
  apply();
})();
