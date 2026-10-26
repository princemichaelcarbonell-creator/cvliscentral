/* =====================================================================
   DOCUMENT REQUESTS — 3-step wizard, tracking, receipts, my requests
   ===================================================================== */

let reqStep = 0;
let lastRequest = null;
const REQ_CACHE = {};

function cacheRequest(req) {
  if (req && req.ref) REQ_CACHE[req.ref] = req;
  return req ? req.ref : "";
}

function cachedRequest(ref) {
  return REQ_CACHE[ref] || lastRequest || null;
}

function initRequest() {
  const next = $("#reqNext");
  const prev = $("#reqPrev");
  const send = $("#sendReq");
  const track = $("#trackBtn");
  const rDoc = $("#rDoc");
  const copies = $("#rCopies");
  const copiesUp = $("#copiesUp");
  const copiesDown = $("#copiesDown");
  const newReq = $("#newReqBtn");
  const start = $("#startReqBtn");

  if (next) next.onclick = () => {
    const err = validateReqStep(reqStep);
    if (err) { requestError(err); return; }
    reqGoStep(reqStep + 1);
  };
  if (prev) prev.onclick = () => reqGoStep(reqStep - 1);
  if (send) send.onclick = sendRequest;
  if (track) track.onclick = trackRequest;
  if (rDoc) rDoc.onchange = () => updateDocMeta();
  if (copies) copies.onchange = () => { normaliseCopies(); updateDocMeta(); };
  if (copiesUp) copiesUp.onclick = () => { stepCopies(1); };
  if (copiesDown) copiesDown.onclick = () => { stepCopies(-1); };
  if (newReq) newReq.onclick = () => resetRequestForm();
  if (start) start.onclick = () => {
    resetRequestForm(true);
    $("#reqWizard").scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const trackRef = $("#trackRef");
  if (trackRef) trackRef.addEventListener("keydown", (e) => { if (e.key === "Enter") trackRequest(); });
  const trackEmail = $("#trackEmail");
  if (trackEmail) trackEmail.addEventListener("keydown", (e) => { if (e.key === "Enter") trackRequest(); });
  const rLrn = $("#rLrn");
  if (rLrn) {
    rLrn.addEventListener("input", () => {
      const digits = rLrn.value.replace(/\D/g, "").slice(0, 12);
      if (rLrn.value !== digits) rLrn.value = digits;
    });
  }

  updateDocMeta();
  renderMyRequestsPlaceholder();
  reqGoStep(0, true);
}

function stepCopies(delta) {
  const input = $("#rCopies");
  if (!input) return;
  input.value = Math.max(1, Math.min(5, (Number(input.value) || 1) + delta));
  updateDocMeta();
}

function normaliseCopies() {
  const input = $("#rCopies");
  if (!input) return;
  input.value = Math.max(1, Math.min(5, Number(input.value) || 1));
}

function reqGoStep(step, silent) {
  reqStep = Math.max(0, Math.min(2, step));
  $$(".req-pane").forEach((p, i) => p.classList.toggle("on", i === reqStep));
  $$(".req-step").forEach((s, i) => {
    s.classList.toggle("on", i === reqStep);
    s.classList.toggle("done", i < reqStep);
  });
  const label = $("#reqStepLabel");
  if (label) label.textContent = "Step " + (reqStep + 1) + " of 3";
  const prev = $("#reqPrev");
  const next = $("#reqNext");
  const send = $("#sendReq");
  if (prev) prev.style.visibility = reqStep === 0 ? "hidden" : "visible";
  if (next) next.style.display = reqStep === 2 ? "none" : "";
  if (send) send.style.display = reqStep === 2 ? "" : "none";
  if (reqStep === 2) updateSummary();
  if (!silent) {
    const panel = $("#reqWizard");
    if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function requestError(message) {
  const el = $("#reqMsg");
  if (el) {
    el.textContent = message;
    el.className = "msg err-text";
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    toast(message, "error");
  }
}

function validateReqStep(step) {
  const val = (id) => (($(id) && $(id).value) || "").trim();
  if (step === 0) {
    if (!val("#rName")) return "Please enter the student's full name.";
    if (!/^\d{12}$/.test(val("#rLrn"))) return "Please enter a valid 12-digit LRN.";
    if (!/^\S+@\S+\.\S+$/.test(val("#rEmail"))) return "Please enter a valid email address.";
    if (!$("#rGrade").value) return "Please choose the grade level.";
  }
  if (step === 1) {
    if (!$("#rDoc").value) return "Please choose the document you need.";
    if (val("#rPurpose").length < 5) return "Please describe the purpose (at least 5 characters).";
  }
  return "";
}

function updateSummary() {
  const val = (id) => (($(id) && $(id).value) || "").trim();
  const doc = DOCS.find((d) => d.name === $("#rDoc").value);
  const copies = Math.max(1, Number($("#rCopies").value) || 1);
  const set = (sel, v) => { const el = $(sel); if (el) el.textContent = v; };
  set("#sumName", val("#rName") || "—");
  set("#sumLrn", val("#rLrn") || "—");
  set("#sumEmail", val("#rEmail") || "—");
  set("#sumGrade", $("#rGrade").value || "—");
  set("#sumDoc", doc ? doc.name : "—");
  set("#sumCopies", copies + " cop" + (copies > 1 ? "ies" : "y"));
  set("#sumPurpose", val("#rPurpose") || "—");
  set("#sumDays", doc ? "~" + doc.days + " day" + (doc.days > 1 ? "s" : "") : "—");
  if (doc) updateDocMeta();
}

async function sendRequest() {
  const v0 = validateReqStep(0);
  if (v0) { reqGoStep(0); requestError(v0); return; }
  const v1 = validateReqStep(1);
  if (v1) { reqGoStep(1); requestError(v1); return; }

  const body = {
    name: $("#rName").value.trim(),
    lrn: $("#rLrn").value.trim(),
    email: $("#rEmail").value.trim().toLowerCase(),
    phone: $("#rPhone").value.trim(),
    grade: $("#rGrade").value,
    document: $("#rDoc").value,
    copies: Math.max(1, Math.min(5, Number($("#rCopies").value) || 1)),
    purpose: $("#rPurpose").value.trim(),
    notes: $("#rNotes").value.trim()
  };

  const btn = $("#sendReq");
  setLoading(btn, true, "Submitting…");
  const msg = $("#reqMsg");
  if (msg) msg.textContent = "";
  try {
    const data = await api("/requests", { method: "POST", body });
    lastRequest = data.request;
    showRequestSuccess(data.request);
    toast("Request submitted! Save your reference code.", "success", 5000);
    refreshMyRequests();
    $("#trackRef").value = data.request.ref;
    $("#trackEmail").value = body.email;
  } catch (e) {
    requestError(e.message);
  } finally {
    setLoading(btn, false);
  }
}

function showRequestSuccess(req) {
  const wizard = $("#reqWizard");
  const success = $("#reqSuccess");
  if (wizard) wizard.style.display = "none";
  if (!success) return;
  const doc = DOCS.find((d) => d.name === req.document);
  success.style.display = "block";
  success.innerHTML = `
    <div class="success-ico">✅</div>
    <h3>Request submitted!</h3>
    <p class="muted">Keep this reference code. You can use it to check the status anytime.</p>
    <div class="ref-box">
      <small>REFERENCE CODE</small>
      <b id="refCodeText">${esc(req.ref)}</b>
      <button class="btn-secondary sm" onclick="copyText('${esc(req.ref)}','Reference code copied!')">Copy</button>
    </div>
    <div class="receipt-mini">
      <div><span>Student</span><b>${esc(req.name)}</b></div>
      <div><span>Document</span><b>${esc(req.document)}</b></div>
      <div><span>Copies</span><b>${esc(req.copies)}</b></div>
      <div><span>Processing</span><b>${doc ? "~" + doc.days + " day" + (doc.days > 1 ? "s" : "") : "—"}</b></div>
      <div><span>Status</span><b>${statusBadge(req.status || "pending")}</b></div>
    </div>
    <div class="form-actions">
      <button onclick="printCachedRequest('${esc(req.ref)}')">Print receipt</button>
      <button class="btn-secondary" onclick="trackKnownRequest()">Track this request</button>
      <button class="btn-secondary" onclick="resetRequestForm()">New request</button>
    </div>`;
  success.scrollIntoView({ behavior: "smooth", block: "center" });
}

function trackKnownRequest() {
  if (!lastRequest) return;
  $("#trackRef").value = lastRequest.ref;
  $("#trackEmail").value = lastRequest.email;
  trackRequest();
  $("#trackResult").scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetRequestForm(keepUser) {
  ["#rLrn", "#rPhone", "#rPurpose", "#rNotes"].forEach((s) => { if ($(s)) $(s).value = ""; });
  if ($("#rCopies")) $("#rCopies").value = 1;
  if (!keepUser) {
    if ($("#rName") && !currentUser) $("#rName").value = "";
    if ($("#rEmail") && !currentUser) $("#rEmail").value = "";
  } else if (currentUser) {
    $("#rName").value = currentUser.name;
    $("#rEmail").value = currentUser.email;
  }
  if ($("#rDoc")) $("#rDoc").value = "";
  if ($("#rGrade")) $("#rGrade").value = "";
  const wizard = $("#reqWizard");
  const success = $("#reqSuccess");
  if (wizard) wizard.style.display = "";
  if (success) { success.style.display = "none"; success.innerHTML = ""; }
  const msg = $("#reqMsg");
  if (msg) msg.textContent = "";
  updateDocMeta();
  reqGoStep(0, true);
}

/* ---------- Tracking ---------- */
function requestTimeline(req) {
  const currentIndex = STATUS_FLOW.findIndex((s) => s.key === req.status);
  if (req.status === "rejected") {
    return '<div class="timeline">' +
      STATUS_FLOW.filter((s) => s.key !== "rejected").map((s, i) =>
        `<div class="tl-row done"><i>✓</i><div><b>${esc(s.label)}</b><small>${esc(s.note)}</small></div></div>`
      ).join("") +
      `<div class="tl-row rejected current"><i>⚠️</i><div><b>Needs attention</b><small>${esc(req.adminNote || "Please contact the registrar.")}</small></div></div></div>`;
  }
  return '<div class="timeline">' +
    STATUS_FLOW.filter((s) => s.key !== "rejected").map((s, i) => {
      const cls = i < currentIndex ? "done" : i === currentIndex ? "current" : "";
      return `<div class="tl-row ${cls}"><i>${i < currentIndex ? "✓" : s.icon}</i><div><b>${esc(s.label)}</b><small>${esc(s.note)}</small></div></div>`;
    }).join("") + "</div>";
}

function requestDetailHTML(req) {
  const doc = DOCS.find((d) => d.name === req.document);
  const key = cacheRequest(req);
  return `
    <div class="req-detail-head">
      ${statusBadge(req.status)}
      <span class="mono ref-small">${esc(req.ref)}</span>
    </div>
    <div class="req-grid">
      <div><small>Student</small><b>${esc(req.name)}</b></div>
      <div><small>LRN</small><b>${esc(req.lrn)}</b></div>
      <div><small>Document</small><b>${esc(req.document)}</b></div>
      <div><small>Copies</small><b>${esc(req.copies)}</b></div>
      <div><small>Processing</small><b>${doc ? "~" + doc.days + " day" + (doc.days > 1 ? "s" : "") : "—"}</b></div>
      <div><small>Filed</small><b>${formatDateTime(req.createdAt)}</b></div>
    </div>
    <div class="req-purpose"><small>Purpose</small><p>${esc(req.purpose)}</p></div>
    ${req.notes ? '<div class="req-purpose"><small>Notes</small><p>' + esc(req.notes) + "</p></div>" : ""}
    ${req.adminNote ? '<div class="admin-note"><b>Note from the registrar</b><p>' + esc(req.adminNote) + "</p></div>" : ""}
    <h4 class="mini-title" style="margin-top:18px">Progress</h4>
    ${requestTimeline(req)}
    <div class="form-actions" style="margin-top:18px">
      <button onclick="printCachedRequest('${esc(key)}')">Print receipt</button>
      <button class="btn-secondary" onclick="closeModal()">Close</button>
    </div>`;
}

async function trackRequest() {
  const ref = ($("#trackRef").value || "").trim().toUpperCase();
  const email = ($("#trackEmail").value || "").trim().toLowerCase();
  const result = $("#trackResult");
  if (!ref) return toast("Enter your reference code.", "error");
  if (!email) return toast("Enter the email used in the request.", "error");

  const btn = $("#trackBtn");
  setLoading(btn, true, "Checking…");
  result.innerHTML = '<div class="loading-card"><span class="spinner dark"></span> Looking up your request…</div>';
  try {
    const data = await api("/requests/track/" + encodeURIComponent(ref) + "?email=" + encodeURIComponent(email));
    const req = data.request;
    result.innerHTML = '<div class="card track-card">' + requestDetailHTML(req) + "</div>";
    initAccordion(result);
  } catch (e) {
    result.innerHTML = '<div class="empty-state">⚠️<b>Request not found</b><span>' + esc(e.message) + "</span></div>";
  } finally {
    setLoading(btn, false);
  }
}

/* ---------- My requests ---------- */
function renderMyRequestsPlaceholder() {
  const box = $("#myRequests");
  if (!box) return;
  if (!currentUser) {
    box.innerHTML = '<div class="empty-state">🔐<b>Log in to see your requests</b><span>Your filed requests and their status will appear here.</span><button onclick="openAuth(\'login\')">Log in</button></div>';
  }
}

async function refreshMyRequests() {
  const box = $("#myRequests");
  if (!box) return;
  if (!currentUser) { renderMyRequestsPlaceholder(); return; }
  box.innerHTML = '<div class="loading-card"><span class="spinner dark"></span> Loading your requests…</div>';
  try {
    const list = await api("/requests/mine");
    if (!list.length) {
      box.innerHTML = '<div class="empty-state">📭<b>No requests yet</b><span>Start a request above and it will show up here.</span></div>';
      return;
    }
    box.innerHTML = list.map((r) => {
      cacheRequest(r);
      const doc = DOCS.find((d) => d.name === r.document);
      return `<div class="my-req" onclick="openRequestDetailByRef('${esc(r.ref)}')">
        <div class="my-req-main">
          <div>${statusBadge(r.status, true)} <b>${esc(r.document)}</b></div>
          <small class="mono">${esc(r.ref)} · ${formatDate(r.createdAt)} · ${doc ? "~" + doc.days + " day" + (doc.days > 1 ? "s" : "") : "—"}</small>
        </div>
        <span class="chev">›</span>
      </div>`;
    }).join("");
  } catch (e) {
    box.innerHTML = '<div class="empty-state">⚠️<b>Could not load requests</b><span>' + esc(e.message) + "</span></div>";
  }
}

function openRequestDetail(req) {
  openModal("Request " + esc(req.ref), requestDetailHTML(req));
}

function openRequestDetailByRef(ref) {
  const req = cachedRequest(ref);
  if (req) openRequestDetail(req);
}

function printCachedRequest(ref) {
  const req = cachedRequest(ref);
  if (req) printRequest(req);
}

/* ---------- Print ---------- */
function printRequest(req) {
  if (!req) return;
  const doc = DOCS.find((d) => d.name === req.document);
  const area = $("#printArea");
  if (!area) return;
  area.innerHTML = `
    <div class="print-doc">
      <div class="print-head">
        <div class="print-logo">CVLIS</div>
        <div><h2>${esc(SETTINGS.shortName)}</h2><p>${esc(SETTINGS.address)}<br>${esc(SETTINGS.phone)} · ${esc(SETTINGS.registrarEmail)}</p></div>
      </div>
      <h3>DOCUMENT REQUEST RECEIPT</h3>
      <div class="print-ref">Reference code: <b>${esc(req.ref)}</b></div>
      <table>
        <tr><td>Student name</td><td><b>${esc(req.name)}</b></td></tr>
        <tr><td>LRN</td><td>${esc(req.lrn)}</td></tr>
        <tr><td>Email</td><td>${esc(req.email)}</td></tr>
        <tr><td>Grade level</td><td>${esc(req.grade || "—")}</td></tr>
        <tr><td>Document</td><td><b>${esc(req.document)}</b></td></tr>
        <tr><td>Copies</td><td>${esc(req.copies)}</td></tr>
        <tr><td>Purpose</td><td>${esc(req.purpose)}</td></tr>
        <tr><td>Processing time</td><td>${doc ? "~" + doc.days + " day" + (doc.days > 1 ? "s" : "") : "—"}</td></tr>
        <tr><td>Status</td><td>${statusInfo(req.status).label}</td></tr>
        <tr><td>Date filed</td><td>${formatDateTime(req.createdAt)}</td></tr>
      </table>
      <p class="print-note">Keep this receipt and present it when claiming the document. Processing time is an estimate and may change if records need verification.</p>
      <div class="print-sign"><span>Registrar's signature</span><span>Date claimed</span></div>
    </div>`;
  document.body.classList.add("printing");
  setTimeout(() => {
    window.print();
    setTimeout(() => {
      document.body.classList.remove("printing");
      area.innerHTML = "";
    }, 400);
  }, 80);
}
