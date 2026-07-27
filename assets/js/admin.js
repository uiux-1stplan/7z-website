(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const state = {
    email: "",
    media: {},
    labels: {},
    section: "architectureVideos"
  };

  const loginView = $("#loginView");
  const adminView = $("#adminView");
  const loginForm = $("#loginForm");
  const loginStatus = $("#loginStatus");
  const adminEmail = $("#adminEmail");
  const logoutButton = $("#logoutButton");
  const sectionSelect = $("#sectionSelect");
  const mediaList = $("#mediaList");
  const mediaStatus = $("#mediaStatus");
  const addMediaForm = $("#addMediaForm");

  function setStatus(element, message) {
    if (element) element.textContent = message || "";
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      credentials: "same-origin",
      headers: options.body instanceof FormData ? {} : { "Content-Type": "application/json" },
      ...options
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  function showAdmin(email) {
    state.email = email;
    adminEmail.textContent = email;
    loginView.classList.add("is-hidden");
    adminView.classList.remove("is-hidden");
  }

  function showLogin() {
    loginView.classList.remove("is-hidden");
    adminView.classList.add("is-hidden");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;");
  }

  function isVideo(path) {
    return /\.(mp4|webm|mov)(\?|#|$)/i.test(path || "");
  }

  async function uploadFile(file) {
    if (!file) return "";
    const form = new FormData();
    form.append("file", file);
    const result = await api("/api/admin/upload", { method: "POST", body: form });
    return result.path;
  }

  function renderBarList(target, rows, emptyText = "No data yet") {
    if (!target) return;
    if (!rows?.length) {
      target.innerHTML = `<p class="status">${emptyText}</p>`;
      return;
    }

    const max = Math.max(...rows.map((row) => row.value), 1);
    target.innerHTML = rows
      .map(
        (row) => `
          <div class="bar-row">
            <header><span>${escapeHtml(row.label || row.key || row.date)}</span><strong>${row.value}</strong></header>
            <div class="bar"><span style="width: ${Math.max(4, Math.round((row.value / max) * 100))}%"></span></div>
          </div>
        `
      )
      .join("");
  }

  function renderAnalytics(data) {
    const topCountry = data.countries?.[0]?.key || "LOCAL";
    const topSection = data.sectionViews?.[0]?.label || "No section yet";
    const topDevice = data.devices?.[0]?.key || "No device yet";

    $("#metrics").innerHTML = `
      <article class="metric"><span>Total Visits</span><strong>${data.totalVisits || 0}</strong></article>
      <article class="metric"><span>Top Country</span><strong>${escapeHtml(topCountry)}</strong></article>
      <article class="metric"><span>Top Section</span><strong>${escapeHtml(topSection)}</strong></article>
      <article class="metric"><span>Top Device</span><strong>${escapeHtml(topDevice)}</strong></article>
    `;

    renderBarList($("#countryList"), data.countries, "No country data yet");
    renderBarList($("#sectionList"), data.sectionViews, "No section views yet");
    renderBarList($("#deviceList"), data.devices, "No device data yet");

    $("#visitList").innerHTML = data.lastVisits?.length
      ? data.lastVisits
          .map(
            (visit) => `
              <div class="visit-row">
                <span>${escapeHtml(new Date(visit.at).toLocaleString())}</span>
                <strong>${escapeHtml(visit.country)} / ${escapeHtml(visit.device)}</strong>
              </div>
            `
          )
          .join("")
      : `<p class="status">No visits yet</p>`;
  }

  async function loadAnalytics() {
    const data = await api("/api/admin/analytics");
    renderAnalytics(data);
  }

  function renderSectionOptions() {
    sectionSelect.innerHTML = Object.entries(state.labels)
      .map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`)
      .join("");
    sectionSelect.value = state.section;
  }

  function previewMarkup(item) {
    if (isVideo(item.src)) {
      return `<video muted playsinline preload="metadata" ${item.poster ? `poster="${escapeHtml(item.poster)}"` : ""} src="${escapeHtml(item.src)}"></video>`;
    }
    return `<img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.title)}" />`;
  }

  function renderMedia() {
    const items = state.media[state.section] || [];
    if (!items.length) {
      mediaList.innerHTML = `<p class="status">No media in this section yet.</p>`;
      return;
    }

    mediaList.innerHTML = items
      .map(
        (item) => `
          <article class="media-card" data-id="${escapeHtml(item.id)}">
            <div class="media-card__preview">${previewMarkup(item)}</div>
            <div class="media-card__body">
              <label>Title <input data-field="title" type="text" value="${escapeHtml(item.title)}" /></label>
              <label>Media Path <input data-field="src" type="text" value="${escapeHtml(item.src)}" /></label>
              <label>Cover Path <input data-field="poster" type="text" value="${escapeHtml(item.poster || "")}" /></label>
              <label>
                Layout
                <select data-field="layout">
                  <option value="" ${!item.layout ? "selected" : ""}>Standard</option>
                  <option value="is-wide" ${item.layout === "is-wide" ? "selected" : ""}>Wide</option>
                  <option value="is-tall" ${item.layout === "is-tall" ? "selected" : ""}>Tall</option>
                </select>
              </label>
              <label>Replace Media <input data-upload="src" type="file" accept="video/*,image/*" /></label>
              <label>Replace Cover <input data-upload="poster" type="file" accept="image/*" /></label>
              <div class="media-card__actions">
                <button type="button" data-action="save">Save</button>
                <button class="button-danger" type="button" data-action="delete">Delete</button>
              </div>
            </div>
          </article>
        `
      )
      .join("");
  }

  async function loadMedia() {
    const data = await api("/api/admin/media");
    state.media = data.media || {};
    state.labels = data.labels || {};

    if (!state.media[state.section]) {
      state.section = Object.keys(state.labels)[0] || "architectureVideos";
    }

    renderSectionOptions();
    renderMedia();
  }

  function getCardPayload(card) {
    const payload = { section: state.section, id: card.dataset.id };
    $$("[data-field]", card).forEach((input) => {
      payload[input.dataset.field] = input.value.trim();
    });
    return payload;
  }

  async function saveCard(card) {
    setStatus(mediaStatus, "Saving...");
    const payload = getCardPayload(card);
    const srcUpload = $('[data-upload="src"]', card).files[0];
    const posterUpload = $('[data-upload="poster"]', card).files[0];

    if (srcUpload) payload.src = await uploadFile(srcUpload);
    if (posterUpload) payload.poster = await uploadFile(posterUpload);

    await api("/api/admin/media", { method: "PUT", body: JSON.stringify(payload) });
    setStatus(mediaStatus, "Saved.");
    await loadMedia();
  }

  async function deleteCard(card) {
    if (!confirm("Delete this media item?")) return;
    setStatus(mediaStatus, "Deleting...");
    await api("/api/admin/media", {
      method: "DELETE",
      body: JSON.stringify({ section: state.section, id: card.dataset.id })
    });
    setStatus(mediaStatus, "Deleted.");
    await loadMedia();
  }

  async function addMedia(event) {
    event.preventDefault();
    setStatus(mediaStatus, "Adding media...");

    const file = $("#newFile").files[0];
    const posterFile = $("#newPosterFile").files[0];
    const src = file ? await uploadFile(file) : $("#newSrc").value.trim();
    const poster = posterFile ? await uploadFile(posterFile) : $("#newPoster").value.trim();

    if (!src) {
      setStatus(mediaStatus, "Upload a media file or enter a media path.");
      return;
    }

    await api("/api/admin/media", {
      method: "POST",
      body: JSON.stringify({
        section: state.section,
        title: $("#newTitle").value.trim(),
        layout: $("#newLayout").value,
        src,
        poster
      })
    });

    addMediaForm.reset();
    setStatus(mediaStatus, "Media added.");
    await loadMedia();
  }

  async function boot() {
    try {
      const me = await api("/api/admin/me");
      if (me.authenticated) {
        showAdmin(me.email);
        await Promise.all([loadAnalytics(), loadMedia()]);
      } else {
        showLogin();
      }
    } catch {
      showLogin();
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(loginStatus, "Signing in...");

    try {
      const result = await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({
          email: $("#email").value,
          password: $("#password").value
        })
      });
      showAdmin(result.email);
      setStatus(loginStatus, "");
      await Promise.all([loadAnalytics(), loadMedia()]);
    } catch (error) {
      setStatus(loginStatus, error.message);
    }
  });

  logoutButton.addEventListener("click", async () => {
    await api("/api/admin/logout", { method: "POST", body: "{}" }).catch(() => {});
    showLogin();
  });

  $$("[data-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      $$("[data-panel]").forEach((item) => item.classList.toggle("is-active", item === button));
      $$(".panel").forEach((panel) => panel.classList.add("is-hidden"));
      $(`#${button.dataset.panel}`).classList.remove("is-hidden");
      $("#panelTitle").textContent = button.textContent;
      if (button.dataset.panel === "analyticsPanel") loadAnalytics().catch(() => {});
      if (button.dataset.panel === "mediaPanel") loadMedia().catch(() => {});
    });
  });

  sectionSelect.addEventListener("change", () => {
    state.section = sectionSelect.value;
    renderMedia();
  });

  $("#refreshMedia").addEventListener("click", () => loadMedia().catch((error) => setStatus(mediaStatus, error.message)));
  addMediaForm.addEventListener("submit", (event) => addMedia(event).catch((error) => setStatus(mediaStatus, error.message)));

  mediaList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const card = event.target.closest(".media-card");
    if (!card) return;
    if (button.dataset.action === "save") saveCard(card).catch((error) => setStatus(mediaStatus, error.message));
    if (button.dataset.action === "delete") deleteCard(card).catch((error) => setStatus(mediaStatus, error.message));
  });

  boot();
})();
