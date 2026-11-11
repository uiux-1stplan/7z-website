(() => {
  "use strict";

  const endpoint = "/api/admin/course-engine";
  const $ = (selector) => document.querySelector(selector);
  const state = { affiliates: [], codes: [], courses: [], registrations: [], auditLogs: [], totals: {} };
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

  function renderCourseCatalog() {
    const list = $("#course-catalog-list");
    if (!list) return;
    list.replaceChildren(...state.courses.map((course, index) => {
      const card = document.createElement("article");
      card.className = "glass-panel course-catalog-card";
      card.innerHTML = '<span class="eyebrow">0' + (index + 1) + ' / LIVE COURSE</span><h3>' + escape(course.name) + '</h3><div class="course-catalog-price">' + Number(course.price_jod || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' <small>JOD</small></div><p>New checkout sessions will use this name and price. Existing payment records remain unchanged.</p><button class="button button-secondary" type="button" data-engine-action="edit-course" data-id="' + escape(course.course_id) + '">Edit course details</button>';
      return card;
    }));
  }

  function renderAffiliates() {
    const body = $("#affiliates-body");
    body.replaceChildren();
    $("#affiliates-empty").hidden = state.affiliates.length > 0;
    const affiliateOptions = ["<option value=''>Studio code / no affiliate</option>"];
    for (const affiliate of state.affiliates) {
      const active = affiliate.status === "active";
      affiliateOptions.push("<option value=\"" + escape(affiliate.id) + "\" " + (active ? "" : "disabled") + ">" + escape(affiliate.name) + (active ? "" : " · inactive") + "</option>");
      const row = document.createElement("tr");
      row.innerHTML = '<td><div class="engine-user"><strong>' + escape(affiliate.name) + '</strong><span>' + escape(affiliate.email || affiliate.company || "Affiliate partner") + '</span></div></td><td>' + Number(affiliate.code_count || 0) + '</td><td>' + Number(affiliate.registration_count || 0) + '</td><td>' + jod(affiliate.net_sales_jod) + '</td><td>' + jod(affiliate.outstanding_commission_jod) + '<small class="engine-subvalue">earned ' + Number(affiliate.earned_commission_jod || 0).toFixed(2) + ' JOD</small></td><td><span class="engine-status ' + (active ? "is-active" : "is-inactive") + '">' + (active ? "ACTIVE" : "PAUSED") + '</span></td><td><div class="engine-actions"><button class="small-button" type="button" data-engine-action="edit-affiliate" data-id="' + escape(affiliate.id) + '">EDIT</button><button class="small-button" type="button" data-engine-action="toggle-affiliate" data-id="' + escape(affiliate.id) + '" data-status="' + (active ? "inactive" : "active") + '">' + (active ? "PAUSE" : "ACTIVATE") + '</button><button class="small-button danger" type="button" data-engine-action="delete-affiliate" data-id="' + escape(affiliate.id) + '">DELETE</button></div></td>';
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
      const course = code.course_id === "all" ? "All courses" : state.courses.find((item) => item.course_id === code.course_id)?.name || code.course_id;
      const row = document.createElement("tr");
      const uses = Number(code.redemption_count || 0) + (code.max_redemptions ? " / " + Number(code.max_redemptions) : "");
      row.innerHTML = '<td><code class="engine-code">' + escape(code.code) + '</code></td><td>' + escape(code.affiliate_name || "Studio") + '</td><td>' + escape(course) + '</td><td>' + Number(code.discount_percent) + '%</td><td>' + Number(code.commission_percent) + '%</td><td>' + uses + '</td><td><span class="engine-status ' + (active ? "is-active" : "is-inactive") + '">' + (active ? "ACTIVE" : "PAUSED") + '</span></td><td><div class="engine-actions"><button class="small-button" type="button" data-engine-action="edit-code" data-id="' + escape(code.id) + '">EDIT TERMS</button><button class="small-button" type="button" data-engine-action="toggle-code" data-id="' + escape(code.id) + '" data-status="' + (active ? "inactive" : "active") + '">' + (active ? "DISABLE" : "ENABLE") + '</button><button class="small-button danger" type="button" data-engine-action="delete-code" data-id="' + escape(code.id) + '">DELETE</button></div></td>';
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
      const course = state.courses.find((item) => item.course_id === registration.course_id)?.name || registration.course_id;
      const due = Math.max(0, Number(registration.price_jod || 0) - Number(registration.discount_jod || 0));
      const date = registration.created_at ? new Date(registration.created_at).toLocaleDateString("en-US", { timeZone: "Asia/Amman", year: "numeric", month: "short", day: "numeric" }) : "—";
      const provider = String(registration.payment_provider || "").toUpperCase();
      const method = provider === "CLIQ" ? "CliQ" : provider === "WESTERN_UNION" ? "Western Union" : registration.payment_provider || "—";
      const row = document.createElement("tr");
      const paymentAction = isPending
        ? '<button class="small-button is-confirm" type="button" data-engine-action="set-payment-status" data-id="' + escape(registration.id) + '" data-status="PAID">APPROVE</button><button class="small-button danger" type="button" data-engine-action="set-payment-status" data-id="' + escape(registration.id) + '" data-status="REJECTED">REJECT</button>'
        : isPaid ? '<button class="small-button" type="button" data-engine-action="set-payment-status" data-id="' + escape(registration.id) + '" data-status="PENDING_REVIEW">REOPEN</button>' : "";
      const commissionAction = isPaid && Number(registration.commission_jod || 0) > 0
        ? '<button class="small-button" type="button" data-engine-action="set-commission-status" data-id="' + escape(registration.id) + '" data-status="' + (registration.commission_status === "PAID" ? "PAYABLE" : "PAID") + '">' + (registration.commission_status === "PAID" ? "REOPEN PAYOUT" : "MARK PAID") + '</button>'
        : "";
      const receiptAction = registration.payment_proof_pathname
        ? '<button class="small-button" type="button" data-engine-action="view-receipt" data-id="' + escape(registration.id) + '">VIEW RECEIPT</button>'
        : '<span class="engine-dash">Not attached</span>';
      row.innerHTML = '<td><div class="engine-user"><strong>' + escape(registration.full_name) + '</strong><span>' + escape(registration.email) + ' · ' + escape(registration.phone || "—") + '</span></div></td>' +
        '<td>' + escape(course) + '</td><td>' + date + '</td><td><code class="engine-code">' + escape(registration.coupon_code || "—") + '</code></td>' +
        '<td>' + escape(method) + '</td><td><code class="engine-code">' + escape(registration.payment_reference || "—") + '</code></td><td>' + jod(due) + '</td>' +
        '<td>' + Number(registration.commission_percent || 0) + '% · ' + Number(registration.commission_jod || 0).toFixed(2) + ' JOD<br><small class="engine-subvalue">' + escape(registration.commission_status || "NOT_APPLICABLE") + '</small></td>' +
        '<td><span class="engine-status ' + (isPaid ? "is-active" : isPending ? "is-pending" : "is-inactive") + '">' + escape(paymentStatus.replaceAll("_", " ")) + '</span></td><td>' + receiptAction + '</td>' +
        '<td><div class="engine-actions"><button class="small-button" type="button" data-engine-action="edit-registration" data-id="' + escape(registration.id) + '">EDIT</button>' + paymentAction + commissionAction + '<button class="small-button danger" type="button" data-engine-action="delete-registration" data-id="' + escape(registration.id) + '">DELETE</button></div></td>';
      body.append(row);
    }
  }

  function renderAuditLogs() {
    const body = $("#audit-log-body");
    const empty = $("#audit-log-empty");
    if (!body || !empty) return;
    body.replaceChildren();
    empty.hidden = state.auditLogs.length > 0;
    for (const log of state.auditLogs) {
      const row = document.createElement("tr");
      const date = log.created_at ? new Date(log.created_at).toLocaleString("en-US", { timeZone: "Asia/Amman", dateStyle: "medium", timeStyle: "short" }) : "—";
      const details = typeof log.details === "string" ? log.details : JSON.stringify(log.details || {});
      row.innerHTML = '<td>' + escape(date) + '</td><td><code class="engine-code">' + escape(log.action || "Action") + '</code></td><td>' + escape([log.target_type, log.target_id].filter(Boolean).join(" · ") || "Workspace") + '</td><td class="audit-detail-cell">' + escape(details) + '</td><td><button class="small-button danger" type="button" data-engine-action="delete-audit-log" data-id="' + escape(log.id) + '">DELETE</button></td>';
      body.append(row);
    }
  }

  async function refresh(silent = false) {
    try {
      const [programs, accounting, audit] = await Promise.all([request(), request({ query: { view: "accounting" } }), request({ query: { view: "audit" } })]);
      state.affiliates = programs.affiliates || [];
      state.courses = programs.courses || [];
      state.codes = programs.codes || [];
      state.registrations = accounting.registrations || [];
      state.totals = accounting.totals || {};
      state.auditLogs = audit.logs || [];
      renderCourseCatalog();
      renderAffiliates();
      renderCodes();
      renderAccounting(state.totals);
      renderAuditLogs();
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

  function xmlEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]);
  }

  function exportAccountingReport() {
    const paid = state.registrations.filter((row) => ["PAID", "APPROVED", "VERIFIED"].includes(String(row.payment_status).toUpperCase()));
    const sheet = (name, rows) => `<Worksheet ss:Name="${xmlEscape(name)}"><Table>${rows.map((row, index) => `<Row>${row.map((value) => {
      const numeric = typeof value === "number" && Number.isFinite(value);
      return `<Cell${index === 0 ? ' ss:StyleID="Header"' : ""}><Data ss:Type="${numeric ? "Number" : "String"}">${xmlEscape(value)}</Data></Cell>`;
    }).join("")}</Row>`).join("")}</Table></Worksheet>`;
    const registrationRows = [["Student", "Email", "Phone", "Course", "Submitted", "Payment status", "Method", "Transfer reference", "Code", "List price JOD", "Discount JOD", "Net due JOD", "Affiliate", "Commission %", "Commission JOD", "Commission status", "Receipt"]];
    state.registrations.forEach((row) => registrationRows.push([
      row.full_name, row.email, row.phone || "", row.course_id, row.created_at || "", row.payment_status || "",
      row.payment_provider || "", row.payment_reference || "", row.coupon_code || "",
      Number(row.price_jod || 0), Number(row.discount_jod || 0),
      Math.max(0, Number(row.price_jod || 0) - Number(row.discount_jod || 0)),
      row.affiliate_name || "", Number(row.commission_percent || 0), Number(row.commission_jod || 0),
      row.commission_status || "", row.payment_proof_pathname ? "Attached" : "Not attached",
    ]));
    const summaryRows = [
      ["7Z MAGIC · ACADEMY ACCOUNTING REPORT", "JOD"],
      ["Generated at", new Date().toLocaleString("en-US", { timeZone: "Asia/Amman" })],
      ["Verified registrations", paid.length],
      ["Gross course sales", Number(state.totals.gross || 0)],
      ["Verified revenue after discounts", Number(state.totals.revenue || 0)],
      ["Pending payment value", Number(state.totals.pending || 0)],
      ["Discounts granted", Number(state.totals.discounts || 0)],
      ["Total earned affiliate commissions", Number(state.totals.commissionsTotal || 0)],
      ["Outstanding commissions", Number(state.totals.commissionsDue || 0)],
      ["Studio net after commissions", Number(state.totals.studioNet || 0)],
    ];
    const affiliateRows = [["Affiliate", "Email", "Company", "Status", "Codes", "Registrations", "Net sales JOD", "Earned commission JOD", "Outstanding commission JOD"]];
    state.affiliates.forEach((row) => affiliateRows.push([row.name, row.email || "", row.company || "", row.status, Number(row.code_count || 0), Number(row.registration_count || 0), Number(row.net_sales_jod || 0), Number(row.earned_commission_jod || 0), Number(row.outstanding_commission_jod || 0)]));
    const codeRows = [["Code", "Affiliate", "Course", "Discount %", "Commission %", "Redemptions", "Max redemptions", "Status"]];
    state.codes.forEach((row) => codeRows.push([row.code, row.affiliate_name || "", row.course_id, Number(row.discount_percent || 0), Number(row.commission_percent || 0), Number(row.redemption_count || 0), row.max_redemptions ?? "Unlimited", row.status]));
    const workbook = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#25365B" ss:Pattern="Solid"/></Style></Styles>${sheet("Summary", summaryRows)}${sheet("Registrations", registrationRows)}${sheet("Affiliates", affiliateRows)}${sheet("Promo Codes", codeRows)}</Workbook>`;
    const blob = new Blob(["\ufeff", workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `7Z-Magic-accounting-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    notify("Accounting workbook exported with summary, registrations, affiliates and promo codes.");
  }

  function bind() {
    document.querySelectorAll("[data-engine-refresh]").forEach((button) => button.addEventListener("click", refresh));
    $("#finance-course-filter")?.addEventListener("change", () => renderAccounting(state.totals));
    $("#export-accounting-report")?.addEventListener("click", exportAccountingReport);
    $("#receipt-preview-dialog")?.querySelector("[data-close-receipt]")?.addEventListener("click", () => $("#receipt-preview-dialog").close());
    $("#receipt-preview-dialog")?.addEventListener("click", (event) => { if (event.target === event.currentTarget) event.currentTarget.close(); });
    $("#affiliate-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (await post({ action: "create-affiliate", ...formObject(form) }, "Affiliate profile created.")) { form.reset(); form.elements.commissionPercent.value = "20"; }
    });
    $("#coupon-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = formObject(form);
      if (await post({ action: "create-code", ...data }, `${String(data.code).toUpperCase()} is now active.`)) {
        form.reset(); form.elements.courseId.value = "all"; form.elements.discountPercent.value = "10"; form.elements.commissionPercent.value = "20";
      }
    });
    document.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-engine-action]");
      if (!button) return;
      const action = button.dataset.engineAction;
      const id = button.dataset.id;
      const dialog = $("#engine-action-dialog");
      const openDialog = ({ title, copy, fields = [], submit = "Save changes", confirm, run }) => {
        if (!dialog) { notify("The action dialog is not available.", "error"); return; }
        const fieldsMarkup = fields.map((field) => {
          if (field.type === "select") {
            const options = field.options.map((option) => `<option value="${escape(option.value)}" ${String(option.value) === String(field.value) ? "selected" : ""}>${escape(option.label)}</option>`).join("");
            return `<label class="engine-dialog-field">${escape(field.label)}<select name="${escape(field.name)}" ${field.required ? "required" : ""}>${options}</select></label>`;
          }
          return `<label class="engine-dialog-field">${escape(field.label)}<input name="${escape(field.name)}" type="${field.type || "text"}" value="${escape(field.value ?? "")}" ${field.required ? "required" : ""} ${field.min !== undefined ? `min="${field.min}"` : ""} ${field.max !== undefined ? `max="${field.max}"` : ""} ${field.step ? `step="${field.step}"` : ""}></label>`;
        }).join("");
        dialog.innerHTML = `<form class="engine-dialog-form"><span class="eyebrow">7Z MAGIC / ADMIN ACTION</span><h2 id="engine-action-title">${escape(title)}</h2><p>${escape(copy)}</p>${fieldsMarkup}<div class="engine-dialog-actions"><button class="button button-secondary" type="button" data-engine-dialog-cancel>Cancel</button><button class="button button-primary" type="submit">${escape(confirm || submit)}</button></div></form>`;
        dialog.querySelector("[data-engine-dialog-cancel]").addEventListener("click", () => dialog.close());
        dialog.onsubmit = async (submitEvent) => {
          submitEvent.preventDefault();
          const submitButton = dialog.querySelector('button[type="submit"]');
          submitButton.disabled = true;
          const values = Object.fromEntries(new FormData(submitEvent.currentTarget).entries());
          try {
            const saved = await run(values);
            if (saved) dialog.close();
          } catch (error) {
            notify(error.message || "The action could not be completed.", "error");
          } finally { submitButton.disabled = false; }
        };
        dialog.showModal();
        dialog.querySelector("input, select")?.focus({ preventScroll: true });
      };
      const runPost = (body, message) => post(body, message);
      if (action === "view-receipt") {
        try {
          const result = await request({ body: { action: "receipt-url", id } });
          const preview = $("#receipt-preview-dialog");
          const image = $("#receipt-preview-image");
          const original = $("#receipt-open-original");
          if (!preview || !image || !result.receiptUrl) throw new Error("The receipt could not be opened.");
          image.src = result.receiptUrl;
          original.href = result.receiptUrl;
          if (!preview.open) preview.showModal();
        } catch (error) { notify(error.message || "The receipt could not be opened.", "error"); }
        return;
      }
      if (action === "edit-course") {
        const item = state.courses.find((entry) => String(entry.course_id) === String(id));
        if (!item) return notify("Course not found. Refresh and try again.", "error");
        openDialog({ title: "Edit course details", copy: "Name and price changes apply to new checkouts. Existing student records keep their saved course price.", fields: [
          { name: "name", label: "Course name", value: item.name, required: true },
          { name: "priceJod", label: "Price (JOD)", type: "number", min: 0.01, max: 100000, step: 0.01, value: item.price_jod, required: true },
        ], run: (values) => runPost({ action: "update-course", courseId: id, ...values }, "Course catalog updated.") });
        return;
      }
      if (action === "edit-affiliate") {
        const item = state.affiliates.find((entry) => String(entry.id) === String(id));
        if (!item) return notify("Affiliate not found. Refresh and try again.", "error");
        openDialog({ title: "Edit affiliate", copy: "Changes apply to the affiliate profile. Existing registration snapshots remain unchanged.", fields: [
          { name: "name", label: "Full name", value: item.name, required: true },
          { name: "email", label: "Email address", type: "email", value: item.email || "" },
          { name: "company", label: "Company", value: item.company || "" },
          { name: "commissionPercent", label: "Default commission (%)", type: "number", min: 0, max: 100, step: 1, value: item.commission_percent, required: true },
        ], run: (values) => runPost({ action: "update-affiliate", id, ...values }, "Affiliate profile updated.") });
        return;
      }
      if (action === "edit-code") {
        const item = state.codes.find((entry) => String(entry.id) === String(id));
        if (!item) return notify("Discount code not found. Refresh and try again.", "error");
        const affiliateOptions = [{ value: "", label: "Studio code / no affiliate" }, ...state.affiliates.filter((entry) => entry.status === "active").map((entry) => ({ value: entry.id, label: entry.name }))];
        openDialog({ title: "Edit promo code", copy: "Update the live code terms. Past registrations keep their recorded discount and commission.", fields: [
          { name: "code", label: "Code", value: item.code, required: true },
          { name: "courseId", label: "Course", type: "select", value: item.course_id, options: [{ value: "all", label: "All courses" }, { value: "cinematic-film", label: "AI Cinematic Filmmaking" }, { value: "ai-engineering", label: "AI for Engineers" }] },
          { name: "affiliateId", label: "Affiliate", type: "select", value: item.affiliate_id || "", options: affiliateOptions },
          { name: "discountPercent", label: "Student discount (%)", type: "number", min: 0, max: 100, step: 1, value: item.discount_percent, required: true },
          { name: "commissionPercent", label: "Affiliate commission (%)", type: "number", min: 0, max: 100, step: 1, value: item.commission_percent, required: true },
          { name: "maxRedemptions", label: "Maximum redemptions (blank = unlimited)", type: "number", min: 1, max: 1000000, step: 1, value: item.max_redemptions ?? "" },
        ], run: (values) => runPost({ action: "update-code", id, ...values }, "Discount code updated.") });
        return;
      }
      if (action === "edit-registration") {
        const item = state.registrations.find((entry) => String(entry.id) === String(id));
        if (!item) return notify("Registration not found. Refresh and try again.", "error");
        openDialog({ title: "Edit student details", copy: "Correct the student's contact details. Payment and financial history stay unchanged.", fields: [
          { name: "name", label: "Full name", value: item.full_name, required: true },
          { name: "email", label: "Email address", type: "email", value: item.email, required: true },
          { name: "phone", label: "Phone number", value: item.phone || "", required: true },
        ], run: (values) => runPost({ action: "update-registration", id, ...values }, "Student details updated.") });
        return;
      }
      const affiliate = state.affiliates.find((entry) => String(entry.id) === String(id));
      const code = state.codes.find((entry) => String(entry.id) === String(id));
      const registration = state.registrations.find((entry) => String(entry.id) === String(id));
      const actionMeta = {
        "delete-affiliate": { title: "Delete affiliate?", copy: `Delete ${affiliate?.name || "this affiliate"}? Past registrations retain their saved commission and attribution.`, confirm: "Delete affiliate", success: "Affiliate deleted.", payload: { action, id } },
        "delete-code": { title: "Delete promo code?", copy: `Delete ${code?.code || "this code"}? Existing registrations retain their saved discount and commission values.`, confirm: "Delete code", success: "Promo code deleted.", payload: { action, id } },
        "delete-audit-log": { title: "Delete activity record?", copy: "This audit entry will be permanently removed from the security history.", confirm: "Delete record", success: "Activity record deleted.", payload: { action, id } },
        "delete-registration": { title: "Delete registration?", copy: `Permanently remove the registration for ${registration?.full_name || "this student"} from the ledger and activity list?`, confirm: "Delete registration", success: "Registration deleted.", payload: { action, id } },
        "toggle-affiliate": { title: button.dataset.status === "active" ? "Reactivate affiliate?" : "Pause affiliate?", copy: "This changes whether the affiliate can be selected for new discount codes.", confirm: button.dataset.status === "active" ? "Reactivate" : "Pause affiliate", success: "Affiliate status updated.", payload: { action, id, status: button.dataset.status } },
        "toggle-code": { title: button.dataset.status === "active" ? "Enable promo code?" : "Disable promo code?", copy: "This changes the code's availability for future registrations. Existing records remain unchanged.", confirm: button.dataset.status === "active" ? "Enable code" : "Disable code", success: "Promo code status updated.", payload: { action, id, status: button.dataset.status } },
        "set-payment-status": { title: "Update payment status?", copy: `Set this student's payment to ${String(button.dataset.status || "").replaceAll("_", " ")}? The student is notified when a payment is approved or rejected.`, confirm: "Update payment", success: "Payment status updated.", payload: { action, id, status: button.dataset.status } },
        "set-commission-status": { title: "Update commission status?", copy: `Mark this affiliate commission as ${button.dataset.status || "payable"}?`, confirm: "Update commission", success: "Commission status updated.", payload: { action, id, status: button.dataset.status } },
      }[action];
      if (!actionMeta) return;
      openDialog({ ...actionMeta, run: () => runPost(actionMeta.payload, actionMeta.success) });
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
