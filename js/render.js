/* =====================================================================
   RENDER — ginagawang HTML ang data
   ===================================================================== */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function esc(text) {
  return String(text == null ? "" : text).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------------- School settings ---------------- */
async function loadSettings() {
  try {
    const data = await api("/settings");
    SETTINGS = { ...DEFAULT_SETTINGS, ...data };
    if (!Array.isArray(SETTINGS.pollOptions) || SETTINGS.pollOptions.length < 2) {
      SETTINGS.pollOptions = [...DEFAULT_SETTINGS.pollOptions];
    }
  } catch (e) {
    SETTINGS = { ...DEFAULT_SETTINGS };
  }
  applySettings();
  return SETTINGS;
}

function applySettings() {
  const logo = $("#schoolLogo");
  if (logo) {
    logo.src = SETTINGS.logo || "logo.jpeg";
    logo.onerror = () => {
      logo.style.display = "none";
      const fb = $("#logoFallback");
      if (fb) fb.style.display = "grid";
    };
    logo.onload = () => {
      logo.style.display = "block";
      const fb = $("#logoFallback");
      if (fb) fb.style.display = "none";
    };
  }
  const setText = (sel, value) => { const el = $(sel); if (el) el.textContent = value; };
  setText("#schoolName", SETTINGS.schoolName);
  setText("#schoolTagline", SETTINGS.tagline || SETTINGS.shortName);
  setText("#footSchool", SETTINGS.shortName);
  setText("#footAddress", SETTINGS.address);
  setText("#footPhone", SETTINGS.phone);
  setText("#footEmail", SETTINGS.registrarEmail);
  setText("#footHours", SETTINGS.hours);
  setText("#contactAddress", SETTINGS.address);
  setText("#contactPhone", SETTINGS.phone);
  setText("#contactEmail", SETTINGS.registrarEmail);
  setText("#contactHours", SETTINGS.hours);
  const mail = $("#contactMail");
  if (mail) mail.href = "mailto:" + SETTINGS.registrarEmail;
  const tel = $("#contactTel");
  if (tel) tel.href = "tel:" + SETTINGS.phone.replace(/[^0-9+]/g, "");
  if (SETTINGS.shortName) document.title = SETTINGS.shortName + " · CVLIS Central";
  const brand = $("#brandLink");
  if (brand) brand.title = SETTINGS.shortName;
}

/* ---------------- Announcements ---------------- */
function announcementHTML(item) {
  const [month, day, title, text, tag, id] = item;
  return `
    <article class="ann clickable" onclick="openNewsModal(${Number(id)})" tabindex="0"
      onkeydown="if(event.key==='Enter')openNewsModal(${Number(id)})">
      <div class="dt"><small>${esc(month)}</small><b>${esc(day)}</b></div>
      <div class="t"><h3>${esc(title)}</h3><p>${esc(text)}</p></div>
      <span class="tag">${esc(tag)}</span>
      <span class="chev">›</span>
    </article>`;
}

function renderAnnouncements() {
  $$(".annList").forEach((box) => {
    const n = Number(box.dataset.n) || NEWS.length;
    box.innerHTML = NEWS.slice(0, n).map(announcementHTML).join("") ||
      '<p class="empty">No announcements yet.</p>';
  });
}

let newsQuery = "";
let newsTag = "All";

function renderNewsPage() {
  const box = $("#newsListAll");
  if (!box) return;
  const tags = ["All", ...Array.from(new Set(NEWS.map((n) => n[4])))];
  const filters = $("#newsFilters");
  if (filters && filters.dataset.count !== String(tags.length)) {
    filters.dataset.count = String(tags.length);
    filters.innerHTML = tags.map((t) =>
      `<button class="chip ${t === newsTag ? "on" : ""}" onclick="setNewsTag('${esc(t).replace(/'/g, "\\'")}')">${esc(t)}</button>`
    ).join("");
  } else if (filters) {
    filters.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c.textContent === newsTag));
  }

  const q = newsQuery.toLowerCase();
  const list = NEWS.filter((n) => {
    const matchesTag = newsTag === "All" || n[4] === newsTag;
    const matchesText = !q || [n[2], n[3], n[4], n[0]].join(" ").toLowerCase().includes(q);
    return matchesTag && matchesText;
  });
  const count = $("#newsCount");
  if (count) count.textContent = list.length + (list.length === 1 ? " announcement" : " announcements");
  box.innerHTML = list.map(announcementHTML).join("") ||
    '<div class="empty-state">🔍<b>No announcements found</b><span>Try a different word or tag.</span></div>';
}

