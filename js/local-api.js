/* =====================================================================
   LOCAL API — offline / demo mode
   Kapag hindi available ang server (hal. double-click lang ang index.html),
   dito naka-save ang lahat sa localStorage ng browser. Kapareho ang
   endpoints ng totoong server para hindi magbago ang front-end code.
   NOTE: demo lang ito. Para sa totoong multi-user, patakbuhin ang server.
   ===================================================================== */

const LocalAPI = (() => {
  const KEY = "cvlis_local_db_v3";
  const HASH_SALT = "cvlis-demo";

  function hashPass(pw) {
    const s = HASH_SALT + ":" + String(pw);
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
  }

  const emailOk = (e) => /^\S+@\S+\.\S+$/.test(e);
  const now = () => new Date().toISOString();

  function seed() {
    const adminId = 1;
    const studentId = 2;
    return {
      version: 3,
      sessionUserId: null,
      seq: { users: 2, news: 9, events: 8, requests: 3, messages: 0 },
      settings: { ...DEFAULT_SETTINGS },
      pollVotes: [],
      users: [
        { id: adminId, name: "School Principal", email: "admin@cvlis.edu", password: hashPass("Cvlis@2026"), role: "admin", createdAt: now() },
        { id: studentId, name: "Maria Santos", email: "student@cvlis.edu", password: hashPass("Student@123"), role: "student", createdAt: now() }
      ],
      news: DEFAULT_NEWS.map((n, i) => ({ id: i + 1, month: n[0], day: n[1], title: n[2], text: n[3], tag: n[4], createdAt: now() })),
      events: DEFAULT_EVENTS.map((e, i) => ({ id: i + 1, month: e[0], day: e[1], title: e[2], place: e[3], time: e[4], createdAt: now() })),
      requests: [
        {
          id: 1, ref: "CVL-2026-0001", userId: studentId, name: "Maria Santos", lrn: "107001230",
          email: "student@cvlis.edu", phone: "09171234567", grade: "Grade 10",
          document: "Good Moral Certificate", copies: 1,
          purpose: "Requirement for a scholarship application", notes: "",
          status: "ready", adminNote: "Ready at the registrar window. Bring your school ID.",
          createdAt: "2026-10-20T08:30:00.000Z", updatedAt: "2026-10-22T09:00:00.000Z"
        },
        {
          id: 2, ref: "CVL-2026-0002", userId: null, name: "Juan Dela Cruz", lrn: "107001231",
          email: "juan@example.com", phone: "", grade: "Grade 12",
          document: "Form 137 / SF10", copies: 2,
          purpose: "College application requirement", notes: "Will pick up on a Friday.",
          status: "processing", adminNote: "Verifying records with the JHS office.",
          createdAt: "2026-10-23T10:15:00.000Z", updatedAt: "2026-10-24T13:20:00.000Z"
        },
        {
          id: 3, ref: "CVL-2026-0003", userId: studentId, name: "Maria Santos", lrn: "107001230",
          email: "student@cvlis.edu", phone: "09171234567", grade: "Grade 10",
          document: "Certificate of Enrollment", copies: 1,
          purpose: "ID application", notes: "",
          status: "pending", adminNote: "",
          createdAt: "2026-10-25T07:45:00.000Z", updatedAt: "2026-10-25T07:45:00.000Z"
        }
      ],
      messages: []
    };
  }

  let db = null;

  function load() {
    if (db) return db;
    try {
      const raw = localStorage.getItem(KEY);
      db = raw ? JSON.parse(raw) : null;
    } catch (e) { db = null; }
    if (!db || db.version !== 3) db = seed();
    save();
    return db;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {
      console.warn("Local storage is full. Some demo data may not be saved.", e);
    }
  }

  function nextId(table) {
    db.seq[table] = (db.seq[table] || 0) + 1;
    return db.seq[table];
  }

  function me() {
    const d = load();
    return d.users.find((u) => u.id === d.sessionUserId) || null;
  }

  function publicUser(u) {
    return u ? { id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt } : null;
  }

  function requireUser() {
    const u = me();
    if (!u) throw new Error("Please log in first.");
    return u;
  }

  function requireAdmin() {
    const u = requireUser();
    if (u.role !== "admin") throw new Error("Admins only.");
    return u;
  }

  function makeRef() {
    const d = load();
    let n = d.seq.requests + 1;
    let ref;
    do {
      ref = "CVL-" + new Date().getFullYear() + "-" + String(n).padStart(4, "0");
      n++;
    } while (d.requests.some((r) => r.ref === ref));
    return ref;
  }

  function sortNewest(list) {
    return [...list].sort((a, b) => b.id - a.id);
  }

  function pollState(voter) {
    const d = load();
    const options = Array.isArray(d.settings.pollOptions) ? d.settings.pollOptions : DEFAULT_SETTINGS.pollOptions;
    const counts = options.map((_, i) => d.pollVotes.filter((v) => v.option === i).length);
    const total = counts.reduce((a, b) => a + b, 0);
    const mine = voter ? d.pollVotes.find((v) => v.voter === voter) : null;
    return {
      question: d.settings.pollQuestion || DEFAULT_SETTINGS.pollQuestion,
      options,
      counts,
      total,
      myVote: mine ? mine.option : null
    };
  }

  function stats() {
    const d = load();
    const by = (s) => d.requests.filter((r) => r.status === s).length;
    return {
      requests: d.requests.length,
      pending: by("pending"),
      processing: by("processing"),
      ready: by("ready"),
      released: by("released"),
      rejected: by("rejected"),
      news: d.news.length,
      events: d.events.length,
      users: d.users.length,
      admins: d.users.filter((u) => u.role === "admin").length,
      unreadMessages: d.messages.filter((m) => !m.read).length
    };
  }

  function everyoneSettings() {
    const d = load();
    return {
      ...DEFAULT_SETTINGS,
      ...d.settings,
      pollOptions: Array.isArray(d.settings.pollOptions) && d.settings.pollOptions.length
        ? d.settings.pollOptions : [...DEFAULT_SETTINGS.pollOptions]
    };
  }

  function handle(pathAndQuery, options = {}) {
    load();
    const method = (options.method || "GET").toUpperCase();
    const qi = pathAndQuery.indexOf("?");
    const path = qi === -1 ? pathAndQuery : pathAndQuery.slice(0, qi);
    const params = new URLSearchParams(qi === -1 ? "" : pathAndQuery.slice(qi + 1));
    const body = options.body || {};
    const d = db;

    /* ---------- health ---------- */
    if (path === "/health" && method === "GET") {
      return { ok: true, storage: "local", demo: true };
    }

    /* ---------- auth ---------- */
    if (path === "/signup" && method === "POST") {
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!name || !email || !password) throw new Error("Please fill in all fields.");
      if (!emailOk(email)) throw new Error("Please enter a valid email address.");
      if (password.length < 8) throw new Error("Password must be at least 8 characters.");
      if (d.users.some((u) => u.email === email)) throw new Error("Account already exists. Try logging in.");
      const user = { id: nextId("users"), name, email, password: hashPass(password), role: "student", createdAt: now() };
      d.users.push(user);
      d.sessionUserId = user.id;
      save();
      return { user: publicUser(user) };
    }

    if (path === "/login" && method === "POST") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const user = d.users.find((u) => u.email === email);
      if (!user || user.password !== hashPass(password)) throw new Error("Wrong email or password.");
      d.sessionUserId = user.id;
      save();
      return { user: publicUser(user) };
    }

    if (path === "/logout" && method === "POST") {
      d.sessionUserId = null;
      save();
      return { ok: true };
    }

    if (path === "/me" && method === "GET") return { user: publicUser(me()) };

    if (path === "/me" && method === "PUT") {
      const u = requireUser();
      const name = String(body.name || "").trim();
      if (!name || name.length > 100) throw new Error("Please enter a valid name.");
      u.name = name;
      save();
      return { user: publicUser(u) };
    }

    if (path === "/me/password" && method === "POST") {
      const u = requireUser();
      if (u.password !== hashPass(String(body.current || ""))) throw new Error("Current password is wrong.");
      const next = String(body.next || "");
      if (next.length < 8) throw new Error("New password must be at least 8 characters.");
      u.password = hashPass(next);
      save();
      return { ok: true };
    }

    /* ---------- announcements ---------- */
    if (path === "/news" && method === "GET") return sortNewest(d.news);

    if (path === "/news" && method === "POST") {
      requireAdmin();
      const n = validateNews(body);
      const item = { id: nextId("news"), ...n, createdAt: now() };
      d.news.push(item);
      save();
      return { ok: true, item };
    }

    const newsId = path.match(/^\/news\/(\d+)$/);
    if (newsId && method === "PUT") {
      requireAdmin();
      const item = d.news.find((n) => n.id === Number(newsId[1]));
      if (!item) throw new Error("Announcement not found.");
      Object.assign(item, validateNews(body));
      save();
      return { ok: true, item };
    }
    if (newsId && method === "DELETE") {
      requireAdmin();
      d.news = d.news.filter((n) => n.id !== Number(newsId[1]));
      save();
      return { ok: true };
    }

    /* ---------- events ---------- */
    if (path === "/events" && method === "GET") return sortNewest(d.events);

    if (path === "/events" && method === "POST") {
      requireAdmin();
      const e = validateEvent(body);
      const item = { id: nextId("events"), ...e, createdAt: now() };
      d.events.push(item);
      save();
      return { ok: true, item };
    }

    const evId = path.match(/^\/events\/(\d+)$/);
    if (evId && method === "PUT") {
      requireAdmin();
      const item = d.events.find((e) => e.id === Number(evId[1]));
      if (!item) throw new Error("Event not found.");
      Object.assign(item, validateEvent(body));
      save();
      return { ok: true, item };
    }
    if (evId && method === "DELETE") {
      requireAdmin();
      d.events = d.events.filter((e) => e.id !== Number(evId[1]));
      save();
      return { ok: true };
    }

    /* ---------- document requests ---------- */
    if (path === "/requests" && method === "POST") {
      const user = me();
      const q = validateRequest(body);
      const ref = makeRef();
      const item = {
        id: nextId("requests"), ref, userId: user ? user.id : null,
        ...q, status: "pending", adminNote: "", createdAt: now(), updatedAt: now()
      };
      d.requests.push(item);
      save();
      return { ok: true, request: item };
    }

    if ((path === "/requests" || path === "/requests/mine") && method === "GET") {
      const user = requireUser();
      let list = user.role === "admin" ? [...d.requests] : d.requests.filter((r) => r.userId === user.id);
      const status = params.get("status");
      const term = (params.get("q") || "").toLowerCase();
      if (status && status !== "all") list = list.filter((r) => r.status === status);
      if (term) {
        list = list.filter((r) =>
          [r.ref, r.name, r.email, r.document, r.lrn, r.status].join(" ").toLowerCase().includes(term));
      }
      return sortNewest(list);
    }

    const track = path.match(/^\/requests\/track\/([A-Za-z0-9-]+)$/);
    if (track && method === "GET") {
      const user = me();
      const ref = track[1].toUpperCase();
      const item = d.requests.find((r) => r.ref.toUpperCase() === ref);
      if (!item) throw new Error("No request found for that reference code.");
      const email = String(params.get("email") || "").trim().toLowerCase();
      const owner = user && (user.role === "admin" || item.userId === user.id);
      if (!owner && (!email || email !== item.email.toLowerCase())) {
        throw new Error("Reference code and email do not match.");
      }
      return { request: item };
    }

    const reqStatus = path.match(/^\/requests\/(\d+)\/status$/);
    if (reqStatus && method === "PUT") {
      requireAdmin();
      const item = d.requests.find((r) => r.id === Number(reqStatus[1]));
      if (!item) throw new Error("Request not found.");
      const status = String(body.status || "");
      if (!STATUS_FLOW.some((s) => s.key === status)) throw new Error("Invalid status.");
      item.status = status;
      item.adminNote = String(body.note || "").trim().slice(0, 500);
      item.updatedAt = now();
      save();
      return { ok: true, request: item };
    }

    const reqId = path.match(/^\/requests\/(\d+)$/);
    if (reqId && method === "DELETE") {
      requireAdmin();
      d.requests = d.requests.filter((r) => r.id !== Number(reqId[1]));
      save();
      return { ok: true };
    }

    /* ---------- settings ---------- */
    if (path === "/settings" && method === "GET") return everyoneSettings();

    if (path === "/settings" && method === "PUT") {
      requireAdmin();
      const allowed = ["schoolName", "shortName", "tagline", "registrarEmail", "phone", "address", "hours", "logo", "pollQuestion"];
      allowed.forEach((k) => {
        if (typeof body[k] === "string") d.settings[k] = body[k].trim().slice(0, k === "logo" ? 4000000 : 500);
      });
      if (Array.isArray(body.pollOptions)) {
        d.settings.pollOptions = body.pollOptions.map((o) => String(o).trim().slice(0, 80)).filter(Boolean).slice(0, 8);
        if (d.settings.pollOptions.length < 2) d.settings.pollOptions = [...DEFAULT_SETTINGS.pollOptions];
        d.pollVotes = [];
      }
      if (body.resetLogo) d.settings.logo = "";
      save();
      return { ok: true, settings: everyoneSettings() };
    }

    /* ---------- poll ---------- */
    if (path === "/poll" && method === "GET") {
      return pollState(params.get("voter") || "");
    }

    if (path === "/poll/vote" && method === "POST") {
      const voter = String(body.voter || "").trim().slice(0, 64);
      const option = Number(body.option);
      if (!voter) throw new Error("Missing voter id.");
      if (!Number.isInteger(option) || option < 0) throw new Error("Invalid option.");
      const options = everyoneSettings().pollOptions;
      if (option >= options.length) throw new Error("Invalid option.");
      if (d.pollVotes.some((v) => v.voter === voter)) throw new Error("You have already voted.");
      d.pollVotes.push({ voter, option, createdAt: now() });
      save();
      return { ok: true, ...pollState(voter) };
    }

    if (path === "/poll/reset" && method === "POST") {
      requireAdmin();
      d.pollVotes = [];
      save();
      return { ok: true, ...pollState("") };
    }

    /* ---------- messages ---------- */
    if (path === "/messages" && method === "POST") {
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const subject = String(body.subject || "").trim();
      const text = String(body.body || "").trim();
      if (!name || !email || !subject || !text) throw new Error("Please fill in all fields.");
      if (!emailOk(email)) throw new Error("Please enter a valid email address.");
      const item = {
        id: nextId("messages"), name, email, subject,
        body: text.slice(0, 2000), read: false, createdAt: now()
      };
      d.messages.push(item);
      save();
      return { ok: true, message: item };
    }

    if (path === "/messages" && method === "GET") {
      requireAdmin();
      return sortNewest(d.messages);
    }

    const msgRead = path.match(/^\/messages\/(\d+)\/read$/);
    if (msgRead && method === "PUT") {
      requireAdmin();
      const item = d.messages.find((m) => m.id === Number(msgRead[1]));
      if (item) { item.read = true; save(); }
      return { ok: true };
    }

    const msgId = path.match(/^\/messages\/(\d+)$/);
    if (msgId && method === "DELETE") {
      requireAdmin();
      d.messages = d.messages.filter((m) => m.id !== Number(msgId[1]));
      save();
      return { ok: true };
    }

    /* ---------- users ---------- */
    if (path === "/users" && method === "GET") {
      requireAdmin();
      return d.users.map(publicUser).sort((a, b) => a.id - b.id);
    }

    const userId = path.match(/^\/users\/(\d+)$/);
    if (userId && method === "PUT") {
      const admin = requireAdmin();
      const user = d.users.find((u) => u.id === Number(userId[1]));
      if (!user) throw new Error("User not found.");
      if (body.role && ["student", "admin"].includes(body.role)) {
        if (user.id === admin.id && body.role !== "admin") throw new Error("You cannot remove your own admin role.");
        if (user.role === "admin" && body.role !== "admin" && d.users.filter((u) => u.role === "admin").length <= 1) {
          throw new Error("At least one admin is required.");
        }
        user.role = body.role;
      }
      if (body.password) {
        if (String(body.password).length < 8) throw new Error("Password must be at least 8 characters.");
        user.password = hashPass(String(body.password));
      }
      save();
      return { ok: true, user: publicUser(user) };
    }

    if (userId && method === "DELETE") {
      const admin = requireAdmin();
      const id = Number(userId[1]);
      if (id === admin.id) throw new Error("You cannot delete your own account.");
      const user = d.users.find((u) => u.id === id);
      if (user && user.role === "admin" && d.users.filter((u) => u.role === "admin").length <= 1) {
        throw new Error("At least one admin is required.");
      }
      d.users = d.users.filter((u) => u.id !== id);
      if (d.sessionUserId === id) d.sessionUserId = null;
      save();
      return { ok: true };
    }

    /* ---------- dashboard stats ---------- */
    if (path === "/stats" && method === "GET") {
      requireAdmin();
      return stats();
    }

    if (path === "/reset-demo" && method === "POST") {
      requireAdmin();
      db = seed();
      db.sessionUserId = null;
      save();
      return { ok: true };
    }

    throw new Error("This action is not available in offline demo mode.");
  }

  function validateNews(body) {
    const month = String(body.month || "").trim().toUpperCase();
    const day = String(body.day || "").trim();
    const title = String(body.title || "").trim();
    const text = String(body.text || "").trim();
    const tag = String(body.tag || "").trim() || "General";
    if (!month || !day || !title || !text) throw new Error("Please fill in month, day, title, and description.");
    if (!/^[A-Z]{3}$/.test(month) || !/^\d{1,2}$/.test(day)) throw new Error("Month should be 3 letters (e.g. AUG). Day should be 1–2 digits.");
    if (title.length > 200 || text.length > 1000 || tag.length > 50) throw new Error("One of the fields is too long.");
    return { month, day, title, text, tag };
  }

  function validateEvent(body) {
    const month = String(body.month || "").trim().toUpperCase();
    const day = String(body.day || "").trim();
    const title = String(body.title || "").trim();
    const place = String(body.place || "").trim();
    const time = String(body.time || "").trim();
    if (!month || !day || !title || !place) throw new Error("Please fill in month, day, title, and place.");
    if (!/^[A-Z]{3}$/.test(month) || !/^\d{1,2}$/.test(day)) throw new Error("Month should be 3 letters (e.g. SEP). Day should be 1–2 digits.");
    if (title.length > 200 || place.length > 200 || time.length > 40) throw new Error("One of the fields is too long.");
    return { month, day, title, place, time };
  }

  function validateRequest(body) {
    const name = String(body.name || "").trim();
    const lrn = String(body.lrn || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const grade = String(body.grade || "").trim();
    const doc = String(body.document || "").trim();
    const copies = Math.max(1, Math.min(5, Number(body.copies) || 1));
    const purpose = String(body.purpose || "").trim();
    const notes = String(body.notes || "").trim();
    if (!name || !lrn || !email || !doc || !purpose) throw new Error("Please fill in the required fields.");
    if (!emailOk(email)) throw new Error("Please enter a valid email address.");
    if (!/^\d{9}$/.test(lrn)) throw new Error("Please enter a valid 9-digit LRN.");
    if (purpose.length < 5) throw new Error("Please describe the purpose (at least 5 characters).");
    if (purpose.length > 500 || notes.length > 500) throw new Error("One of the fields is too long.");
    return { name, lrn, email, phone, grade, document: doc, copies, purpose, notes };
  }

  return { handle, reset: () => { localStorage.removeItem(KEY); db = null; load(); } };
})();
