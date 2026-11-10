(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const readPreference = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const writePreference = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  const page = document.documentElement.dataset.academyPage || "catalog";
  const slug = document.documentElement.dataset.course || "cinematic-filmmaking-with-ai";
  const courses = {
    "cinematic-filmmaking-with-ai": {
      id: "cinematic-film", title: { en: "AI Cinematic Filmmaking", ar: "صناعة الأفلام السينمائية بالذكاء الاصطناعي" },
      subtitle: { en: "Build a film from the first spark to the final frame.", ar: "اصنع فيلماً من الوميض الأول حتى اللقطة الأخيرة." },
      description: { en: "A hands-on production path through story, visual direction, generative image and video, sound, and editing—designed to turn an idea into a coherent cinematic piece.", ar: "مسار إنتاج تطبيقي يجمع بناء القصة والتوجيه البصري وتوليد الصور والفيديو والصوت والمونتاج، لتحويل الفكرة إلى عمل سينمائي متكامل." },
      art: "/media/posters/film/1.jpg", label: { en: "CINEMATIC / GENERATIVE FILM", ar: "السينما / صناعة الأفلام بالذكاء الاصطناعي" }, length: { en: "8 production chapters", ar: "8 فصول إنتاجية" },
      audience: { en: "Creators & storytellers", ar: "صنّاع المحتوى ورواة القصص" },
      chapters: [["01", {en:"Find the story",ar:"اكتشاف الفكرة"},{en:"Shape a clear concept, audience, and emotional direction.",ar:"صياغة مفهوم واضح وجمهور واتجاه عاطفي للعمل."}], ["02",{en:"Script & visual language",ar:"السيناريو واللغة البصرية"},{en:"Build scenes, shot logic, and a visual reference system.",ar:"بناء المشاهد ومنطق اللقطات ونظام المراجع البصرية."}], ["03",{en:"Direct with AI",ar:"الإخراج بأدوات الذكاء الاصطناعي"},{en:"Create consistent characters, locations, and cinematic frames.",ar:"إنشاء شخصيات ومواقع وإطارات سينمائية متناسقة."}], ["04",{en:"Generate motion",ar:"توليد الحركة"},{en:"Turn selected frames into intentional, directed sequences.",ar:"تحويل الإطارات المختارة إلى تسلسلات مقصودة وموجّهة."}], ["05",{en:"Sound & edit",ar:"الصوت والمونتاج"},{en:"Assemble pace, sound, transitions, and finishing details.",ar:"تركيب الإيقاع والصوت والانتقالات وتفاصيل الإنهاء."}], ["06",{en:"Deliver the film",ar:"إخراج الفيلم النهائي"},{en:"Complete a polished short-form cinematic project.",ar:"إنجاز مشروع سينمائي قصير ومصقول."}]]
    },
    "ai-for-engineers": {
      id: "ai-engineering", title: { en: "AI for Engineers", ar: "الذكاء الاصطناعي للمهندسين" },
      subtitle: { en: "Connect engineering workflows to intelligent production.", ar: "اربط سير العمل الهندسي بإنتاج أكثر ذكاءً." },
      description: { en: "A practical path for applying AI to engineering and architectural visualization—from briefs and CAD drawings to 3D scenes, visualization, and a concise project presentation.", ar: "مسار عملي لتطبيق الذكاء الاصطناعي في الهندسة والتصور المعماري، من فهم المتطلبات ومخططات CAD إلى المشاهد ثلاثية الأبعاد والإخراج والعرض النهائي." },
      art: "/media/posters/arch_projects/9-16H/1-optimized.svg", label: { en: "ENGINEERING / AI WORKFLOWS", ar: "الهندسة / مسارات الذكاء الاصطناعي" }, length: { en: "6 applied modules", ar: "6 وحدات تطبيقية" },
      audience: { en: "Architects & engineers", ar: "المهندسون والمعماريون" },
      chapters: [["01",{en:"Map the workflow",ar:"رسم سير العمل"},{en:"Identify repeatable tasks and define a useful AI-assisted process.",ar:"تحديد المهام المتكررة وبناء مسار عملي مدعوم بالذكاء الاصطناعي."}], ["02",{en:"Briefs & CAD",ar:"المتطلبات ومخططات CAD"},{en:"Read project inputs and turn drawings into structured next steps.",ar:"فهم مدخلات المشروع وتحويل المخططات إلى خطوات تنفيذية واضحة."}], ["03",{en:"Build the scene",ar:"بناء المشهد"},{en:"Move from geometry and references to a deliberate 3D scene.",ar:"الانتقال من الهندسة والمراجع إلى مشهد ثلاثي الأبعاد مدروس."}], ["04",{en:"Visualize with intent",ar:"التصور والإخراج"},{en:"Shape materials, light, camera, and atmosphere for clear communication.",ar:"تشكيل الخامات والإضاءة والكاميرا والأجواء لخدمة الفكرة."}], ["05",{en:"Automate & refine",ar:"الأتمتة والتحسين"},{en:"Use assistants to accelerate iteration while keeping review in control.",ar:"تسريع التكرار باستخدام المساعدات مع إبقاء القرار والمراجعة بيدك."}], ["06",{en:"Present the outcome",ar:"تقديم النتيجة"},{en:"Package a complete visual proposal for clients and collaborators.",ar:"تجهيز مقترح بصري متكامل للعملاء والشركاء."}]]
    }
  };
  const copy = {
    en: { academy:"ACADEMY / 7Z MAGIC", home:"Academy", language:"العربية", languageLabel:"Switch to Arabic", theme:"Switch theme", themeLight:"Light mode", themeDark:"Dark mode", explore:"Explore learning paths", catalogTitle:"Make the next idea real.", catalogText:"Cinematic craft and applied AI, taught through projects built for the real world.", catalogMeta:"Two focused paths · practical work · 7Z Magic", learningPaths:"01 — 02 / LEARNING PATHS", registration:"REGISTRATION", filmTag:"FILM / STORY / AI", engineeringTag:"DESIGN / ENGINEERING / AI", view:"Explore the course", syllabus:"THE LEARNING ARC", whatLearn:"A practical route from first principle to finished work.", course:"Course", project:"Applied project", register:"Begin registration", beginRegistration:"Begin registration", reserve:"Reserve your place", back:"← All courses", apply:"Apply code", coupon:"Discount code", couponHint:"The code is checked before you continue to payment.", priorEmail:"Previous course email (if requested)", payment:"Payment & receipt", details:"Your details", name:"Full name", email:"Email address", phone:"Phone / WhatsApp", country:"Country / City", experience:"Experience level", choose:"Select one", beginner:"Beginner", some:"Some experience", pro:"Professional", lang:"Preferred language", arabic:"Arabic", english:"English", goal:"What would you like to build?", consent:"I agree to be contacted about this course and understand that my place is confirmed after payment review.", continue:"Continue to payment", method:"Choose a transfer method", cliq:"CliQ", western:"Western Union", transferDetails:"TRANSFER DETAILS", recipient:"Recipient", account:"Account / number", sending:"Sending your registration securely…", reference:"Transfer reference", receipt:"Payment receipt image", receiptHelp:"JPG, PNG or WebP · up to 5 MB", proofUpload:"Upload receipt", send:"Submit registration", price:"Course price", invalid:"Please complete the required fields.", error:"We could not complete this step. Check the details and try again.", couponDone:"Discount code applied", noCoupon:"No discount code applied", upload:"Uploading receipt securely…", proofReady:"Receipt verified and ready to submit.", proofError:"Receipt upload failed. Please retry.", chooseMethod:"Choose CliQ or Western Union to see the transfer details.", enterReference:"Enter the transfer reference to continue.", successTitle:"Your place is in review.", successText:"We received your registration and receipt. The academy team will email you after checking the payment.", finish:"Back to academy", courseClosed:"Registration is not available right now.", alumni:"This code needs the email used for your previous course.", cliqAlias:"CliQ Alias / ID", recipientName:"Recipient name", bank:"Bank", receiverFullName:"Full name (receiver)", countryCity:"Country & city", phoneNumber:"Phone number", mtcnHint:"Enter the 10-digit MTCN in Transfer reference.", copy:"Copy", copied:"Copied", copyFailed:"Could not copy." },
    ar: { academy:"الأكاديمية / 7Z MAGIC", home:"الأكاديمية", language:"English", languageLabel:"التبديل إلى الإنجليزية", theme:"تبديل المظهر", themeLight:"الوضع الفاتح", themeDark:"الوضع الداكن", explore:"اكتشف المسارات", catalogTitle:"حوّل فكرتك القادمة إلى واقع.", catalogText:"تعلم سينمائي وذكاء اصطناعي تطبيقي عبر مشاريع قريبة من سوق العمل.", catalogMeta:"مساران متخصصان · تطبيق عملي · 7Z Magic", learningPaths:"٠١ — ٠٢ / مسارات التعلّم", registration:"التسجيل", filmTag:"فيلم / قصة / ذكاء اصطناعي", engineeringTag:"تصميم / هندسة / ذكاء اصطناعي", view:"اكتشف الدورة", syllabus:"رحلة التعلم", whatLearn:"مسار تطبيقي من الفكرة الأولى إلى العمل المكتمل.", course:"الدورة", project:"مشروع تطبيقي", register:"ابدأ التسجيل", beginRegistration:"ابدأ التسجيل", reserve:"احجز مقعدك", back:"العودة إلى جميع الدورات ←", apply:"تفعيل الكود", coupon:"كود الخصم", couponHint:"يتم التحقق من الكود قبل الانتقال إلى الدفع.", priorEmail:"البريد المستخدم في الدورة السابقة (إن طُلب)", payment:"الدفع والإيصال", details:"بياناتك", name:"الاسم الكامل", email:"البريد الإلكتروني", phone:"رقم الهاتف / واتساب", country:"الدولة / المدينة", experience:"مستوى الخبرة", choose:"اختر", beginner:"مبتدئ", some:"لدي خبرة", pro:"محترف", lang:"اللغة المفضلة", arabic:"العربية", english:"الإنجليزية", goal:"ما الذي ترغب في إنجازه؟", consent:"أوافق على التواصل معي بخصوص الدورة، وأفهم أن تأكيد المقعد يتم بعد مراجعة الدفع.", continue:"المتابعة إلى الدفع", method:"اختر طريقة التحويل", cliq:"كليك CliQ", western:"ويسترن يونيون", transferDetails:"بيانات التحويل", recipient:"المستفيد", account:"الحساب / الرقم", sending:"جارٍ إرسال طلب التسجيل بأمان…", reference:"الرقم المرجعي للحوالة", receipt:"صورة إيصال الدفع", receiptHelp:"JPG أو PNG أو WebP · حتى 5 ميغابايت", proofUpload:"رفع الإيصال", send:"إرسال طلب التسجيل", price:"سعر الدورة", invalid:"يرجى استكمال الحقول المطلوبة.", error:"تعذر إكمال هذه الخطوة. تحقق من البيانات وحاول مجدداً.", couponDone:"تم تفعيل كود الخصم", noCoupon:"لا يوجد كود خصم", upload:"جارٍ رفع الإيصال بشكل آمن…", proofReady:"تم التحقق من الإيصال، ويمكنك إرسال الطلب.", proofError:"تعذر رفع الإيصال. يرجى المحاولة مجدداً.", chooseMethod:"اختر كليك أو ويسترن يونيون لعرض بيانات التحويل.", enterReference:"أدخل الرقم المرجعي للحوالة للمتابعة.", successTitle:"طلبك قيد المراجعة.", successText:"استلمنا طلب التسجيل والإيصال. سيراسلك فريق الأكاديمية بعد التحقق من الدفع.", finish:"العودة إلى الأكاديمية", courseClosed:"التسجيل غير متاح حالياً.", alumni:"هذا الكود يتطلب البريد المستخدم في الدورة السابقة.", cliqAlias:"معرّف CliQ", recipientName:"اسم المستلم", bank:"البنك", receiverFullName:"الاسم الرباعي للمستلم", countryCity:"الدولة والمدينة", phoneNumber:"رقم الهاتف", mtcnHint:"أدخل رقم MTCN المكوّن من 10 أرقام في خانة مرجع التحويل.", copy:"نسخ", copied:"تم النسخ", copyFailed:"تعذر النسخ." }
  };
  let lang = new URLSearchParams(location.search).get("lang") || readPreference("7z-course-lang") || "en";
  if (!['ar','en'].includes(lang)) lang = 'en';
  let course = courses[slug] || courses["cinematic-filmmaking-with-ai"];
  let token = "", methods = [], coupon = "";
  const t = key => copy[lang][key] || key;
  const c = value => typeof value === "string" ? value : value[lang];
  const escape = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const header = `<header class="academy-topbar"><a class="academy-brand" href="/courses/"><img src="/assets/brand/7Z-LogoT(3).png" alt="7Z Magic"><span>7Z MAGIC<br><small style="font-size:9px;color:var(--a-muted);letter-spacing:.15em">ACADEMY</small></span></a><div class="academy-tools"><button class="academy-language" type="button" aria-label="${t('languageLabel')}">${t('language')}</button><button class="academy-theme" type="button" aria-label="${t('theme')}" data-theme-button><span aria-hidden="true" data-theme-icon>☾</span><span data-theme-label></span></button></div></header>`;
  const footer = `<footer class="academy-footer"><span>© 2026 7Z Magic Academy</span><a href="mailto:creative@7z-magic.com">creative@7z-magic.com</a></footer>`;
  const shell = content => `<div class="academy-page">${header}${content}${footer}</div>`;
  const catalog = () => `<main class="academy-shell"><section class="academy-hero"><div class="academy-hero-copy"><span class="academy-kicker">${t('academy')}</span><h1>${t('catalogTitle')}</h1><p>${t('catalogText')}</p><div class="academy-hero-actions"><a class="academy-button primary" href="#paths">${t('explore')} <span aria-hidden="true">↘</span></a><span class="academy-status-pill">${t('catalogMeta')}</span></div></div></section><section class="academy-section" id="paths"><div class="academy-section-head"><div><span class="academy-overline">${t('learningPaths')}</span><h2>${t('explore')}</h2></div><p>${t('catalogMeta')}</p></div><div class="academy-course-grid">${Object.entries(courses).map(([path,item],i)=>`<a class="academy-course" href="/courses/${path}/"><div class="academy-course-art"><img src="${item.art}" alt="${escape(c(item.title))}" loading="lazy"><span>${i?'02':'01'} / ${i?t('engineeringTag'):t('filmTag')}</span></div><div class="academy-course-copy"><span class="academy-overline">${i?t('engineeringTag'):t('filmTag')}</span><h3>${escape(c(item.title))}</h3><p>${escape(c(item.subtitle))}</p><p>${escape(c(item.description))}</p><div class="academy-tags"><span>${escape(c(item.length))}</span><span>${escape(c(item.audience))}</span></div><div class="academy-card-cta">${t('view')} <span aria-hidden="true">↗</span></div></div></a>`).join('')}</div></section></main>`;
  const detail = () => `<main class="academy-shell"><div style="padding-top:22px"><a class="academy-link" href="/courses/">${t('back')}</a></div><section class="academy-detail-hero"><div><span class="academy-kicker">${t('academy')} / 0${slug.includes('engineers')?'2':'1'}</span><h1>${escape(c(course.title))}</h1><p><strong>${escape(c(course.subtitle))}</strong></p><p>${escape(c(course.description))}</p><div class="academy-hero-actions"><a class="academy-button primary" href="/courses/${slug}/registration/">${t('reserve')} <span aria-hidden="true">↗</span></a><span class="academy-status-pill">${escape(c(course.length))}</span></div></div><div class="academy-detail-art"><img src="${course.art}" alt="${escape(c(course.title))}"><span>${escape(c(course.label))}</span></div></section><div class="academy-facts"><div class="academy-fact"><strong>${slug.includes('engineers')?'06':'08'}</strong><span>${escape(c(course.length))}</span></div><div class="academy-fact"><strong>01</strong><span>${t('project')}</span></div><div class="academy-fact"><strong>7Z</strong><span>${escape(c(course.audience))}</span></div><div class="academy-fact"><strong>AI</strong><span>${escape(c(course.title))}</span></div></div><section class="academy-chapters"><div><span class="academy-overline">${t('syllabus')}</span><h2>${t('whatLearn')}</h2><p>${escape(c(course.description))}</p><a class="academy-button primary" href="/courses/${slug}/registration/">${t('register')} ↗</a></div><div class="academy-chapter-list">${course.chapters.map(([n,title,description])=>`<article class="academy-chapter"><b>${n}</b><div><h3>${escape(c(title))}</h3><p>${escape(c(description))}</p></div></article>`).join('')}</div></section><section class="academy-cta-band"><h2>${t('reserve')}<br><span style="color:var(--a-blue)">${escape(c(course.title))}</span></h2><a class="academy-button primary" href="/courses/${slug}/registration/">${t('beginRegistration')} ↗</a></section></main>`;
  const registration = () => `<main class="academy-shell academy-register" id="register"><div style="margin-bottom:24px"><a class="academy-link" href="/courses/${slug}/">${t('back')}</a></div><div class="academy-register-intro"><span class="academy-kicker">${t('academy')} / ${t('registration')}</span><h1>${t('reserve')}</h1><p>${escape(c(course.title))} — ${escape(c(course.subtitle))}</p><div class="academy-steps"><span class="academy-step active" data-step-indicator="1"><b>1</b>${t('details')}</span><span class="academy-step" data-step-indicator="2"><b>2</b>${t('payment')}</span></div></div><form class="academy-form-panel" id="academy-registration" novalidate><div class="academy-form-grid" data-registration-fields><div class="academy-field"><label for="reg-name">${t('name')}</label><input id="reg-name" name="name" autocomplete="name" required maxlength="120"></div><div class="academy-field"><label for="reg-email">${t('email')}</label><input id="reg-email" name="email" type="email" autocomplete="email" required maxlength="254"></div><div class="academy-field"><label for="reg-phone">${t('phone')}</label><input id="reg-phone" name="phone" type="tel" autocomplete="tel" required maxlength="40"></div><div class="academy-field"><label for="reg-country">${t('country')}</label><input id="reg-country" name="country" autocomplete="country-name" required maxlength="120"></div><div class="academy-field"><label for="reg-experience">${t('experience')}</label><select id="reg-experience" name="experience" required><option value="">${t('choose')}</option><option value="beginner">${t('beginner')}</option><option value="some">${t('some')}</option><option value="pro">${t('pro')}</option></select></div><div class="academy-field"><label for="reg-language">${t('lang')}</label><select id="reg-language" name="language"><option value="${lang==='ar'?'arabic':'english'}">${t(lang==='ar'?'arabic':'english')}</option><option value="${lang==='ar'?'english':'arabic'}">${t(lang==='ar'?'english':'arabic')}</option></select></div><div class="academy-field full"><label for="reg-goal">${t('goal')}</label><textarea id="reg-goal" name="goal" maxlength="2000"></textarea></div><div class="academy-field"><label for="coupon-code">${t('coupon')}</label><input id="coupon-code" autocomplete="off" maxlength="50"><small class="academy-file-hint">${t('couponHint')}</small></div><div class="academy-field full academy-hidden" data-prior-email><label for="prior-email">${t('priorEmail')}</label><input id="prior-email" type="email" autocomplete="email"></div><p class="academy-form-message academy-field full" data-coupon-status aria-live="polite"></p><div class="academy-field full"><label class="academy-consent"><input name="consent" type="checkbox" required><span>${t('consent')}</span></label></div></div><div class="academy-payment" data-payment><h2>${t('payment')}</h2><div class="academy-payment-summary"><span>${escape(c(course.title))}<small style="display:block;color:var(--a-muted);margin-top:5px">${t('price')}</small></span><strong><span data-total>250</span> JOD</strong></div><div class="academy-form-grid"><div class="academy-field full"><label>${t('method')}</label><div class="academy-payment-methods" data-methods></div></div><div class="academy-field"><label for="transfer-reference">${t('reference')}</label><input id="transfer-reference" minlength="3" maxlength="160"></div><div class="academy-field"><label for="receipt">${t('receipt')}</label><input id="receipt" type="file" accept="image/jpeg,image/png,image/webp"><button class="academy-button" type="button" data-upload-proof disabled>${t('proofUpload')}</button><span class="academy-file-hint">${t('receiptHelp')}</span></div></div></div><p class="academy-form-message" data-form-status aria-live="polite"></p><div class="academy-form-actions"><a class="academy-link" href="/courses/${slug}/">${t('back')}</a><button class="academy-button primary" type="submit" data-submit>${t('continue')}</button></div><div class="academy-hidden" data-success><span class="academy-kicker">7Z MAGIC / ACADEMY</span><h2>${t('successTitle')}</h2><p>${t('successText')}</p><a class="academy-button primary" href="/courses/">${t('finish')}</a></div></form></main>`;
  const app = $("#academyApp");
  if (app) app.innerHTML = shell(page === "catalog" ? catalog() : page === "course" ? detail() : registration());
  document.documentElement.lang = lang; document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  const applyTheme = theme => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.body.classList.toggle("light", theme === "light");
    document.body.classList.toggle("dark", theme === "dark");
    writePreference("7z-course-theme", theme);
  };
  const changeTheme = () => applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
  const languageButton = $(".academy-language"); if (languageButton) languageButton.addEventListener("click", () => {
    const nextLanguage = lang === "ar" ? "en" : "ar";
    writePreference("7z-course-lang", nextLanguage);
    const nextUrl = new URL(location.href);
    nextUrl.searchParams.set("lang", nextLanguage);
    location.assign(nextUrl.href);
  });
  applyTheme(readPreference("7z-course-theme") || document.documentElement.dataset.theme || "dark");
  const themeButton = $("[data-theme-button]");
  if (themeButton) {
    const themeLabel = $("[data-theme-label]", themeButton);
    const themeIcon = $("[data-theme-icon]", themeButton);
    const updateThemeLabel = () => {
      const light = document.documentElement.dataset.theme === "light";
      themeLabel.textContent = t(light ? "themeDark" : "themeLight");
      themeIcon.textContent = light ? "☾" : "☀";
      themeButton.setAttribute("aria-label", t(light ? "themeDark" : "themeLight"));
    };
    updateThemeLabel();
    themeButton.addEventListener("click", () => { changeTheme(); updateThemeLabel(); });
  }
  if (page === "registration") setupRegistration();

  function setupRegistration() {
    const form = $("#academy-registration");
    const status = $("[data-form-status]");
    const couponStatus = $("[data-coupon-status]");
    const submit = $("[data-submit]");
    const panel = $("[data-payment]");
    const total = $("[data-total]");
    const methodsBox = $("[data-methods]");
    const uploadButton = $("[data-upload-proof]");
    const reference = $("#transfer-reference");
    const receipt = $("#receipt");
    let proofReady = false, proofBusy = false, proofProvider = "", selectedProvider = "", checkoutReady = false;
    const call = async payload => {
      const response = await fetch("/api/course-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, token }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { const error = new Error(data.error || t("error")); error.code = data.code; throw error; }
      return data;
    };
    const setStatus = (message, kind = "") => { status.textContent = message; status.className = "academy-form-message " + kind; };
    const updateFinalButton = () => {
      const selected = $("input[name='pay-method']:checked");
      const matchingProof = proofReady && selected && selected.value === proofProvider;
      uploadButton.disabled = proofBusy || !selected || !receipt.files || !receipt.files[0] || matchingProof;
      const validReference = selected?.value === "WESTERN_UNION" ? /^\d{10}$/.test(reference.value.trim()) : reference.value.trim().length >= 3;
      submit.disabled = panel.classList.contains("visible") && (!token || !checkoutReady || proofBusy || !proofReady || !selected || selected.value !== proofProvider || !validReference);
    };
    const renderMethodDetails = () => {
      const selected = $("input[name='pay-method']:checked");
      const method = (methods || []).find(item => item.id === (selected && selected.value));
      let box = $("[data-transfer-details]");
      if (!box) { box = document.createElement("div"); box.dataset.transferDetails = ""; box.className = "academy-payment-summary"; methodsBox.after(box); }
      if (!method) { box.className = "academy-transfer-card academy-transfer-empty"; box.textContent = t("chooseMethod"); return; }
      const instructions = typeof method.instructions === "string" ? method.instructions : (method.instructions?.[lang] || method.instructions?.en || method.instructions?.ar || "");
      const row = (label, value, copyable = false) => value ? '<div class="academy-transfer-row"><span>' + escape(t(label)) + '</span><strong>' + escape(value) + '</strong>' + (copyable ? '<button type="button" class="academy-copy-value" data-copy-value="' + escape(value) + '">' + escape(t("copy")) + '</button>' : '') + '</div>' : '';
      const details = method.id === "CLIQ"
        ? row("cliqAlias", method.alias || method.recipient, true) + row("recipientName", method.recipientName) + row("bank", method.bank) + row("phoneNumber", method.account)
        : row("receiverFullName", method.receiverFullName || method.recipient) + row("countryCity", [method.country, method.city].filter(Boolean).join(" · ")) + row("phoneNumber", method.phone || method.account);
      box.className = "academy-transfer-card";
      box.innerHTML = '<div class="academy-transfer-heading"><span>' + escape(t("transferDetails")) + '</span><strong>' + escape(t(method.id === "CLIQ" ? "cliq" : "western")) + '</strong></div><div class="academy-transfer-rows">' + details + '</div>' + (instructions ? '<p class="academy-transfer-instructions">' + escape(instructions) + '</p>' : '') + (method.id === "WESTERN_UNION" ? '<p class="academy-mtcn-note">' + escape(t("mtcnHint")) + '</p>' : '');
    };
    const renderMethodOptions = () => {
      methodsBox.innerHTML = methods.map(method => '<label class="academy-method-choice' + (method.id === selectedProvider ? " active" : "") + '"><input type="radio" name="pay-method" value="' + escape(method.id) + '"' + (method.id === selectedProvider ? " checked" : "") + '><span><strong>' + escape(t(method.id === "CLIQ" ? "cliq" : "western")) + '</strong><small>' + (method.id === "CLIQ" ? "ALIAS TRANSFER" : "MONEY TRANSFER") + '</small></span><b aria-hidden="true">↗</b></label>').join("");
    };
    const applyDetails = data => {
      total.textContent = new Intl.NumberFormat(lang === "ar" ? "ar-JO" : "en-JO", { maximumFractionDigits: 3 }).format(Number(data.totalJod ?? data.priceJod));
      methods = (data.methods || []).filter(method => ["CLIQ", "WESTERN_UNION"].includes(method.id));
      checkoutReady = methods.length > 0;
      renderMethodOptions();
      renderMethodDetails();
      updateFinalButton();
    };
    const loadPublicMethods = async () => {
      const response = await fetch("/api/course-checkout?methods=public", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t("error"));
      methods = (data.methods || []).filter(method => ["CLIQ", "WESTERN_UNION"].includes(method.id));
      renderMethodOptions();
      renderMethodDetails();
      updateFinalButton();
    };
    const publicMethodsRequest = loadPublicMethods().catch(() => {});
    methodsBox.addEventListener("change", () => {
      const selected = $("input[name='pay-method']:checked");
      selectedProvider = selected ? selected.value : "";
      document.querySelectorAll(".academy-method-choice").forEach(choice => choice.classList.toggle("active", choice.contains(selected)));
      proofReady = false; proofProvider = "";
      renderMethodDetails();
      uploadButton.disabled = !selectedProvider || !receipt.files || !receipt.files[0];
      updateFinalButton();
    });
    panel.addEventListener("click", async event => {
      const button = event.target.closest("[data-copy-value]");
      if (!button) return;
      try { await navigator.clipboard.writeText(button.dataset.copyValue); button.textContent = t("copied"); setTimeout(() => { button.textContent = t("copy"); }, 1300); }
      catch { setStatus(t("copyFailed"), "error"); }
    });
    receipt.addEventListener("change", () => {
      proofReady = false; proofProvider = "";
      const selected = $("input[name='pay-method']:checked");
      uploadButton.disabled = !selected || !receipt.files || !receipt.files[0];
      if (receipt.files && receipt.files[0] && !selected) setStatus(t("chooseMethod"), "error");
      else setStatus("");
      updateFinalButton();
    });
    reference.addEventListener("input", updateFinalButton);
    uploadButton.addEventListener("click", async () => {
      const file = receipt.files && receipt.files[0];
      const selected = $("input[name='pay-method']:checked");
      if (!file || !selected) { setStatus(t("chooseMethod"), "error"); return; }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { setStatus(t("receiptHelp"), "error"); return; }
      proofBusy = true; uploadButton.textContent = t("upload"); updateFinalButton(); setStatus(t("upload"));
      try {
        const provider = selected.value;
        const proof = await call({ action: "proof-url", provider, contentType: file.type, size: file.size });
        const uploaded = await fetch(proof.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        if (!uploaded.ok) throw new Error(t("proofError"));
        const blobData = await uploaded.json();
        const blobUrl = blobData.url;
        const pathname = decodeURIComponent(new URL(blobUrl).pathname.slice(1));
        await call({ action: "proof-confirm", provider, contentType: file.type, pathname, blobUrl });
        const currentSelection = $("input[name='pay-method']:checked");
        proofReady = Boolean(currentSelection && currentSelection.value === provider);
        proofProvider = proofReady ? provider : "";
        if (proofReady) setStatus(t("proofReady"), "success");
        else setStatus(t("proofError"), "error");
      } catch (error) {
        proofReady = false; proofProvider = "";
        setStatus(error.message || t("proofError"), "error");
      } finally {
        proofBusy = false; uploadButton.textContent = t("proofUpload"); updateFinalButton();
        if (proofReady && reference.value.trim().length < 3) setStatus(t("enterReference"));
      }
    });
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (token && panel.classList.contains("visible") && checkoutReady) {
        const selected = $("input[name='pay-method']:checked");
        if (!selected || !proofReady || selected.value !== proofProvider || reference.value.trim().length < 3) {
          setStatus(!selected ? t("chooseMethod") : !proofReady ? t("proofError") : t("enterReference"), "error");
          updateFinalButton();
          return;
        }
        submit.disabled = true;
        setStatus(t("upload"));
        try {
          await call({ action: "submit", provider: selected.value, reference: reference.value.trim() });
          panel.classList.remove("visible");
          $("[data-registration-fields]").classList.add("academy-hidden");
          $(".academy-form-actions").classList.add("academy-hidden");
          status.classList.add("academy-hidden");
          $("[data-success]").classList.remove("academy-hidden");
          history.replaceState(null, "", location.pathname);
        } catch (error) {
          setStatus(error.message || t("error"), "error");
          submit.disabled = false;
        }
        return;
      }
      if (!panel.classList.contains("visible") && !form.reportValidity()) { setStatus(t("invalid"), "error"); return; }
      // Enter the payment step immediately after validating required learner details.
      // Backend readiness must not leave Continue appearing inert.
      panel.classList.add("visible");
      $("[data-registration-fields]").classList.add("academy-hidden");
      $("[data-step-indicator='2']").classList.add("active");
      reference.required = true; receipt.required = true;
      submit.textContent = t("send");
      setStatus(t("sending"));
      panel.scrollIntoView({ behavior: "smooth", block: "center" });
      if (!token) {
        submit.disabled = true;
        try {
          const values = Object.fromEntries(new FormData(form));
          const response = await fetch("/api/course-registration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, courseId: course.id, consent: form.elements.consent.checked }) });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) { const error = new Error(data.error || t("error")); error.pendingPaymentProof = Boolean(data.pendingPaymentProof); throw error; }
          token = data.checkoutToken;
          history.replaceState(null, "", location.pathname + "#" + encodeURIComponent(token));
        } catch (error) {
          if (error.pendingPaymentProof) await publicMethodsRequest;
          setStatus(error.message || t("error"), "error");
          submit.disabled = panel.classList.contains("visible");
          return;
        }
      }
      try {
        const details = await call({ action: "details", couponCode: $("#coupon-code").value.trim().toUpperCase(), previousCourseEmail: $("#prior-email").value.trim() });
        applyDetails(details);
        panel.classList.add("visible");
        $("[data-registration-fields]").classList.add("academy-hidden");
        $("[data-step-indicator='2']").classList.add("active");
        reference.required = true; receipt.required = true;
        submit.textContent = t("send");
        couponStatus.textContent = details.couponCode ? t("couponDone") + ": " + details.couponCode + " (" + details.discountPercent + "%)" : t("noCoupon");
        couponStatus.className = "academy-form-message";
        setStatus(t("chooseMethod"));
        updateFinalButton();
        panel.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (error) {
        if (error.code === "PREVIOUS_COURSE_EMAIL_REQUIRED") { $("[data-prior-email]").classList.remove("academy-hidden"); $("#prior-email").focus(); couponStatus.textContent = t("alumni"); couponStatus.className = "academy-form-message error"; }
        else { couponStatus.textContent = error.message || t("error"); couponStatus.className = "academy-form-message error"; }
        submit.disabled = false;
        return;
      }
    });
    const existing = decodeURIComponent(location.hash.slice(1));
    if (existing) {
      token = existing;
      call({ action: "details" }).then(details => {
        applyDetails(details); panel.classList.add("visible"); $("[data-registration-fields]").classList.add("academy-hidden"); $("[data-step-indicator='2']").classList.add("active");
        reference.required = true; receipt.required = true; submit.textContent = t("send"); setStatus(t("chooseMethod")); updateFinalButton();
      }).catch(() => { token = ""; history.replaceState(null, "", location.pathname); });
    }
    fetch("/api/course-registration?course=" + encodeURIComponent(course.id), { cache: "no-store" }).then(response => response.json()).then(data => {
      // Availability feedback is informational; the first-step action stays usable.
      if (data.open === false && !token && !panel.classList.contains("visible")) setStatus(t("courseClosed"));
    }).catch(() => {});
  }
})();

