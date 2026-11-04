(() => {
  "use strict";

  const panel = document.getElementById("z7-academy-finance");
  if (!panel) return;

  const $ = (selector) => panel.querySelector(selector);
  const all = (selector) => [...panel.querySelectorAll(selector)];
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const courseName = (id) => id === "ai-engineering" ? "AI for Engineers" : "AI Cinematic Filmmaking";
  const methodName = (id) => id === "CLIQ" ? "CliQ" : id === "WESTERN_UNION" ? "Western Union" : String(id || "—");
  const statusName = (value) => ({
    PAID: "Paid", PENDING_REVIEW: "Awaiting verification", PAYABLE: "Payable",
    PENDING_PAYMENT_REVIEW: "Payment confirmation pending", NOT_APPLICABLE: "Not applicable",
    REJECTED: "Rejected", CANCELLED: "Cancelled", EXPIRED: "Expired", REFUNDED: "Refunded",
    PENDING: "Under review", PAYMENT_REVIEW: "Under review"
  })[value] || "Under review";
  const statusClass = (value) => value === "PAID" ? "paid" : /PENDING|PAYABLE/.test(value || "") ? "pending" : "";
  const money = (value) => {
    const amount = Number(value || 0);
    return "JOD " + amount.toLocaleString("en-JO", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  };
  const value = (row, key) => Number(row?.[key] || 0);
  const netAfterDiscount = (row) => value(row, "price_jod") - value(row, "discount_jod");
  const academyNet = (row) => netAfterDiscount(row) - value(row, "commission_jod");
  const codeName = (row) => String(row?.coupon_code || "No code");
  let state = null;
  let page = 1;
  let section = "registrations";
  let loading = false;
  let queued = false;
  let toastTimer = null;

  function showToast(message, error = false) {
    const host = document.getElementById("toast-stack");
    if (!host) return;
    let toast = document.getElementById("academy-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "academy-toast";
      toast.className = "toast";
      host.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.toggle("error", error);
    toast.classList.toggle("success", !error);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.remove(), 4200);
  }

  function translatedError(message) {
    const map = {
      "اختر دورة صحيحة.": "Choose a valid course.",
      "يجب أن يتكون الكود من 2 إلى 24 حرفًا أو رقمًا إنجليزيًا أو شرطة.": "Use 2–24 English letters, numbers, or hyphens for the code.",
      "نسبتا الخصم والعمولة يجب أن تكونا بين 0 و100.": "Discount and commission rates must be between 0% and 100%.",
      "أدخل اسم المسوّق عند تحديد عمولة.": "Enter an affiliate name when setting a commission.",
      "بيانات تعديل الكود غير صحيحة.": "The discount code update is invalid.",
      "الكود غير موجود.": "Discount code not found.",
      "أدخل مرجع تحويل العمولة بعد صرفها.": "Enter the transfer reference after paying the commission.",
      "هذه العمولة غير مستحقة للصرف حاليًا. حدّث القائمة وتحقق من حالتها.": "This commission is not currently payable. Refresh and check its status.",
      "الإجراء المطلوب غير صحيح.": "The requested action is invalid.",
      "يلزم تنفيذ الطلب من لوحة الإدارة.": "This action must be performed from the admin dashboard.",
      "طريقة الطلب غير مدعومة.": "This request method is not supported.",
      "تعذر تحميل إدارة الدورات مؤقتًا. حاول مرة أخرى.": "Academy finance is temporarily unavailable. Please try again."
    };
    return map[message] || message || "Something went wrong. Please try again.";
  }

  async function request(url, options = {}) {
    const clerk = window.Clerk;
    const token = await clerk?.session?.getToken();
    if (!token) throw new Error("Your admin session has expired. Please sign in again.");
    const headers = { Authorization: `Bearer ${token}`, ...(options.headers || {}) };
    if (options.body && typeof options.body !== "string") {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(options.body);
    }
    const response = await fetch(url, {
      ...options, headers, cache: "no-store", credentials: "same-origin"
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(translatedError(result.error) || `Request failed (${response.status}).`);
    return result;
  }

  function badge(status) {
    return `<span class="z7-af-status ${statusClass(status)}">${escape(statusName(status))}</span>`;
  }

  function currentRows() {
    const course = $("#af-course-filter").value;
    let rows = state?.registrations || [];
    if (course !== "all") rows = rows.filter((row) => row.course_id === course);
    if (section === "payments") rows = rows.filter((row) => row.payment_status === "PENDING_REVIEW");
    if (section === "commissions") rows = rows.filter((row) => Number(row.commission_percent) > 0 && ["PAYABLE", "PAID", "PENDING_PAYMENT_REVIEW"].includes(row.commission_status));
    const query = $("#af-search").value.trim().toLowerCase();
    if (query && section === "registrations") rows = rows.filter((row) =>
      [row.full_name, row.email, row.coupon_code, row.affiliate_name].some((part) => String(part || "").toLowerCase().includes(query))
    );
    return rows;
  }

  function renderRegistrationRows() {
    const rows = currentRows();
    $("#af-registrations-body").innerHTML = rows.map((row) => {
      const afterDiscount = netAfterDiscount(row);
      const commission = value(row, "commission_jod");
      const projected = row.payment_status !== "PAID";
      return `<tr>
        <td><strong>${escape(row.full_name)}</strong><br><span class="z7-af-inline-note">${escape(row.email)}</span></td>
        <td>${escape(courseName(row.course_id))}<br><span class="z7-af-inline-note">Registration #${escape(row.seat_number)}</span></td>
        <td>${badge(row.payment_status)}</td>
        <td class="amount">${money(row.price_jod)}</td>
        <td class="amount">${Number(row.discount_percent || 0)}% · ${money(row.discount_jod)}<br><span class="z7-af-inline-note">${escape(codeName(row))}</span></td>
        <td class="amount"><strong>${money(afterDiscount)}</strong></td>
        <td>${escape(row.affiliate_name || "No affiliate")}<br><span class="z7-af-inline-note">${Number(row.commission_percent || 0)}% rate</span></td>
        <td class="amount">${money(commission)}</td>
        <td class="amount"><strong>${money(academyNet(row))}</strong>${projected ? '<br><span class="z7-af-inline-note">Projected until payment is confirmed</span>' : ""}</td>
        <td>${escape(new Date(row.created_at).toLocaleDateString("en-JO"))}</td>
      </tr>`;
    }).join("");
    $("#af-registrations-empty").hidden = rows.length > 0;
    $("#af-page-label").textContent = `Page ${state.pagination.page} of ${state.pagination.pages} · ${state.pagination.total} registrations`;
    $("#af-prev").disabled = page <= 1;
    $("#af-next").disabled = page >= state.pagination.pages;
  }

  function renderPayments() {
    const rows = (state.registrations || []).filter((row) => row.payment_status === "PENDING_REVIEW");
    $("#af-payments-body").innerHTML = rows.map((row) => `<tr>
      <td><strong>${escape(row.full_name)}</strong><br><span class="z7-af-inline-note">${escape(row.email)}</span></td>
      <td>${escape(courseName(row.course_id))} · #${escape(row.seat_number)}</td>
      <td class="amount"><strong>${money(netAfterDiscount(row))}</strong></td>
      <td>${escape(methodName(row.payment_provider))}<br><span class="z7-af-inline-note">${escape(row.payment_reference || "—")}</span></td>
      <td>${row.payment_proof_pathname ? `<button class="button button-secondary" data-af-proof="${escape(row.id)}">View receipt</button>` : "—"}</td>
      <td><button class="button button-primary" data-af-confirm="${escape(row.id)}">Confirm payment</button></td>
    </tr>`).join("");
    $("#af-payments-empty").hidden = rows.length > 0;
  }

  function renderCoupons() {
    const course = $("#af-course-filter").value;
    const rows = (state.coupons || []).filter((row) => course === "all" || row.course_id === course);
    const usage = new Map((state.couponSummary || []).map((row) => [`${row.course_id}:${row.code}`, row]));
    $("#af-coupons-body").innerHTML = rows.map((coupon) => {
      const summary = usage.get(`${coupon.course_id}:${coupon.code}`) || {};
      return `<tr>
        <td>${escape(courseName(coupon.course_id))}</td><td><strong>${escape(coupon.code)}</strong></td>
        <td>${Number(coupon.discount_percent)}%</td><td>${escape(coupon.affiliate_name || "—")}</td>
        <td>${Number(coupon.commission_percent)}%</td><td>${Number(summary.uses || 0)}</td>
        <td class="amount">${money(summary.discount_total)}</td>
        <td>${coupon.active ? '<span class="z7-af-status paid">Active</span>' : '<span class="z7-af-status">Inactive</span>'}</td>
        <td><button class="button button-secondary" data-af-coupon="${escape(coupon.id)}" data-active="${coupon.active ? "false" : "true"}">${coupon.active ? "Deactivate" : "Activate"}</button></td>
      </tr>`;
    }).join("");
  }

  function renderCommissions() {
    const course = $("#af-course-filter").value;
    const affiliateRows = (state.commissionSummary || []).filter((row) =>
      (course === "all" || row.course_id === course) && Number(row.paid_registrations) > 0
    );
    $("#af-affiliates-body").innerHTML = affiliateRows.map((row) => `<tr>
      <td>${escape(courseName(row.course_id))}</td><td><strong>${escape(row.affiliate_name)}</strong></td>
      <td>${Number(row.paid_registrations)}</td><td class="amount">${money(row.paid_after_discount)}</td>
      <td class="amount">${money(row.commission_total)}</td><td class="amount">${money(row.commission_paid)}</td>
      <td class="amount"><strong>${money(row.commission_payable)}</strong></td><td class="amount">${money(row.academy_net)}</td>
    </tr>`).join("");
    $("#af-affiliates-empty").hidden = affiliateRows.length > 0;

    const rows = (state.registrations || []).filter((row) =>
      (course === "all" || row.course_id === course) &&
      Number(row.commission_percent) > 0 &&
      ["PAYABLE", "PAID", "PENDING_PAYMENT_REVIEW"].includes(row.commission_status)
    );
    $("#af-commission-ledger").innerHTML = rows.map((row) => `<tr>
      <td>${escape(row.affiliate_name || "—")}</td><td>${escape(courseName(row.course_id))}</td>
      <td>${escape(row.full_name)} · #${escape(row.seat_number)}</td><td>${Number(row.commission_percent)}%</td>
      <td class="amount">${money(row.commission_jod)}</td><td>${badge(row.commission_status)}</td>
      <td>${escape(row.commission_payment_reference || "—")}</td>
      <td>${row.commission_status === "PAYABLE" ? `<button class="button button-secondary" data-af-payout="${escape(row.id)}">Record payout</button>` : "—"}</td>
    </tr>`).join("");
    $("#af-commission-ledger-empty").hidden = rows.length > 0;
  }

  function renderReports() {
    const course = $("#af-course-filter").value;
    const courses = (state.courseSummary || []).filter((row) => course === "all" || row.course_id === course);
    $("#af-course-report").innerHTML = courses.map((row) => `<tr>
      <td>${escape(courseName(row.course_id))}</td><td>${Number(row.registrations)}</td>
      <td>${Number(row.pending_payments)}</td><td>${Number(row.paid_registrations)}</td>
      <td class="amount">${money(row.paid_list_value)}</td><td class="amount">${money(row.discounts_applied)}</td>
      <td class="amount">${money(row.net_collected)}</td><td class="amount">${money(row.commission_total)}</td>
      <td class="amount"><strong>${money(row.academy_net)}</strong></td>
    </tr>`).join("");
    $("#af-code-report").innerHTML = (state.couponSummary || []).filter((row) =>
      course === "all" || row.course_id === course
    ).map((row) => `<tr>
      <td>${escape(courseName(row.course_id))}</td><td>${escape(row.code)}</td><td>${Number(row.uses)}</td>
      <td class="amount">${money(row.discount_total)}</td><td class="amount">${money(row.commission_total)}</td>
    </tr>`).join("");
  }

  function render() {
    const selectedCourse = $("#af-course-filter").value;
    const summaries = (state.courseSummary || []).filter((row) => selectedCourse === "all" || row.course_id === selectedCourse);
    const total = summaries.reduce((sum, row) => sum + Number(row.registrations || 0), 0);
    const pending = summaries.reduce((sum, row) => sum + Number(row.pending_payments || 0), 0);
    const collected = summaries.reduce((sum, row) => sum + value(row, "net_collected"), 0);
    const payable = summaries.reduce((sum, row) => sum + value(row, "commission_payable"), 0);
    const net = summaries.reduce((sum, row) => sum + value(row, "academy_net"), 0);
    $("#af-stat-registrations").textContent = total.toLocaleString("en");
    $("#af-stat-pending").textContent = pending.toLocaleString("en");
    $("#af-stat-collected").textContent = money(collected);
    $("#af-stat-commission-due").textContent = money(payable);
    $("#af-stat-academy-net").textContent = money(net);
    renderRegistrationRows();
    renderPayments();
    renderCoupons();
    renderCommissions();
    renderReports();
  }

  async function load() {
    if (loading) return;
    loading = true;
    $("#af-loading").hidden = false;
    $("#af-error").hidden = true;
    $("#af-content").hidden = true;
    try {
      state = await request(`/api/admin/course-finance?course=${encodeURIComponent($("#af-course-filter").value)}&page=${page}`);
      $("#af-loading").hidden = true;
      $("#af-content").hidden = false;
      render();
    } catch (error) {
      $("#af-loading").hidden = true;
      $("#af-error").textContent = translatedError(error.message);
      $("#af-error").hidden = false;
    } finally {
      loading = false;
    }
  }

  function scheduleLoad(attempt = 0) {
    if (queued || section !== "registrations" && !panel.isConnected) return;
    if (document.getElementById("app")?.classList.contains("hidden") || !window.Clerk?.loaded) {
      if (attempt < 50) {
        queued = true;
        setTimeout(() => { queued = false; scheduleLoad(attempt + 1); }, 250);
      }
      return;
    }
    load();
  }

  async function viewReceipt(id) {
    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    try {
      const result = await request(`/api/admin/course-finance?action=proof&registrationId=${encodeURIComponent(id)}`);
      if (popup) popup.location.href = result.url;
      else showToast("Allow receipt pop-ups in your browser settings, then try again.", true);
    } catch (error) {
      if (popup) popup.close();
      showToast(translatedError(error.message), true);
    }
  }

  async function confirmPayment(id) {
    if (!confirm("Have you verified that the transfer reached the account? The registration will be marked paid and a confirmation email will be sent.")) return;
    try {
      await request("/api/admin/course-payments", { method: "POST", body: { action: "confirm-payment", registrationId: Number(id) } });
      showToast("Payment confirmed and student email sent.");
      await load();
    } catch (error) { showToast(translatedError(error.message), true); }
  }

  async function toggleCoupon(id, active) {
    try {
      await request("/api/admin/course-finance", { method: "POST", body: { action: "toggle-coupon", couponId: Number(id), active: active === "true" } });
      showToast("Discount code updated.");
      await load();
    } catch (error) { showToast(translatedError(error.message), true); }
  }

  async function recordPayout(id) {
    const reference = prompt("Enter the transfer reference after you have paid this commission:");
    if (!reference || reference.trim().length < 3) return;
    try {
      await request("/api/admin/course-finance", { method: "POST", body: { action: "mark-commission-paid", registrationId: Number(id), reference: reference.trim() } });
      showToast("Affiliate payout recorded.");
      await load();
    } catch (error) { showToast(translatedError(error.message), true); }
  }

  async function saveCoupon(event) {
    event.preventDefault();
    const button = $("#af-save-coupon");
    button.disabled = true;
    try {
      await request("/api/admin/course-finance", { method: "POST", body: {
        action: "save-coupon",
        courseId: $("#af-coupon-course").value,
        code: $("#af-coupon-code").value.trim().toUpperCase(),
        discountPercent: Number($("#af-discount-percent").value),
        affiliateName: $("#af-affiliate-name").value.trim(),
        commissionPercent: Number($("#af-commission-percent").value),
        requiresPreviousEmail: $("#af-requires-alumni").checked
      }});
      event.currentTarget.reset();
      $("#af-commission-percent").value = "0";
      showToast("Discount code saved for this course only.");
      await load();
    } catch (error) { showToast(translatedError(error.message), true); }
    finally { button.disabled = false; }
  }

  function csvCell(raw) {
    let text = String(raw ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  }

  function exportReport() {
    if (!state) return;
    const headings = ["Course", "Registration ID", "Student", "Email", "Payment status", "List price (JOD)", "Discount (%)", "Discount amount (JOD)", "Amount after discount (JOD)", "Discount code", "Affiliate", "Commission rate (%)", "Commission (JOD)", "Academy net (JOD)", "Commission status"];
    const rows = (state.registrations || []).map((row) => [
      courseName(row.course_id), row.seat_number, row.full_name, row.email, statusName(row.payment_status),
      row.price_jod, row.discount_percent, row.discount_jod, netAfterDiscount(row), row.coupon_code,
      row.affiliate_name, row.commission_percent, row.commission_jod, academyNet(row), statusName(row.commission_status)
    ]);
    const csv = "\uFEFF" + [headings, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    anchor.download = "7z-academy-finance.csv";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 0);
  }

  function selectSection(tab) {
    const next = tab.dataset.afTab;
    if (!next) return;
    section = next;
    all("[data-af-tab]").forEach((item) => item.classList.toggle("is-active", item === tab));
    all("[data-af-view]").forEach((item) => { item.hidden = item.dataset.afView !== section; });
    $("#af-search").hidden = section !== "registrations";
  }

  $("#af-course-filter").addEventListener("change", () => { page = 1; load(); });
  $("#af-refresh").addEventListener("click", () => load());
  $("#af-export").addEventListener("click", exportReport);
  $("#af-search").addEventListener("input", renderRegistrationRows);
  $("#af-coupon-form").addEventListener("submit", saveCoupon);
  $("#af-prev").addEventListener("click", () => { if (page > 1) { page -= 1; load(); } });
  $("#af-next").addEventListener("click", () => { if (state && page < state.pagination.pages) { page += 1; load(); } });
  all("[data-af-tab]").forEach((tab) => tab.addEventListener("click", () => selectSection(tab)));
  panel.addEventListener("click", (event) => {
    const receipt = event.target.closest("[data-af-proof]");
    const confirmButton = event.target.closest("[data-af-confirm]");
    const coupon = event.target.closest("[data-af-coupon]");
    const payout = event.target.closest("[data-af-payout]");
    if (receipt) viewReceipt(receipt.dataset.afProof);
    if (confirmButton) confirmPayment(confirmButton.dataset.afConfirm);
    if (coupon) toggleCoupon(coupon.dataset.afCoupon, coupon.dataset.active);
    if (payout) recordPayout(payout.dataset.afPayout);
  });
  window.addEventListener("z7-admin-view-change", (event) => {
    if (event.detail?.view === "academy") scheduleLoad();
  });
  if (location.hash === "#academy") scheduleLoad();
})();