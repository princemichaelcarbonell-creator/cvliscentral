/* =====================================================================
   ADMIN PANEL — dashboard, requests, announcements, events, messages,
   users, at settings (kasama ang school logo upload)
   ===================================================================== */

let ADMIN_REQS = [];
let ADMIN_MSGS = [];
let ADMIN_USERS = [];
let pendingLogo = null;

/* ---------- Data loading ---------- */
async function loadNewsEvents() {
  try {
    const news = await api("/news");
    NEWS = news.map((n) => [n.month, n.day, n.title, n.text, n.tag, n.id]);
  } catch (e) { NEWS = DEFAULT_NEWS.map((n, i) => [...n, i + 1]); }
  try {
    const events = await api("/events");
    EVENTS = events.map((e) => [e.month, e.day, e.title, e.place, e.time || "", e.id]);
  } catch (e) { EVENTS = DEFAULT_EVENTS.map((e, i) => [...e, i + 1]); }
}

async function refreshLists() {
  await loadNewsEvents();
  renderAnnouncements();
  renderNewsPage();
  renderEvents();
  renderCalendar();
  renderAdminAnnList();
  renderAdminEvList();
}

/* ---------- Admin visibility ---------- */
function applyAdminState(on) {
  const link = $("#navAdminLink");
  const label = $("#adminNavLabel");
  if (link) link.hidden = !on;
  if (label) label.hidden = !on;
  if (on) {
    const who = $("#adminWho");
    if (who && currentUser) who.textContent = currentUser.name + " · " + currentUser.email;
    loadAdminDashboard();
  } else {
    const adminView = $("#admin");
    if (adminView && adminView.classList.contains("on")) go("home");
  }
}

/* Backwards-compatible helpers */
function addAdminNavLink() { applyAdminState(true); }
function removeAdminNavLink() {
  const link = $("#navAdminLink");
  const label = $("#adminNavLabel");
  if (link) link.hidden = true;
  if (label) label.hidden = true;
}

function adminLogout() { logout(); }

/* ---------- Tabs ---------- */
function initAdminTabs() {
  $$(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => goAdminTab(tab.dataset.tab));
  });
}

function goAdminTab(name) {
  $$(".admin-tab").forEach((t) => t.classList.toggle("on", t.dataset.tab === name));
  $$(".admin-tab-content").forEach((c) => c.classList.toggle("on", c.id === "tab-" + name));
  const nav = $("#adminTabs");
  if (nav) nav.scrollIntoView({ behavior: "smooth", block: "nearest" });
  if (name === "overview") loadAdminDashboard();
  if (name === "requests") loadAdminRequests();
  if (name === "messages") loadAdminMessages();
  if (name === "users") loadAdminUsers();
  if (name === "settings") fillSettingsForm();
  if (name === "ann" || name === "ev") refreshLists();
}

/* =====================================================
   OVERVIEW
   ===================================================== */
async function loadAdminDashboard() {
  if (!isAdminSession()) return;
  const who = $("#adminWho");
  if (who && currentUser) who.textContent = currentUser.name + " · " + currentUser.email;

  let stats = null;
  let statsError = "";
  try { stats = await api("/stats"); } catch (e) { statsError = e.message; }
  const box = $("#adminStats");
  if (box) {
    if (!stats) {
      box.innerHTML = '<div class="empty-state">⚠️<b>Could not load stats</b><span>' + esc(statsError) + "</span></div>";
    } else {
      const cards = [
        ["requests", "Total requests", stats.requests, "📨", "requests"],
        ["pending", "Pending review", stats.pending, "🕒", "requests"],
        ["processing", "Processing", stats.processing, "📝", "requests"],
        ["ready", "Ready for pickup", stats.ready, "✅", "requests"],
        ["news", "Announcements", stats.news, "📣", "ann"],
        ["events", "Events", stats.events, "📅", "ev"],
        ["users", "Accounts", stats.users, "👥", "users"],
        ["unreadMessages", "Unread messages", stats.unreadMessages, "✉️", "messages"]
      ];
      box.innerHTML = cards.map(([key, label, value, icon, tab]) =>
        `<button class="stat-card" onclick="goAdminTab('${tab}')">
          <span class="stat-ico">${icon}</span>
          <b>${Number(value).toLocaleString("en-PH")}</b>
          <small>${esc(label)}</small>
        </button>`).join("");
    }
  }

  const recent = $("#adminRecent");
  if (recent) {
    try {
      const list = await api("/requests");
      ADMIN_REQS = list;
      const latest = list.slice(0, 5);
      recent.innerHTML = latest.length ? latest.map((r) =>
        `<div class="my-req" onclick="openAdminRequest('${esc(r.ref)}')">
          <div class="my-req-main">
            <div>${statusBadge(r.status, true)} <b>${esc(r.document)}</b></div>
            <small class="mono">${esc(r.ref)} · ${esc(r.name)} · ${timeAgo(r.createdAt)}</small>
          </div><span class="chev">›</span>
        </div>`).join("") : '<p class="empty">No requests yet.</p>';
    } catch (e) {
      recent.innerHTML = '<p class="empty">Could not load recent requests.</p>';
    }
  }
}

