/* =====================================================================
   UI HELPERS — toast, modal, theme, animations, at iba pa
   ===================================================================== */

let activeModalOnClose = null;

function toast(message, type = "info", ms = 3600) {
  let box = $("#toasts");
  if (!box) {
    box = document.createElement("div");
    box.id = "toasts";
    document.body.appendChild(box);
  }
  const icons = { success: "✅", error: "⚠️", info: "ℹ️", warn: "🔔" };
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.innerHTML = '<span class="toast-ico">' + (icons[type] || icons.info) + "</span>" +
    '<span class="toast-msg">' + esc(message) + "</span>" +
    '<button class="toast-x" aria-label="Dismiss">✕</button>';
  box.appendChild(el);
  const remove = () => {
    el.classList.add("out");
    setTimeout(() => el.remove(), 220);
  };
  el.querySelector(".toast-x").onclick = remove;
  setTimeout(remove, ms);
  return el;
}

function openModal(title, html, onClose) {
  const dlg = $("#modal");
  if (!dlg) return;
  $("#modalTitle").innerHTML = title;
  $("#modalBody").innerHTML = html;
  activeModalOnClose = onClose || null;
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
}

function closeModal() {
  const dlg = $("#modal");
  if (dlg && dlg.open) dlg.close();
  if (activeModalOnClose) {
    const fn = activeModalOnClose;
    activeModalOnClose = null;
    try { fn(); } catch (e) {}
  }
}

function askConfirm(title, message, okLabel = "Confirm", danger = false) {
  return new Promise((resolve) => {
    let answered = false;
    openModal(
      title,
      '<p style="margin-top:0;color:var(--mut)">' + esc(message) + "</p>" +
      '<div class="form-actions" style="margin-top:18px">' +
      '<button class="btn-secondary" id="cfNo">Cancel</button>' +
      '<button id="cfYes" class="' + (danger ? "btn-danger" : "") + '">' + esc(okLabel) + "</button>" +
      "</div>",
      () => { if (!answered) resolve(false); }
    );
    $("#cfNo").onclick = () => { answered = true; resolve(false); closeModal(); };
    $("#cfYes").onclick = () => { answered = true; resolve(true); closeModal(); };
  });
}

function setLoading(btn, on, label) {
  if (!btn) return;
  if (on) {
    btn.dataset.original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> ' + (label || "Please wait…");
  } else {
    btn.disabled = false;
    if (btn.dataset.original) btn.innerHTML = btn.dataset.original;
  }
}

function statusInfo(key) {
  return STATUS_FLOW.find((s) => s.key === key) || STATUS_FLOW[0];
}

function statusBadge(key, small) {
  const s = statusInfo(key);
  return '<span class="status ' + esc(key) + (small ? " sm" : "") + '">' +
    '<span>' + s.icon + "</span> " + esc(s.label) + "</span>";
}

function initials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "?";
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d)) return String(value);
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d)) return String(value);
  return d.toLocaleString("en-PH", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function timeAgo(value) {
  const d = new Date(value);
  if (isNaN(d)) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + "h ago";
  const days = Math.floor(hours / 24);
  if (days < 31) return days + "d ago";
  return formatDate(value);
}

async function copyText(text, okMessage) {
  try {
    await navigator.clipboard.writeText(text);
    toast(okMessage || "Copied to clipboard.", "success");
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); toast(okMessage || "Copied to clipboard.", "success"); }
    catch (err) { toast("Could not copy. Please copy it manually.", "error"); }
    ta.remove();
  }
}

function downloadText(filename, text, type = "text/plain") {
  const blob = new Blob([text], { type: type + ";charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------- Theme ---------- */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem("cvlis_theme", theme); } catch (e) {}
  const btn = $("#themeBtn");
  if (btn) {
    btn.textContent = theme === "dark" ? "☀️" : "🌙";
    btn.title = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  }
}

function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem("cvlis_theme"); } catch (e) {}
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (prefersDark ? "dark" : "light"));
  const btn = $("#themeBtn");
  if (btn) btn.onclick = () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    toast(next === "dark" ? "Dark mode on." : "Light mode on.", "info", 1600);
  };
}

/* ---------- Accordion ---------- */
function initAccordion(root) {
  (root || document).querySelectorAll(".acc-head").forEach((head) => {
    if (head.dataset.bound) return;
    head.dataset.bound = "1";
    head.addEventListener("click", () => {
      const acc = head.closest(".acc");
      if (!acc) return;
      const wasOpen = acc.classList.contains("open");
      if (acc.parentElement) acc.parentElement.querySelectorAll(".acc.open").forEach((a) => a.classList.remove("open"));
      acc.classList.toggle("open", !wasOpen);
    });
  });
}

/* ---------- Reveal on scroll ---------- */
function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  items.forEach((el) => io.observe(el));
}

/* ---------- Animated counters ---------- */
function animateCounters() {
  document.querySelectorAll("[data-count]").forEach((el) => {
    if (el.dataset.done) return;
    el.dataset.done = "1";
    const target = Number(el.dataset.count) || 0;
    const duration = 900;
    const start = performance.now();
    const suffix = el.dataset.suffix || "";
    function tick(t) {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString("en-PH") + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

/* ---------- Live clock ---------- */
function initClock() {
  const el = $("#liveClock");
  if (!el) return;
  const update = () => {
    const now = new Date();
    el.textContent = now.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" }) +
      " · " + now.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
  };
  update();
  setInterval(update, 30000);
}

/* ---------- Back to top ---------- */
function initBackTop() {
  const btn = $("#backTop");
  if (!btn) return;
  window.addEventListener("scroll", () => {
    btn.classList.toggle("show", window.scrollY > 500);
  }, { passive: true });
  btn.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- Global UI init ---------- */
function initUI() {
  initTheme();
  initClock();
  initBackTop();
  initReveal();
  animateCounters();
  initAccordion();

  const dlg = $("#modal");
  if (dlg) {
    dlg.addEventListener("click", (e) => { if (e.target === dlg) closeModal(); });
    dlg.addEventListener("close", () => {
      if (activeModalOnClose) {
        const fn = activeModalOnClose;
        activeModalOnClose = null;
        try { fn(); } catch (e) {}
      }
    });
  }
  const mx = $("#modalX");
  if (mx) mx.onclick = closeModal;

  document.addEventListener("keydown", (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || tag === "select";
    if (e.key === "Escape") {
      const menu = $("#nav");
      if (menu && menu.classList.contains("open")) toggleMenu(false);
      return;
    }
    if (typing) return;
    if (e.key === "/") {
      const search = document.querySelector(".view.on [data-search]") || $("[data-search]");
      if (search) { e.preventDefault(); search.focus(); }
    }
    if (e.key.toLowerCase() === "m") {
      const menu = $("#nav");
      if (menu) toggleMenu(!menu.classList.contains("open"));
    }
  });
}
