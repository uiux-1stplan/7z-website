(() => {
  "use strict";

  const endpoint = "/api/admin/course-engine";
  const $ = (selector) => document.querySelector(selector);
  const state = { affiliates: [], codes: [], registrations: [], adjustments: [], totals: {} };
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

  function confirmAction({ title, copy, confirmLabel, onConfirm }) {
    const dialog = $("#admin-action-confirm-dialog");
    if (!dialog) {
      if (window.confirm(copy)) return onConfirm();
      return;
    }
    $("#admin-action-confirm-title").textContent = title;
    $("#admin-action-confirm-copy").textContent = copy;
    const accept = $("#admin-action-confirm-accept");
    accept.textContent = confirmLabel;
    accept.onclick = async () => {
      accept.disabled = true;
      dialog.close();
      try { await onConfirm(); }
      finally { accept.disabled = false; }
    };
    dialog.showModal();
  }

  function bindDeleteButton(button, title, copy, label, action, success) {
    button?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const target = event.currentTarget;
      confirmAction({ title, copy, confirmLabel: label, onConfirm: async () => {
        target.disabled = true;
        const saved = await post(action, success);
        if (!saved) target.disabled = false;
      } });
    });
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
      row.innerHTML = `<td><div class="engine-user"><strong>${escape(affiliate.name)}</strong><span>${escape(affiliate.email || affiliate.company || "Affiliate partner")}</span></div></td><td>${Number(affiliate.code_count || 0)}</td><td>${Number(affiliate.registration_count || 0)}</td><td>${jod(affiliate.net_sales_jod)}</td><td>${jod(affiliate.outstanding_commission_jod)}<small class="engine-subvalue">earned ${Number(affiliate.earned_commission_jod || 0).toFixed(2)} JOD</small></td><td><span class="engine-status ${active ? "is-active" : "is-inactive"}">${active ? "ACTIVE" : "PAUSED"}</span></td><td><div class="engine-actions"><button class="small-button" type="button" data-engine-edit="affiliate" data-id="${escape(affiliate.id)}" data-name="${escape(affiliate.name)}" data-email="${escape(affiliate.email || "")}" data-company="${escape(affiliate.company || "")}" data-commission="${Number(affiliate.commission_percent || 0)}">EDIT</button><button class="small-button ${active ? "danger" : "is-confirm"}" type="button" data-engine-action="toggle-affiliate" data-id="${escape(affiliate.id)}" data-status="${active ? "inactive" : "active"}">${active ? "ARCHIVE" : "RESTORE"}</button><button class="small-button danger" type="button" data-engine-action="delete-affiliate" data-id="${escape(affiliate.id)}" data-name="${escape(affiliate.name)}">DELETE</button></div></td>`;
      bindDeleteButton(row.querySelector('[data-engine-action="delete-affiliate"]'), "Delete affiliate?", `Delete ${affiliate.name} and its discount codes? Historical registrations, commission values and revenue records will be retained.`, "Delete affiliate", { action: "delete-affiliate", id: affiliate.id }, "Affiliate and its codes deleted. Historical registrations were retained.");
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
      row.innerHTML = `<td><code class="engine-code">${escape(code.code)}</code></td><td>${escape(code.affiliate_name || "Studio")}</td><td>${escape(course)}</td><td>${Number(code.discount_percent)}%</td><td>${Number(code.commission_percent)}%</td><td>${Number(code.redemption_count || 0)}${code.max_redemptions ? ` / ${Number(code.max_redemptions)}` : ""}</td><td><span class="engine-status ${active ? "is-active" : "is-inactive"}">${active ? "ACTIVE" : "PAUSED"}</span></td><td><div class="engine-actions"><button class="small-button" type="button" data-engine-edit="code" data-id="${escape(code.id)}" data-code="${escape(code.code)}" data-affiliate="${escape(code.affiliate_id || "")}" data-course="${escape(code.course_id || "all")}" data-discount="${Number(code.discount_percent)}" data-commission="${Number(code.commission_percent)}" data-max-uses="${escape(code.max_redemptions || "")}">EDIT</button><button class="small-button ${active ? "danger" : "is-confirm"}" type="button" data-engine-action="toggle-code" data-id="${escape(code.id)}" data-status="${active ? "inactive" : "active"}">${active ? "ARCHIVE" : "RESTORE"}</button><button class="small-button danger" type="button" data-engine-action="delete-code" data-id="${escape(code.id)}" data-name="${escape(code.code)}">DELETE</button></div></td>`;
      bindDeleteButton(row.querySelector('[data-engine-action="delete-code"]'), "Delete discount code?", `Delete ${code.code}? Past registrations keep their recorded code, discount and commission values.`, "Delete code", { action: "delete-code", id: code.id }, "Discount code deleted. Historical registrations were retained.");
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
    const history = $("#revenue-adjustment-history");
    if (history) history.innerHTML = state.adjustments.length ? state.adjustments.map(item => `<div class="adjustment-row"><span>${new Date(item.created_at).toLocaleDateString("en-US", { timeZone: "Asia/Amman", month: "short", day: "numeric", year: "numeric" })}</span><strong class="${Number(item.amount_jod) < 0 ? "is-negative" : "is-positive"}">${Number(item.amount_jod) > 0 ? "+" : ""}${Number(item.amount_jod).toFixed(3)} JOD</strong><small>${escape(item.reason)}</small><div class="adjustment-actions"><button type="button" class="small-button" data-adjustment-edit="${escape(item.id)}" data-amount="${Number(item.amount_jod)}" data-reason="${escape(item.reason)}">EDIT</button><button type="button" class="small-button danger" data-adjustment-delete="${escape(item.id)}" data-amount="${Number(item.amount_jod)}">DELETE</button></div></div>`).join("") : '<p class="adjustment-empty">No manual adjustments yet. Every change will be recorded here.</p>';
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
      row.dataset.registrationId = String(registration.id);
      const paymentAction = isPending
        ? `<button class="small-button is-confirm" type="button" data-engine-action="set-payment-status" data-id="${escape(registration.id)}" data-status="PAID">VERIFY PAYMENT</button><button class="small-button danger" type="button" data-engine-action="set-payment-status" data-id="${escape(registration.id)}" data-status="REJECTED">REJECT</button>`
        : isPaid ? `<button class="small-button" type="button" data-engine-action="set-payment-status" data-id="${escape(registration.id)}" data-status="PENDING_REVIEW">REOPEN REVIEW</button>` : `<span class="engine-dash">—</span>`;
      const commissionAction = isPaid && Number(registration.commission_jod || 0) > 0
        ? `<button class="small-button" type="button" data-engine-action="set-commission-status" data-id="${escape(registration.id)}" data-status="${registration.commission_status === "PAID" ? "PAYABLE" : "PAID"}">${registration.commission_status === "PAID" ? "REOPEN PAYOUT" : "MARK COMMISSION PAID"}</button>`
        : "";
      row.innerHTML = `<td><div class="engine-user"><strong>${escape(registration.full_name)}</strong><span>${escape(registration.email)}</span></div></td><td>${escape(course)}</td><td>${date}</td><td><code class="engine-code">${escape(registration.coupon_code || "—")}</code></td><td>${jod(due)}</td><td>${Number(registration.commission_percent || 0)}% · ${Number(registration.commission_jod || 0).toFixed(2)} JOD<br><small class="engine-subvalue">${escape(registration.commission_status || "NOT_APPLICABLE")}</small></td><td><span class="engine-status ${isPaid ? "is-active" : isPending ? "is-pending" : "is-inactive"}">${escape(paymentStatus.replaceAll("_", " "))}</span></td><td><div class="engine-actions"><button class="small-button" type="button" data-engine-edit="registration" data-id="${escape(registration.id)}" data-name="${escape(registration.full_name)}" data-email="${escape(registration.email)}" data-course="${escape(registration.course_id)}" data-price="${Number(registration.price_jod || 0)}" data-discount="${Number(registration.discount_jod || 0)}" data-commission="${Number(registration.commission_percent || 0)}" data-status="${escape(paymentStatus)}">EDIT</button>${paymentAction}${commissionAction}<button class="small-button danger" type="button" data-engine-action="delete-registration" data-id="${escape(registration.id)}" data-name="${escape(registration.full_name)}">DELETE</button></div></td>`;
      body.append(row);
    }
  }

  async function refresh(silent = false) {
    try {
      const [programs, accounting] = await Promise.all([request(), request({ query: { view: "accounting" } })]);
      state.affiliates = programs.affiliates || [];
      state.codes = programs.codes || [];
      state.registrations = accounting.registrations || [];
      state.adjustments = accounting.adjustments || [];
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
      return true;
    } catch (error) {
      notify(error.message || "The change could not be saved.", "error");
      return false;
    }
  }

  function formObject(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function editRecord(button) {
    const dialog = $("#course-edit-dialog");
    const fields = $("#course-edit-fields");
    const form = $("#course-edit-form");
    const kind = button.dataset.engineEdit;
    form.dataset.kind = kind;
    form.dataset.id = button.dataset.id;
    if (kind === "affiliate") {
      $("#course-edit-title").textContent = "Edit affiliate";
      $("#course-edit-copy").textContent = "Update partner details and the default commission. Existing registrations keep their recorded rate.";
      fields.innerHTML = `<label>Partner name<input name="name" required maxlength="120" value="${escape(button.dataset.name)}"></label><label>Email<input name="email" type="email" maxlength="180" value="${escape(button.dataset.email)}"></label><label>Company<input name="company" maxlength="160" value="${escape(button.dataset.company)}"></label><label>Default commission %<input name="commissionPercent" type="number" min="0" max="100" step="1" required value="${Number(button.dataset.commission)}"></label>`;
    } else if (kind === "code") {
      const options = state.affiliates.filter(item => item.status === "active").map(item => `<option value="${escape(item.id)}" ${item.id === button.dataset.affiliate ? "selected" : ""}>${escape(item.name)}</option>`).join("");
      $("#course-edit-title").textContent = "Edit discount code";
      $("#course-edit-copy").textContent = "Discounts and commissions change for future checkouts; past registrations remain unchanged.";
      fields.innerHTML = `<label>Code<input name="code" required maxlength="32" pattern="[A-Za-z0-9_-]{3,32}" value="${escape(button.dataset.code)}"></label><label>Affiliate<select name="affiliateId"><option value="">Studio code / no affiliate</option>${options}</select></label><label>Course<select name="courseId"><option value="all">All courses</option><option value="cinematic-film" ${button.dataset.course === "cinematic-film" ? "selected" : ""}>AI Cinematic Filmmaking</option><option value="ai-engineering" ${button.dataset.course === "ai-engineering" ? "selected" : ""}>AI for Engineers</option></select></label><div class="engine-form-pair"><label>Discount %<input name="discountPercent" type="number" min="0" max="100" required value="${Number(button.dataset.discount)}"></label><label>Commission %<input name="commissionPercent" type="number" min="0" max="100" required value="${Number(button.dataset.commission)}"></label></div><label>Maximum uses<input name="maxRedemptions" type="number" min="1" max="1000000" value="${escape(button.dataset.maxUses)}" placeholder="Unlimited"></label>`;
    } else if (kind === "registration") {
      $("#course-edit-title").textContent = "Edit registration & revenue";
      $("#course-edit-copy").textContent = "Changes update the course ledger, verified revenue, commissions and Latest Activity. Revenue includes paid registrations only.";
      fields.innerHTML = `<label>Student name<input name="fullName" required maxlength="160" value="${escape(button.dataset.name)}"></label><label>Email address<input name="email" type="email" required maxlength="180" value="${escape(button.dataset.email)}"></label><label>Course<select name="courseId"><option value="cinematic-film" ${button.dataset.course === "cinematic-film" ? "selected" : ""}>AI Cinematic Filmmaking</option><option value="ai-engineering" ${button.dataset.course === "ai-engineering" ? "selected" : ""}>AI for Engineers</option></select></label><div class="engine-form-pair"><label>Price (JOD)<input name="priceJod" type="number" min="0" max="1000000000" step="0.001" required value="${Number(button.dataset.price)}"></label><label>Discount (JOD)<input name="discountJod" type="number" min="0" max="1000000000" step="0.001" required value="${Number(button.dataset.discount)}"></label></div><div class="engine-form-pair"><label>Commission %<input name="commissionPercent" type="number" min="0" max="100" step="1" required value="${Number(button.dataset.commission)}"></label><label>Payment status<select name="paymentStatus"><option value="PENDING_REVIEW" ${button.dataset.status === "PENDING_REVIEW" ? "selected" : ""}>Pending review</option><option value="PAID" ${["PAID","APPROVED","VERIFIED"].includes(button.dataset.status) ? "selected" : ""}>Paid / verified</option><option value="REJECTED" ${button.dataset.status === "REJECTED" ? "selected" : ""}>Rejected</option></select></label></div>`;
    } else {
      $("#course-edit-title").textContent = "Edit revenue adjustment";
      $("#course-edit-copy").textContent = "This audited entry changes reported revenue. Original student payment records remain intact.";
      fields.innerHTML = `<label>Adjustment amount (JOD)<input name="amount" type="number" min="-1000000000" max="1000000000" step="0.001" required value="${Number(button.dataset.amount)}"></label><label>Reason<input name="reason" maxlength="240" required value="${escape(button.dataset.reason)}"></label>`;
    }
    dialog.showModal();
  }

  function exportExcelReport() {
    const registrations = state.registrations;
    const courseNames = { "cinematic-film": "AI Cinematic Filmmaking", "ai-engineering": "AI for Engineers" };
    const paid = row => ["PAID", "APPROVED", "VERIFIED"].includes(String(row.payment_status || "").toUpperCase());
    const net = row => Math.max(0, Number(row.price_jod || 0) - Number(row.discount_jod || 0));
    const group = new Map();
    for (const row of registrations) {
      const key = row.course_id || "unknown";
      if (!group.has(key)) group.set(key, { id: key, total: 0, paid: 0, pending: 0, rejected: 0, gross: 0, revenue: 0, pendingValue: 0, discounts: 0, commissions: 0 });
      const item = group.get(key);
      item.total += 1;
      item.paid += paid(row) ? 1 : 0;
      item.pending += row.payment_status === "PENDING_REVIEW" ? 1 : 0;
      item.rejected += row.payment_status === "REJECTED" ? 1 : 0;
      item.gross += paid(row) ? Number(row.price_jod || 0) : 0;
      item.revenue += paid(row) ? net(row) : 0;
      item.pendingValue += row.payment_status === "PENDING_REVIEW" ? net(row) : 0;
      item.discounts += Number(row.discount_jod || 0);
      item.commissions += paid(row) ? Number(row.commission_jod || 0) : 0;
    }
    const monthly = new Map();
    for (const row of registrations) if (paid(row) && row.created_at) {
      const date = new Date(row.created_at);
      if (Number.isNaN(date.getTime())) continue;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthly.has(key)) monthly.set(key, { month: key, count: 0, gross: 0, discounts: 0, revenue: 0, commissions: 0 });
      const item = monthly.get(key);
      item.count += 1;
      item.gross += Number(row.price_jod || 0);
      item.discounts += Number(row.discount_jod || 0);
      item.revenue += net(row);
      item.commissions += Number(row.commission_jod || 0);
    }
    const rowsFor = (headers, rows) => [
      { kind: "title", cells: ["7Z MAGIC  /  ACADEMY FINANCIAL REPORT"] },
      { kind: "subtitle", cells: [`Generated ${new Date().toLocaleString("en-US", { timeZone: "Asia/Amman", dateStyle: "long", timeStyle: "short" })}  ·  Reporting currency: JOD  ·  Source: live administration ledger`] },
      { kind: "blank", cells: [] },
      { kind: "header", cells: headers },
      ...rows.map((cells, index) => ({ kind: index % 2 ? "zebra" : "body", cells, styles: headers.map(header => /JOD/i.test(header) ? "currency" : /%/.test(header) ? "percent" : null) })),
    ];
    const sheets = [
      { name: "Executive Summary", widths: [30, 19, 68], filter: false, rows: [
        { kind: "title", cells: ["7Z MAGIC  /  ACADEMY FINANCIAL REPORT"] },
        { kind: "subtitle", cells: [`Generated ${new Date().toLocaleString("en-US", { timeZone: "Asia/Amman", dateStyle: "long", timeStyle: "short" })}  ·  Currency: JOD  ·  Live course and affiliate ledger`] },
        { kind: "blank", cells: [] },
        { kind: "section", cells: ["STUDIO FINANCIAL POSITION"] },
        { kind: "header", cells: ["Metric", "Amount (JOD)", "Definition"] },
        ...[["Gross verified sales", state.totals.gross, "List price for registrations marked paid or verified."], ["Verified revenue", state.totals.revenue, "Paid net receipts, including audited manual adjustments."], ["Pending payment value", state.totals.pending, "Submitted payments awaiting administrator verification; excluded from verified revenue."], ["Discounts granted", state.totals.discounts, "Recorded discounts across registrations."], ["Affiliate commissions due", state.totals.commissionsDue, "Verified commissions not yet marked paid."], ["Total verified commissions", state.totals.commissionsTotal, "All affiliate commissions on verified registrations."], ["Studio net after commissions", state.totals.studioNet, "Verified revenue less total verified commissions; before operating costs."]].map((row, i) => ({ kind: i % 2 ? "zebra" : "body", cells: row, styles: [null, "currency", null] })),
        { kind: "blank", cells: [] },
        { kind: "section", cells: ["REGISTRATION PIPELINE"] },
        { kind: "header", cells: ["Status", "Registrations", "Revenue treatment"] },
        ...[["Paid / verified", registrations.filter(paid).length, "Included in verified revenue."], ["Pending review", registrations.filter(row => row.payment_status === "PENDING_REVIEW").length, "Not included until verified."], ["Rejected", registrations.filter(row => row.payment_status === "REJECTED").length, "Excluded from verified revenue."]].map((row, i) => ({ kind: i % 2 ? "zebra" : "body", cells: row })),
        { kind: "blank", cells: [] },
        { kind: "section", cells: ["COURSE PERFORMANCE"] },
        { kind: "header", cells: ["Course", "Paid revenue (JOD)", "Enrollments / paid / pending"] },
        ...[...group.values()].map((row, i) => ({ kind: i % 2 ? "zebra" : "body", cells: [courseNames[row.id] || row.id, row.revenue, `${row.total} total  ·  ${row.paid} paid  ·  ${row.pending} pending`], styles: [null, "currency", null] })),
      ] },
      { name: "Registration Ledger", widths: [10, 11, 20, 30, 34, 28, 19, 18, 26, 17, 15, 19, 18, 20, 15, 17, 24, 15, 18, 24, 34, 25, 34], filter: true, rows: rowsFor(["ID", "Seat", "Submitted", "Student", "Email", "Course", "Payment status", "Provider", "Transfer reference", "List price (JOD)", "Discount (JOD)", "Net due (JOD)", "Coupon", "Affiliate", "Commission %", "Commission (JOD)", "Commission status", "Phone", "Location", "Experience", "Student goal", "Preferred language", "Previous-course email"], registrations.map(row => [Number(row.id), Number(row.seat_number || 0), row.created_at ? new Date(row.created_at).toISOString() : "", row.full_name, row.email, courseNames[row.course_id] || row.course_id, row.payment_status, row.payment_provider, row.payment_reference, Number(row.price_jod || 0), Number(row.discount_jod || 0), net(row), row.coupon_code, row.affiliate_name, Number(row.commission_percent || 0) / 100, Number(row.commission_jod || 0), row.commission_status, row.phone, row.location, row.experience, row.goal, row.preferred_language, row.previous_course_email])) },
      { name: "Affiliate Performance", widths: [27, 31, 24, 18, 14, 13, 16, 17, 18, 21, 21], filter: true, rows: rowsFor(["Affiliate", "Email", "Company", "Status", "Default commission %", "Codes", "Registrations", "Verified sales (JOD)", "Commission earned (JOD)", "Commission outstanding (JOD)", "Affiliate ID"], state.affiliates.map(row => [row.name, row.email, row.company, row.status, Number(row.commission_percent || 0) / 100, Number(row.code_count || 0), Number(row.registration_count || 0), Number(row.net_sales_jod || 0), Number(row.earned_commission_jod || 0), Number(row.outstanding_commission_jod || 0), row.id])) },
      { name: "Discount Code Register", widths: [20, 28, 27, 14, 16, 16, 15, 18, 14, 20, 22], filter: true, rows: rowsFor(["Code", "Affiliate", "Course", "Discount %", "Commission %", "Redemptions", "Maximum uses", "Status", "Requires prior email", "Created", "Code ID"], state.codes.map(row => [row.code, row.affiliate_name || "Studio", row.course_id === "all" ? "All courses" : courseNames[row.course_id] || row.course_id, Number(row.discount_percent || 0) / 100, Number(row.commission_percent || 0) / 100, Number(row.redemption_count || 0), row.max_redemptions || "Unlimited", row.status, row.requires_previous_email ? "Yes" : "No", row.created_at ? new Date(row.created_at).toISOString() : "", row.id])) },
      { name: "Course Comparison", widths: [31, 15, 15, 15, 19, 18, 19, 20, 23], filter: true, rows: rowsFor(["Course", "Registrations", "Paid", "Pending", "Rejected", "Gross verified (JOD)", "Discounts (JOD)", "Verified revenue (JOD)", "Verified commissions (JOD)"], [...group.values()].map(row => [courseNames[row.id] || row.id, row.total, row.paid, row.pending, row.rejected, row.gross, row.discounts, row.revenue, row.commissions])) },
      { name: "Monthly Revenue", widths: [17, 17, 20, 20, 22, 24], filter: true, rows: rowsFor(["Month", "Paid registrations", "Gross sales (JOD)", "Discounts (JOD)", "Verified revenue (JOD)", "Verified commissions (JOD)"], [...monthly.values()].sort((a, b) => a.month.localeCompare(b.month)).map(row => [row.month, row.count, row.gross, row.discounts, row.revenue, row.commissions])) },
      { name: "Manual Adjustments", widths: [22, 20, 19, 60, 28], filter: true, rows: rowsFor(["Adjustment ID", "Created", "Amount (JOD)", "Reason", "Created by"], state.adjustments.map(row => [row.id, row.created_at ? new Date(row.created_at).toISOString() : "", Number(row.amount_jod || 0), row.reason, row.created_by])) },
    ];
    const esc = value => String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]);
    const columnName = number => { let name = ""; for (let n = number + 1; n; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name; return name; };
    const styleFor = (kind, value, requested) => {
      if (requested === "currency") return "6";
      if (requested === "percent") return "7";
      if (kind === "title") return "1";
      if (kind === "subtitle") return "2";
      if (kind === "section") return "3";
      if (kind === "header") return "4";
      if (kind === "zebra") return "5";
      return "0";
    };
    const rowsXml = sheet => sheet.rows.map((row, ri) => {
      if (row.kind === "blank") return `<row r="${ri + 1}"/>`;
      const cells = row.cells.map((value, ci) => {
        const ref = `${columnName(ci)}${ri + 1}`;
        const style = styleFor(row.kind, value, row.styles?.[ci]);
        return typeof value === "number" && Number.isFinite(value) ? `<c r="${ref}" s="${style}"><v>${value}</v></c>` : `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
      }).join("");
      const merge = ["title", "subtitle", "section"].includes(row.kind) && sheet.widths.length > 1 ? ` spans="1:${sheet.widths.length}"` : "";
      return `<row r="${ri + 1}"${merge}>${cells}</row>`;
    }).join("");
    const encoder = new TextEncoder();
    const fileEntries = {};
    fileEntries["[Content_Types].xml"] = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`;
    fileEntries["_rels/.rels"] = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    fileEntries["xl/workbook.xml"] = `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets.map((sheet, i) => `<sheet name="${esc(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`;
    fileEntries["xl/_rels/workbook.xml.rels"] = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    fileEntries["xl/styles.xml"] = `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.000 &quot;JOD&quot;"/><numFmt numFmtId="165" formatCode="0.0%"/></numFmts><fonts count="5"><font><sz val="10"/><color rgb="FF253047"/><name val="Aptos"/></font><font><b/><sz val="18"/><color rgb="FFFFFFFF"/><name val="Aptos Display"/></font><font><sz val="10"/><color rgb="FFCBD5E1"/><name val="Aptos"/></font><font><b/><sz val="11"/><color rgb="FFF3F5FF"/><name val="Aptos"/></font><font><b/><sz val="10"/><color rgb="FFF5F7FF"/><name val="Aptos"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF141A29"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF292342"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF1F4FB"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFE2E8F2"/></left><right style="thin"><color rgb="FFE2E8F2"/></right><top/><bottom style="hair"><color rgb="FFE2E8F2"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="8"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="2" borderId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="3" borderId="0"/><xf numFmtId="0" fontId="4" fillId="2" borderId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="1" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="1" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    sheets.forEach((sheet, index) => {
      const lastCol = columnName(sheet.widths.length - 1);
      const lastRow = sheet.rows.length;
      const filter = sheet.filter && lastRow >= 4 ? `<autoFilter ref="A4:${lastCol}${lastRow}"/>` : "";
      const merges = sheet.rows.map((row, ri) => ["title", "subtitle", "section"].includes(row.kind) && sheet.widths.length > 1 ? `<mergeCell ref="A${ri + 1}:${lastCol}${ri + 1}"/>` : "").join("");
      const uniqueMerges = [...new Set(merges.match(/<mergeCell[^>]+\/>/g) || [])].join("");
      fileEntries[`xl/worksheets/sheet${index + 1}.xml`] = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastCol}${lastRow}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="22"/><cols>${sheet.widths.map((width, i) => `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`).join("")}</cols><sheetData>${rowsXml(sheet)}</sheetData>${filter}${uniqueMerges ? `<mergeCells count="${(uniqueMerges.match(/<mergeCell/g) || []).length}">${uniqueMerges}</mergeCells>` : ""}</worksheet>`;
    });
    const crc32 = bytes => { let crc = 0xffffffff; for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; };
    const zipParts = [];
    const centralParts = [];
    let offset = 0;
    const viewOf = (length, entries) => { const buffer = new Uint8Array(length); const view = new DataView(buffer.buffer); for (const [method, at, value] of entries) view[method](at, value, true); return buffer; };
    for (const [name, xml] of Object.entries(fileEntries)) {
      const filename = encoder.encode(name), data = encoder.encode(xml), crc = crc32(data);
      const local = viewOf(30, [["setUint32",0,0x04034b50],["setUint16",4,20],["setUint16",6,0x800],["setUint16",8,0],["setUint32",14,crc],["setUint32",18,data.length],["setUint32",22,data.length],["setUint16",26,filename.length]]);
      zipParts.push(local, filename, data);
      const central = viewOf(46, [["setUint32",0,0x02014b50],["setUint16",4,20],["setUint16",6,20],["setUint16",8,0x800],["setUint16",10,0],["setUint32",16,crc],["setUint32",20,data.length],["setUint32",24,data.length],["setUint16",28,filename.length],["setUint32",42,offset]]);
      centralParts.push(central, filename);
      offset += local.length + filename.length + data.length;
    }
    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = viewOf(22, [["setUint32",0,0x06054b50],["setUint16",8,Object.keys(fileEntries).length],["setUint16",10,Object.keys(fileEntries).length],["setUint32",12,centralSize],["setUint32",16,offset]]);
    const blob = new Blob([...zipParts, ...centralParts, end], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `7z-magic-academy-financial-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    notify("Formatted Excel workbook downloaded.");
  }

  function bind() {
    document.querySelectorAll("[data-engine-refresh]").forEach((button) => button.addEventListener("click", refresh));
    $("#finance-course-filter").addEventListener("change", () => renderAccounting(state.totals));
    $("#archive-all-affiliates")?.addEventListener("click", () => {
      const active = state.affiliates.filter(item => item.status === "active").length;
      if (!active) return notify("There are no active affiliates to archive.");
      if (window.confirm(`Archive all ${active} active affiliates and disable their discount codes? Historical sales and commissions will remain in the ledger.`)) post({ action: "archive-all-affiliates" }, "All active affiliates and their codes were archived.");
    });
    $("#revenue-adjustment-form")?.addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.currentTarget;
      if (await post({ action: "adjust-revenue", ...formObject(form) }, "Revenue adjustment recorded in the audit trail.")) form.reset();
    });
    $("#revenue-reset")?.addEventListener("click", () => {
      if (window.confirm("Reset the reported revenue total to zero? This adds an audited offset; original registration and payment records remain unchanged.")) post({ action: "reset-revenue" }, "Reported revenue reset with an audited adjustment.");
    });
    $("#report-export")?.addEventListener("click", exportExcelReport);
    $("#course-edit-cancel")?.addEventListener("click", () => $("#course-edit-dialog")?.close());
    $("#course-edit-close")?.addEventListener("click", () => $("#course-edit-dialog")?.close());
    $("#course-edit-form")?.addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const action = form.dataset.kind === "affiliate" ? "update-affiliate" : form.dataset.kind === "code" ? "update-code" : form.dataset.kind === "adjustment" ? "update-revenue-adjustment" : "update-registration";
      try {
        await request({ body: { action, id: form.dataset.id, ...formObject(form) } });
        $("#course-edit-dialog").close();
        notify(form.dataset.kind === "adjustment" ? "Revenue adjustment updated in the audit trail." : "Changes saved and recorded in the audit trail.");
        await refresh();
      } catch (error) { notify(error.message || "Changes could not be saved.", "error"); }
    });
    $("#affiliate-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (await post({ action: "create-affiliate", ...formObject(form) }, "Affiliate profile created.")) {
        form.reset();
        form.elements.commissionPercent.value = "20";
      }
    });
    $("#coupon-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = formObject(form);
      if (await post({ action: "create-code", ...data }, `${String(data.code).toUpperCase()} is now active.`)) {
        form.reset();
        form.elements.courseId.value = "all";
        form.elements.discountPercent.value = "10";
        form.elements.commissionPercent.value = "20";
      }
    });
    document.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-engine-edit]");
      if (editButton) { editRecord(editButton); return; }
      const adjustmentEdit = event.target.closest("[data-adjustment-edit]");
      if (adjustmentEdit) {
        const dialog = $("#course-edit-dialog");
        const form = $("#course-edit-form");
        form.dataset.kind = "adjustment";
        form.dataset.id = adjustmentEdit.dataset.adjustmentEdit;
        $("#course-edit-title").textContent = "Edit revenue adjustment";
        $("#course-edit-copy").textContent = "This audited entry changes reported revenue. Original student payment records remain intact.";
        $("#course-edit-fields").innerHTML = `<label>Adjustment amount (JOD)<input name="amount" type="number" min="-1000000000" max="1000000000" step="0.001" required value="${Number(adjustmentEdit.dataset.amount)}"></label><label>Reason<input name="reason" maxlength="240" required value="${escape(adjustmentEdit.dataset.reason)}"></label>`;
        dialog.showModal();
        return;
      }
      const adjustmentDelete = event.target.closest("[data-adjustment-delete]");
      if (adjustmentDelete) {
        if (window.confirm(`Delete this audited revenue adjustment (${Number(adjustmentDelete.dataset.amount).toFixed(3)} JOD)? This will recalculate reported revenue.`)) post({ action: "delete-revenue-adjustment", id: adjustmentDelete.dataset.adjustmentDelete }, "Revenue adjustment deleted and totals recalculated.");
        return;
      }
      const button = event.target.closest("[data-engine-action]");
      if (!button) return;
      const body = { action: button.dataset.engineAction, id: button.dataset.id, status: button.dataset.status };
      const message = body.action === "set-payment-status" ? `Set payment status to ${body.status.replaceAll("_", " ")}?` : body.action === "set-commission-status" ? `Set commission status to ${body.status}?` : body.action === "toggle-affiliate" && body.status === "inactive" ? "Archive this affiliate and disable its active discount codes? Sales history will be retained." : body.action === "toggle-code" && body.status === "inactive" ? "Archive this discount code? Existing registrations will be retained." : body.action === "delete-affiliate" ? `Permanently delete ${button.dataset.name || "this affiliate"} and its discount codes? Historical registrations and their recorded totals remain in the ledger.` : body.action === "delete-code" ? `Permanently delete discount code ${button.dataset.name || ""}? Past registrations keep their recorded code and commission.` : body.action === "delete-registration" ? "Delete this student registration? It will disappear from Latest Activity and be removed from the registration ledger, recalculating verified revenue, discounts and commissions." : `Set status to ${body.status}?`;
      if (!window.confirm(message)) return;
      const success = body.action === "delete-affiliate" ? "Affiliate and its codes deleted. Historical ledger entries were retained." : body.action === "delete-code" ? "Discount code deleted. Historical registrations were retained." : body.action === "delete-registration" ? "Registration deleted; revenue and Latest Activity were recalculated." : "Course administration updated.";
      post(body, success);
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