/* =====================================================
   REQUESTS
   ===================================================== */
async function loadAdminRequests() {
  if (!isAdminSession()) return;
  const box = $("#adminReqList");
  if (!box) return;
  const status = ($("#reqFilter") && $("#reqFilter").value) || "all";
  const q = ($("#reqSearch") && $("#reqSearch").value.trim()) || "";
  box.innerHTML = '<div class="loading-card"><span class="spinner dark"></span> Loading requests…</div>';
  try {
    const list = await api("/requests?status=" + encodeURIComponent(status) + "&q=" + encodeURIComponent(q));
    ADMIN_REQS = list;
    if (!list.length) {
      box.innerHTML = '<div class="empty-state">📭<b>No requests found</b><span>Try a different filter or search term.</span></div>';
      return;
    }
    box.innerHTML = list.map((r) => `
      <div class="admin-req">
        <div class="admin-req-main">
          <div class="admin-req-top">${statusBadge(r.status, true)}<span class="mono ref-small">${esc(r.ref)}</span></div>
          <b>${esc(r.document)} · ${esc(r.name)}</b>
          <small>${esc(r.email)} · ${esc(r.grade || "—")} · ${timeAgo(r.createdAt)}</small>
        </div>
        <div class="actions">
          <button class="out btn-ink" onclick="openAdminRequest('${esc(r.ref)}')">Manage</button>
          <button class="btn-secondary sm" onclick="printCachedRequest('${esc(r.ref)}')">Print</button>
        </div>
      </div>`).join("");
    list.forEach(cacheRequest);
  } catch (e) {
    box.innerHTML = '<div class="empty-state">⚠️<b>Could not load requests</b><span>' + esc(e.message) + "</span></div>";
  }
}