function setNewsTag(tag) {
  newsTag = tag;
  renderNewsPage();
}

function openNewsModal(id) {
  const item = NEWS.find((n) => Number(n[5]) === Number(id));
  if (!item) return;
  openModal(
    '<span class="tag">' + esc(item[4]) + "</span> " + esc(item[2]),
    '<div class="modal-meta">📅 ' + esc(item[0]) + " " + esc(item[1]) + "</div>" +
    '<p class="modal-text">' + esc(item[3]) + "</p>" +
    '<div class="form-actions"><button onclick="closeModal();go(\'news\')">See all announcements</button></div>'
  );
}

/* ---------------- Events + calendar ---------------- */
function eventHTML(item) {
  const [month, day, title, place, time, id] = item;
  return `
    <article class="ev clickable" onclick="openEventModal(${Number(id)})" tabindex="0"
      onkeydown="if(event.key==='Enter')openEventModal(${Number(id)})">
      <div class="dt"><b>${esc(month)}<br>${esc(day)}</b></div>
      <div class="ev-main"><b>${esc(title)}</b><small>${esc(place)}${time ? " · " + esc(time) : ""}</small></div>
      <span class="chev">›</span>
    </article>`;
}

function renderEvents() {
  $$(".evList").forEach((box) => {
    const n = Number(box.dataset.n) || EVENTS.length;
    box.innerHTML = EVENTS.slice(0, n).map(eventHTML).join("") ||
      '<p class="empty">No events yet.</p>';
  });
  const all = $("#eventListAll");
  if (all) all.innerHTML = EVENTS.map(eventHTML).join("") || '<p class="empty">No events yet.</p>';
}

function openEventModal(id) {
  const item = EVENTS.find((e) => Number(e[5]) === Number(id));
  if (!item) return;
  openModal(esc(item[2]),
    '<div class="event-big-date"><b>' + esc(item[0]) + " " + esc(item[1]) + "</b><span>" + esc(item[3]) + "</span></div>" +
    (item[4] ? '<p class="modal-meta">🕒 ' + esc(item[4]) + "</p>" : "") +
    '<p class="modal-text">Mark your calendar. Details may be updated through school announcements — check the Announcements page before the event.</p>' +
    '<div class="form-actions"><button onclick="closeModal();go(\'events\')">See full calendar</button></div>');
}

let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();

function renderCalendar() {
  const grid = $("#calendarGrid");
  if (!grid) return;
  const label = $("#calLabel");
  if (label) label.textContent = MONTHS_FULL[calMonth] + " " + calYear;
  const first = new Date(calYear, calMonth, 1);
  const startDay = first.getDay();
  const days = new Date(calYear, calMonth + 1, 0).getDate();
  const prevDays = new Date(calYear, calMonth, 0).getDate();
  const today = new Date();

  const cells = [];
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  dow.forEach((d) => cells.push('<div class="cal-dow">' + d + "</div>"));

  for (let i = startDay - 1; i >= 0; i--) {
    cells.push('<div class="cal-day muted"><span>' + (prevDays - i) + "</span></div>");
  }
  for (let d = 1; d <= days; d++) {
    const evs = EVENTS.filter((e) => e[0] === MONTHS[calMonth] && Number(e[1]) === d);
    const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
    cells.push(
      '<div class="cal-day' + (isToday ? " today" : "") + (evs.length ? " has-ev" : "") +
      '" ' + (evs.length ? 'onclick="showDayEvents(' + d + ')" role="button" tabindex="0"' : "") + ">" +
      "<span>" + d + "</span>" +
      (evs.length ? '<i class="cal-dot"></i><small>' + evs.length + "</small>" : "") +
      "</div>"
    );
  }
  const rest = (7 - ((startDay + days) % 7)) % 7;
  for (let i = 1; i <= rest; i++) cells.push('<div class="cal-day muted"><span>' + i + "</span></div>");
  grid.innerHTML = cells.join("");
}

