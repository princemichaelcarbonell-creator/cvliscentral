/* ===== NAVIGATION: side menu at page switching ===== */

let currentView = "home";

function toggleMenu(open) {
  $("#nav").classList.toggle("open", open);
  $("#ov").classList.toggle("open", open);
}

function go(viewId, opts = {}) {
  if (!viewId) viewId = "home";
  if (viewId === "admin" && !(typeof isAdminSession === "function" && isAdminSession())) {
    viewId = "home";
    if (typeof toast === "function") toast("Admin Panel is for admin accounts only.", "warn");
  }
  currentView = viewId;
  toggleMenu(false);

  const target = document.getElementById(viewId);
  if (!target) { viewId = "home"; }

  $$(".view").forEach((v) => v.classList.toggle("on", v.id === viewId));
  $$("nav a").forEach((a) => a.classList.toggle("on", a.dataset.v === viewId));

  if (!opts.silent) {
    try { history.replaceState(null, "", viewId === "home" ? location.pathname : "#" + viewId); } catch (e) {}
  }
  window.scrollTo({ top: 0, behavior: opts.instant ? "auto" : "smooth" });

  // Page-specific refresh
  if (viewId === "news") renderNewsPage();
  if (viewId === "events") { renderCalendar(); renderEvents(); }
  if (viewId === "staff") renderStaff();
  if (viewId === "request" && typeof refreshMyRequests === "function") refreshMyRequests();
  if (viewId === "admin" && typeof loadAdminDashboard === "function") loadAdminDashboard();
  if (typeof initReveal === "function") setTimeout(initReveal, 40);
}

function initNav() {
  $("#burger").onclick = () => toggleMenu(!$("#nav").classList.contains("open"));
  $("#ov").onclick = () => toggleMenu(false);

  // Delegated — kaya gumagana din ang Admin link na dinadagdag later.
  $("#nav").addEventListener("click", (e) => {
    const link = e.target.closest("a[data-v]");
    if (link) go(link.dataset.v);
  });

  // Any element with data-go (buttons, quick action cards, footer links)
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-go]");
    if (trigger) {
      e.preventDefault();
      go(trigger.dataset.go);
    }
  });

  const start = (location.hash || "").replace("#", "");
  if (start && document.getElementById(start)) go(start, { silent: true, instant: true });
  else go("home", { silent: true, instant: true });

  window.addEventListener("hashchange", () => {
    const v = (location.hash || "").replace("#", "") || "home";
    if (v !== currentView) go(v, { silent: true, instant: true });
  });
}
