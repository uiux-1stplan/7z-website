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
    const registrations = state.registrations || [];
    const affiliates = state.affiliates || [];
    const codes = state.codes || [];
    const money = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
    const paid = (row) => ["PAID","APPROVED","VERIFIED"].includes(String(row.payment_status || "").toUpperCase());
    const xml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&apos;" }[c]));
    const cell = (value, style = 0) => ({ v:value, s:style });
    const formula = (value, expression, style = 0) => ({ v:value, f:expression, s:style });
    const sales = [
      [cell("7Z Magic Academy — Financial & Accounting Report",1)],
      ["Student","Email","Phone","Course","Submitted","Payment status","Method","Reference","Promo code","Affiliate","Gross JOD","Discount JOD","Net due JOD","Commission JOD","Commission status","Receipt"].map((v) => cell(v,2))
    ];
    registrations.forEach((row, index) => {
      const n = index + 3;
      const alt = index % 2 ? 3 : 0;
      sales.push([
        cell(row.full_name,alt),cell(row.email,alt),cell(row.phone,alt),cell(row.course_id,alt),cell(row.created_at ? new Date(row.created_at).toISOString() : "",alt),
        cell(String(row.payment_status || "PENDING_REVIEW").toUpperCase(),alt),cell(row.payment_provider || "",alt),cell(row.payment_reference || "",alt),cell(row.coupon_code || "",alt),cell(row.affiliate_name || "",alt),
        cell(money(row.price_jod),index%2?5:4),cell(money(row.discount_jod),index%2?5:4),
        formula(Math.max(0,money(row.price_jod)-money(row.discount_jod)),"MAX(0,K"+n+"-L"+n+")",index%2?5:4),
        cell(money(row.commission_jod),index%2?5:4),cell(row.commission_status || "",alt),cell(row.payment_proof_pathname ? "Attached" : "Not attached",alt)
      ]);
    });
    const affiliateRows = [
      [cell("7Z Magic Academy — Affiliate Performance",1)],
      ["Affiliate","Email","Company","Status","Codes","Registrations","Verified gross JOD","Verified discounts JOD","Verified commission JOD","Academy net JOD"].map((v)=>cell(v,2))
    ];
    affiliates.forEach((a,index)=>{
      const n=index+3, alt=index%2?3:0, name=String(a.name||"");
      const verifiedGross='SUMIFS(Sales!$K$3:$K$10000,Sales!$J$3:$J$10000,A'+n+',Sales!$F$3:$F$10000,"PAID")+SUMIFS(Sales!$K$3:$K$10000,Sales!$J$3:$J$10000,A'+n+',Sales!$F$3:$F$10000,"APPROVED")+SUMIFS(Sales!$K$3:$K$10000,Sales!$J$3:$J$10000,A'+n+',Sales!$F$3:$F$10000,"VERIFIED")';
      const verifiedDiscount='SUMIFS(Sales!$L$3:$L$10000,Sales!$J$3:$J$10000,A'+n+',Sales!$F$3:$F$10000,"PAID")+SUMIFS(Sales!$L$3:$L$10000,Sales!$J$3:$J$10000,A'+n+',Sales!$F$3:$F$10000,"APPROVED")+SUMIFS(Sales!$L$3:$L$10000,Sales!$J$3:$J$10000,A'+n+',Sales!$F$3:$F$10000,"VERIFIED")';
      const verifiedCommission='SUMIFS(Sales!$N$3:$N$10000,Sales!$J$3:$J$10000,A'+n+',Sales!$F$3:$F$10000,"PAID")+SUMIFS(Sales!$N$3:$N$10000,Sales!$J$3:$J$10000,A'+n+',Sales!$F$3:$F$10000,"APPROVED")+SUMIFS(Sales!$N$3:$N$10000,Sales!$J$3:$J$10000,A'+n+',Sales!$F$3:$F$10000,"VERIFIED")';
      const sumFor = (prop) => registrations.filter((r)=>paid(r)&&String(r.affiliate_name||"")===name).reduce((sum,r)=>sum+money(r[prop]),0);
      const gross=sumFor("price_jod"), discount=sumFor("discount_jod"), commission=sumFor("commission_jod");
      affiliateRows.push([
        cell(a.name,alt),cell(a.email||"",alt),cell(a.company||"",alt),cell(a.status||"",alt),
        formula(Number(a.code_count||0),'COUNTIF(\'Promo Codes\'!$B$3:$B$10000,A'+n+')',alt),
        formula(Number(a.registration_count||0),'COUNTIF(Sales!$J$3:$J$10000,A'+n+')',alt),
        formula(gross,verifiedGross,index%2?5:4),formula(discount,verifiedDiscount,index%2?5:4),formula(commission,verifiedCommission,index%2?5:4),
        formula(Math.max(0,gross-discount-commission),"MAX(0,G"+n+"-H"+n+"-I"+n+")",index%2?5:4)
      ]);
    });
    const codeRows = [
      [cell("7Z Magic Academy — Promo Code Economics",1)],
      ["Code","Affiliate","Code type","Course","Discount %","Commission %","Uses","Verified discounts JOD","Verified commissions JOD","Academy net JOD"].map((v)=>cell(v,2))
    ];
    codes.forEach((c,index)=>{
      const n=index+3, alt=index%2?3:0, code=String(c.code||"");
      const rows=registrations.filter((r)=>String(r.coupon_code||"").toUpperCase()===code.toUpperCase());
      const paidRows=rows.filter(paid);
      const disc=paidRows.reduce((s,r)=>s+money(r.discount_jod),0);
      const comm=paidRows.reduce((s,r)=>s+money(r.commission_jod),0);
      const net=paidRows.reduce((s,r)=>s+Math.max(0,money(r.price_jod)-money(r.discount_jod)-money(r.commission_jod)),0);
      codeRows.push([
        cell(code,alt),cell(c.affiliate_name||"Studio",alt),cell(c.affiliate_id?"Affiliate":"General",alt),cell(c.course_id==="all"?"All courses":c.course_id,alt),
        cell(Number(c.discount_percent||0)/100,index%2?7:6),cell(Number(c.commission_percent||0)/100,index%2?7:6),
        formula(rows.length,'COUNTIF(Sales!$I$3:$I$10000,A'+n+')',alt),
        formula(disc,'SUMIFS(Sales!$L$3:$L$10000,Sales!$I$3:$I$10000,A'+n+',Sales!$F$3:$F$10000,"PAID")+SUMIFS(Sales!$L$3:$L$10000,Sales!$I$3:$I$10000,A'+n+',Sales!$F$3:$F$10000,"APPROVED")+SUMIFS(Sales!$L$3:$L$10000,Sales!$I$3:$I$10000,A'+n+',Sales!$F$3:$F$10000,"VERIFIED")',index%2?5:4),
        formula(comm,'SUMIFS(Sales!$N$3:$N$10000,Sales!$I$3:$I$10000,A'+n+',Sales!$F$3:$F$10000,"PAID")+SUMIFS(Sales!$N$3:$N$10000,Sales!$I$3:$I$10000,A'+n+',Sales!$F$3:$F$10000,"APPROVED")+SUMIFS(Sales!$N$3:$N$10000,Sales!$I$3:$I$10000,A'+n+',Sales!$F$3:$F$10000,"VERIFIED")',index%2?5:4),
        formula(net,'SUMIFS(Sales!$M$3:$M$10000,Sales!$I$3:$I$10000,A'+n+',Sales!$F$3:$F$10000,"PAID")+SUMIFS(Sales!$M$3:$M$10000,Sales!$I$3:$I$10000,A'+n+',Sales!$F$3:$F$10000,"APPROVED")+SUMIFS(Sales!$M$3:$M$10000,Sales!$I$3:$I$10000,A'+n+',Sales!$F$3:$F$10000,"VERIFIED")-I'+n,index%2?5:4)
      ]);
    });
    const lastSales=Math.max(3,sales.length);
    const summary=[
      [cell("7Z Magic Academy - Financial & Accounting Report",1)],
      [cell("Generated in Amman",2),cell(new Date().toLocaleString("en-US",{timeZone:"Asia/Amman"}),0)],
      [cell("Metric",2),cell("Value (JOD)",2)],
      [cell("Gross registrations — all statuses",0),formula(registrations.reduce((s,r)=>s+money(r.price_jod),0),"SUM(Sales!K3:K"+lastSales+")",8)],
      [cell("Verified discounts granted",3),formula(registrations.filter(paid).reduce((s,r)=>s+money(r.discount_jod),0),'SUMIF(Sales!F3:F'+lastSales+',"PAID",Sales!L3:L'+lastSales+')+SUMIF(Sales!F3:F'+lastSales+',"APPROVED",Sales!L3:L'+lastSales+')+SUMIF(Sales!F3:F'+lastSales+',"VERIFIED",Sales!L3:L'+lastSales+')',8)],
      [cell("Verified net collected",3),formula(registrations.filter(paid).reduce((s,r)=>s+Math.max(0,money(r.price_jod)-money(r.discount_jod)),0),'SUMIF(Sales!F3:F'+lastSales+',"PAID",Sales!M3:M'+lastSales+')+SUMIF(Sales!F3:F'+lastSales+',"APPROVED",Sales!M3:M'+lastSales+')+SUMIF(Sales!F3:F'+lastSales+',"VERIFIED",Sales!M3:M'+lastSales+')',8)],
      [cell("Verified affiliate commissions",3),formula(registrations.filter(paid).reduce((s,r)=>s+money(r.commission_jod),0),'SUMIF(Sales!F3:F'+lastSales+',"PAID",Sales!N3:N'+lastSales+')+SUMIF(Sales!F3:F'+lastSales+',"APPROVED",Sales!N3:N'+lastSales+')+SUMIF(Sales!F3:F'+lastSales+',"VERIFIED",Sales!N3:N'+lastSales+')',8)],
      [cell("Academy net after affiliate commission",3),formula(registrations.filter(paid).reduce((s,r)=>s+Math.max(0,money(r.price_jod)-money(r.discount_jod)-money(r.commission_jod)),0),"MAX(0,B6-B7)",8)],
      [cell("Pending registrations",0),formula(registrations.filter((r)=>!paid(r)&&!["REJECTED","CANCELLED"].includes(String(r.payment_status||"").toUpperCase())).length,'COUNTIF(Sales!F3:F'+lastSales+',"PENDING_REVIEW")',0)],
      [cell("Formula notes",2)],
      [cell("Net due = gross less student discount. Affiliate and promo sheets use verified payment rows only.",0)]
    ];
    const sheets=[{name:"Summary",rows:summary,widths:[44,25]},{name:"Sales",rows:sales,widths:[26,30,18,25,23,19,18,24,20,24,16,17,16,19,22,18]},{name:"Affiliates",rows:affiliateRows,widths:[24,30,22,14,12,16,22,24,25,20]},{name:"Promo Codes",rows:codeRows,widths:[18,24,16,24,15,17,12,24,25,20]}];
    const colName=(number)=>{let n=number+1,out="";while(n){const rem=(n-1)%26;out=String.fromCharCode(65+rem)+out;n=Math.floor((n-1)/26);}return out;};
    const encode=new TextEncoder();
    const worksheet=(sheet)=>{
      const maxCols=Math.max(1,...sheet.rows.map((r)=>r.length));
      const maxRow=Math.max(1,sheet.rows.length);
      const colXml='<cols>'+sheet.widths.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join("")+'</cols>';
      const rowsXml=sheet.rows.map((row,ri)=>{
        const rowNum=ri+1;
        const cells=row.map((raw,ci)=>{
          const c=raw&&typeof raw==="object"&&Object.prototype.hasOwnProperty.call(raw,"v")?raw:{v:raw,s:0};
          const ref=colName(ci)+rowNum,style=Number(c.s||0),attr=' r="'+ref+'" s="'+style+'"';
          if(c.f)return '<c'+attr+'><f>'+xml(c.f)+'</f><v>'+xml(c.v??0)+'</v></c>';
          if(typeof c.v==="number"&&Number.isFinite(c.v))return '<c'+attr+'><v>'+c.v+'</v></c>';
          return '<c'+attr+' t="inlineStr"><is><t xml:space="preserve">'+xml(c.v??"")+'</t></is></c>';
        }).join("");
        return '<row r="'+rowNum+'"'+(ri===0?' ht="30" customHeight="1"':"")+'>'+cells+'</row>';
      }).join("");
      const filter=sheet.name==="Summary"?"":'<autoFilter ref="A2:'+colName(maxCols-1)+maxRow+'"/>';
      return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"><pane ySplit="2" topLeftCell="A3" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="21"/>'+colXml+'<sheetData>'+rowsXml+'</sheetData>'+filter+'<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/></worksheet>';
    };
    const contentTypes='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join("")+'</Types>';
    const rootRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    const workbook='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>'+sheets.map((s,i)=>'<sheet name="'+xml(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join("")+'</sheets><calcPr calcId="191029" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>';
    const workbookRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join("")+'<Relationship Id="rId'+(sheets.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.000 &quot;JOD&quot;;[Red]-#,##0.000 &quot;JOD&quot;"/><numFmt numFmtId="165" formatCode="0.0%"/></numFmts><fonts count="3"><font><sz val="10"/><name val="Aptos"/></font><font><b/><sz val="15"/><color rgb="FFFFFFFF"/><name val="Aptos Display"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF182238"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF334A72"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF0F3FA"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD9E1F0"/></left><right style="thin"><color rgb="FFD9E1F0"/></right><top style="thin"><color rgb="FFD9E1F0"/></top><bottom style="thin"><color rgb="FFD9E1F0"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="9"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0"/><xf numFmtId="164" fontId="0" fillId="4" borderId="1" xfId="0"/><xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0"/><xf numFmtId="165" fontId="0" fillId="4" borderId="1" xfId="0"/><xf numFmtId="164" fontId="2" fillId="3" borderId="1" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
    const files=[["[Content_Types].xml",contentTypes],["_rels/.rels",rootRels],["xl/workbook.xml",workbook],["xl/_rels/workbook.xml.rels",workbookRels],["xl/styles.xml",styles]];
    sheets.forEach((sheet,i)=>files.push(["xl/worksheets/sheet"+(i+1)+".xml",worksheet(sheet)]));
    const crcTable=new Uint32Array(256);
    for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);crcTable[n]=c>>>0;}
    const crc32=(data)=>{let c=0xffffffff;for(let i=0;i<data.length;i++)c=crcTable[(c^data[i])&255]^(c>>>8);return(c^0xffffffff)>>>0;};
    const u16=(v)=>new Uint8Array([v&255,(v>>>8)&255]);
    const u32=(v)=>new Uint8Array([v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255]);
    const join=(parts)=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const part of parts){out.set(part,at);at+=part.length;}return out;};
    const locals=[],centrals=[];let offset=0;
    for(const [name,text] of files){
      const nameBytes=encode.encode(name),data=encode.encode(text),crc=crc32(data);
      const local=join([u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(nameBytes.length),u16(0),nameBytes,data]);
      locals.push(local);
      const central=join([u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(nameBytes.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),nameBytes]);
      centrals.push(central);offset+=local.length;
    }
    const centralBytes=join(centrals);
    const end=join([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(centralBytes.length),u32(offset),u16(0)]);
    const blob=new Blob([join(locals),centralBytes,end],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    const url=URL.createObjectURL(blob),link=document.createElement("a");
    link.href=url;link.download="7Z-Magic-Academy-Financial-Accounting-"+new Date().toISOString().slice(0,10)+".xlsx";
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    notify("Professional .xlsx report exported with formulas across Summary, Sales, Affiliates and Promo Codes.");
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