function shiftCalendar(delta) {
  calMonth += delta;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
}

function showDayEvents(day) {
  const evs = EVENTS.filter((e) => e[0] === MONTHS[calMonth] && Number(e[1]) === day);
  if (!evs.length) return;
  openModal(MONTHS_FULL[calMonth] + " " + day + ", " + calYear,
    evs.map((e) =>
      '<div class="day-event"><b>' + esc(e[2]) + "</b><small>" + esc(e[3]) + (e[4] ? " · " + esc(e[4]) : "") + "</small></div>"
    ).join(""));
}

/* ---------------- Enrollment ---------------- */
let enrollType = "new";
try { enrollType = localStorage.getItem("cvlis_enroll_type") || "new"; } catch (e) {}

function renderEnrollment() {
  $$(".enr").forEach((box) => {
    box.innerHTML = `
      <h3 style="font-size:1.5rem">Enrollment, step by step</h3>
      <p>For new, transferring, and returning Grade 7–12 students at CVLIS. Enrollment is done in person at the school.</p>
      ${ENROLL_PROCEDURE.slice(0, 3).map(([t, d], i) =>
        `<div class="step"><i>${i + 1}</i><div><b>${esc(t)}</b><br><span style="color:#c3cce0">${esc(d)}</span></div></div>`
      ).join("")}
      <button style="margin-top:14px" onclick="go('enroll')">Open the full enrollment guide</button>`;
  });
}

function checkedDocs() {
  try { return JSON.parse(localStorage.getItem("cvlis_enroll_check_" + enrollType) || "[]"); }
  catch (e) { return []; }
}

function saveCheckedDocs(list) {
  try { localStorage.setItem("cvlis_enroll_check_" + enrollType, JSON.stringify(list)); } catch (e) {}
}

