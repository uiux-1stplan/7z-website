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
    let token = null;
    try {
      token = await window.Clerk?.session?.getToken?.();
    } catch (_) {}
    if (!token && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
      token = "mock-dev-token";
    }
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
      row.innerHTML = `<td><div class="engine-user"><strong>${escape(affiliate.name)}</strong><span>${escape(affiliate.email || affiliate.company || "Affiliate partner")}</span></div></td><td>${Number(affiliate.code_count || 0)}</td><td>${Number(affiliate.registration_count || 0)}</td><td>${jod(affiliate.net_sales_jod)}</td><td>${jod(affiliate.outstanding_commission_jod)}<small class="engine-subvalue">earned ${Number(affiliate.earned_commission_jod || 0).toFixed(2)} JOD</small></td><td><span class="engine-status ${active ? "is-active" : "is-inactive"}">${active ? "ACTIVE" : "PAUSED"}</span></td><td><div class="engine-actions"><button class="small-button" type="button" data-engine-edit="affiliate" data-id="${escape(affiliate.id)}" data-name="${escape(affiliate.name)}" data-email="${escape(affiliate.email || "")}" data-company="${escape(affiliate.company || "")}" data-commission="${Number(affiliate.commission_percent || 0)}">Edit</button><button class="small-button ${active ? "danger" : "is-confirm"}" type="button" data-engine-action="toggle-affiliate" data-id="${escape(affiliate.id)}" data-status="${active ? "inactive" : "active"}">${active ? "Archive" : "Restore"}</button><button class="small-button danger" type="button" data-engine-action="delete-affiliate" data-id="${escape(affiliate.id)}" data-name="${escape(affiliate.name)}">Delete</button></div></td>`;
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
      row.innerHTML = `<td><code class="engine-code">${escape(code.code)}</code></td><td>${escape(code.affiliate_name || "Studio")}</td><td>${escape(course)}</td><td>${Number(code.discount_percent)}%</td><td>${Number(code.commission_percent)}%</td><td>${Number(code.redemption_count || 0)}${code.max_redemptions ? ` / ${Number(code.max_redemptions)}` : ""}</td><td><span class="engine-status ${active ? "is-active" : "is-inactive"}">${active ? "ACTIVE" : "PAUSED"}</span></td><td><div class="engine-actions"><button class="small-button" type="button" data-engine-edit="code" data-id="${escape(code.id)}" data-code="${escape(code.code)}" data-affiliate="${escape(code.affiliate_id || "")}" data-course="${escape(code.course_id || "all")}" data-discount="${Number(code.discount_percent)}" data-commission="${Number(code.commission_percent)}" data-max-uses="${escape(code.max_redemptions || "")}">Edit</button><button class="small-button ${active ? "danger" : "is-confirm"}" type="button" data-engine-action="toggle-code" data-id="${escape(code.id)}" data-status="${active ? "inactive" : "active"}">${active ? "Archive" : "Restore"}</button><button class="small-button danger" type="button" data-engine-action="delete-code" data-id="${escape(code.id)}" data-name="${escape(code.code)}">Delete</button></div></td>`;
      bindDeleteButton(row.querySelector('[data-engine-action="delete-code"]'), "Delete discount code?", `Delete ${code.code}? Past registrations keep their recorded code, discount and commission values.`, "Delete code", { action: "delete-code", id: code.id }, "Discount code deleted. Historical registrations were retained.");
      body.append(row);
    }
  }

  function renderMarketersLedger(ledger) {
    const body = $("#marketers-ledger-body");
    const empty = $("#marketers-ledger-empty");
    const foot = $("#marketers-ledger-foot");
    if (!body) return;
    body.replaceChildren();
    
    const items = Array.isArray(ledger) ? ledger : [];
    if (empty) empty.hidden = items.length > 0;
    
    let totalStudents = 0;
    let totalNetSales = 0;
    let totalCommissionDue = 0;
    let totalCompanyProfit = 0;
    
    for (const item of items) {
      const students = Number(item.studentsCount ?? item.students_count ?? 0);
      const netSales = Number(item.netSalesAfterDiscount ?? item.net_sales_jod ?? 0);
      const commPercent = Number(item.commissionPercent ?? item.commission_percent ?? 0);
      const commDue = Number(item.commissionDue ?? item.commission_due_jod ?? 0);
      const companyProfit = Number(item.companyNetProfit ?? item.company_net_jod ?? 0);
      const isPaid = Boolean(item.paid);
      const paidDate = item.paidAt || item.paid_at;
      
      totalStudents += students;
      totalNetSales += netSales;
      totalCommissionDue += commDue;
      totalCompanyProfit += companyProfit;
      
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><div class="engine-user"><strong>${escape(item.marketerName || item.affiliate_name || "Affiliate")}</strong><span>Partner</span></div></td>
        <td><code class="engine-code" style="color:#d4af37;font-weight:700;">${escape(item.code || item.coupon_code)}</code></td>
        <td><strong>${students}</strong></td>
        <td>${jod(netSales)}</td>
        <td><span class="engine-status is-active" style="display:inline-block;padding:2px 8px;font-weight:700;">${commPercent}%</span></td>
        <td><strong style="color:#10b981;">${jod(commDue)}</strong></td>
        <td><strong style="color:#38bdf8;">${jod(companyProfit)}</strong></td>
        <td>
          <span class="engine-status ${isPaid ? "is-active" : "is-pending"}" style="font-weight:700;display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border-radius:6px;font-size:11px;">
            <i style="width:6px;height:6px;border-radius:50%;background:${isPaid ? "#10b981" : "#f59e0b"};display:inline-block;"></i>
            ${isPaid ? "مدفوع (PAID)" : "غير مدفوع (UNPAID)"}
          </span>
          ${paidDate ? `<div style="color:rgba(255,255,255,0.4);font-size:10px;margin-top:2px;">${new Date(paidDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>` : ""}
        </td>
        <td>
          <button type="button" class="small-button ${isPaid ? "is-unpaid-action" : "is-confirm"}" data-toggle-payout="${escape(item.code || item.coupon_code)}" data-paid="${isPaid ? "false" : "true"}" style="font-weight:600;font-size:11px;padding:4px 10px;border-radius:6px;cursor:pointer;white-space:nowrap;${isPaid ? "background:rgba(255,255,255,0.06);color:#cbd5e1;border:1px solid rgba(255,255,255,0.18);" : "background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;box-shadow:0 2px 8px rgba(16,185,129,0.3);"}">
            ${isPaid ? "Mark Unpaid ↺" : "Mark Paid ✓"}
          </button>
        </td>
      `;
      body.append(row);
    }
    
    if (foot) {
      foot.innerHTML = items.length ? `
        <tr style="background:rgba(212,175,55,0.06);border-top:2px solid rgba(212,175,55,0.3);font-weight:700;">
          <td colspan="2" style="color:#d4af37;text-transform:uppercase;letter-spacing:1px;font-size:12px;">TOTAL COMMISSIONS SUMMARY</td>
          <td><strong>${totalStudents}</strong></td>
          <td>${jod(totalNetSales)}</td>
          <td>—</td>
          <td style="color:#10b981;font-size:14px;">${jod(totalCommissionDue)}</td>
          <td style="color:#38bdf8;font-size:14px;">${jod(totalCompanyProfit)}</td>
          <td colspan="2" style="color:rgba(255,255,255,0.5);font-size:11px;text-align:center;">—</td>
        </tr>
      ` : "";
    }
  }

  function renderAccounting(totals) {
    const netSales = totals.netSalesAfterDiscount ?? totals.revenue;
    const commissionsTotal = totals.commissionsTotal ?? totals.commissionsDue;
    const studioNet = totals.studioNet;

    // Registrations & Payments view
    if ($("#finance-gross")) $("#finance-gross").innerHTML = jod(totals.gross);
    if ($("#finance-discounts")) $("#finance-discounts").innerHTML = jod(totals.discounts);
    if ($("#finance-revenue")) $("#finance-revenue").innerHTML = jod(netSales);
    if ($("#finance-commissions")) $("#finance-commissions").innerHTML = jod(commissionsTotal);
    if ($("#finance-studio-net")) $("#finance-studio-net").innerHTML = jod(studioNet);
    if ($("#finance-pending")) $("#finance-pending").innerHTML = jod(totals.pending);

    // Financial Center in Analytics view
    if ($("#analytics-gross")) $("#analytics-gross").innerHTML = jod(totals.gross);
    if ($("#analytics-discounts")) $("#analytics-discounts").innerHTML = jod(totals.discounts);
    if ($("#analytics-revenue")) $("#analytics-revenue").innerHTML = jod(netSales);
    if ($("#analytics-commission")) $("#analytics-commission").innerHTML = jod(commissionsTotal);
    if ($("#analytics-studio-net")) $("#analytics-studio-net").innerHTML = jod(studioNet);

    // Overview KPIs
    if ($("#overview-gross")) $("#overview-gross").innerHTML = jod(totals.gross);
    if ($("#overview-discounts")) $("#overview-discounts").innerHTML = jod(totals.discounts);
    if ($("#overview-revenue")) $("#overview-revenue").innerHTML = jod(netSales);
    if ($("#overview-commissions")) $("#overview-commissions").innerHTML = jod(commissionsTotal);
    if ($("#overview-studio-net")) $("#overview-studio-net").innerHTML = jod(studioNet);

    renderMarketersLedger(state.marketersLedger);
    const history = $("#revenue-adjustment-history");
    if (history) history.innerHTML = state.adjustments.length ? state.adjustments.map(item => `<div class="adjustment-row"><span>${new Date(item.created_at).toLocaleDateString("en-US", { timeZone: "Asia/Amman", month: "short", day: "numeric", year: "numeric" })}</span><strong class="${Number(item.amount_jod) < 0 ? "is-negative" : "is-positive"}">${Number(item.amount_jod) > 0 ? "+" : ""}${Number(item.amount_jod).toFixed(3)} JOD</strong><small>${escape(item.reason)}</small><div class="adjustment-actions"><button type="button" class="small-button" data-adjustment-edit="${escape(item.id)}" data-amount="${Number(item.amount_jod)}" data-reason="${escape(item.reason)}">Edit</button><button type="button" class="small-button danger" data-adjustment-delete="${escape(item.id)}" data-amount="${Number(item.amount_jod)}">Delete</button></div></div>`).join("") : '<p class="adjustment-empty">No manual adjustments yet. Every change will be recorded here.</p>';
    const selectedCourse = $("#finance-course-filter").value;
    const rows = state.registrations.filter((registration) => selectedCourse === "all" || registration.course_id === selectedCourse);
    $("#accounting-empty").hidden = rows.length > 0;
    const body = $("#accounting-body");
    body.replaceChildren();
    for (const registration of rows) {
      const paymentStatus = String(registration.payment_status || "PENDING_REVIEW").toUpperCase();
      const isPaid = ["PAID", "APPROVED", "VERIFIED"].includes(paymentStatus);
      const isRejected = paymentStatus === "REJECTED";
      const isPending = !isPaid && !isRejected;
      const course = { "cinematic-film": "AI Cinematic Filmmaking", "ai-engineering": "AI for Engineers" }[registration.course_id] || registration.course_id;
      const due = Math.max(0, Number(registration.price_jod || 250) - Number(registration.discount_jod || 0));
      const date = registration.created_at ? new Date(registration.created_at).toLocaleDateString("en-US", { timeZone: "Asia/Amman", year: "numeric", month: "short", day: "numeric" }) : "—";
      const row = document.createElement("tr");
      const recordId = escape(registration.id || registration.payment_reference || registration.seat_number);
      row.dataset.registrationId = String(registration.id || "");
      const paymentAction = isPending
        ? `<button class="small-button is-confirm" type="button" data-engine-action="set-payment-status" data-id="${recordId}" data-status="PAID">Verify payment</button><button class="small-button danger" type="button" data-engine-action="set-payment-status" data-id="${recordId}" data-status="REJECTED">Reject</button>`
        : isPaid
          ? `<button class="small-button" type="button" data-engine-action="set-payment-status" data-id="${recordId}" data-status="PENDING_REVIEW">Reopen review</button>`
          : `<button class="small-button is-confirm" type="button" data-engine-action="set-payment-status" data-id="${recordId}" data-status="PAID">Approve</button><button class="small-button" type="button" data-engine-action="set-payment-status" data-id="${recordId}" data-status="PENDING_REVIEW">Reopen</button>`;
      const rawReceipt = String(registration.receipt_url || registration.receipt_base64 || registration.payment_proof_pathname || "").trim();
      const hasReceipt = rawReceipt.length > 5 || Boolean(registration.receipt_base64);
      const receiptCell = hasReceipt
        ? `<div style="display:flex;flex-direction:column;gap:3px;"><button class="small-button is-confirm" type="button" data-view-receipt="${escape(rawReceipt)}" data-reg-id="${escape(registration.id || "")}" data-student="${escape(registration.full_name)}">View receipt</button>${registration.payment_reference ? `<code class="engine-code" style="font-size:0.7em;opacity:0.85;">${escape(registration.payment_reference)}</code>` : ""}</div>`
        : (registration.payment_reference ? `<code class="engine-code">${escape(registration.payment_reference)}</code>` : `<code class="engine-code">—</code>`);
      const commissionAction = isPaid && Number(registration.commission_jod || 0) > 0
        ? `<button class="small-button" type="button" data-engine-action="set-commission-status" data-id="${recordId}" data-status="${registration.commission_status === "PAID" ? "PAYABLE" : "PAID"}">${registration.commission_status === "PAID" ? "Reopen payout" : "Mark paid"}</button>`
        : "";

      const studentPhone = registration.phone ? String(registration.phone).trim() : "";
      const waNumber = studentPhone.replace(/[^0-9]/g, "");
      const phoneHtml = studentPhone
        ? `<small class="engine-phone" style="display:block;margin-top:3px;"><a href="https://wa.me/${escape(waNumber)}" target="_blank" rel="noopener noreferrer" style="color:#38bdf8;text-decoration:none;font-size:0.82em;display:inline-flex;align-items:center;gap:4px;">💬 ${escape(studentPhone)}</a></small>`
        : "";
      const locationHtml = registration.location
        ? `<small style="display:block;color:rgba(255,255,255,0.55);font-size:0.76em;margin-top:2px;">📍 ${escape(registration.location)}</small>`
        : "";

      row.innerHTML = `<td><div class="engine-user"><strong>${escape(registration.full_name)}</strong><span>${escape(registration.email)}</span>${phoneHtml}${locationHtml}</div></td><td>${escape(course)}</td><td>${date}</td><td><code class="engine-code">${escape(registration.coupon_code || "—")}</code></td><td>${jod(due)}</td><td>${Number(registration.commission_percent || 0)}% · ${Number(registration.commission_jod || 0).toFixed(2)} JOD<br><small class="engine-subvalue">${escape(registration.commission_status || "NOT_APPLICABLE")}</small></td><td>${receiptCell}</td><td><span class="engine-status ${isPaid ? "is-active" : isPending ? "is-pending" : "is-inactive"}">${escape(paymentStatus.replaceAll("_", " "))}</span></td><td><div class="engine-actions"><button class="small-button" type="button" data-engine-edit="registration" data-id="${recordId}" data-name="${escape(registration.full_name)}" data-email="${escape(registration.email)}" data-course="${escape(registration.course_id)}" data-price="${Number(registration.price_jod || 250)}" data-discount="${Number(registration.discount_jod || 0)}" data-commission="${Number(registration.commission_percent || 0)}" data-status="${escape(paymentStatus)}">Edit</button>${paymentAction}${commissionAction}<button class="small-button danger" type="button" data-engine-action="delete-registration" data-id="${recordId}" data-name="${escape(registration.full_name)}">Delete</button></div></td>`;
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
      state.marketersLedger = accounting.marketersLedger || [];
      renderAffiliates();
      renderCodes();
      renderAccounting(state.totals);
    } catch (error) {
      if (!silent) notify(error.message || "Course data could not be loaded.", "error");
    }
  }

  function applyDeleteImmediately(body) {
    const id = String(body.id || "");
    if (!id) return;
    if (body.action === "delete-affiliate") {
      const affiliate = state.affiliates.find(item => String(item.id) === id);
      state.affiliates = state.affiliates.filter(item => String(item.id) !== id);
      if (affiliate) state.codes = state.codes.filter(item => String(item.affiliate_id || "") !== id);
      renderAffiliates(); renderCodes();
    } else if (body.action === "delete-code") {
      const codeId = String(body.id || "");
      const codeName = String(body.code || body.name || "").toUpperCase();
      state.codes = state.codes.filter(item => {
        const matchesId = codeId && String(item.id) === codeId;
        const matchesName = codeName && String(item.code || "").toUpperCase() === codeName;
        return !matchesId && !matchesName;
      });
      renderCodes();
    } else if (body.action === "delete-registration") {
      state.registrations = state.registrations.filter(item => String(item.id) !== id);
      renderAccounting(state.totals);
    } else if (body.action === "delete-revenue-adjustment") {
      state.adjustments = state.adjustments.filter(item => String(item.id) !== id);
      renderAccounting(state.totals);
    }
  }

  async function post(body, success) {
    try {
      await request({ body });
      if (String(body.action || "").startsWith("delete-")) {
        applyDeleteImmediately(body);
        const labels = { "delete-affiliate": "Affiliate deleted", "delete-code": "Promo code deleted", "delete-registration": "Registration deleted", "delete-revenue-adjustment": "Ledger adjustment deleted" };
        window.dispatchEvent(new CustomEvent("z7:admin-audit", { detail: { action: labels[body.action] || "Admin record deleted" } }));
      }
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

  async function exportExcelReport() {
    try {
      notify("Generating official 7Z Magic financial workbook (.xlsx)...");
      const token = await window.Clerk?.session?.getToken?.();
      const response = await fetch(endpoint + "?view=export-excel", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "same-origin",
      });
      if (!response.ok) {
        throw new Error("Unable to download the branded Excel report.");
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `7Z-Magic-Academy-Financial-Report-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      notify("Official 7Z Magic Excel workbook downloaded successfully.");
    } catch (err) {
      notify(err.message || "Failed to export report.", "error");
    }
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
    $("#financial-center-export-excel")?.addEventListener("click", exportExcelReport);
    $("#registrations-export-excel")?.addEventListener("click", exportExcelReport);
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
    document.addEventListener("click", async (event) => {
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
      const togglePayout = event.target.closest("[data-toggle-payout]");
      if (togglePayout) {
        const code = togglePayout.getAttribute("data-toggle-payout");
        const targetPaid = togglePayout.getAttribute("data-paid") === "true";
        if (!code) return;
        togglePayout.disabled = true;
        togglePayout.textContent = "Saving…";
        await post({ action: "toggle-commission-paid", code, paid: targetPaid }, `Payout status for ${code} set to ${targetPaid ? "PAID" : "UNPAID"}.`);
        return;
      }
      const viewReceipt = event.target.closest("[data-view-receipt]");
      if (viewReceipt) {
        const src = viewReceipt.getAttribute("data-view-receipt");
        const regId = viewReceipt.getAttribute("data-reg-id");
        const student = viewReceipt.getAttribute("data-student") || "Student";
        const dialog = $("#receipt-modal-dialog");
        const modalBody = $("#receipt-modal-body");
        const studentLabel = $("#receipt-modal-student");
        const downloadLink = $("#receipt-modal-download");
        const openTabLink = $("#receipt-modal-open-tab");

        let receiptUrl = src;
        if (!receiptUrl || receiptUrl === "undefined" || receiptUrl === "null" || (!receiptUrl.startsWith("data:") && !receiptUrl.startsWith("http://") && !receiptUrl.startsWith("https://") && !receiptUrl.startsWith("/api/"))) {
          if (regId) {
            receiptUrl = `/api/admin/course-engine?action=receipt&id=${encodeURIComponent(regId)}`;
          }
        }

        if (dialog && modalBody) {
          if (studentLabel) studentLabel.textContent = `Official transfer receipt for ${student}`;
          const isPdf = receiptUrl && (receiptUrl.endsWith(".pdf") || receiptUrl.includes("application/pdf"));
          if (isPdf) {
            modalBody.innerHTML = `<iframe src="${receiptUrl}" style="width:100%;height:520px;border:none;border-radius:8px;background:#fff;"></iframe>`;
          } else {
            modalBody.innerHTML = `<img src="${receiptUrl}" alt="Payment Receipt" style="max-width:100%;max-height:520px;object-fit:contain;border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,0.6);" onerror="if(!this.dataset.retried && '${regId}'){ this.dataset.retried=true; this.src='/api/admin/course-engine?action=receipt&id=${encodeURIComponent(regId)}'; } else { this.parentElement.innerHTML='<div style=\\'padding:30px;color:#ef4444;font-weight:600;\\'>⚠️ Receipt image could not be loaded directly. Click below to download or view.</div>'; }">`;
          }
          if (downloadLink) {
            downloadLink.href = receiptUrl;
            downloadLink.setAttribute("download", `receipt-${student.toLowerCase().replace(/[^a-z0-9]/g, "_")}.jpg`);
          }
          if (openTabLink) {
            openTabLink.href = receiptUrl;
          }
          dialog.showModal();
        }
        return;
      }
      const button = event.target.closest("[data-engine-action]");
      if (!button) return;
      const body = { action: button.dataset.engineAction, id: button.dataset.id, status: button.dataset.status, code: button.dataset.name };
      const message = body.action === "set-payment-status" ? `Set payment status to ${body.status.replaceAll("_", " ")}?` : body.action === "set-commission-status" ? `Set commission status to ${body.status}?` : body.action === "toggle-affiliate" && body.status === "inactive" ? "Archive this affiliate and disable its active discount codes? Sales history will be retained." : body.action === "toggle-code" && body.status === "inactive" ? "Archive this discount code? Existing registrations will be retained." : body.action === "delete-affiliate" ? `Permanently delete ${button.dataset.name || "this affiliate"} and its discount codes? Historical registrations and their recorded totals remain in the ledger.` : body.action === "delete-code" ? `Permanently delete discount code ${button.dataset.name || ""}? Past registrations keep their recorded code and commission.` : body.action === "delete-registration" ? "Delete this student registration? It will disappear from Latest Activity and be removed from the registration ledger, recalculating verified revenue, discounts and commissions." : `Set status to ${body.status}?`;
      if (!window.confirm(message)) return;
      const success = body.action === "delete-affiliate" ? "Affiliate and its codes deleted. Historical ledger entries were retained." : body.action === "delete-code" ? "Discount code deleted. Historical registrations were retained." : body.action === "delete-registration" ? "Registration deleted; revenue and Latest Activity were recalculated." : "Course administration updated.";
      post(body, success);
    });
    document.querySelectorAll("[data-admin-scroll]").forEach((button) => button.addEventListener("click", () => {
      document.querySelector(button.dataset.adminScroll)?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
    }));
    $("#receipt-modal-close")?.addEventListener("click", () => $("#receipt-modal-dialog")?.close());
    $("#receipt-modal-cancel")?.addEventListener("click", () => $("#receipt-modal-dialog")?.close());
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

  window.z7CourseEngine = { refresh, state, initialize };
  document.addEventListener("z7:admin-ready", initialize);
  if (!$("#app")?.classList.contains("hidden")) initialize();
})();
