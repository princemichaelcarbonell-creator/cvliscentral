/* =====================================================================
   AUTH — sign up, log in, profile, change password
   ===================================================================== */

let authMode = "login";
let currentUser = null;

function isAdminSession() {
  return !!currentUser && currentUser.role === "admin";
}

function setAuthMode(mode) {
  authMode = mode;
  const nameRow = $("#nameRow");
  if (nameRow) nameRow.style.display = mode === "sign" ? "block" : "none";
  const msg = $("#aMsg");
  if (msg) { msg.textContent = ""; msg.className = "msg"; }
  const tLogin = $("#tLogin");
  const tSign = $("#tSign");
  if (tLogin) tLogin.classList.toggle("on", mode === "login");
  if (tSign) tSign.classList.toggle("on", mode === "sign");
  const go = $("#aGo");
  if (go) go.textContent = mode === "sign" ? "Create account" : "Log in";
  const title = $("#authTitle");
  if (title) title.textContent = mode === "sign" ? "Create your account" : "Welcome back";
  setTimeout(() => { const f = $("#aEmail"); if (f) f.focus(); }, 60);
}

function openAuth(mode) {
  setAuthMode(mode);
  const dlg = $("#dlg");
  if (dlg && !dlg.open) dlg.showModal();
}

function openA(mode) { openAuth(mode); }

function refreshAuthUI() {
  const logged = !!currentUser;
  const who = $("#who");
  const avatar = $("#avatar");
  if (who) who.textContent = logged ? currentUser.name.split(" ")[0] : "";
  if (avatar) {
    avatar.textContent = logged ? initials(currentUser.name) : "";
    avatar.style.display = logged ? "inline-grid" : "none";
    avatar.title = logged ? currentUser.name + " · " + currentUser.role : "";
  }
  ["#loginBtn", "#signBtn"].forEach((sel) => { const el = $(sel); if (el) el.style.display = logged ? "none" : ""; });
  ["#profileBtn", "#logoutBtn"].forEach((sel) => { const el = $(sel); if (el) el.style.display = logged ? "" : "none"; });
  const userChip = $("#userChip");
  if (userChip) userChip.classList.toggle("on", logged);
}

function showLoggedIn(user) {
  currentUser = user;
  refreshAuthUI();
  if ($("#rName")) $("#rName").value = user.name;
  if ($("#rEmail")) $("#rEmail").value = user.email;
  if ($("#aPass")) $("#aPass").value = "";
  const dlg = $("#dlg");
  if (dlg && dlg.open) dlg.close();
  applyAdminState(isAdminSession());
}

async function logout() {
  try { await api("/logout", { method: "POST" }); } catch (e) {}
  currentUser = null;
  refreshAuthUI();
  if ($("#rName")) $("#rName").value = "";
  if ($("#rEmail")) $("#rEmail").value = "";
  applyAdminState(false);
  go("home");
  toast("You are logged out.", "info", 1800);
}