function renderEnrollPage() {
  const box = $("#enrollPage");
  if (!box) return;
  const typeLabel = (STUDENT_TYPES.find(([k]) => k === enrollType) || STUDENT_TYPES[0])[1];
  const docs = ENROLL_DOCS.filter(([, , , types]) => types.length === 0 || types.includes(enrollType));
  const checked = checkedDocs();
  const checkedIds = docs.filter((d) => checked.includes(d[0])).length;
  const pct = docs.length ? Math.round((checkedIds / docs.length) * 100) : 0;

  box.innerHTML = `
    <div class="dark reveal" style="margin-bottom:24px">
      <h3 style="font-size:1.3rem;margin-bottom:6px">Enrollment is done in person</h3>
      <p style="margin:0">Students enroll at the school's registrar office. This website does not accept online enrollment. Follow the steps below and use the checklist so you don't miss a document.</p>
    </div>

    <div class="card reveal" style="margin-bottom:22px">
      <div class="row" style="align-items:center">
        <h3 style="font-size:1.2rem;margin:0">I am a…</h3>
        <span class="mono" style="font-size:.75rem;color:var(--mut)">Choose your student type</span>
      </div>
      <div class="type-switch" role="tablist">
        ${STUDENT_TYPES.map(([key, label]) =>
          `<button class="type-btn ${key === enrollType ? "on" : ""}" onclick="setEnrollType('${key}')">${esc(label)}</button>`
        ).join("")}
      </div>
      <p style="color:var(--mut);margin:14px 0 0">Showing requirements for <b>${esc(typeLabel)}</b>.</p>
    </div>

    <div class="card reveal" style="margin-bottom:24px">
      <h3 style="font-size:1.3rem;margin-bottom:6px">Requirements checklist</h3>
      <p style="color:var(--mut);margin-top:0">Tap each item once you have prepared it. Your progress is saved in this browser.</p>
      <div class="progress"><i style="width:${pct}%"></i></div>
      <div class="progress-label"><span id="enrollProgressText">${checkedIds} of ${docs.length} ready</span><b>${pct}%</b></div>
      <div class="checklist">
        ${docs.map(([id, name, hint]) => {
          const on = checked.includes(id);
          return `<label class="check ${on ? "on" : ""}">
            <input type="checkbox" ${on ? "checked" : ""} onchange="toggleEnrollDoc('${id}', this)">
            <span class="box">${on ? "✓" : ""}</span>
            <span class="check-text"><b>${esc(name)}</b><small>${esc(hint)}</small></span>
          </label>`;
        }).join("")}
      </div>
      <div class="form-actions" style="margin-top:16px">
        <button class="btn-secondary" onclick="resetEnrollChecklist()">Reset checklist</button>
        <button onclick="printEnrollChecklist()">Print checklist</button>
      </div>
    </div>

    <h3 style="font-size:1.3rem;margin:0 0 4px">Step-by-step procedure</h3>
    <p style="color:var(--mut);margin-top:0">Tap a step to read the details.</p>
    <div class="acc-group" style="margin-bottom:24px">
      ${ENROLL_PROCEDURE.map(([title, text], i) =>
        `<div class="acc ${i === 0 ? "open" : ""}">
          <button class="acc-head"><i>${i + 1}</i><span>${esc(title)}</span><b>+</b></button>
          <div class="acc-body"><p>${esc(text)}</p></div>
        </div>`
      ).join("")}
    </div>

    <div class="card reveal" style="margin:24px 0">
      <h3 style="font-size:1.15rem;margin-bottom:8px">Senior High School strands (Grade 11–12)</h3>
      <div class="chips">${SHS_STRANDS.map(([code, name]) => `<span class="tag" title="${esc(name)}">${esc(code)}</span>`).join("")}</div>
      <p style="color:var(--mut);font-size:.9rem;margin-bottom:0">${SHS_STRANDS.map(([code, name]) => `${esc(code)} – ${esc(name)}`).join(" · ")}</p>
    </div>

    <div class="card reveal">
      <h3 style="font-size:1.15rem;margin-bottom:8px">Where and when</h3>
      <p style="margin:0 0 6px"><b>Where:</b> ${esc(ENROLL_OFFICE)}</p>
      <p style="margin:0 0 14px"><b>Office hours:</b> ${esc(ENROLL_HOURS)}</p>
      <div class="btns" style="margin-top:0">
        <button onclick="go('staff')">Staff Directory</button>
        <button class="out" style="color:var(--ink)" onclick="go('news')">See announcements</button>
      </div>
    </div>`;

  initAccordion(box);
  initReveal();
}

function setEnrollType(key) {
  enrollType = key;
  try { localStorage.setItem("cvlis_enroll_type", key); } catch (e) {}
  renderEnrollPage();
}

function toggleEnrollDoc(id, input) {
  const list = checkedDocs().filter((x) => x !== id);
  if (input.checked) list.push(id);
  saveCheckedDocs(list);
  renderEnrollPage();
}

function resetEnrollChecklist() {
  saveCheckedDocs([]);
  renderEnrollPage();
  toast("Checklist reset.", "info", 1800);
}

