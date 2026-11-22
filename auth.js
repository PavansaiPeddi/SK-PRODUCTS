"use strict";
/* Customer sign-up / login / account. Used by auth.html and account.html. */
const TOKEN_KEY = "srikala_access_token", USER_KEY = "srikala_user";
const authHeaders = () => ({ apikey: SUPABASE_KEY, "Content-Type": "application/json" });

function storeSession(data) {
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}
function clearSession() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }
function errorText(data, fallback) { return data.error_description || data.msg || data.message || fallback; }

async function loginUser(email, password) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ email, password }) });
  const data = await r.json();
  if (!r.ok) throw new Error(errorText(data, "Login failed"));
  storeSession(data);
  return data.user;
}

async function signupUser(name, email, password) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ email, password, data: { full_name: name } }) });
  const data = await r.json();
  if (!r.ok) throw new Error(errorText(data, "Account creation failed"));
  // Supabase answers "success" for an already-registered email but returns a user with no identities.
  const user = data.user || data;
  if (user && Array.isArray(user.identities) && user.identities.length === 0) throw new Error("An account with this email already exists. Please log in instead.");
  if (data.access_token) storeSession(data);
  return data;
}

async function logoutUser() {
  const token = localStorage.getItem(TOKEN_KEY);
  clearSession();
  if (token) { try { await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` } }); } catch (e) { /* best effort */ } }
  window.location.href = "index.html";
}

function setMessage(text, type) {
  const m = document.getElementById("auth-message");
  if (!m) return;
  m.textContent = text || "";
  m.className = text ? (type === "error" ? "error" : "success") : "";
  m.setAttribute("role", type === "error" ? "alert" : "status");
}

function initAuthPage() {
  const loginTab = document.getElementById("login-tab"), signupTab = document.getElementById("signup-tab");
  const loginForm = document.getElementById("login-form"), signupForm = document.getElementById("signup-form");
  if (!loginForm || !signupForm) return;

  function show(which) {
    const login = which === "login";
    loginTab.classList.toggle("active", login); signupTab.classList.toggle("active", !login);
    loginTab.setAttribute("aria-selected", String(login)); signupTab.setAttribute("aria-selected", String(!login));
    loginForm.hidden = !login; signupForm.hidden = login;
    setMessage("");
  }
  loginTab.addEventListener("click", () => show("login"));
  signupTab.addEventListener("click", () => show("signup"));
  if (location.hash === "#signup") show("signup");

  if (localStorage.getItem(TOKEN_KEY)) setMessage("You are already logged in.", "ok");

  loginForm.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = loginForm.querySelector("button[type=submit]");
    btn.disabled = true; setMessage("Logging in…", "ok");
    try {
      await loginUser(document.getElementById("login-email").value.trim(), document.getElementById("login-password").value);
      setMessage("Login successful!", "ok");
      setTimeout(() => { window.location.href = "account.html"; }, 600);
    } catch (err) { setMessage(err.message, "error"); btn.disabled = false; }
  });

  signupForm.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = signupForm.querySelector("button[type=submit]");
    btn.disabled = true; setMessage("Creating account…", "ok");
    try {
      const data = await signupUser(document.getElementById("signup-name").value.trim(), document.getElementById("signup-email").value.trim(), document.getElementById("signup-password").value);
      setMessage(data.access_token ? "Account created successfully!" : "Account created! Redirecting…", "ok");
      setTimeout(() => { window.location.href = data.access_token ? "account.html" : "signup-success.html"; }, 700);
    } catch (err) { setMessage(err.message, "error"); btn.disabled = false; }
  });
}

async function initAccountPage() {
  const nameEl = document.getElementById("account-name"), emailEl = document.getElementById("account-email");
  if (!nameEl || !emailEl) return;
  const token = localStorage.getItem(TOKEN_KEY);
  let user = null;
  try { user = JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch (e) { /* ignore */ }
  if (!token || !user) { window.location.href = "auth.html"; return; }

  // Confirm with Supabase that the saved login is still valid.
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` } });
    if (r.status === 401 || r.status === 403) { clearSession(); window.location.href = "auth.html"; return; }
    if (r.ok) { user = await r.json(); localStorage.setItem(USER_KEY, JSON.stringify(user)); }
  } catch (e) { /* offline: keep showing the saved details */ }

  const name = (user.user_metadata && user.user_metadata.full_name) || (user.email || "").split("@")[0] || "Customer";
  nameEl.textContent = "Name: " + name;
  emailEl.textContent = "Email: " + (user.email || "");
  document.getElementById("logout-btn").addEventListener("click", logoutUser);
}

document.addEventListener("DOMContentLoaded", () => { initAuthPage(); initAccountPage(); });