async function submitAuth() {
  const email = $("#aEmail").value.trim().toLowerCase();
  const pass = $("#aPass").value;
  const name = $("#aName").value.trim();

  const setMsg = (text, ok) => {
    const msg = $("#aMsg");
    if (!msg) return;
    msg.textContent = text;
    msg.className = "msg " + (ok ? "ok-text" : "err-text");
  };

  if (!email || !pass || (authMode === "sign" && !name)) {
    setMsg("Please fill in all fields.", false);
    return;
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    setMsg("Please enter a valid email address.", false);
    return;
  }
  if (authMode === "sign" && pass.length < 8) {
    setMsg("Password must be at least 8 characters.", false);
    return;
  }

  const btn = $("#aGo");
  const original = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Please wait…';
  setMsg("", false);
  try {
    const data = authMode === "sign"
      ? await api("/signup", { method: "POST", body: { name, email, password: pass } })
      : await api("/login", { method: "POST", body: { email, password: pass } });

    showLoggedIn(data.user);
    toast(authMode === "sign" ? "Account created. Welcome!" : "Welcome back, " + data.user.name.split(" ")[0] + "!", "success");
    setAuthMode("login");
    setTimeout(() => { if ($("#aPass")) $("#aPass").value = ""; }, 30);
  } catch (e) {
    setMsg(e.message, false);
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

/* ---------- Profile modal ---------- */
function openProfile() {
  if (!currentUser) return openAuth("login");
  const isAdmin = isAdminSession();
  openModal(
    "My account",
    '<div class="profile-top">' +
      '<div class="avatar lg">' + esc(initials(currentUser.name)) + "</div>" +
      "<div><b>" + esc(currentUser.name) + "</b><br><small>" + esc(currentUser.email) + "</small>" +
      '<div class="chips" style="margin-top:8px"><span class="tag">' + (isAdmin ? "Admin" : "Student") + "</span></div></div>" +
    "</div>" +
    '<hr class="sep">' +
    '<h4 class="mini-title">Update display name</h4>' +
    '<div class="inline-form"><input id="pfName" value="' + esc(currentUser.name) + '" maxlength="100">' +
    '<button id="pfSaveName">Save</button></div>' +
    '<h4 class="mini-title" style="margin-top:22px">Change password</h4>' +
    '<label>Current password<input id="pfOld" type="password" autocomplete="current-password"></label>' +
    '<label>New password (min 8 characters)<input id="pfNew" type="password" autocomplete="new-password"></label>' +
    '<div class="form-actions" style="margin-top:14px"><button id="pfSavePass">Update password</button>' +
    '<button class="btn-secondary" onclick="closeModal()">Close</button></div>' +
    (isAdmin ? '<div style="margin-top:16px"><button class="btn-secondary" onclick="closeModal();go(\'admin\')">Open Admin Panel</button></div>' : "")
  );

  $("#pfSaveName").onclick = async () => {
    const name = $("#pfName").value.trim();
    if (!name) return toast("Please enter your name.", "error");
    try {
      const data = await api("/me", { method: "PUT", body: { name } });
      currentUser = data.user;
      refreshAuthUI();
      toast("Name updated.", "success");
      closeModal();
    } catch (e) { toast(e.message, "error"); }
  };

  $("#pfSavePass").onclick = async () => {
    const current = $("#pfOld").value;
    const next = $("#pfNew").value;
    if (!current || !next) return toast("Fill in both password fields.", "error");
    if (next.length < 8) return toast("New password must be at least 8 characters.", "error");
    const btn = $("#pfSavePass");
    setLoading(btn, true, "Updating…");
    try {
      await api("/me/password", { method: "POST", body: { current, next } });
      toast("Password updated. Use it next time you log in.", "success");
      closeModal();
    } catch (e) {
      toast(e.message, "error");
      setLoading(btn, false);
    }
  };
}

function fillDemo(role) {
  openAuth("login");
  const isAdmin = role === "admin";
  $("#aEmail").value = isAdmin ? "admin@cvlis.edu" : "student@cvlis.edu";
  $("#aPass").value = isAdmin ? "Cvlis@2026" : "Student@123";
  const msg = $("#aMsg");
  if (msg) {
    msg.textContent = isAdmin ? "Demo admin loaded. Tap Log in to continue." : "Demo student loaded. Tap Log in to continue.";
    msg.className = "msg";
  }
}

function forgotPassword() {
  openModal("Forgot password?",
    '<p style="color:var(--mut);margin-top:0">For security, passwords cannot be recovered automatically. Ask the school admin to reset your password, or create a new account with another email for the demo.</p>' +
    '<div class="form-actions"><a class="btn-link" href="mailto:' + esc(SETTINGS.registrarEmail) + '?subject=Password%20reset%20request">Email the registrar</a>' +
    '<button class="btn-secondary" onclick="closeModal()">Close</button></div>');
}

async function initAuth() {
  refreshAuthUI();

  const loginBtn = $("#loginBtn");
  const signBtn = $("#signBtn");
  const logoutBtn = $("#logoutBtn");
  const profileBtn = $("#profileBtn");
  if (loginBtn) loginBtn.onclick = () => openAuth("login");
  if (signBtn) signBtn.onclick = () => openAuth("sign");
  if (logoutBtn) logoutBtn.onclick = logout;
  if (profileBtn) profileBtn.onclick = openProfile;

  const tLogin = $("#tLogin");
  const tSign = $("#tSign");
  const aX = $("#aX");
  const aGo = $("#aGo");
  if (tLogin) tLogin.onclick = () => setAuthMode("login");
  if (tSign) tSign.onclick = () => setAuthMode("sign");
  if (aX) aX.onclick = () => $("#dlg").close();
  if (aGo) aGo.onclick = submitAuth;

  const dlg = $("#dlg");
  if (dlg) {
    dlg.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.tagName !== "BUTTON") { e.preventDefault(); submitAuth(); }
    });
    dlg.addEventListener("close", () => {
      const msg = $("#aMsg");
      if (msg) msg.textContent = "";
    });
  }

  const demo = $("#demoAdminBtn");
  if (demo) demo.onclick = () => {
    setAuthMode("login");
    $("#aEmail").value = "admin@cvlis.edu";
    $("#aPass").value = "Cvlis@2026";
    const msg = $("#aMsg");
    if (msg) { msg.textContent = "Demo admin loaded. Tap Log in to continue."; msg.className = "msg"; }
  };

  const forgot = $("#forgotBtn");
  if (forgot) forgot.onclick = forgotPassword;

  // Restore session if any
  try {
    const data = await api("/me");
    if (data.user) showLoggedIn(data.user);
  } catch (e) { /* no session */ }
}