function openAdminRequest(ref) {
  const req = ADMIN_REQS.find((r) => r.ref === ref) || cachedRequest(ref);
  if (!req) return;
  cacheRequest(req);
  const doc = DOCS.find((d) => d.name === req.document);
  openModal("Manage request " + esc(req.ref),
    '<div class="req-detail-head">' + statusBadge(req.status) + '<span class="mono ref-small">' + esc(req.ref) + "</span></div>" +
    '<div class="req-grid">' +
      "<div><small>Student</small><b>" + esc(req.name) + "</b></div>" +
      "<div><small>LRN</small><b>" + esc(req.lrn) + "</b></div>" +
      "<div><small>Email</small><b>" + esc(req.email) + "</b></div>" +
      "<div><small>Phone</small><b>" + esc(req.phone || "—") + "</b></div>" +
      "<div><small>Grade</small><b>" + esc(req.grade || "—") + "</b></div>" +
      "<div><small>Document</small><b>" + esc(req.document) + "</b></div>" +
      "<div><small>Copies</small><b>" + esc(req.copies) + "</b></div>" +
      "<div><small>Processing</small><b>" + (doc ? "~" + doc.days + " day" + (doc.days > 1 ? "s" : "") : "—") + "</b></div>" +
      "<div><small>Filed</small><b>" + formatDateTime(req.createdAt) + "</b></div>" +
      "<div><small>Updated</small><b>" + timeAgo(req.updatedAt) + "</b></div>" +
    "</div>" +
    '<div class="req-purpose"><small>Purpose</small><p>' + esc(req.purpose) + "</p></div>" +
    (req.notes ? '<div class="req-purpose"><small>Student notes</small><p>' + esc(req.notes) + "</p></div>" : "") +
    '<hr class="sep">' +
    '<label>Update status<select id="arStatus">' +
      STATUS_FLOW.map((s) => '<option value="' + s.key + '"' + (s.key === req.status ? " selected" : "") + ">" + s.icon + " " + esc(s.label) + "</option>").join("") +
    "</select></label>" +
    '<label>Note to the student (optional)<textarea id="arNote" rows="2" maxlength="500" placeholder="e.g. Ready at the registrar window. Bring your school ID.">' + esc(req.adminNote || "") + "</textarea></label>" +
    '<div class="form-actions" style="margin-top:14px">' +
      '<button id="arSave">Save status</button>' +
      '<button class="btn-secondary" onclick="printCachedRequest(\'' + esc(req.ref) + '\')">Print</button>' +
      '<button class="btn-secondary" onclick="closeModal()">Close</button>' +
    "</div>" +
    '<div style="margin-top:14px"><button class="btn-danger sm" id="arDelete">Delete request</button></div>'
  );

  const markRead = () => {
    const dot = document.querySelector('[data-req-dot="' + req.ref + '"]');
    if (dot) dot.remove();
  };
  markRead();

  $("#arSave").onclick = async () => {
    const btn = $("#arSave");
    setLoading(btn, true, "Saving…");
    try {
      await api("/requests/" + req.id + "/status", {
        method: "PUT",
        body: { status: $("#arStatus").value, note: $("#arNote").value.trim() }
      });
      toast("Request updated. The student will see the new status.", "success");
      closeModal();
      await loadAdminRequests();
      await loadAdminDashboard();
    } catch (e) {
      toast(e.message, "error");
      setLoading(btn, false);
    }
  };

  $("#arDelete").onclick = async () => {
    const ok = await askConfirm("Delete request?", "This will permanently remove " + req.ref + ". This cannot be undone.", "Delete", true);
    if (!ok) { openAdminRequest(req.ref); return; }
    try {
      await api("/requests/" + req.id, { method: "DELETE" });
      toast("Request deleted.", "success");
      closeModal();
      await loadAdminRequests();
      await loadAdminDashboard();
    } catch (e) { toast(e.message, "error"); }
  };
}

