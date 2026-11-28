/**
 * 7Z MAGIC — MAJARA ACADEMY ADMIN CLIENT ENGINE
 * Full-stack Course, Curriculum & Student Administration
 * Strict CSP (Zero inline code, zero inline styles)
 */

(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  let state = {
    courses: [],
    students: [],
    currentCourseId: null,
    lessons: []
  };

  const API_URL = "/api/admin/course-engine";

  // Toast feedback helper
  function notify(message, isError = false) {
    const existing = $("#majara-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "majara-toast";
    toast.className = `admin-toast ${isError ? "toast-error" : "toast-success"}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("toast-fadeout");
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  // Extract video ID helper for YouTube & Google Drive
  function extractVideoMeta(input, preferredType = null) {
    const raw = String(input || "").trim();
    if (!raw) return { sourceType: "youtube", sourceId: "" };

    if (preferredType === "gdrive" || raw.includes("drive.google.com")) {
      const match = raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                    raw.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                    raw.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
      return {
        sourceType: "gdrive",
        sourceId: match ? match[1] : raw
      };
    }

    const ytMatch = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/) ||
                    raw.match(/^([\w-]{11})$/);
    return {
      sourceType: "youtube",
      sourceId: ytMatch ? ytMatch[1] : raw
    };
  }

  async function apiPost(action, payload = {}) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // Load courses & students
  async function loadMajaraData() {
    try {
      const res = await fetch(`${API_URL}?action=majara-data`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      state.courses = data.courses || [];
      state.students = data.students || [];

      // Update counters
      const courseCountEl = $("#majara-courses-count");
      const studentCountEl = $("#majara-students-count");
      if (courseCountEl) courseCountEl.textContent = state.courses.length;
      if (studentCountEl) studentCountEl.textContent = state.students.length;

      renderCourses();
      populateCourseSelects();
      renderStudents();

      if (state.courses.length > 0 && !state.currentCourseId) {
        state.currentCourseId = state.courses[0].id;
        loadLessons(state.currentCourseId);
      }
    } catch (err) {
      console.error("[Majara Admin] Failed to load data:", err);
      notify("Failed to load Majara Academy data: " + err.message, true);
    }
  }

  // Load lessons for a specific course
  async function loadLessons(courseId) {
    if (!courseId) return;
    state.currentCourseId = courseId;
    try {
      const res = await fetch(`${API_URL}?action=majara-lessons&courseId=${encodeURIComponent(courseId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      state.lessons = data.lessons || [];

      const currentCourse = state.courses.find(c => String(c.id) === String(courseId) || String(c.slug) === String(courseId));
      const titleEl = $("#majara-current-course-title");
      if (titleEl && currentCourse) {
        titleEl.textContent = `Curriculum: ${currentCourse.title_en || currentCourse.title_ar}`;
      }

      renderLessons();
    } catch (err) {
      console.error("[Majara Admin] Failed to load lessons:", err);
      notify("Failed to load lessons: " + err.message, true);
    }
  }

  // 1. Render Courses Table
  function renderCourses() {
    const tbody = $("#majara-courses-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (state.courses.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No courses found. Click "+ Add New Course" to begin.</td></tr>`;
      return;
    }

    state.courses.forEach(c => {
      const tr = document.createElement("tr");

      const tdCourse = document.createElement("td");
      const titleBold = document.createElement("strong");
      titleBold.textContent = c.title_en || c.title_ar;
      const titleSub = document.createElement("small");
      titleSub.className = "d-block text-muted";
      titleSub.textContent = c.title_ar;
      tdCourse.appendChild(titleBold);
      tdCourse.appendChild(titleSub);

      const tdSlug = document.createElement("td");
      const codeSlug = document.createElement("code");
      codeSlug.textContent = c.slug;
      tdSlug.appendChild(codeSlug);

      const tdPrice = document.createElement("td");
      tdPrice.textContent = `$${Number(c.price_usd || 0).toFixed(2)}`;

      const tdLessons = document.createElement("td");
      const btnViewLessons = document.createElement("button");
      btnViewLessons.type = "button";
      btnViewLessons.className = "button button-secondary button-small";
      btnViewLessons.textContent = "View Lessons ↗";
      btnViewLessons.addEventListener("click", () => {
        selectSubTab("lessons");
        const select = $("#majara-lessons-course-select");
        if (select) select.value = c.id;
        loadLessons(c.id);
      });
      tdLessons.appendChild(btnViewLessons);

      const tdDrive = document.createElement("td");
      if (c.drive_folder_url) {
        const linkDrive = document.createElement("a");
        linkDrive.href = c.drive_folder_url;
        linkDrive.target = "_blank";
        linkDrive.rel = "noopener noreferrer";
        linkDrive.className = "button button-secondary button-small";
        linkDrive.textContent = "Google Drive ↗";
        tdDrive.appendChild(linkDrive);
      } else {
        tdDrive.textContent = "—";
      }

      const tdStatus = document.createElement("td");
      const tagStatus = document.createElement("span");
      tagStatus.className = c.is_published ? "tag tag-emerald" : "tag tag-slate";
      tagStatus.textContent = c.is_published ? "Published" : "Draft";
      tdStatus.appendChild(tagStatus);

      const tdActions = document.createElement("td");
      const btnEdit = document.createElement("button");
      btnEdit.type = "button";
      btnEdit.className = "button button-secondary button-small mr-1";
      btnEdit.textContent = "Edit";
      btnEdit.addEventListener("click", () => openCourseDialog(c));

      const btnDelete = document.createElement("button");
      btnDelete.type = "button";
      btnDelete.className = "button button-danger button-small";
      btnDelete.textContent = "Delete";
      btnDelete.addEventListener("click", async () => {
        if (!confirm(`Are you sure you want to delete course "${c.title_en || c.title_ar}" and all its lessons?`)) return;
        try {
          await apiPost("delete-majara-course", { id: c.id });
          notify("Course deleted successfully");
          loadMajaraData();
        } catch (err) {
          notify("Delete failed: " + err.message, true);
        }
      });

      tdActions.appendChild(btnEdit);
      tdActions.appendChild(btnDelete);

      tr.appendChild(tdCourse);
      tr.appendChild(tdSlug);
      tr.appendChild(tdPrice);
      tr.appendChild(tdLessons);
      tr.appendChild(tdDrive);
      tr.appendChild(tdStatus);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    });
  }

  // Populate course dropdowns
  function populateCourseSelects() {
    const selects = [$("#majara-lessons-course-select"), $("#majara-student-course-select")];
    selects.forEach(select => {
      if (!select) return;
      const currentVal = select.value;
      select.innerHTML = "";
      state.courses.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = `${c.title_en || c.title_ar} (${c.slug})`;
        select.appendChild(opt);
      });
      if (currentVal && state.courses.some(c => String(c.id) === currentVal)) {
        select.value = currentVal;
      }
    });
  }

  // 2. Render Lessons Table
  function renderLessons() {
    const tbody = $("#majara-lessons-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (state.lessons.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No lessons yet for this course. Click "+ Add Lesson" to build your curriculum.</td></tr>`;
      return;
    }

    state.lessons.forEach(l => {
      const tr = document.createElement("tr");

      const tdOrder = document.createElement("td");
      tdOrder.textContent = `${l.module_order}.${l.lesson_order}`;

      const tdModule = document.createElement("td");
      tdModule.textContent = l.module_title;

      const tdTitle = document.createElement("td");
      const titleStrong = document.createElement("strong");
      titleStrong.textContent = l.title_en || l.title_ar;
      const titleSub = document.createElement("small");
      titleSub.className = "d-block text-muted";
      titleSub.textContent = l.title_ar;
      tdTitle.appendChild(titleStrong);
      tdTitle.appendChild(titleSub);

      const tdSource = document.createElement("td");
      const tagSource = document.createElement("span");
      tagSource.className = l.source_type === "youtube" ? "tag tag-sky" : "tag tag-amber";
      tagSource.textContent = l.source_type === "youtube" ? "YouTube" : "Google Drive";
      tdSource.appendChild(tagSource);

      const tdSourceId = document.createElement("td");
      const codeId = document.createElement("code");
      codeId.textContent = l.source_id;
      tdSourceId.appendChild(codeId);

      const tdDuration = document.createElement("td");
      tdDuration.textContent = l.duration_label || "—";

      const tdPreview = document.createElement("td");
      const tagPrev = document.createElement("span");
      tagPrev.className = l.is_free_preview ? "tag tag-emerald" : "tag tag-slate";
      tagPrev.textContent = l.is_free_preview ? "Free Preview" : "Protected";
      tdPreview.appendChild(tagPrev);

      const tdActions = document.createElement("td");
      const btnEdit = document.createElement("button");
      btnEdit.type = "button";
      btnEdit.className = "button button-secondary button-small mr-1";
      btnEdit.textContent = "Edit";
      btnEdit.addEventListener("click", () => openLessonDialog(l));

      const btnDelete = document.createElement("button");
      btnDelete.type = "button";
      btnDelete.className = "button button-danger button-small";
      btnDelete.textContent = "Delete";
      btnDelete.addEventListener("click", async () => {
        if (!confirm(`Delete lesson "${l.title_en || l.title_ar}"?`)) return;
        try {
          await apiPost("delete-majara-lesson", { id: l.id });
          notify("Lesson deleted");
          loadLessons(state.currentCourseId);
        } catch (err) {
          notify("Delete failed: " + err.message, true);
        }
      });

      tdActions.appendChild(btnEdit);
      tdActions.appendChild(btnDelete);

      tr.appendChild(tdOrder);
      tr.appendChild(tdModule);
      tr.appendChild(tdTitle);
      tr.appendChild(tdSource);
      tr.appendChild(tdSourceId);
      tr.appendChild(tdDuration);
      tr.appendChild(tdPreview);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    });
  }

  // 3. Render Students Table
  function renderStudents(filterTerm = "") {
    const tbody = $("#majara-students-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    let list = state.students || [];
    if (filterTerm) {
      const q = filterTerm.toLowerCase();
      list = list.filter(s =>
        (s.full_name || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        (s.phone || "").toLowerCase().includes(q)
      );
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No students matching criteria.</td></tr>`;
      return;
    }

    list.forEach(s => {
      const tr = document.createElement("tr");

      const tdName = document.createElement("td");
      const strongName = document.createElement("strong");
      strongName.textContent = s.full_name || "Student";
      tdName.appendChild(strongName);

      const tdEmail = document.createElement("td");
      const spanEmail = document.createElement("span");
      spanEmail.textContent = s.email;
      const btnCopyEmail = document.createElement("button");
      btnCopyEmail.type = "button";
      btnCopyEmail.className = "button button-secondary button-small ml-2";
      btnCopyEmail.title = "Copy email for Google Drive sharing";
      btnCopyEmail.textContent = "Copy 📋";
      btnCopyEmail.addEventListener("click", () => {
        navigator.clipboard.writeText(s.email).then(() => {
          btnCopyEmail.textContent = "Copied! ✓";
          setTimeout(() => { btnCopyEmail.textContent = "Copy 📋"; }, 2000);
          notify(`Copied email for Google Drive: ${s.email}`);
        }).catch(() => {
          notify("Clipboard access denied", true);
        });
      });
      tdEmail.appendChild(spanEmail);
      tdEmail.appendChild(btnCopyEmail);

      const tdPhone = document.createElement("td");
      tdPhone.textContent = s.phone || "—";

      const tdEnrollments = document.createElement("td");
      const enrollments = s.enrollments || [];
      if (enrollments.length === 0) {
        const spanNone = document.createElement("span");
        spanNone.className = "tag tag-slate";
        spanNone.textContent = "Not Enrolled";
        tdEnrollments.appendChild(spanNone);
      } else {
        enrollments.forEach(en => {
          const badge = document.createElement("span");
          badge.className = `tag ${en.status === "active" ? "tag-emerald" : "tag-amber"} mr-1 mb-1 pointer`;
          badge.textContent = `${en.course_slug || en.course_title_en || en.course_id} (${en.status})`;
          badge.title = "Click to toggle Active / Suspended";
          badge.addEventListener("click", async () => {
            const nextStatus = en.status === "active" ? "suspended" : "active";
            try {
              await apiPost("toggle-majara-enrollment", {
                studentId: s.id,
                courseId: en.course_id,
                status: nextStatus
              });
              notify(`Course enrollment set to ${nextStatus}`);
              loadMajaraData();
            } catch (err) {
              notify("Toggle failed: " + err.message, true);
            }
          });
          tdEnrollments.appendChild(badge);
        });
      }

      const tdSession = document.createElement("td");
      const tagSess = document.createElement("span");
      tagSess.className = s.active_session_token ? "tag tag-sky" : "tag tag-slate";
      tagSess.textContent = s.active_session_token ? "1 Session Active" : "No Active Device";
      tdSession.appendChild(tagSess);

      const tdActions = document.createElement("td");
      const btnActivate = document.createElement("button");
      btnActivate.type = "button";
      btnActivate.className = "button button-secondary button-small mr-1";
      btnActivate.textContent = "Send Activation ✉";
      btnActivate.title = "Email student activation / password setup link";
      btnActivate.addEventListener("click", async () => {
        try {
          btnActivate.disabled = true;
          const res = await apiPost("send-student-activation", { studentId: s.id });
          notify("Activation email sent successfully to " + s.email);
        } catch (err) {
          notify("Email dispatch error: " + err.message, true);
        } finally {
          btnActivate.disabled = false;
        }
      });

      const btnEdit = document.createElement("button");
      btnEdit.type = "button";
      btnEdit.className = "button button-secondary button-small mr-1";
      btnEdit.textContent = "Edit";
      btnEdit.addEventListener("click", () => openStudentDialog(s));

      const btnDelete = document.createElement("button");
      btnDelete.type = "button";
      btnDelete.className = "button button-danger button-small";
      btnDelete.textContent = "Delete";
      btnDelete.addEventListener("click", async () => {
        if (!confirm(`Delete student account for "${s.full_name} (${s.email})"?`)) return;
        try {
          await apiPost("delete-majara-student", { id: s.id });
          notify("Student deleted");
          loadMajaraData();
        } catch (err) {
          notify("Delete failed: " + err.message, true);
        }
      });

      tdActions.appendChild(btnActivate);
      tdActions.appendChild(btnEdit);
      tdActions.appendChild(btnDelete);

      tr.appendChild(tdName);
      tr.appendChild(tdEmail);
      tr.appendChild(tdPhone);
      tr.appendChild(tdEnrollments);
      tr.appendChild(tdSession);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    });
  }

  // Dialog Helpers
  function openCourseDialog(course = null) {
    const dialog = $("#majara-course-dialog");
    if (!dialog) return;

    $("#majara-course-id").value = course?.id || "";
    $("#majara-course-title-en").value = course?.title_en || "";
    $("#majara-course-title-ar").value = course?.title_ar || "";
    $("#majara-course-slug").value = course?.slug || "";
    $("#majara-course-price").value = course?.price_usd ?? 250;
    $("#majara-course-drive").value = course?.drive_folder_url || "";
    $("#majara-course-cover").value = course?.cover_image || "/media/posters/film/1.webp";
    $("#majara-course-desc-ar").value = course?.description_ar || "";
    $("#majara-course-desc-en").value = course?.description_en || "";
    $("#majara-course-published").checked = course ? Boolean(course.is_published) : true;

    $("#majara-course-dialog-title").textContent = course ? "Edit Masterclass" : "Create New Masterclass";
    dialog.showModal();
  }

  function openLessonDialog(lesson = null) {
    const dialog = $("#majara-lesson-dialog");
    if (!dialog) return;

    $("#majara-lesson-id").value = lesson?.id || "";
    $("#majara-lesson-course-id").value = lesson?.course_id || state.currentCourseId || "";
    $("#majara-lesson-mod-order").value = lesson?.module_order || 1;
    $("#majara-lesson-mod-title").value = lesson?.module_title || "Module 1";
    $("#majara-lesson-order").value = lesson?.lesson_order || 1;
    $("#majara-lesson-title-en").value = lesson?.title_en || "";
    $("#majara-lesson-title-ar").value = lesson?.title_ar || "";
    $("#majara-lesson-source-type").value = lesson?.source_type || "youtube";
    $("#majara-lesson-source-id").value = lesson?.source_id || "";
    $("#majara-lesson-duration").value = lesson?.duration_label || "15:00";
    $("#majara-lesson-summary").value = lesson?.summary || "";
    $("#majara-lesson-resources").value = JSON.stringify(lesson?.resources_json || [], null, 2);
    $("#majara-lesson-preview").checked = Boolean(lesson?.is_free_preview);

    const helperText = $("#majara-lesson-source-helper");
    if (helperText) helperText.textContent = lesson?.source_id ? `Source ID: ${lesson.source_id}` : "";

    $("#majara-lesson-dialog-title").textContent = lesson ? "Edit Lesson" : "Add Lesson to Curriculum";
    dialog.showModal();
  }

  function openStudentDialog(student = null) {
    const dialog = $("#majara-student-dialog");
    if (!dialog) return;

    $("#majara-student-id").value = student?.id || "";
    $("#majara-student-name").value = student?.full_name || "";
    $("#majara-student-email").value = student?.email || "";
    $("#majara-student-phone").value = student?.phone || "";
    $("#majara-student-password").value = "";
    $("#majara-student-activation").checked = true;

    $("#majara-student-dialog-title").textContent = student ? "Edit Student Record" : "Enroll New Student";
    dialog.showModal();
  }

  // Sub-tab switcher
  function selectSubTab(tabName) {
    const tabs = {
      courses: { btn: $("#majara-sub-courses-tab"), panel: $("#majara-courses-subpanel") },
      lessons: { btn: $("#majara-sub-lessons-tab"), panel: $("#majara-lessons-subpanel") },
      students: { btn: $("#majara-sub-students-tab"), panel: $("#majara-students-subpanel") }
    };

    Object.keys(tabs).forEach(k => {
      const item = tabs[k];
      if (!item.btn || !item.panel) return;
      const isTarget = k === tabName;
      item.btn.classList.toggle("active", isTarget);
      item.panel.hidden = !isTarget;
      item.panel.classList.toggle("hidden", !isTarget);
    });
  }

  // Initialize event listeners cleanly (No inline code)
  function init() {
    // 1. Sub-nav tabs
    $("#majara-sub-courses-tab")?.addEventListener("click", () => selectSubTab("courses"));
    $("#majara-sub-lessons-tab")?.addEventListener("click", () => selectSubTab("lessons"));
    $("#majara-sub-students-tab")?.addEventListener("click", () => selectSubTab("students"));

    // 2. Action buttons
    $("#majara-refresh-btn")?.addEventListener("click", loadMajaraData);
    $("#majara-add-course-btn")?.addEventListener("click", () => openCourseDialog());
    $("#majara-add-student-btn")?.addEventListener("click", () => openStudentDialog());
    $("#majara-add-lesson-btn")?.addEventListener("click", () => openLessonDialog());

    // 3. Lessons course selector
    $("#majara-lessons-course-select")?.addEventListener("change", (e) => {
      loadLessons(e.target.value);
    });

    // 4. Student search input
    $("#majara-student-search")?.addEventListener("input", (e) => {
      renderStudents(e.target.value);
    });

    // 5. Live video source extractor on input
    $("#majara-lesson-source-id")?.addEventListener("input", (e) => {
      const prefType = $("#majara-lesson-source-type")?.value || null;
      const meta = extractVideoMeta(e.target.value, prefType);
      const helper = $("#majara-lesson-source-helper");
      if (helper) {
        helper.textContent = meta.sourceId ? `Detected ${meta.sourceType.toUpperCase()} ID: ${meta.sourceId}` : "";
      }
    });

    // 6. Course Form Submission
    $("#majara-course-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        id: $("#majara-course-id").value || undefined,
        title_en: $("#majara-course-title-en").value,
        title_ar: $("#majara-course-title-ar").value,
        slug: $("#majara-course-slug").value,
        price_usd: Number($("#majara-course-price").value || 0),
        drive_folder_url: $("#majara-course-drive").value,
        cover_image: $("#majara-course-cover").value,
        description_ar: $("#majara-course-desc-ar").value,
        description_en: $("#majara-course-desc-en").value,
        is_published: $("#majara-course-published").checked
      };
      try {
        await apiPost("save-majara-course", payload);
        notify("Course saved successfully!");
        $("#majara-course-dialog")?.close();
        loadMajaraData();
      } catch (err) {
        notify("Failed to save course: " + err.message, true);
      }
    });

    $("#majara-course-cancel")?.addEventListener("click", () => {
      $("#majara-course-dialog")?.close();
    });
    $("#majara-course-close-btn")?.addEventListener("click", () => {
      $("#majara-course-dialog")?.close();
    });

    // 7. Lesson Form Submission
    $("#majara-lesson-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      let resJson = [];
      try {
        resJson = JSON.parse($("#majara-lesson-resources").value || "[]");
      } catch {
        notify("Invalid resources JSON format", true);
        return;
      }

      const payload = {
        id: $("#majara-lesson-id").value || undefined,
        course_id: $("#majara-lesson-course-id").value || state.currentCourseId,
        module_order: Number($("#majara-lesson-mod-order").value || 1),
        module_title: $("#majara-lesson-mod-title").value,
        lesson_order: Number($("#majara-lesson-order").value || 1),
        title_en: $("#majara-lesson-title-en").value,
        title_ar: $("#majara-lesson-title-ar").value,
        source_type: $("#majara-lesson-source-type").value,
        source_id: $("#majara-lesson-source-id").value,
        duration_label: $("#majara-lesson-duration").value,
        summary: $("#majara-lesson-summary").value,
        resources_json: resJson,
        is_free_preview: $("#majara-lesson-preview").checked
      };

      try {
        await apiPost("save-majara-lesson", payload);
        notify("Lesson saved successfully!");
        $("#majara-lesson-dialog")?.close();
        loadLessons(payload.course_id);
      } catch (err) {
        notify("Failed to save lesson: " + err.message, true);
      }
    });

    $("#majara-lesson-cancel")?.addEventListener("click", () => {
      $("#majara-lesson-dialog")?.close();
    });
    $("#majara-lesson-close-btn")?.addEventListener("click", () => {
      $("#majara-lesson-dialog")?.close();
    });

    // 8. Student Form Submission
    $("#majara-student-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        id: $("#majara-student-id").value || undefined,
        full_name: $("#majara-student-name").value,
        email: $("#majara-student-email").value,
        phone: $("#majara-student-phone").value,
        courseId: $("#majara-student-course-select")?.value || undefined,
        password: $("#majara-student-password").value || undefined,
        sendActivation: $("#majara-student-activation").checked
      };

      try {
        await apiPost("save-majara-student", payload);
        notify("Student saved & enrolled successfully!");
        $("#majara-student-dialog")?.close();
        loadMajaraData();
      } catch (err) {
        notify("Failed to save student: " + err.message, true);
      }
    });

    $("#majara-student-cancel")?.addEventListener("click", () => {
      $("#majara-student-dialog")?.close();
    });
    $("#majara-student-close-btn")?.addEventListener("click", () => {
      $("#majara-student-dialog")?.close();
    });

    // Load initial data
    loadMajaraData();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