function printEnrollChecklist() {
  const docs = ENROLL_DOCS.filter(([, , , types]) => types.length === 0 || types.includes(enrollType));
  const checked = checkedDocs();
  const lines = docs.map(([id, name]) => (checked.includes(id) ? "[x] " : "[  ] ") + name).join("\n");
  downloadText("CVLIS-enrollment-checklist.txt",
    "CVLIS ENROLLMENT CHECKLIST\nStudent type: " +
    (STUDENT_TYPES.find(([k]) => k === enrollType) || [])[1] + "\n\n" + lines +
    "\n\nWhere: " + ENROLL_OFFICE + "\nHours: " + ENROLL_HOURS + "\n");
  toast("Checklist downloaded. You can print it from your Downloads folder.", "success");
}

/* ---------------- Documents ---------------- */
function renderDocs() {
  $$(".docs").forEach((box) => {
    box.innerHTML = DOCS.slice(0, 5).map((d) =>
      `<div><b style="font-weight:500">${esc(d.name)}</b><span class="mono">~${d.days}d</span></div>`
    ).join("");
  });

  const rDoc = $("#rDoc");
  if (rDoc) {
    rDoc.innerHTML = '<option value="">Select a document…</option>' +
      DOCS.map((d) => `<option value="${esc(d.name)}">${esc(d.name)} — ~${d.days} day${d.days > 1 ? "s" : ""}</option>`).join("");
  }

  const catalog = $("#docCatalog");
  if (catalog) {
    catalog.innerHTML = DOCS.map((d, i) => `
      <div class="doc-card reveal" onclick="pickDoc(${i})" tabindex="0"
        onkeydown="if(event.key==='Enter')pickDoc(${i})">
        <div class="doc-ico">📄</div>
        <div><b>${esc(d.name)}</b><small>${esc(d.desc)}</small></div>
        <span class="doc-time">~${d.days} day${d.days > 1 ? "s" : ""}</span>
      </div>`).join("");
  }
  initReveal();
}

function pickDoc(index) {
  const d = DOCS[index];
  if (!d) return;
  const select = $("#rDoc");
  if (select) {
    select.value = d.name;
    updateDocMeta();
  }
  go("request");
  setTimeout(() => {
    const el = $("#rDoc");
    if (el) { el.focus(); el.scrollIntoView({ behavior: "smooth", block: "center" }); }
  }, 250);
  toast("Selected: " + d.name + " · ~" + d.days + " day" + (d.days > 1 ? "s" : "") + " processing", "info", 2200);
}

function updateDocMeta() {
  const sel = $("#rDoc");
  const meta = $("#docMeta");
  if (!sel || !meta) return;
  const d = DOCS.find((x) => x.name === sel.value);
  if (!d) {
    meta.innerHTML = '<span class="muted">Choose a document to see the processing time.</span>';
    return;
  }
  const copies = Math.max(1, Number($("#rCopies")?.value) || 1);
  meta.innerHTML = `<div class="doc-meta-inner">
      <span>⏱ <b>~${d.days} day${d.days > 1 ? "s" : ""}</b> processing</span>
      <span>📄 <b>${copies}</b> cop${copies > 1 ? "ies" : "y"}</span>
    </div>
    <small>${esc(d.desc)}</small>`;
  const sumDoc = $("#sumDoc");
  if (sumDoc) sumDoc.textContent = d.name;
  const sumDays = $("#sumDays");
  if (sumDays) sumDays.textContent = "~" + d.days + " day" + (d.days > 1 ? "s" : "");
}

/* ---------------- Staff ---------------- */
let staffQuery = "";

function renderStaff() {
  const box = $("#staffList");
  if (!box) return;
  const q = staffQuery.toLowerCase();
  const list = STAFF.map((s, index) => ({ s, index }))
    .filter(({ s }) => !q || s.join(" ").toLowerCase().includes(q));
  box.innerHTML = list.map(({ s: [role, office, email], index }) => `
    <div class="card staff-card clickable" onclick="openStaffModal(${index})" tabindex="0"
      onkeydown="if(event.key==='Enter')openStaffModal(${index})">
      <div class="avatar">${esc(initials(role))}</div>
      <h3 style="font-size:1.05rem">${esc(role)}</h3>
      <b class="staff-role">${esc(office)}</b>
      <small class="mono staff-mail">${esc(email)}</small>
    </div>`).join("") || '<div class="empty-state">🔍<b>No office found</b><span>Try another office or role.</span></div>';
}

