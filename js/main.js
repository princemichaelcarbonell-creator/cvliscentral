/* ===== START-UP: runs once the page has loaded ===== */

function initContactForm() {
  const form = $("#contactForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#cName").value.trim();
    const email = $("#cEmail").value.trim().toLowerCase();
    const subject = $("#cSubject").value.trim();
    const body = $("#cBody").value.trim();
    if (!name || !email || !subject || !body) return toast("Please fill in all fields.", "error");
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast("Please enter a valid email address.", "error");
    const btn = $("#cSend");
    setLoading(btn, true, "Sending…");
    try {
      await api("/messages", { method: "POST", body: { name, email, subject, body } });
      form.reset();
      if (currentUser) { $("#cName").value = currentUser.name; $("#cEmail").value = currentUser.email; }
      toast("Message sent. The school office will get back to you.", "success");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setLoading(btn, false);
    }
  });
}

function initHomeSearch() {
  const box = $("#homeSearch");
  if (!box) return;
  box.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const q = box.value.trim();
    newsQuery = q;
    go("news");
    setTimeout(() => { const s = $("#newsSearch"); if (s) s.value = q; renderNewsPage(); }, 60);
  });
  const btn = $("#homeSearchBtn");
  if (btn) btn.onclick = () => {
    const q = box.value.trim();
    newsQuery = q;
    go("news");
    setTimeout(() => { const s = $("#newsSearch"); if (s) s.value = q; renderNewsPage(); }, 60);
  };
}

(async function start() {
  await detectApiMode();

  await loadSettings();
  await loadNewsEvents();

  renderAll();
  initNav();
  initUI();
  initRenderControls();
  initRequest();
  initContactForm();
  initHomeSearch();

  await initAuth();
  await initAdmin();
  await loadPoll();
  await refreshMyRequests();

  if (currentUser) {
    if ($("#cName")) $("#cName").value = currentUser.name;
    if ($("#cEmail")) $("#cEmail").value = currentUser.email;
    if ($("#trackEmail") && !$("#trackEmail").value) $("#trackEmail").value = currentUser.email;
  }

  // reveal anything na na-render pagkatapos ng unang init
  setTimeout(initReveal, 120);
  setTimeout(animateCounters, 150);

  console.log("%cCVLIS Central ready", "color:#d9b44a;font-weight:bold", "· mode:", API.mode);
})();
