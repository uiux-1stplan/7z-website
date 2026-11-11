(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const titles = {
    overview: ["7Z MAGIC / OVERVIEW", "Studio overview", "A live view of your client and academy workspace."],
    users: ["CLIENT DIRECTORY / ACCESS CONTROL", "Users", "Invite, organize and protect access to private project spaces."],
    files: ["CLIENT DELIVERY / PRIVATE STORAGE", "Client files", "Organize protected deliverables and manage account permissions."],
    orders: ["ACADEMY / COURSE COMMERCE", "Courses & partners", "Manage affiliates, promo codes and course offers."],
    registrations: ["ACADEMY / PAYMENT REVIEW", "Registrations & Payments", "Review registration records, payment submissions and approvals."],
    analytics: ["ACADEMY / BUSINESS INTELLIGENCE", "Analytics & Accounting", "Financial and enrollment signals from recorded course activity."],
    settings: ["STUDIO CONTROL / PREFERENCES", "Settings", "Workspace appearance, session security and course destinations."],
  };
  const months = new Intl.DateTimeFormat("en", { month: "short" });
  let initialized = false;
  let frame = 0;

  function selectView(name, animate = true) {
    if (!titles[name]) return;
    const current = $(`[data-dashboard-panel].is-active`);
    const next = $(`[data-dashboard-panel="${name}"]`);
    if (!next || current === next) return;
    if (current) {
      current.classList.remove("is-active");
      current.setAttribute("aria-hidden", "true");
      current.hidden = true;
    }
    next.hidden = false;
    next.setAttribute("aria-hidden", "false");
    next.classList.add("is-active");
    $$("[data-dashboard-nav]").forEach((button) => {
      const active = button.dataset.dashboardNav === name;
      button.classList.toggle("active", active);
      if (button.closest(".dashboard-nav")) {
        if (active) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
      }
    });
    const pageKicker = $("#admin-page-kicker");
    const pageTitle = $("#admin-page-title");
    const pageSubtitle = $("#admin-page-subtitle");
    if (pageKicker) pageKicker.textContent = titles[name][0];
    if (pageTitle) pageTitle.textContent = titles[name][1];
    if (pageSubtitle) pageSubtitle.textContent = titles[name][2];
    if (animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      next.animate([{ opacity: 0, transform: "translateY(9px)" }, { opacity: 1, transform: "translateY(0)" }], {
        duration: 250,
        easing: "cubic-bezier(.2,.8,.2,1)",
      });
    }
  }

  function parseMoney(value) {
    const number = Number(String(value || "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(number) ? number : 0;
  }

  function registrations() {
    return $$("#accounting-body tr").map((row) => {
      const status = $(".engine-status", row.cells[6] || row);
      const dateText = row.cells[2]?.textContent.trim() || "";
      const parsedDate = Date.parse(dateText);
      return {
        id: row.dataset.registrationId || "",
        name: $(".engine-user strong", row)?.textContent.trim() || "Student",
        course: row.cells[1]?.textContent.trim() || "Course registration",
        dateText,
        date: Number.isNaN(parsedDate) ? null : new Date(parsedDate),
        due: parseMoney(row.cells[4]?.textContent),
        paid: status?.classList.contains("is-active") || /verified|paid|complete/i.test(status?.textContent || ""),
        pending: status?.classList.contains("is-pending"),
        status: status?.textContent.trim() || "Recorded",
      };
    });
  }

  function money(value, withCurrency = false) {
    const amount = Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return withCurrency ? `${amount} JOD` : amount;
  }

  function drawChart(prefix, rows) {
    const chart = $(`#${prefix}-revenue-chart`);
    const monthsData = [];
    const today = new Date();
    for (let offset = 5; offset >= 0; offset--) {
      const date = new Date(today.getFullYear(), today.getMonth() - offset, 1);
      monthsData.push({ year: date.getFullYear(), month: date.getMonth(), label: months.format(date), total: 0 });
    }
    rows.forEach((row) => {
      if (!row.paid || !row.date) return;
      const bucket = monthsData.find((item) => item.year === row.date.getFullYear() && item.month === row.date.getMonth());
      if (bucket) bucket.total += row.due;
    });
    const values = monthsData.map((item) => item.total);
    const max = Math.max(...values, 1);
    const x0 = 42;
    const x1 = 738;
    const y0 = 18;
    const y1 = 184;
    const points = values.map((value, index) => ({
      x: x0 + ((x1 - x0) / Math.max(values.length - 1, 1)) * index,
      y: y1 - ((y1 - y0) * value) / max,
      value,
    }));
    const line = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
    const area = `${line} L${x1} ${y1} L${x0} ${y1} Z`;
    const linePath = $(`#${prefix}-chart-line`);
    const areaPath = $(`#${prefix}-chart-area`);
    if (linePath) linePath.setAttribute("d", line);
    if (areaPath) areaPath.setAttribute("d", area);
    const pointGroup = $(`#${prefix}-chart-points`);
    if (pointGroup) {
      pointGroup.replaceChildren(...points.map((point) => {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", point.x.toFixed(1));
        circle.setAttribute("cy", point.y.toFixed(1));
        circle.setAttribute("r", point.value ? "4" : "2.5");
        circle.setAttribute("class", "chart-point");
        return circle;
      }));
    }
    const labels = $(`#${prefix}-chart-labels`);
    if (labels) labels.replaceChildren(...monthsData.map((item) => {
      const span = document.createElement("span");
      span.textContent = item.label;
      return span;
    }));
    const empty = $(`#${prefix}-chart-empty`);
    if (empty) empty.hidden = rows.some((row) => row.paid);
    if (chart) chart.setAttribute("aria-label", `Verified revenue for ${monthsData.map((item) => item.label).join(", ")}: ${values.map((value) => money(value, true)).join(", ")}`);
  }

  function renderCourseMix(rows) {
    const list = $("#analytics-course-mix");
    const empty = $("#analytics-mix-empty");
    if (!list) return;
    const totals = new Map();
    rows.forEach((row) => totals.set(row.course, (totals.get(row.course) || 0) + 1));
    const entries = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...entries.map((item) => item[1]));
    list.replaceChildren(...entries.map(([name, count], index) => {
      const item = document.createElement("div");
      item.className = "course-mix-item";
      const label = document.createElement("div");
      label.className = "course-mix-item__label";
      const title = document.createElement("strong");
      title.textContent = name;
      const value = document.createElement("span");
      value.textContent = `${count} ${count === 1 ? "registration" : "registrations"}`;
      label.append(title, value);
      const track = document.createElement("div");
      track.className = "course-mix-track";
      const fill = document.createElement("i");
      fill.style.width = `${Math.max(8, (count / max) * 100)}%`;
      fill.dataset.tone = String(index % 3);
      track.append(fill);
      item.append(label, track);
      return item;
    }));
    if (empty) empty.hidden = entries.length > 0;
  }

  function renderRecent(rows) {
    const list = $("#analytics-recent-activity");
    const empty = $("#analytics-activity-empty");
    if (!list) return;
    const recent = [...rows].sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0)).slice(0, 5);
    list.replaceChildren(...recent.map((row, index) => {
      const item = document.createElement("div");
      item.className = "activity-row";
      const icon = document.createElement("span");
      icon.className = `activity-index activity-index--${index % 3}`;
      icon.textContent = String(index + 1).padStart(2, "0");
      const detail = document.createElement("div");
      detail.className = "activity-detail";
      const name = document.createElement("strong");
      name.textContent = row.name;
      const course = document.createElement("span");
      course.textContent = row.course;
      detail.append(name, course);
      const status = document.createElement("span");
      status.className = `activity-status ${row.paid ? "is-paid" : row.pending ? "is-pending" : ""}`;
      status.textContent = row.status;
      const amount = document.createElement("strong");
      amount.className = "activity-amount";
      amount.textContent = money(row.due, true);
      item.append(icon, detail, status, amount);
      if (row.id) {
        const remove = document.createElement("button");
        remove.className = "activity-remove";
        remove.type = "button";
        remove.dataset.engineAction = "delete-registration";
        remove.dataset.id = row.id;
        remove.dataset.name = row.name;
        remove.setAttribute("aria-label", `Delete registration for ${row.name}`);
        remove.title = "Delete registration from the ledger";
        remove.textContent = "×";
        item.append(remove);
      }
      return item;
    }));
    if (empty) empty.hidden = recent.length > 0;
  }

  function refreshDashboard() {
    if (!$("#app") || $("#app").classList.contains("hidden")) return;
    const rows = registrations();
    const paidRows = rows.filter((row) => row.paid);
    const pendingRows = rows.filter((row) => row.pending);
    const revenue = parseMoney($("#finance-revenue")?.textContent);
    const gross = parseMoney($("#finance-gross")?.textContent);
    const commission = parseMoney($("#finance-commissions")?.textContent);
    const activeUsers = $("#stat-active")?.textContent.trim() || "0";
    const conversion = rows.length ? Math.round((paidRows.length / rows.length) * 100) : 0;

    $("#overview-revenue").textContent = money(revenue);
    $("#overview-active-users").textContent = activeUsers;
    $("#overview-orders").textContent = String(rows.length);
    $("#overview-pending").textContent = `${pendingRows.length} awaiting review`;
    $("#overview-conversion").textContent = `${conversion}%`;
    $("#overview-conversion-bar").style.width = `${conversion}%`;
    $("#overview-chart-total").innerHTML = `${money(revenue)} <small>JOD</small>`;
    $("#pulse-pending-count").textContent = `${pendingRows.length} ${pendingRows.length === 1 ? "order" : "orders"}`;
    $("#pulse-pending-copy").textContent = pendingRows.length ? "Payment submissions need a review." : "No payment reviews are waiting.";
    $("#analytics-revenue").innerHTML = $("#finance-revenue").innerHTML;
    $("#analytics-gross").innerHTML = $("#finance-gross").innerHTML;
    $("#analytics-commission").innerHTML = $("#finance-commissions").innerHTML;
    $("#analytics-conversion").textContent = `${conversion}%`;
    $("#overview-admin-name").textContent = $("#admin-name")?.textContent.trim() || "Admin";
    $("#settings-account-name").textContent = $("#admin-name")?.textContent.trim() || "Administrator";
    $("#settings-account-email").textContent = $("#admin-email")?.textContent.trim() || "Your 7Z Magic account is active in this session.";
    drawChart("overview", rows);
    drawChart("analytics", rows);
    renderCourseMix(rows);
    renderRecent(rows);
  }

  function setClock() {
    const clock = $("#overview-clock");
    if (clock) clock.textContent = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(new Date());
  }

  function filterUsers(query) {
    const normalized = query.trim().toLowerCase();
    $$("#users-body tr").forEach((row) => { row.hidden = Boolean(normalized) && !row.textContent.toLowerCase().includes(normalized); });
  }

  function initialize() {
    if (initialized || !$("#app")) return;
    initialized = true;
    $$("[data-dashboard-nav]").forEach((button) => button.addEventListener("click", () => {
      selectView(button.dataset.dashboardNav);
      if (button.hasAttribute("data-focus-create-user")) $("#create-name")?.focus({ preventScroll: true });
    }));
    $$("[data-focus-create-user]").forEach((button) => button.addEventListener("click", () => {
      selectView("users");
      window.setTimeout(() => $("#create-name")?.focus({ preventScroll: true }), 80);
    }));
    $("#admin-global-search")?.addEventListener("input", (event) => {
      const value = event.currentTarget.value;
      if (value.trim()) selectView("users", false);
      filterUsers(value);
    });
    const observed = ["#accounting-body", "#users-body", "#finance-revenue", "#finance-gross", "#finance-commissions", "#stat-active"];
    const observer = new MutationObserver(() => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { frame = 0; refreshDashboard(); });
    });
    observed.forEach((selector) => { const node = $(selector); if (node) observer.observe(node, { childList: true, subtree: true, characterData: true }); });
    const appObserver = new MutationObserver(refreshDashboard);
    appObserver.observe($("#app"), { attributes: true, attributeFilter: ["class"] });
    setClock();
    refreshDashboard();
  }

  document.addEventListener("z7:admin-ready", initialize);
  if (!$("#app")?.classList.contains("hidden")) initialize();
})();