function openStaffModal(index) {
  const s = STAFF[index];
  if (!s) return;
  const [role, office, email, phone] = s;
  openModal(esc(role),
    '<div class="staff-modal-top"><div class="avatar lg">' + esc(initials(role)) + "</div>" +
    "<div><b>" + esc(office) + "</b><br><small>Camp Vicente Lim Integrated School</small></div></div>" +
    '<div class="contact-lines">' +
    '<div>📧 <a href="mailto:' + esc(email) + '">' + esc(email) + "</a></div>" +
    '<div>📞 <a href="tel:' + esc(phone.replace(/[^0-9+]/g, "")) + '">' + esc(phone) + "</a></div>" +
    "</div>" +
    '<div class="form-actions"><a class="btn-link" href="mailto:' + esc(email) + '">Send email</a>' +
    '<button class="btn-secondary" onclick="closeModal()">Close</button></div>');
}

/* ---------------- Help, FAQ, timeline ---------------- */
function helpCardHTML([title, steps, view, label]) {
  return `
    <div class="card reveal" style="margin-bottom:18px">
      <h3 style="font-size:1.2rem;margin-bottom:6px">${esc(title)}</h3>
      ${steps.map((text, i) => `<div class="step"><i>${i + 1}</i><div>${esc(text)}</div></div>`).join("")}
      ${view ? `<button onclick="go('${view}')">${esc(label)}</button>` : ""}
    </div>`;
}

function renderHelp() {
  const guides = $("#helpGuides");
  if (guides) guides.innerHTML = HELP.map(helpCardHTML).join("");
  const faq = $("#faqList");
  if (faq) {
    faq.innerHTML = FAQS.map(([q, a], i) => `
      <div class="acc ${i === 0 ? "open" : ""}">
        <button class="acc-head"><span>${esc(q)}</span><b>+</b></button>
        <div class="acc-body"><p>${esc(a)}</p></div>
      </div>`).join("");
    initAccordion(faq);
  }
  const mode = $("#modeInfo");
  if (mode) {
    mode.textContent = apiModeLabel();
    mode.className = "mode-pill " + (API.mode === "server" ? "server" : "local");
  }
  const footMode = $("#footerMode");
  if (footMode) footMode.textContent = API.mode === "server" ? "Server mode" : "Offline demo";
  initReveal();
}

function renderTimeline() {
  const box = $("#timeline");
  if (!box) return;
  box.innerHTML = TIMELINE.map(([year, text]) =>
    `<div class="tl-item reveal"><b>${esc(year)}</b><p>${esc(text)}</p></div>`).join("");
}

/* ---------------- Search boxes at calendar controls ---------------- */
function initRenderControls() {
  const newsSearch = $("#newsSearch");
  if (newsSearch) {
    newsSearch.value = newsQuery;
    newsSearch.oninput = () => {
      newsQuery = newsSearch.value.trim();
      renderNewsPage();
    };
  }

  const staffSearch = $("#staffSearch");
  if (staffSearch) {
    staffSearch.value = staffQuery;
    staffSearch.oninput = () => {
      staffQuery = staffSearch.value.trim();
      renderStaff();
    };
  }

  const calPrev = $("#calPrev");
  if (calPrev) calPrev.onclick = () => shiftCalendar(-1);
  const calNext = $("#calNext");
  if (calNext) calNext.onclick = () => shiftCalendar(1);
}

/* ---------------- Main render ---------------- */
function renderAll() {
  renderAnnouncements();
  renderNewsPage();
  renderEvents();
  renderCalendar();
  renderEnrollment();
  renderEnrollPage();
  renderDocs();
  renderStaff();
  renderHelp();
  renderTimeline();
  initAccordion();
  initReveal();
  $$(".msg").forEach((m) => { m.style.fontSize = ".9rem"; });
}
