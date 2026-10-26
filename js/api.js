/* =====================================================================
   API CLIENT
   Gumagamit ng totoong server kung available. Kung hindi (hal. bukas lang
   ang index.html), awtomatikong lumilipat sa offline local mode.
   ===================================================================== */

const API = { mode: "detect", storage: "unknown", demo: false };

function getVoterId() {
  try {
    let id = localStorage.getItem("cvlis_voter");
    if (!id) {
      id = "v-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("cvlis_voter", id);
    }
    return id;
  } catch (e) {
    return "v-anon";
  }
}

async function detectApiMode() {
  if (location.protocol === "file:") {
    API.mode = "local";
    API.storage = "local";
    API.demo = true;
    return API;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch("/api/health", {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      API.mode = "server";
      API.storage = data.storage || "server";
      API.demo = false;
      return API;
    }
  } catch (e) { /* server not running — use local */ }
  API.mode = "local";
  API.storage = "local";
  API.demo = true;
  return API;
}

async function api(path, options = {}) {
  if (API.mode === "local") {
    await wait(90); // maliit na delay para hindi "bigla" ang UI
    return LocalAPI.handle(path, options);
  }

  const res = await fetch("/api" + path, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "same-origin",
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let data = {};
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    const err = new Error(data.error || "Something went wrong. Please try again.");
    err.status = res.status;
    throw err;
  }
  return data;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* Short label para sa mode indicator sa footer/help */
function apiModeLabel() {
  return API.mode === "server"
    ? "Server mode · " + API.storage
    : "Offline demo mode · data saved in this browser";
}
