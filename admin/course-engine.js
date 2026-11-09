(() => {
  "use strict";

  const endpoint = "/api/admin/course-engine";
  const $ = (selector) => document.querySelector(selector);
  const state = { affiliates: [], codes: [], registrations: [], totals: {} };
  let initialized = false;

  function escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function jod(value) {
    return `${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <small>JOD</small>`;
  }

  function notify(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    $("#toast-stack")?.append(toast);
    window.setTimeout(() => toast.remove(), 4200);
  }

  async function request(options = {}) {
    const token = await window.Clerk?.session?.getToken?.();
    if (!token) throw new Error("Your secure admin session has expired. Sign in again to continue.");
    const response = await fetch(endpoint + (options.query ? `?${new URLSearchParams(options.query)}` : ""), {
      method: options.body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${token}`, ...(options.body ? { "Content-Type": "application/json" } : {}) },
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    });
    let data = {};
    try { data = await response.json(); } catch { /* A non-JSON error is reported below. */ }
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
    return data;
  }

  function renderAffiliates() {
    const body = $("#affiliates-body");
    body.replaceChildren();
    $("#affiliates-empty").hidden = state.affiliates.length > 0;
    const affiliateOptions = ["<option value=''>Studio code / no affiliate</option>"];
    for (const affiliate of state.affiliates) {
      const active = affiliate.status === "active";
      affiliateOptions.push(`<option value="${escape(affiliate.id)}" ${active ? "" : "disabled"}>${escape(affiliate.name)}${active ? "" : " · inactive"}</option>`);
      const row = document.createElement("tr");
      row.innerHTML = `<td><div class="engine-user"><strong>${escape(affiliate.name)}</strong><span>${escape(affiliate.email || affiliate.company || "Affiliate partner")}</span></div></td><td>${Number(affiliate.code_count || 0)}</td><td>${Number(affiliate.registration_count || 0)}</td><td>${jod(affiliate.net_sales_jod)}</td><td>${jod(affiliate.outstanding_commission_jod)}<small class="engine-subvalue">earned ${Number(affiliate.earned_commission_jod || 0).toFixed(2)} JOD</small></td><td><span class="engine-status ${active ? "is-active" : "is-inactive"}">${active ? "ACTIVE" : "PAUSED"}</span></td><td><button class="small-button" type="button" data-engine-action="toggle-affiliate" data-id="${escape(affiliate.id)}" data-status="${active ? "inactive" : "active"}">${active ? "PAUSE" : "ACTIVATE"}</button></td>`;
      body.append(row);
    }
    $("#coupon-affiliate").innerHTML = affiliateOptions.join("");
  }

  function renderCodes() {
    const body = $("#coupons-body");
    body.replaceChildren();
    $("#coupons-empty").hidden = state.codes.length > 0;
    for (const code of state.codes) {
      const active = code.status === "active";
      const course = { all: "All courses", "cinematic-film": "AI Cinematic Filmmaking", "ai-engineering": "AI for Engineers" }[code.course_id] || code.course_id;
      const row = document.createElement("tr");
      row.innerHTML = `<td><code class="engine-code">${escape(code.code)}</code></td><td>${escape(code.affiliate_name || "Studio")}</td><td>${escape(course)}</td><td>${Number(code.discount_percent)}%</td><td>${Number(code.commission_percent)}%</td><td>${Number(code.redemption_count || 0)}${code.max_redemptions ? ` / ${Number(code.max_redemptions)}` : ""}</td><td><span class="engine-status ${active ? "is-active" : "is-inactive"}">${active ? "ACTIVE" : "PAUSED"}</span></td><td><button class="small-button" type="button" data-engine-action="toggle-code" data-id="${escape(code.id)}" data-status="${active ? "inactive" : "active"}">${active ? "DISABLE" : "ENABLE"}</button></td>`;
      body.append(row);
    }
  }

  function renderAccounting(totals) {
    $("#finance-gross").innerHTML = jod(totals.gross);
    $("#finance-revenue").innerHTML = jod(totals.revenue);
    $("#finance-pending").innerHTML = jod(totals.pending);
    $("#finance-discounts").innerHTML = jod(totals.discounts);
    $("#finance-commissions").innerHTML = jod(totals.commissionsDue);
    $("#finance-studio-net").innerHTML = jod(totals.studioNet);
    const selectedCourse = $("#finance-course-filter").value;
    const rows = state.registrations.filter((registration) => selectedCourse === "all" || registration.course_id === selectedCourse);
    $("#accounting-empty").hidden = rows.length > 0;
    const body = $("#accounting-body");
    body.replaceChildren();
    for (const registration of rows) {
      const paymentStatus = String(registration.payment_status || "PENDING_REVIEW").toUpperCase();
      const isPaid = ["PAID", "APPROVED", "VERIFIED"].includes(paymentStatus);
      const isPending = paymentStatus === "PENDING_REVIEW";
      const course = { "cinematic-film": "AI Cinematic Filmmaking", "ai-engineering": "AI for Engineers" }[registration.course_id] || registration.course_id;
      const due = Math.max(0, Number(registration.price_jod || 0) - Number(registration.discount_jod || 0));
      const date = registration.created_at ? new Date(registration.created_at).toLocaleDateString("en-US", { timeZone: "Asia/Amman", year: "numeric", month: "short", day: "numeric" }) : "—";
      const row = document.createElement("tr");
      const paymentAction = isPending
        ? `<button class="small-button is-confirm" type="button" data-engine-action="set-payment-status" data-id="${escape(registration.id)}" data-status="PAID">VERIFY PAYMENT</button><button class="small-button danger" type="button" data-engine-action="set-payment-status" data-id="${escape(registration.id)}" data-status="REJECTED">REJECT</button>`
        : isPaid ? `<button class="small-button" type="button" data-engine-action="set-payment-status" data-id="${escape(registration.id)}" data-status="PENDING_REVIEW">REOPEN REVIEW</button>` : `<span class="engine-dash">—</span>`;
      const commissionAction = isPaid && Number(registration.commission_jod || 0) > 0
        ? `<button class="small-button" type="button" data-engine-action="set-commission-status" data-id="${escape(registration.id)}" data-status="${registration.commission_status === "PAID" ? "PAYABLE" : "PAID"}">${registration.commission_status === "PAID" ? "REOPEN PAYOUT" : "MARK COMMISSION PAID"}</button>`
        : "";
      row.innerHTML = `<td><div class="engine-user"><strong>${escape(registration.full_name)}</strong><span>${escape(registration.email)}</span></div></td><td>${escape(course)}</td><td>${date}</td><td><code class="engine-code">${escape(registration.coupon_code || "—")}</code></td><td>${jod(due)}</td><td>${Number(registration.commission_percent || 0)}% · ${Number(registration.commission_jod || 0).toFixed(2)} JOD<br><small class="engine-subvalue">${escape(registration.commission_status || "NOT_APPLICABLE")}</small></td><td><span class="engine-status ${isPaid ? "is-active" : isPending ? "is-pending" : "is-inactive"}">${escape(paymentStatus.replaceAll("_", " "))}</span></td><td><div class="engine-actions">${paymentAction}${commissionAction}</div></td>`;
      body.append(row);
    }
  }

  async function refresh(silent = false) {
    try {
      const [programs, accounting] = await Promise.all([request(), request({ query: { view: "accounting" } })]);
      state.affiliates = programs.affiliates || [];
      state.codes = programs.codes || [];
      state.registrations = accounting.registrations || [];
      state.totals = accounting.totals || {};
      renderAffiliates();
      renderCodes();
      renderAccounting(state.totals);
    } catch (error) {
      if (!silent) notify(error.message || "Course data could not be loaded.", "error");
    }
  }

  async function post(body, success) {
    try {
      await request({ body });
      notify(success);
      await refresh();
    } catch (error) {
      notify(error.message || "The change could not be saved.", "error");
    }
  }

  function formObject(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function bind() {
    document.querySelectorAll("[data-engine-refresh]").forEach((button) => button.addEventListener("click", refresh));
    $("#finance-course-filter").addEventListener("change", () => renderAccounting(state.totals));
    $("#affiliate-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      await post({ action: "create-affiliate", ...formObject(form) }, "Affiliate profile created.");
      form.reset();
      form.elements.commissionPercent.value = "20";
    });
    $("#coupon-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = formObject(form);
      await post({ action: "create-code", ...data }, `${String(data.code).toUpperCase()} is now active.`);
      form.reset();
      form.elements.courseId.value = "all";
      form.elements.discountPercent.value = "10";
      form.elements.commissionPercent.value = "20";
    });
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-engine-action]");
      if (!button) return;
      const body = { action: button.dataset.engineAction, id: button.dataset.id, status: button.dataset.status };
      const message = body.action === "set-payment-status" ? `Set payment status to ${body.status.replaceAll("_", " ")}?` : body.action === "set-commission-status" ? `Set commission status to ${body.status}?` : `Set status to ${body.status}?`;
      if (!window.confirm(message)) return;
      post(body, "Course administration updated.");
    });
    document.querySelectorAll("[data-admin-scroll]").forEach((button) => button.addEventListener("click", () => {
      document.querySelector(button.dataset.adminScroll)?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
    }));
  }

  function initialize() {
    if (initialized || !$("#app") || $("#app").classList.contains("hidden")) return;
    initialized = true;
    bind();
    refresh();
    window.setInterval(() => {
      if (document.visibilityState === "visible") refresh(true);
    }, 30000);
  }

  document.addEventListener("z7:admin-ready", initialize);
  if (!$("#app")?.classList.contains("hidden")) initialize();
})();
