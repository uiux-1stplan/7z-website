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
      "أدخل مرجع تحويل العمولة بعد صرفها.": "This commission update is invalid.",
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
        <td><button class="button button-danger" data-af-delete-registration="${escape(row.id)}" data-af-delete-name="${escape(row.full_name)}" data-af-delete-status="${escape(row.payment_status)}">Remove student</button></td>
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
    const usage = new Map((state.couponSummary || []).map((row) => [String(row.course_id) + ":" + row.code, row]));
    $("#af-coupons-body").innerHTML = rows.map((coupon) => {
      const summary = usage.get(String(coupon.course_id) + ":" + coupon.code) || {};
      return '<tr><td>' + escape(courseName(coupon.course_id)) + '</td><td><strong>' + escape(coupon.code) +
        '</strong></td><td>' + Number(coupon.discount_percent) + '%</td><td>' + escape(coupon.affiliate_name || "—") +
        '</td><td>' + Number(coupon.commission_percent) + '%</td><td>' + Number(summary.uses || 0) +
        '</td><td class="amount">' + money(summary.discount_total) + '</td><td>' +
        (coupon.active ? '<span class="z7-af-status paid">Active</span>' : '<span class="z7-af-status">Inactive</span>') +
        '</td><td><div class="z7-af-controls"><button class="button button-secondary" data-af-edit-coupon="' + escape(coupon.id) +
        '">Edit</button><button class="button button-secondary" data-af-coupon="' + escape(coupon.id) +
        '" data-active="' + (coupon.active ? "false" : "true") + '">' + (coupon.active ? "Deactivate" : "Activate") +
        '</button><button class="button button-danger" data-af-delete-coupon="' + escape(coupon.id) + '">Delete</button></div></td></tr>';
    }).join("");
    const grouped = new Map();
    rows.filter((row) => row.affiliate_name).forEach((row) => {
      const key = String(row.course_id) + ":" + String(row.affiliate_name);
      if (!grouped.has(key)) grouped.set(key, { course_id: row.course_id, affiliate_name: row.affiliate_name, codes: [], rates: new Set() });
      const item = grouped.get(key);
      item.codes.push(row.code);
      item.rates.add(Number(row.commission_percent));
    });
    const affiliates = [...grouped.values()];
    $("#af-affiliate-directory").innerHTML = affiliates.map((item) =>
      '<tr><td>' + escape(courseName(item.course_id)) + '</td><td><strong>' + escape(item.affiliate_name) +
      '</strong></td><td>' + item.codes.length + '</td><td>' + [...item.rates].sort((a,b)=>a-b).map((rate)=>rate + "%").join(", ") +
      '</td><td><div class="z7-af-controls"><button class="button button-secondary" data-af-edit-affiliate="' + escape(item.affiliate_name) +
      '" data-course="' + escape(item.course_id) + '">Rename</button><button class="button button-danger" data-af-delete-affiliate="' +
      escape(item.affiliate_name) + '" data-course="' + escape(item.course_id) + '">Remove marketer</button></div></td></tr>'
    ).join("");
    $("#af-affiliate-empty").hidden = affiliates.length > 0;
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
      <td>${row.commission_status === "PAYABLE" ? `<button class="button button-secondary" data-af-payout="${escape(row.id)}">Mark paid</button>` : "—"}</td>
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
    const adjustments = (state.refundAdjustments || []).filter((row) => course === "all" || row.course_id === course);
    $("#af-refund-adjustments").innerHTML = adjustments.map((row) => `<tr>
      <td>${escape(courseName(row.course_id))}</td><td>#${escape(row.seat_number)}</td>
      <td class="amount">${money(row.list_price_jod)}</td><td class="amount">− ${money(row.discount_jod)}</td>
      <td class="amount"><strong>${money(row.refund_due_jod)}</strong></td><td class="amount">${money(row.commission_already_paid_jod)}</td>
      <td>${escape(row.refund_status)}</td><td>${escape(new Date(row.deleted_at).toLocaleDateString("en-JO"))}</td>
    </tr>`).join("");
    $("#af-refund-empty").hidden = adjustments.length > 0;
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
    if (!confirm("Mark this commission as paid in the accounting ledger? This only records your confirmation; it does not send money or use a transfer method.")) return;
    try {
      await request("/api/admin/course-finance", { method: "POST", body: { action: "mark-commission-paid", registrationId: Number(id) } });
      showToast("Commission marked paid in the ledger.");
      await load();
    } catch (error) { showToast(translatedError(error.message), true); }
  }

  async function deleteRegistration(id, name, paymentStatus) {
    const refundNote = paymentStatus === "PAID" ? " A refund adjustment will be created for the amount paid; no money will be sent." : "";
    if (!confirm("Remove " + name + " from active student records? Personal details and the uploaded receipt will be deleted. A non-identifying accounting snapshot will remain." + refundNote)) return;
    try {
      const result = await request("/api/admin/course-finance", { method: "POST", body: { action: "delete-registration", registrationId: Number(id) } });
      showToast(result.refundDue ? "Student removed. Refund liability added to reports." : "Student removed and personal details cleared.");
      await load();
    } catch (error) { showToast(translatedError(error.message), true); }
  }

  function editCoupon(id) {
    const coupon = (state?.coupons || []).find((row) => Number(row.id) === Number(id));
    if (!coupon) return;
    $("#af-coupon-id").value = coupon.id;
    $("#af-coupon-course").value = coupon.course_id;
    $("#af-coupon-code").value = coupon.code;
    $("#af-discount-percent").value = coupon.discount_percent;
    $("#af-affiliate-name").value = coupon.affiliate_name || "";
    $("#af-commission-percent").value = coupon.commission_percent;
    $("#af-requires-alumni").checked = Boolean(coupon.requires_previous_email);
    $("#af-save-coupon").textContent = "Update code";
    $("#af-cancel-coupon-edit").hidden = false;
    $("#af-coupon-form").scrollIntoView({ behavior: "smooth", block: "center" });
    $("#af-coupon-code").focus();
  }

  function cancelCouponEdit() {
    $("#af-coupon-form").reset();
    $("#af-coupon-id").value = "";
    $("#af-commission-percent").value = "0";
    $("#af-save-coupon").textContent = "Save code";
    $("#af-cancel-coupon-edit").hidden = true;
  }

  async function deleteCoupon(id) {
    if (!confirm("Delete this discount code? It will stop working for new checkouts; previous registrations and accounting remain unchanged.")) return;
    try {
      await request("/api/admin/course-finance", { method: "POST", body: { action: "delete-coupon", couponId: Number(id) } });
      showToast("Discount code deleted for future checkouts.");
      await load();
    } catch (error) { showToast(translatedError(error.message), true); }
  }

  async function editAffiliate(courseId, name) {
    const newName = prompt("Enter the marketer's new name:", name);
    if (!newName || newName.trim() === name) return;
    try {
      await request("/api/admin/course-finance", { method: "POST", body: { action: "edit-affiliate", courseId, affiliateName: name, newName: newName.trim() } });
      showToast("Marketer name updated on active codes; historical registrations are unchanged.");
      await load();
    } catch (error) { showToast(translatedError(error.message), true); }
  }

  async function deleteAffiliate(courseId, name) {
    if (!confirm("Remove " + name + " from " + courseName(courseId) + "? All active codes assigned to this marketer will stop working; historical records stay intact.")) return;
    try {
      await request("/api/admin/course-finance", { method: "POST", body: { action: "delete-affiliate", courseId, affiliateName: name } });
      showToast("Marketer removed and their active codes disabled.");
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
        couponId: $("#af-coupon-id").value ? Number($("#af-coupon-id").value) : null,
        courseId: $("#af-coupon-course").value,
        code: $("#af-coupon-code").value.trim().toUpperCase(),
        discountPercent: Number($("#af-discount-percent").value),
        affiliateName: $("#af-affiliate-name").value.trim(),
        commissionPercent: Number($("#af-commission-percent").value),
        requiresPreviousEmail: $("#af-requires-alumni").checked
      }});
      cancelCouponEdit();
      showToast("Discount code saved for this course only. Past registrations retain their saved values.");
      await load();
    } catch (error) { showToast(translatedError(error.message), true); }
    finally { button.disabled = false; }
  }

  function excelCell(value, style = 5) {
    return value === null || value === undefined ? null : { value, style };
  }

  function excelColumn(number) {
    let label = "";
    while (number > 0) {
      const remainder = (number - 1) % 26;
      label = String.fromCharCode(65 + remainder) + label;
      number = Math.floor((number - 1) / 26);
    }
    return label;
  }

  function excelDate(value) {
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? (time - Date.UTC(1899, 11, 30)) / 86400000 : null;
  }

  function excelXml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
    })[char]);
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function joinBytes(parts) {
    const length = parts.reduce((sum, part) => sum + part.length, 0);
    const joined = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) { joined.set(part, offset); offset += part.length; }
    return joined;
  }

  function zipWorkbook(entries) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let localOffset = 0;
    for (const [name, content] of Object.entries(entries)) {
      const filename = encoder.encode(name);
      const data = encoder.encode(content);
      const checksum = crc32(data);
      const local = new Uint8Array(30);
      const lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true);
      lv.setUint16(8, 0, true);
      lv.setUint32(14, checksum, true);
      lv.setUint32(18, data.length, true);
      lv.setUint32(22, data.length, true);
      lv.setUint16(26, filename.length, true);
      localParts.push(local, filename, data);

      const central = new Uint8Array(46);
      const cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint32(16, checksum, true);
      cv.setUint32(20, data.length, true);
      cv.setUint32(24, data.length, true);
      cv.setUint16(28, filename.length, true);
      cv.setUint32(42, localOffset, true);
      centralParts.push(central, filename);
      localOffset += local.length + filename.length + data.length;
    }
    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, Object.keys(entries).length, true);
    ev.setUint16(10, Object.keys(entries).length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, localOffset, true);
    return joinBytes([...localParts, ...centralParts, end]);
  }

  function excelStylesXml() {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<numFmts count="3"><numFmt numFmtId="164" formatCode="#,##0.000;[Red]-#,##0.000"/><numFmt numFmtId="165" formatCode="0&quot;%&quot;"/><numFmt numFmtId="166" formatCode="dd mmm yyyy hh:mm"/></numFmts>' +
      '<fonts count="4"><font><sz val="10"/><color rgb="FF1C2A3C"/><name val="Aptos"/></font><font><b/><sz val="17"/><color rgb="FFFFFFFF"/><name val="Aptos Display"/></font><font><i/><sz val="10"/><color rgb="FF607087"/><name val="Aptos"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font></fonts>' +
      '<fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF101B2B"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF365D95"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF0F7"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3F6FA"/><bgColor indexed="64"/></patternFill></fill></fills>' +
      '<borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFE1E7EF"/></left><right style="thin"><color rgb="FFE1E7EF"/></right><top/><bottom style="thin"><color rgb="FFE1E7EF"/></bottom><diagonal/></border><border><left/><right/><top/><bottom style="medium"><color rgb="FF7895BB"/></bottom><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="14">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="2" fillId="4" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="3" fillId="2" borderId="2" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>' +
      '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>' +
      '<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>' +
      '<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>' +
      '<xf numFmtId="164" fontId="0" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>' +
      '<xf numFmtId="165" fontId="0" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>' +
      '<xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>' +
      '<xf numFmtId="3" fontId="0" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>' +
      '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  }

  function excelSheetXml(sheet) {
    const rowCount = sheet.rows.length;
    const columnCount = Math.max(1, ...sheet.rows.map((row) => row.length));
    const lastCell = excelColumn(columnCount) + rowCount;
    const rowsXml = sheet.rows.map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const height = sheet.rowHeights?.[rowIndex];
      const cells = row.map((cell, columnIndex) => {
        if (!cell) return "";
        const ref = excelColumn(columnIndex + 1) + rowNumber;
        const style = Number.isInteger(cell.style) ? ' s="' + cell.style + '"' : "";
        if (typeof cell.value === "number" && Number.isFinite(cell.value)) {
          return '<c r="' + ref + '"' + style + '><v>' + cell.value + '</v></c>';
        }
        return '<c r="' + ref + '" t="inlineStr"' + style + '><is><t xml:space="preserve">' + excelXml(cell.value) + '</t></is></c>';
      }).join("");
      return '<row r="' + rowNumber + '"' + (height ? ' ht="' + height + '" customHeight="1"' : "") + '>' + cells + '</row>';
    }).join("");
    const columns = sheet.widths.map((width, index) => '<col min="' + (index + 1) + '" max="' + (index + 1) + '" width="' + width + '" customWidth="1"/>').join("");
    const pane = sheet.freezeRows ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="' + sheet.freezeRows + '" topLeftCell="A' + (sheet.freezeRows + 1) + '" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A' + (sheet.freezeRows + 1) + '" sqref="A' + (sheet.freezeRows + 1) + '"/></sheetView></sheetViews>' : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
    const mergeXml = sheet.merges?.length ? '<mergeCells count="' + sheet.merges.length + '">' + sheet.merges.map((range) => '<mergeCell ref="' + range + '"/>').join("") + '</mergeCells>' : "";
    const filterXml = sheet.filter ? '<autoFilter ref="' + sheet.filter + '"/>' : "";
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<dimension ref="A1:' + lastCell + '"/>' + pane + '<cols>' + columns + '</cols><sheetData>' + rowsXml + '</sheetData>' + filterXml + mergeXml + '</worksheet>';
  }

  function makeExcelWorkbook(sheets) {
    const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      sheets.map((_, index) => '<Override PartName="/xl/worksheets/sheet' + (index + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join("") +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>';
    const rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    const workbookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets.map((_, index) => '<Relationship Id="rId' + (index + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (index + 1) + '.xml"/>').join("") +
      '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    const workbookXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<bookViews><workbookView activeTab="0"/></bookViews><sheets>' +
      sheets.map((sheet, index) => '<sheet name="' + excelXml(sheet.name) + '" sheetId="' + (index + 1) + '" r:id="rId' + (index + 1) + '"/>').join("") +
      '</sheets><calcPr calcId="191029"/></workbook>';
    const entries = {
      "[Content_Types].xml": contentTypes,
      "_rels/.rels": rootRels,
      "xl/workbook.xml": workbookXml,
      "xl/_rels/workbook.xml.rels": workbookRels,
      "xl/styles.xml": excelStylesXml()
    };
    sheets.forEach((sheet, index) => { entries["xl/worksheets/sheet" + (index + 1) + ".xml"] = excelSheetXml(sheet); });
    return zipWorkbook(entries);
  }

  function makeFinanceReportSheets(allRows, courseFilter) {
    const selected = allRows.filter((row) => courseFilter === "all" || row.course_id === courseFilter);
    const paid = selected.filter((row) => row.payment_status === "PAID");
    const pending = selected.filter((row) => row.payment_status === "PENDING_REVIEW");
    const selectedCourses = (state.courseSummary || []).filter((row) => courseFilter === "all" || row.course_id === courseFilter);
    const selectedAffiliates = (state.commissionSummary || []).filter((row) => courseFilter === "all" || row.course_id === courseFilter);
    const selectedCodes = (state.couponSummary || []).filter((row) => courseFilter === "all" || row.course_id === courseFilter);
    const adjustments = (state.refundAdjustments || []).filter((row) => courseFilter === "all" || row.course_id === courseFilter);
    const sum = (rows, key) => rows.reduce((total, row) => total + Number(row[key] || 0), 0);
    const currency = (value, alternate = false) => excelCell(Number(value || 0), alternate ? 10 : 6);
    const count = (value, alternate = false) => excelCell(Number(value || 0), alternate ? 13 : 12);
    const percent = (value, alternate = false) => excelCell(Number(value || 0), alternate ? 11 : 7);
    const textCell = (value, alternate = false) => excelCell(String(value ?? "—"), alternate ? 9 : 5);
    const title = (label, cols, style) => [excelCell(label, style), ...Array(cols - 1).fill(null)];

    const summaryRows = [
      title("7Z MAGIC  |  ACADEMY FINANCE", 10, 1),
      title("Financial reconciliation · All amounts in JOD · Filter: " + (courseFilter === "all" ? "All courses" : courseName(courseFilter)) + " · Generated " + new Date().toLocaleString("en-JO"), 10, 2),
      Array(10).fill(null),
      title("Executive overview", 10, 3),
      ["Metric","Value","Metric","Value","Metric","Value","Metric","Value","Metric","Value"].map((value) => excelCell(value,4)),
      [
        textCell("Registrations"), count(selected.length), textCell("Paid"), count(paid.length),
        textCell("Pending review"), count(pending.length), textCell("Collected after discount"), currency(sum(paid.map((row)=>({net:netAfterDiscount(row)})),"net")),
        textCell("Commission due"), currency(sum(paid.filter((row)=>row.commission_status==="PAYABLE"),"commission_jod"))
      ],
      [
        textCell("List value"), currency(sum(paid,"price_jod")), textCell("Discounts"), currency(sum(paid,"discount_jod")),
        textCell("Commission earned"), currency(sum(paid,"commission_jod")), textCell("Commission recorded paid"), currency(sum(paid.filter((row)=>row.commission_status==="PAID"),"commission_jod")),
        textCell("Academy net"), currency(paid.reduce((total,row)=>total+academyNet(row),0))
      ],
      Array(10).fill(null),
      title("Course reconciliation", 10, 3),
      ["Course","Registrations","Awaiting review","Paid","List value (JOD)","Discounts (JOD)","Collected (JOD)","Commission (JOD)","Commission due (JOD)","Academy net (JOD)"].map((value)=>excelCell(value,4))
    ];
    selectedCourses.forEach((row,index)=>{
      const alt=index%2===1;
      summaryRows.push([
        textCell(courseName(row.course_id),alt),count(row.registrations,alt),count(row.pending_payments,alt),count(row.paid_registrations,alt),
        currency(row.paid_list_value,alt),currency(row.discounts_applied,alt),currency(row.net_collected,alt),
        currency(row.commission_total,alt),currency(row.commission_payable,alt),currency(row.academy_net,alt)
      ]);
    });
    summaryRows.push(Array(10).fill(null), title("Affiliate reconciliation",10,3));
    summaryRows.push(["Course","Affiliate","Paid registrations","Collected after discount (JOD)","Commission earned (JOD)","Recorded paid (JOD)","Still due (JOD)","Academy net (JOD)"].map((value)=>excelCell(value,4)));
    selectedAffiliates.forEach((row,index)=>{
      const alt=index%2===1;
      summaryRows.push([
        textCell(courseName(row.course_id),alt),textCell(row.affiliate_name,alt),count(row.paid_registrations,alt),
        currency(row.paid_after_discount,alt),currency(row.commission_total,alt),currency(row.commission_paid,alt),
        currency(row.commission_payable,alt),currency(row.academy_net,alt)
      ]);
    });
    summaryRows.push(Array(10).fill(null), title("Discount code performance",10,3));
    summaryRows.push(["Course","Code","Uses","Discount total (JOD)","Commission total (JOD)"].map((value)=>excelCell(value,4)));
    selectedCodes.forEach((row,index)=>{
      const alt=index%2===1;
      summaryRows.push([textCell(courseName(row.course_id),alt),textCell(row.code,alt),count(row.uses,alt),currency(row.discount_total,alt),currency(row.commission_total,alt)]);
    });
    summaryRows.push(Array(10).fill(null), title("Removed registrations · Refund liabilities",10,3));
    summaryRows.push(["Course","Registration","List price (JOD)","Discount (JOD)","Amount after discount (JOD)","Refund due (JOD)","Commission already paid (JOD)","Status","Removed at"].map((value)=>excelCell(value,4)));
    adjustments.forEach((row,index)=>{
      const alt=index%2===1;
      summaryRows.push([
        textCell(courseName(row.course_id),alt),count(row.seat_number,alt),currency(row.list_price_jod,alt),currency(row.discount_jod,alt),
        currency(row.amount_after_discount_jod,alt),currency(row.refund_due_jod,alt),currency(row.commission_already_paid_jod,alt),
        textCell(row.refund_status,alt),excelCell(excelDate(row.deleted_at),alt?9:8)
      ]);
    });

    const detailRows=[
      title("7Z MAGIC  |  REGISTRATION DETAIL",16,1),
      title("All active registrations for " + (courseFilter==="all"?"all courses":courseName(courseFilter)) + " · Amounts in JOD · Generated " + new Date().toLocaleString("en-JO"),16,2),
      Array(16).fill(null),
      ["Course","Registration #","Student","Email","Payment status","List price (JOD)","Discount (%)","Discount (JOD)","After discount (JOD)","Discount code","Affiliate","Commission (%)","Commission (JOD)","Academy net (JOD)","Commission status","Registered at"].map((value)=>excelCell(value,4))
    ];
    selected.forEach((row,index)=>{
      const alt=index%2===1;
      detailRows.push([
        textCell(courseName(row.course_id),alt),count(row.seat_number,alt),textCell(row.full_name,alt),textCell(row.email,alt),
        textCell(statusName(row.payment_status),alt),currency(row.price_jod,alt),percent(row.discount_percent,alt),currency(row.discount_jod,alt),
        currency(netAfterDiscount(row),alt),textCell(row.coupon_code||"—",alt),textCell(row.affiliate_name||"No affiliate",alt),
        percent(row.commission_percent,alt),currency(row.commission_jod,alt),currency(academyNet(row),alt),
        textCell(statusName(row.commission_status),alt),excelCell(excelDate(row.created_at),alt?9:8)
      ]);
    });

    const adjustmentRows=[
      title("7Z MAGIC  |  ACCOUNTING ADJUSTMENTS",9,1),
      title("Non-identifying records retained for reconciliation · No refund is issued from this report · Amounts in JOD",9,2),
      Array(9).fill(null),
      ["Course","Registration #","List price (JOD)","Discount (JOD)","Amount after discount (JOD)","Refund due (JOD)","Commission already paid (JOD)","Refund status","Removed at"].map((value)=>excelCell(value,4))
    ];
    adjustments.forEach((row,index)=>{
      const alt=index%2===1;
      adjustmentRows.push([
        textCell(courseName(row.course_id),alt),count(row.seat_number,alt),currency(row.list_price_jod,alt),currency(row.discount_jod,alt),
        currency(row.amount_after_discount_jod,alt),currency(row.refund_due_jod,alt),currency(row.commission_already_paid_jod,alt),
        textCell(row.refund_status,alt),excelCell(excelDate(row.deleted_at),alt?9:8)
      ]);
    });

    return [
      {name:"Summary",rows:summaryRows,widths:[28,18,24,18,22,18,28,20,25,20],rowHeights:{0:32,1:24},merges:["A1:J1","A2:J2"]},
      {name:"Registrations",rows:detailRows,widths:[28,15,27,34,21,18,14,18,23,18,24,16,19,20,28,23],rowHeights:{0:32,1:24},merges:["A1:P1","A2:P2"],freezeRows:4,filter:"A4:P"+detailRows.length},
      {name:"Adjustments",rows:adjustmentRows,widths:[28,15,18,18,25,18,27,23,23],rowHeights:{0:32,1:24},merges:["A1:I1","A2:I2"],freezeRows:4,filter:"A4:I"+adjustmentRows.length}
    ];
  }

  async function exportReport() {
    if (!state) return;
    const button = $("#af-export");
    if (button.disabled) return;
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = "Building Excel report…";
    try {
      const course = $("#af-course-filter").value;
      const allRows = [...(state.registrations || [])];
      const pages = Number(state.pagination?.pages || 1);
      for (let nextPage = 2; nextPage <= pages; nextPage += 1) {
        const pageData = await request("/api/admin/course-finance?course=" + encodeURIComponent(course) + "&page=" + nextPage);
        allRows.push(...(pageData.registrations || []));
      }
      const sheets = makeFinanceReportSheets(allRows, course);
      const workbook = makeExcelWorkbook(sheets);
      const file = new Blob([workbook], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(file);
      const date = new Date().toISOString().slice(0, 10);
      anchor.download = "7z-academy-finance-" + (course === "all" ? "all-courses" : course) + "-" + date + ".xlsx";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
      showToast("Excel workbook downloaded · " + allRows.length + " registrations across " + sheets.length + " sheets.");
    } catch (error) {
      showToast(translatedError(error.message), true);
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
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
  $("#af-cancel-coupon-edit").addEventListener("click", cancelCouponEdit);
  $("#af-prev").addEventListener("click", () => { if (page > 1) { page -= 1; load(); } });
  $("#af-next").addEventListener("click", () => { if (state && page < state.pagination.pages) { page += 1; load(); } });
  all("[data-af-tab]").forEach((tab) => tab.addEventListener("click", () => selectSection(tab)));
  panel.addEventListener("click", (event) => {
    const receipt = event.target.closest("[data-af-proof]");
    const confirmButton = event.target.closest("[data-af-confirm]");
    const coupon = event.target.closest("[data-af-coupon]");
    const payout = event.target.closest("[data-af-payout]");
    const removeStudent = event.target.closest("[data-af-delete-registration]");
    const editCode = event.target.closest("[data-af-edit-coupon]");
    const deleteCode = event.target.closest("[data-af-delete-coupon]");
    const editMarketer = event.target.closest("[data-af-edit-affiliate]");
    const deleteMarketer = event.target.closest("[data-af-delete-affiliate]");
    if (receipt) viewReceipt(receipt.dataset.afProof);
    if (confirmButton) confirmPayment(confirmButton.dataset.afConfirm);
    if (coupon) toggleCoupon(coupon.dataset.afCoupon, coupon.dataset.active);
    if (payout) recordPayout(payout.dataset.afPayout);
    if (removeStudent) deleteRegistration(removeStudent.dataset.afDeleteRegistration, removeStudent.dataset.afDeleteName, removeStudent.dataset.afDeleteStatus);
    if (editCode) editCoupon(editCode.dataset.afEditCoupon);
    if (deleteCode) deleteCoupon(deleteCode.dataset.afDeleteCoupon);
    if (editMarketer) editAffiliate(editMarketer.dataset.course, editMarketer.dataset.afEditAffiliate);
    if (deleteMarketer) deleteAffiliate(deleteMarketer.dataset.course, deleteMarketer.dataset.afDeleteAffiliate);
  });
  window.addEventListener("z7-admin-view-change", (event) => {
    if (event.detail?.view === "academy") scheduleLoad();
  });
  if (location.hash === "#academy") scheduleLoad();
})();