async function exportRequestsCSV() {
  try {
    const list = await api("/requests");
    if (!list.length) return toast("No requests to export.", "info");
    const header = ["Reference", "Student", "LRN", "Email", "Phone", "Grade", "Document", "Copies", "Purpose", "Status", "Admin note", "Filed", "Updated"];
    const rows = list.map((r) => [r.ref, r.name, r.lrn, r.email, r.phone, r.grade, r.document, r.copies, r.purpose, r.status, r.adminNote, r.createdAt, r.updatedAt]
      .map((v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"').join(","));
    downloadText("CVLIS-document-requests.csv", [header.join(","), ...rows].join("\r\n"), "text/csv");
    toast("Requests exported as CSV.", "success");
  } catch (e) { toast(e.message, "error"); }
}

/* =====================================================
   ANNOUNCEMENTS
   ===================================================== */
function clearAnnForm() {
  ["#annMonth", "#annDay", "#annTitle", "#annText", "#annTag"].forEach((s) => { if ($(s)) $(s).value = ""; });
  const btn = $("#saveAnnBtn");
  if (btn) { btn.dataset.editId = ""; btn.textContent = "Save announcement"; }
  return false;
}

async function saveAnnouncement() {
  const month = $("#annMonth").value.trim().toUpperCase();
  const day = $("#annDay").value.trim();
  const title = $("#annTitle").value.trim();
  const text = $("#annText").value.trim();
  const tag = $("#annTag").value.trim() || "General";

  if (!month || !day || !title || !text) return toast("Please fill in month, day, title, and description.", "error");
  if (!/^[A-Z]{3}$/.test(month) || !/^\d{1,2}$/.test(day)) return toast("Month should be 3 letters (e.g. AUG). Day should be 1–2 digits.", "error");

  const editId = $("#saveAnnBtn").dataset.editId;
  const body = { month, day, title, text, tag };
  const btn = $("#saveAnnBtn");
  setLoading(btn, true, "Saving…");
  try {
    if (editId) await api("/news/" + editId, { method: "PUT", body });
    else await api("/news", { method: "POST", body });
    clearAnnForm();
    await refreshLists();
    toast(editId ? "Announcement updated." : "Announcement published.", "success");
  } catch (e) {
    toast(e.message, "error");
  } finally {
    setLoading(btn, false);
  }
}

function editAnnouncement(index) {
  const item = NEWS[index];
  if (!item) return;
  $("#annMonth").value = item[0];
  $("#annDay").value = item[1];
  $("#annTitle").value = item[2];
  $("#annText").value = item[3];
  $("#annTag").value = item[4];
  $("#saveAnnBtn").dataset.editId = item[5];
  $("#saveAnnBtn").textContent = "Update announcement";
  $("#annTitle").focus();
  $("#annTitle").scrollIntoView({ behavior: "smooth", block: "center" });
}

async function deleteAnnouncement(index) {
  const item = NEWS[index];
  if (!item) return;
  const ok = await askConfirm("Delete announcement?", item[2], "Delete", true);
  if (!ok) return;
  try {
    await api("/news/" + item[5], { method: "DELETE" });
    await refreshLists();
    toast("Announcement deleted.", "success");
  } catch (e) { toast(e.message, "error"); }
}

function renderAdminAnnList() {
  const box = $("#annAdminList");
  if (!box) return;
  if (!NEWS.length) {
    box.innerHTML = '<p class="empty">No announcements yet. Add one above.</p>';
    return;
  }
  box.innerHTML = NEWS.map((item, i) =>
    '<div class="admin-item">' +
      '<div class="info"><b>' + esc(item[2]) + "</b>" +
      "<small>" + esc(item[0]) + " " + esc(item[1]) + " · " + esc(item[4]) + "</small></div>" +
      '<div class="actions">' +
        '<button class="out btn-ink" onclick="editAnnouncement(' + i + ')">Edit</button>' +
        '<button class="del" onclick="deleteAnnouncement(' + i + ')">Delete</button>' +
      "</div></div>"
  ).join("");
}

/* =====================================================
   EVENTS
   ===================================================== */
function clearEvForm() {
  ["#evMonth", "#evDay", "#evTitle", "#evPlace", "#evTime"].forEach((s) => { if ($(s)) $(s).value = ""; });
  const btn = $("#saveEvBtn");
  if (btn) { btn.dataset.editId = ""; btn.textContent = "Save event"; }
  return false;
}

async function saveEvent() {
  const month = $("#evMonth").value.trim().toUpperCase();
  const day = $("#evDay").value.trim();
  const title = $("#evTitle").value.trim();
  const place = $("#evPlace").value.trim();
  const time = ($("#evTime") && $("#evTime").value.trim()) || "";

  if (!month || !day || !title || !place) return toast("Please fill in month, day, title, and place.", "error");
  if (!/^[A-Z]{3}$/.test(month) || !/^\d{1,2}$/.test(day)) return toast("Month should be 3 letters (e.g. SEP). Day should be 1–2 digits.", "error");

  const editId = $("#saveEvBtn").dataset.editId;
  const body = { month, day, title, place, time };
  const btn = $("#saveEvBtn");
  setLoading(btn, true, "Saving…");
  try {
    if (editId) await api("/events/" + editId, { method: "PUT", body });
    else await api("/events", { method: "POST", body });
    clearEvForm();
    await refreshLists();
    toast(editId ? "Event updated." : "Event added to the calendar.", "success");
  } catch (e) {
    toast(e.message, "error");
  } finally {
    setLoading(btn, false);
  }
}

function editEvent(index) {
  const item = EVENTS[index];
  if (!item) return;
  $("#evMonth").value = item[0];
  $("#evDay").value = item[1];
  $("#evTitle").value = item[2];
  $("#evPlace").value = item[3];
  if ($("#evTime")) $("#evTime").value = item[4] || "";
  $("#saveEvBtn").dataset.editId = item[5];
  $("#saveEvBtn").textContent = "Update event";
  $("#evTitle").focus();
  $("#evTitle").scrollIntoView({ behavior: "smooth", block: "center" });
}

async function deleteEvent(index) {
  const item = EVENTS[index];
  if (!item) return;
  const ok = await askConfirm("Delete event?", item[2], "Delete", true);
  if (!ok) return;
  try {
    await api("/events/" + item[5], { method: "DELETE" });
    await refreshLists();
    toast("Event deleted.", "success");
  } catch (e) { toast(e.message, "error"); }
}

function renderAdminEvList() {
  const box = $("#evAdminList");
  if (!box) return;
  if (!EVENTS.length) {
    box.innerHTML = '<p class="empty">No events yet. Add one above.</p>';
    return;
  }
  box.innerHTML = EVENTS.map((item, i) =>
    '<div class="admin-item">' +
      '<div class="info"><b>' + esc(item[2]) + "</b>" +
      "<small>" + esc(item[0]) + " " + esc(item[1]) + " · " + esc(item[3]) + (item[4] ? " · " + esc(item[4]) : "") + "</small></div>" +
      '<div class="actions">' +
        '<button class="out btn-ink" onclick="editEvent(' + i + ')">Edit</button>' +
        '<button class="del" onclick="deleteEvent(' + i + ')">Delete</button>' +
      "</div></div>"
  ).join("");
}

/* =====================================================
   MESSAGES
   ===================================================== */
async function loadAdminMessages() {
  if (!isAdminSession()) return;
  const box = $("#adminMsgList");
  if (!box) return;
  box.innerHTML = '<div class="loading-card"><span class="spinner dark"></span> Loading messages…</div>';
  try {
    ADMIN_MSGS = await api("/messages");
    if (!ADMIN_MSGS.length) {
      box.innerHTML = '<div class="empty-state">📭<b>Inbox is empty</b><span>Messages sent from the Contact page appear here.</span></div>';
      return;
    }
    box.innerHTML = ADMIN_MSGS.map((m) => `
      <div class="msg-item ${m.read ? "read" : "unread"}">
        <div class="msg-head"><b>${esc(m.subject)}</b>${m.read ? "" : '<span class="dot"></span>'}</div>
        <small>${esc(m.name)} · ${esc(m.email)} · ${timeAgo(m.createdAt)}</small>
        <p>${esc(m.body)}</p>
        <div class="actions">
          ${m.read ? "" : `<button class="out btn-ink" onclick="markMessage(${m.id})">Mark read</button>`}
          <a class="btn-link sm" href="mailto:${esc(m.email)}?subject=${encodeURIComponent("Re: " + m.subject)}">Reply</a>
          <button class="btn-danger sm" onclick="deleteMessage(${m.id})">Delete</button>
        </div>
      </div>`).join("");
  } catch (e) {
    box.innerHTML = '<div class="empty-state">⚠️<b>Could not load messages</b><span>' + esc(e.message) + "</span></div>";
  }
}

async function markMessage(id) {
  try {
    await api("/messages/" + id + "/read", { method: "PUT" });
    await loadAdminMessages();
    await loadAdminDashboard();
  } catch (e) { toast(e.message, "error"); }
}

async function deleteMessage(id) {
  const ok = await askConfirm("Delete message?", "This message will be permanently removed.", "Delete", true);
  if (!ok) return;
  try {
    await api("/messages/" + id, { method: "DELETE" });
    await loadAdminMessages();
    await loadAdminDashboard();
    toast("Message deleted.", "success");
  } catch (e) { toast(e.message, "error"); }
}

/* =====================================================
   USERS
   ===================================================== */
async function loadAdminUsers() {
  if (!isAdminSession()) return;
  const box = $("#adminUserList");
  if (!box) return;
  box.innerHTML = '<div class="loading-card"><span class="spinner dark"></span> Loading accounts…</div>';
  try {
    ADMIN_USERS = await api("/users");
    box.innerHTML = '<div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead><tbody>' +
      ADMIN_USERS.map((u) => `<tr>
        <td data-label="Name"><div class="user-cell"><span class="avatar sm">${esc(initials(u.name))}</span><b>${esc(u.name)}</b></div></td>
        <td data-label="Email">${esc(u.email)}</td>
        <td data-label="Role"><span class="tag ${u.role === "admin" ? "gold" : ""}">${u.role === "admin" ? "Admin" : "Student"}</span></td>
        <td data-label="Joined">${formatDate(u.createdAt)}</td>
        <td class="row-actions" data-label="Actions">
          <button class="out btn-ink sm" onclick="toggleUserRole(${u.id}, '${u.role === "admin" ? "student" : "admin"}')">
            ${u.role === "admin" ? "Make student" : "Make admin"}
          </button>
          <button class="btn-secondary sm" onclick="openResetPassword(${u.id})">Reset password</button>
          <button class="btn-danger sm" onclick="deleteUser(${u.id})">Delete</button>
        </td>
      </tr>`).join("") + "</tbody></table></div>";
  } catch (e) {
    box.innerHTML = '<div class="empty-state">⚠️<b>Could not load accounts</b><span>' + esc(e.message) + "</span></div>";
  }
}

async function toggleUserRole(id, role) {
  const ok = await askConfirm("Change role?", "Set this account's role to " + role + "?", "Change role");
  if (!ok) return;
  try {
    await api("/users/" + id, { method: "PUT", body: { role } });
    await loadAdminUsers();
    toast("Role updated.", "success");
  } catch (e) { toast(e.message, "error"); }
}

function openResetPassword(id) {
  const user = ADMIN_USERS.find((u) => u.id === id);
  openModal("Reset password",
    '<p class="muted" style="margin-top:0">Set a new password for <b>' + esc(user ? user.name : "this account") + "</b>. Share it with them privately — they can change it in My account.</p>" +
    '<label>New password (min 8 characters)<input id="rpPass" type="text" placeholder="Temporary password"></label>' +
    '<div class="form-actions" style="margin-top:14px"><button id="rpSave">Save password</button><button class="btn-secondary" onclick="closeModal()">Cancel</button></div>');
  $("#rpSave").onclick = async () => {
    const pass = $("#rpPass").value;
    if (pass.length < 8) return toast("Password must be at least 8 characters.", "error");
    try {
      await api("/users/" + id, { method: "PUT", body: { password: pass } });
      toast("Password updated.", "success");
      closeModal();
    } catch (e) { toast(e.message, "error"); }
  };
}

async function deleteUser(id) {
  const user = ADMIN_USERS.find((u) => u.id === id);
  const ok = await askConfirm("Delete account?", "Delete " + (user ? user.name : "this account") + "? Their document requests will stay, but they will no longer be able to log in.", "Delete", true);
  if (!ok) return;
  try {
    await api("/users/" + id, { method: "DELETE" });
    await loadAdminUsers();
    toast("Account deleted.", "success");
  } catch (e) { toast(e.message, "error"); }
}

/* =====================================================
   SETTINGS + LOGO
   ===================================================== */
function fillSettingsForm() {
  if (!isAdminSession()) return;
  const map = {
    "#setSchoolName": SETTINGS.schoolName,
    "#setShortName": SETTINGS.shortName,
    "#setTagline": SETTINGS.tagline,
    "#setRegistrarEmail": SETTINGS.registrarEmail,
    "#setPhone": SETTINGS.phone,
    "#setAddress": SETTINGS.address,
    "#setHours": SETTINGS.hours,
    "#setPollQuestion": SETTINGS.pollQuestion
  };
  Object.entries(map).forEach(([sel, value]) => { if ($(sel)) $(sel).value = value || ""; });
  if ($("#setPollOptions")) $("#setPollOptions").value = (SETTINGS.pollOptions || []).join("\n");
  updateLogoPreview();
}

function updateLogoPreview() {
  const img = $("#setLogoPreview");
  if (!img) return;
  const src = pendingLogo !== null ? pendingLogo : (SETTINGS.logo || "logo.jpeg");
  if (!src) {
    img.style.display = "none";
    return;
  }
  img.style.display = "block";
  img.src = src;
  img.onerror = () => { img.style.display = "none"; };
}

function handleLogoFile(file) {
  if (!file) return;
  if (!/^image\//.test(file.type)) return toast("Please choose an image file (PNG, JPG, or WEBP).", "error");
  if (file.size > 8 * 1024 * 1024) return toast("Image is too large. Please choose a file under 8 MB.", "error");

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 512;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      pendingLogo = canvas.toDataURL("image/jpeg", 0.88);
      updateLogoPreview();
      toast("Logo ready. Tap Save settings to apply it.", "info", 3200);
    };
    img.onerror = () => toast("Could not read that image. Try another file.", "error");
    img.src = reader.result;
  };
  reader.onerror = () => toast("Could not read the file.", "error");
  reader.readAsDataURL(file);
}

async function saveSettings() {
  const btn = $("#saveSettingsBtn");
  const options = ($("#setPollOptions").value || "").split("\n").map((s) => s.trim()).filter(Boolean);
  if (options.length < 2) return toast("Add at least 2 poll options.", "error");

  const body = {
    schoolName: $("#setSchoolName").value.trim(),
    shortName: $("#setShortName").value.trim(),
    tagline: $("#setTagline").value.trim(),
    registrarEmail: $("#setRegistrarEmail").value.trim(),
    phone: $("#setPhone").value.trim(),
    address: $("#setAddress").value.trim(),
    hours: $("#setHours").value.trim(),
    pollQuestion: $("#setPollQuestion").value.trim(),
    pollOptions: options
  };
  if (pendingLogo !== null) body.logo = pendingLogo;

  setLoading(btn, true, "Saving…");
  try {
    const data = await api("/settings", { method: "PUT", body });
    if (data.settings) SETTINGS = { ...SETTINGS, ...data.settings };
    pendingLogo = null;
    applySettings();
    fillSettingsForm();
    renderDocs();
    await loadPoll();
    toast("Settings saved and applied to the whole site.", "success");
  } catch (e) {
    toast(e.message, "error");
  } finally {
    setLoading(btn, false);
  }
}

async function resetLogo() {
  pendingLogo = "";
  updateLogoPreview();
  toast("Logo will reset when you save settings.", "info");
}

async function resetDemoData() {
  const ok = await askConfirm("Reset demo data?", "This will erase all local demo data and restore the sample accounts, announcements, events, and requests. The page will reload.", "Reset", true);
  if (!ok) return;
  try {
    await api("/reset-demo", { method: "POST" });
    location.reload();
  } catch (e) {
    toast(e.message, "error");
  }
}

/* =====================================================
   INIT
   ===================================================== */
async function initAdmin() {
  const annSave = $("#saveAnnBtn");
  const evSave = $("#saveEvBtn");
  if (annSave) annSave.addEventListener("click", saveAnnouncement);
  if (evSave) evSave.addEventListener("click", saveEvent);

  initAdminTabs();

  const fmtMonth = (sel) => {
    const el = $(sel);
    if (!el) return;
    el.addEventListener("input", () => {
      el.value = el.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
    });
  };
  const fmtDay = (sel) => {
    const el = $(sel);
    if (!el) return;
    el.addEventListener("input", () => {
      el.value = el.value.replace(/[^0-9]/g, "").slice(0, 2);
    });
  };
  fmtMonth("#annMonth"); fmtDay("#annDay");
  fmtMonth("#evMonth"); fmtDay("#evDay");

  const tabBtns = $$("[data-admin-tab]");
  tabBtns.forEach((b) => b.addEventListener("click", () => goAdminTab(b.dataset.adminTab)));

  const reqFilter = $("#reqFilter");
  const reqSearch = $("#reqSearch");
  if (reqFilter) reqFilter.onchange = loadAdminRequests;
  if (reqSearch) {
    let timer;
    reqSearch.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(loadAdminRequests, 300);
    });
  }

  const exportBtn = $("#exportReqBtn");
  if (exportBtn) exportBtn.onclick = exportRequestsCSV;
  const refreshReq = $("#refreshReqBtn");
  if (refreshReq) refreshReq.onclick = loadAdminRequests;

  const saveSettingsBtn = $("#saveSettingsBtn");
  if (saveSettingsBtn) saveSettingsBtn.onclick = saveSettings;
  const logoInput = $("#logoInput");
  if (logoInput) logoInput.onchange = (e) => handleLogoFile(e.target.files[0]);
  const resetLogoBtn = $("#resetLogoBtn");
  if (resetLogoBtn) resetLogoBtn.onclick = resetLogo;
  const resetDemoBtn = $("#resetDemoBtn");
  if (resetDemoBtn) {
    resetDemoBtn.onclick = resetDemoData;
    resetDemoBtn.hidden = API.mode !== "local";
  }

  if ($("#resetPollBtn")) $("#resetPollBtn").onclick = async () => {
    const ok = await askConfirm("Reset poll?", "Clear all votes and start fresh?", "Reset poll");
    if (!ok) return;
    try {
      await api("/poll/reset", { method: "POST" });
      await loadPoll();
      toast("Poll votes cleared.", "success");
    } catch (e) { toast(e.message, "error"); }
  };

  applyAdminState(isAdminSession());
}
