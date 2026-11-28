/**
 * 7Z MAGIC — MAJARA ACADEMY CLIENT APPLICATION & CINEMA PLAYER
 * Strict CSP (Zero inline code, zero inline styles)
 * Single-Session Lock, Dynamic Forensic Watermark, Course Progress Tracking
 */

(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const API_URL = "/api/student-portal";
  const STORAGE_KEY = "z7_majara_session";

  // Application State
  const state = {
    student: null,
    sessionToken: null,
    lang: "ar",
    enrollments: [],
    currentCourse: null,
    currentLesson: null,
    lessons: [],
    progressMap: {},
    watermarkInterval: null,
    ytPlayer: null
  };

  // Translations dictionary
  const i18n = {
    ar: {
      brand_sub: "بوابة الطالب الأكاديمية",
      login_title: "تسجيل دخول الطالب",
      login_desc: "أدخل بريدك الإلكتروني وكلمة المرور للمتابعة إلى استوديو الدروس.",
      login_btn: "تسجيل الدخول إلى الأكاديمية ←",
      activate_title: "تفعيل الحساب لأول مرة",
      activate_desc: "قم بتعيين كلمة المرور الخاصة بحسابك الأكاديمي للوصول الفوري.",
      activate_btn: "تفعيل الحساب والدخول ←",
      reset_title: "استعادة كلمة المرور",
      reset_desc: "أدخل بريدك الإلكتروني لإرسال رابط إعادة التعيين عبر Zoho SMTP.",
      reset_btn: "إرسال رابط الاستعادة ←",
      switch_to_activate: "تفعيل حساب جديد لأول مرة",
      switch_to_login: "لديك حساب مفعل؟ تسجيل الدخول",
      switch_to_reset: "نسيت كلمة المرور؟",
      my_courses: "مكتبة دوراتي المسجل بها",
      resume_learning: "متابعة التعلم من حيث توقفت ←",
      completed_lessons: "دروس مكتملة",
      out_of: "من أصل",
      mark_completed: "تحديد الدرس كمكتمل ✓",
      lesson_completed_badge: "مكتمل ✓",
      tab_notes: "ملخص وملاحظات الدرس",
      tab_resources: "المرفقات والملفات الرقمية",
      no_resources: "لا توجد ملفات مرفقة لهذا الدرس.",
      download: "تنزيل الملف ⤓",
      session_superseded: "تم قفل الجلسة: تم تسجيل الدخول إلى حسابك من جهاز آخر. للحفاظ على أمان حسابك يُسمح بجلسة نشطة واحدة فقط.",
      profile_title: "الملف الشخصي والأمان",
      save_profile: "حفظ التغييرات",
      change_password_title: "تغيير كلمة المرور",
      sign_out: "تسجيل الخروج",
      back_dashboard: "العودة إلى دوراتي"
    },
    en: {
      brand_sub: "Student Portal",
      login_title: "Student Sign In",
      login_desc: "Enter your email and password to access your masterclass workspace.",
      login_btn: "Sign In to Academy →",
      activate_title: "First-Time Account Activation",
      activate_desc: "Set your personal password to unlock immediate course access.",
      activate_btn: "Activate & Enter Academy →",
      reset_title: "Reset Password",
      reset_desc: "Enter your registered email to receive a secure password reset link.",
      reset_btn: "Send Reset Link →",
      switch_to_activate: "First time here? Activate account",
      switch_to_login: "Already activated? Sign In",
      switch_to_reset: "Forgot password?",
      my_courses: "My Enrolled Masterclasses",
      resume_learning: "Resume Learning →",
      completed_lessons: "Completed",
      out_of: "of",
      mark_completed: "Mark as Completed ✓",
      lesson_completed_badge: "Completed ✓",
      tab_notes: "Lesson Notes & Summary",
      tab_resources: "Resources & Downloads",
      no_resources: "No digital attachments for this lesson.",
      download: "Download Asset ⤓",
      session_superseded: "Session Locked: Your account was accessed from another device. Only one concurrent session is permitted.",
      profile_title: "Profile & Security",
      save_profile: "Save Changes",
      change_password_title: "Change Password",
      sign_out: "Sign Out",
      back_dashboard: "Back to Dashboard"
    }
  };

  function t(key) {
    return (i18n[state.lang] && i18n[state.lang][key]) || key;
  }

  // Toast feedback
  function toast(message, isError = false) {
    const existing = $("#majara-toast-notification");
    if (existing) existing.remove();

    const el = document.createElement("div");
    el.id = "majara-toast-notification";
    el.className = `majara-user-pill ${isError ? "text-amber" : "text-emerald"}`;
    el.textContent = message;
    document.body.appendChild(el);

    setTimeout(() => {
      el.remove();
    }, 3500);
  }

  // API Client with Single-Session Lock detection
  async function api(action, payload = {}) {
    const headers = {
      "Content-Type": "application/json"
    };

    if (state.sessionToken) {
      headers["X-Student-Token"] = state.sessionToken;
    }
    if (state.student?.id) {
      headers["X-Student-Id"] = state.student.id;
    }

    const res = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ action, ...payload })
    });

    if (res.status === 401) {
      const err = await res.json().catch(() => ({}));
      if (err.code === "SESSION_SUPERSEDED" || err.error?.includes("another device")) {
        clearSession();
        alert(t("session_superseded"));
        showView("auth-view");
        return null;
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    return res.json();
  }

  // Session persistence
  function saveSession(data) {
    state.sessionToken = data.sessionToken;
    state.student = data.student;
    state.enrollments = data.enrollments || [];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        sessionToken: state.sessionToken,
        student: state.student
      }));
    } catch {}
  }

  function loadStoredSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (parsed.sessionToken && parsed.student?.id) {
        state.sessionToken = parsed.sessionToken;
        state.student = parsed.student;
        return true;
      }
    } catch {}
    return false;
  }

  function clearSession() {
    state.sessionToken = null;
    state.student = null;
    state.enrollments = [];
    clearInterval(state.watermarkInterval);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  // View Routing
  function showView(viewId) {
    const views = ["auth-view", "dashboard-view", "classroom-view", "profile-view"];
    views.forEach(v => {
      const el = $(`#${v}`);
      if (!el) return;
      const isActive = v === viewId;
      el.hidden = !isActive;
      el.classList.toggle("hidden", !isActive);
    });

    // Update nav user state
    updateNavUI();
  }

  function updateNavUI() {
    const userPill = $("#nav-user-pill");
    const loginBtn = $("#nav-login-btn");
    const logoutBtn = $("#nav-logout-btn");
    const myCoursesBtn = $("#nav-mycourses-btn");
    const studentNameEl = $("#nav-student-name");

    if (state.student && state.sessionToken) {
      if (userPill) userPill.classList.remove("hidden");
      if (loginBtn) loginBtn.classList.add("hidden");
      if (logoutBtn) logoutBtn.classList.remove("hidden");
      if (myCoursesBtn) myCoursesBtn.classList.remove("hidden");
      if (studentNameEl) studentNameEl.textContent = state.student.fullName || state.student.email;
    } else {
      if (userPill) userPill.classList.add("hidden");
      if (loginBtn) loginBtn.classList.remove("hidden");
      if (logoutBtn) logoutBtn.classList.add("hidden");
      if (myCoursesBtn) myCoursesBtn.classList.add("hidden");
    }
  }

  // Language management
  function setLanguage(lang) {
    state.lang = lang === "en" ? "en" : "ar";
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";

    const langToggleBtn = $("#majara-lang-toggle");
    if (langToggleBtn) {
      langToggleBtn.textContent = state.lang === "ar" ? "EN" : "عربي";
    }

    // Refresh active view texts
    $$("[data-i18n]").forEach(el => {
      const k = el.dataset.i18n;
      if (k) el.textContent = t(k);
    });

    if (state.student) {
      if (!$("#dashboard-view").hidden) renderDashboard();
      if (!$("#classroom-view").hidden && state.currentLesson) renderClassroom();
    }
  }

  // Dynamic Forensic Watermark Engine
  function startForensicWatermark(watermarkData) {
    clearInterval(state.watermarkInterval);

    const watermarkEl = $("#cinema-watermark");
    if (!watermarkEl) return;

    const studentInfo = watermarkData || {
      fullName: state.student?.fullName || "Student",
      email: state.student?.email || "",
      phone: state.student?.phone || "",
      ip: state.student?.lastIp || ""
    };

    function updatePosition() {
      // Random coordinates keeping within safe video margins (8% to 75%)
      const top = Math.floor(Math.random() * 65) + 10;
      const left = Math.floor(Math.random() * 60) + 10;

      watermarkEl.style.top = `${top}%`;
      watermarkEl.style.left = `${left}%`;

      const now = new Date();
      const timeStr = now.toLocaleTimeString(state.lang === "ar" ? "ar-JO" : "en-US", { hour12: false });
      watermarkEl.textContent = `MAJARA // ${studentInfo.fullName} • ${studentInfo.email} • ${studentInfo.phone || studentInfo.ip} • ${timeStr}`;
    }

    updatePosition();
    // Reposition every 7 seconds
    state.watermarkInterval = setInterval(updatePosition, 7000);
  }

  // 1. Dashboard Controller
  async function loadDashboard() {
    try {
      const data = await api("dashboard");
      if (!data) return;
      state.enrollments = data.enrollments || [];
      renderDashboard();
      showView("dashboard-view");
    } catch (err) {
      console.error("[Dashboard Load Error]:", err);
      toast(err.message, true);
    }
  }

  function renderDashboard() {
    const grid = $("#dashboard-courses-grid");
    if (!grid) return;
    grid.innerHTML = "";

    if (state.enrollments.length === 0) {
      grid.innerHTML = `
        <div class="majara-course-card p-6 text-center">
          <h3 class="majara-card-title">${state.lang === "ar" ? "لم يتم تفعيل أي دورة بعد" : "No Active Masterclasses"}</h3>
          <p class="majara-card-desc">${state.lang === "ar" ? "يرجى مراجعة الإدارة أو إتمام التسجيل في المتجر." : "Please contact studio administration or complete registration in marketplace."}</p>
          <a href="https://7z-magic.com/" class="majara-btn-primary d-inline-block mt-3">${state.lang === "ar" ? "تصفح المتجر والماستر كلاس ↗" : "Browse Marketplace Catalog ↗"}</a>
        </div>
      `;
      return;
    }

    state.enrollments.forEach(en => {
      const card = document.createElement("div");
      card.className = "majara-course-card";

      const total = Number(en.total_lessons || 0);
      const completed = Number(en.completed_lessons || 0);
      const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

      const title = state.lang === "ar" ? (en.title_ar || en.title_en) : (en.title_en || en.title_ar);
      const desc = state.lang === "ar" ? (en.description_ar || en.description_en) : (en.description_en || en.description_ar);

      const media = document.createElement("div");
      media.className = "majara-card-media";
      const img = document.createElement("img");
      img.className = "majara-card-img";
      img.src = en.cover_image || "/media/posters/film/1.webp";
      img.alt = title;
      img.loading = "lazy";
      media.appendChild(img);

      const content = document.createElement("div");
      content.className = "majara-card-content";

      const h3 = document.createElement("h3");
      h3.className = "majara-card-title";
      h3.textContent = title;

      const p = document.createElement("p");
      p.className = "majara-card-desc";
      p.textContent = desc;

      const barWrap = document.createElement("div");
      barWrap.className = "majara-progress-bar-wrap";
      const barFill = document.createElement("div");
      barFill.className = "majara-progress-bar-fill";
      barFill.style.width = `${pct}%`;
      barWrap.appendChild(barFill);

      const meta = document.createElement("div");
      meta.className = "majara-progress-meta";
      meta.innerHTML = `<span>${pct}% ${t("completed_lessons")}</span><span>${completed} ${t("out_of")} ${total}</span>`;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "majara-btn-primary";
      btn.textContent = t("resume_learning");
      btn.addEventListener("click", () => {
        openCourseClassroom(en.id || en.slug);
      });

      content.appendChild(h3);
      content.appendChild(p);
      content.appendChild(barWrap);
      content.appendChild(meta);
      content.appendChild(btn);

      card.appendChild(media);
      card.appendChild(content);
      grid.appendChild(card);
    });
  }

  // 2. Cinema Classroom Controller
  async function openCourseClassroom(courseId, initialLessonId = null) {
    try {
      const data = await api("course-curriculum", { courseId });
      if (!data) return;
      state.currentCourse = data.course;
      state.lessons = data.lessons || [];
      state.progressMap = data.progressMap || {};

      showView("classroom-view");

      // Select target lesson
      let targetLesson = null;
      if (initialLessonId) {
        targetLesson = state.lessons.find(l => String(l.id) === String(initialLessonId));
      }
      if (!targetLesson && state.lessons.length > 0) {
        // Find first incomplete lesson or default to first
        targetLesson = state.lessons.find(l => !state.progressMap[l.id]?.completed) || state.lessons[0];
      }

      if (targetLesson) {
        loadLesson(targetLesson.id);
      }
    } catch (err) {
      console.error("[Open Classroom Error]:", err);
      toast(err.message, true);
    }
  }

  async function loadLesson(lessonId) {
    try {
      const data = await api("lesson-view", { lessonId });
      if (!data) return;
      state.currentLesson = data.lesson;
      const progress = data.progress || { completed: false };

      renderClassroom(progress);
      startForensicWatermark(data.watermark);
    } catch (err) {
      console.error("[Load Lesson Error]:", err);
      toast(err.message, true);
    }
  }

  function renderClassroom(progress = {}) {
    if (!state.currentLesson || !state.currentCourse) return;

    const lesson = state.currentLesson;
    const isAr = state.lang === "ar";
    const title = isAr ? (lesson.title_ar || lesson.title_en) : (lesson.title_en || lesson.title_ar);
    const courseTitle = isAr ? (state.currentCourse.title_ar || state.currentCourse.title_en) : (state.currentCourse.title_en || state.currentCourse.title_ar);

    // Update Classroom Header
    const courseTitleEl = $("#classroom-course-title");
    const lessonTitleEl = $("#classroom-lesson-title");
    if (courseTitleEl) courseTitleEl.textContent = courseTitle;
    if (lessonTitleEl) lessonTitleEl.textContent = title;

    // Load Video in Protected Cinema Frame
    const iframe = $("#cinema-video-iframe");
    if (iframe) {
      if (lesson.source_type === "youtube") {
        const ytId = lesson.source_id;
        iframe.src = `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1&controls=1&disablekb=1&iv_load_policy=3&enablejsapi=1`;
      } else if (lesson.source_type === "gdrive") {
        const driveId = lesson.source_id;
        iframe.src = `https://drive.google.com/file/d/${driveId}/preview`;
      }
    }

    // Complete button state
    const isCompleted = state.progressMap[lesson.id]?.completed || progress.completed;
    const completeBtn = $("#classroom-mark-completed-btn");
    if (completeBtn) {
      completeBtn.classList.toggle("is-done", Boolean(isCompleted));
      completeBtn.textContent = isCompleted ? t("lesson_completed_badge") : t("mark_completed");
    }

    // Lesson Notes & Summary
    const notesEl = $("#classroom-notes-pane");
    if (notesEl) {
      notesEl.textContent = lesson.summary || (isAr ? "لا توجد ملاحظات إضافية لهذا الدرس." : "No additional notes for this lesson.");
    }

    // Resources List
    const resListEl = $("#classroom-resources-list");
    if (resListEl) {
      resListEl.innerHTML = "";
      const resources = Array.isArray(lesson.resources_json) ? lesson.resources_json : [];
      if (resources.length === 0) {
        resListEl.innerHTML = `<p class="text-muted">${t("no_resources")}</p>`;
      } else {
        resources.forEach(r => {
          const a = document.createElement("a");
          a.className = "majara-resource-item";
          a.href = r.url || "#";
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.innerHTML = `<span>${r.name || "Resource File"}</span><span>${t("download")}</span>`;
          resListEl.appendChild(a);
        });
      }
    }

    // Render Curriculum Playlist in Sidebar
    renderCurriculumSidebar();
  }

  function renderCurriculumSidebar() {
    const listEl = $("#classroom-curriculum-list");
    if (!listEl) return;
    listEl.innerHTML = "";

    // Group lessons by module
    const modulesMap = new Map();
    state.lessons.forEach(l => {
      const key = `${l.module_order || 1}:::${l.module_title || "Module"}`;
      if (!modulesMap.has(key)) modulesMap.set(key, []);
      modulesMap.get(key).push(l);
    });

    modulesMap.forEach((lessonsInMod, modKey) => {
      const [, modTitle] = modKey.split(":::");
      const modHeader = document.createElement("div");
      modHeader.className = "majara-module-header";
      modHeader.textContent = modTitle;
      listEl.appendChild(modHeader);

      lessonsInMod.forEach(l => {
        const isCurrent = state.currentLesson && String(state.currentLesson.id) === String(l.id);
        const isDone = Boolean(state.progressMap[l.id]?.completed);
        const lTitle = state.lang === "ar" ? (l.title_ar || l.title_en) : (l.title_en || l.title_ar);

        const item = document.createElement("div");
        item.className = `majara-lesson-item ${isCurrent ? "is-active" : ""}`;

        const left = document.createElement("div");
        left.className = "majara-lesson-item-left";

        const check = document.createElement("div");
        check.className = `majara-check-indicator ${isDone ? "is-completed" : ""}`;
        check.textContent = isDone ? "✓" : "";
        left.appendChild(check);

        const titleSpan = document.createElement("span");
        titleSpan.className = "majara-lesson-item-title";
        titleSpan.textContent = lTitle;
        left.appendChild(titleSpan);

        const dur = document.createElement("span");
        dur.className = "majara-lesson-item-dur";
        dur.textContent = l.duration_label || "";

        item.appendChild(left);
        item.appendChild(dur);

        item.addEventListener("click", () => {
          loadLesson(l.id);
        });

        listEl.appendChild(item);
      });
    });
  }

  // Toggle Lesson Completion
  async function toggleLessonCompletion() {
    if (!state.currentLesson) return;
    const lId = state.currentLesson.id;
    const wasCompleted = Boolean(state.progressMap[lId]?.completed);
    const newStatus = !wasCompleted;

    try {
      await api("update-progress", {
        lessonId: lId,
        completed: newStatus
      });

      if (!state.progressMap[lId]) state.progressMap[lId] = {};
      state.progressMap[lId].completed = newStatus;

      const completeBtn = $("#classroom-mark-completed-btn");
      if (completeBtn) {
        completeBtn.classList.toggle("is-done", newStatus);
        completeBtn.textContent = newStatus ? t("lesson_completed_badge") : t("mark_completed");
      }

      renderCurriculumSidebar();
      toast(newStatus ? "Lesson marked as completed! ✓" : "Lesson status updated");
    } catch (err) {
      toast("Failed to update progress: " + err.message, true);
    }
  }

  // Event Listeners Initialization
  function init() {
    // 1. Language Toggle
    $("#majara-lang-toggle")?.addEventListener("click", () => {
      setLanguage(state.lang === "ar" ? "en" : "ar");
    });

    // 2. Navigation Actions
    $("#nav-mycourses-btn")?.addEventListener("click", loadDashboard);
    $("#nav-back-dashboard-btn")?.addEventListener("click", loadDashboard);
    $("#nav-profile-btn")?.addEventListener("click", () => showView("profile-view"));
    $("#nav-logout-btn")?.addEventListener("click", async () => {
      try { await api("logout"); } catch {}
      clearSession();
      showView("auth-view");
    });

    // 3. Auth Form Handlers
    $("#auth-login-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("#login-email").value;
      const password = $("#login-password").value;
      try {
        const data = await api("login", { email, password });
        if (data && data.ok) {
          saveSession(data);
          loadDashboard();
        }
      } catch (err) {
        toast(err.message, true);
      }
    });

    $("#auth-activate-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("#activate-email").value;
      const password = $("#activate-password").value;
      try {
        const data = await api("activate", { email, password });
        if (data && data.ok) {
          saveSession(data);
          toast("Account activated successfully!");
          loadDashboard();
        }
      } catch (err) {
        toast(err.message, true);
      }
    });

    $("#auth-reset-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("#reset-email").value;
      try {
        const data = await api("request-reset", { email });
        toast(data.message || "Reset instructions sent.");
        $("#auth-reset-pane").classList.add("hidden");
        $("#auth-login-pane").classList.remove("hidden");
      } catch (err) {
        toast(err.message, true);
      }
    });

    // 4. Auth Mode Switchers
    $("#switch-to-activate")?.addEventListener("click", () => {
      $("#auth-login-pane").classList.add("hidden");
      $("#auth-reset-pane").classList.add("hidden");
      $("#auth-activate-pane").classList.remove("hidden");
    });

    $("#switch-to-login")?.addEventListener("click", () => {
      $("#auth-activate-pane").classList.add("hidden");
      $("#auth-reset-pane").classList.add("hidden");
      $("#auth-login-pane").classList.remove("hidden");
    });

    $("#switch-to-reset")?.addEventListener("click", () => {
      $("#auth-login-pane").classList.add("hidden");
      $("#auth-activate-pane").classList.add("hidden");
      $("#auth-reset-pane").classList.remove("hidden");
    });

    $("#reset-to-login")?.addEventListener("click", () => {
      $("#auth-reset-pane").classList.add("hidden");
      $("#auth-activate-pane").classList.add("hidden");
      $("#auth-login-pane").classList.remove("hidden");
    });

    // 5. Classroom Tabs
    $("#tab-notes-btn")?.addEventListener("click", () => {
      $("#tab-notes-btn").classList.add("active");
      $("#tab-resources-btn").classList.remove("active");
      $("#classroom-notes-pane").classList.remove("hidden");
      $("#classroom-resources-pane").classList.add("hidden");
    });

    $("#tab-resources-btn")?.addEventListener("click", () => {
      $("#tab-resources-btn").classList.add("active");
      $("#tab-notes-btn").classList.remove("active");
      $("#classroom-resources-pane").classList.remove("hidden");
      $("#classroom-notes-pane").classList.add("hidden");
    });

    // 6. Complete Lesson Button
    $("#classroom-mark-completed-btn")?.addEventListener("click", toggleLessonCompletion);

    // 7. Cinema Custom Controls (Play/Pause, Rewind, Forward, Fullscreen)
    $("#ctrl-fullscreen")?.addEventListener("click", () => {
      const stage = $("#cinema-container");
      if (!stage) return;
      if (!document.fullscreenElement) {
        stage.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    // 8. Profile Form
    $("#profile-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fullName = $("#profile-name").value;
      const phone = $("#profile-phone").value;
      try {
        const data = await api("update-profile", { fullName, phone });
        if (data && data.ok) {
          state.student.fullName = data.student.fullName;
          state.student.phone = data.student.phone;
          updateNavUI();
          toast("Profile updated successfully!");
        }
      } catch (err) {
        toast(err.message, true);
      }
    });

    $("#password-change-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const currentPassword = $("#profile-old-pass").value;
      const newPassword = $("#profile-new-pass").value;
      try {
        await api("change-password", { currentPassword, newPassword });
        toast("Password changed successfully!");
        $("#profile-old-pass").value = "";
        $("#profile-new-pass").value = "";
      } catch (err) {
        toast(err.message, true);
      }
    });

    // Check query params for activate or reset
    const urlParams = new URLSearchParams(window.location.search);
    const activateToken = urlParams.get("activate");
    const resetToken = urlParams.get("reset");
    const paramEmail = urlParams.get("email");

    if (activateToken || (urlParams.get("action") === "activate")) {
      showView("auth-view");
      $("#auth-login-pane")?.classList.add("hidden");
      $("#auth-activate-pane")?.classList.remove("hidden");
      if (paramEmail && $("#activate-email")) $("#activate-email").value = paramEmail;
    } else if (resetToken) {
      showView("auth-view");
      $("#auth-login-pane")?.classList.add("hidden");
      $("#auth-activate-pane")?.classList.remove("hidden");
      if (paramEmail && $("#activate-email")) $("#activate-email").value = paramEmail;
    } else {
      // Check stored session
      if (loadStoredSession()) {
        loadDashboard();
      } else {
        showView("auth-view");
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
