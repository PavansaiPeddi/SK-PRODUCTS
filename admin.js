"use strict";
/* Admin dashboard. The access token is kept in memory only (closing/reloading the tab logs out).
   Who may read or change orders is enforced by Supabase (the RPC functions + row-level security),
   not by this page. */
let accessToken = "";
const STATUSES = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

const $ = id => document.getElementById(id);
const rpcHeaders = () => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" });
const rpc = (name, body) => fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { method: "POST", headers: rpcHeaders(), body: JSON.stringify(body || {}) });

function showLogin(message) {
  accessToken = "";
  $("dashboard").hidden = true; $("login").hidden = false;
  $("login-msg").textContent = message || "";
  $("password").value = "";
}

async function login(e) {
  e.preventDefault();
  const msg = $("login-msg"), btn = $("login-btn");
  msg.textContent = "Logging in…"; btn.disabled = true;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST", headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email: $("email").value.trim(), password: $("password").value })
    });
    const s = await r.json();
    if (!r.ok || !s.access_token) throw new Error("Login failed");
    accessToken = s.access_token;
    $("login").hidden = true; $("dashboard").hidden = false; msg.textContent = "";
    await loadOrders();
  } catch (err) {
    msg.textContent = "Invalid email or password.";
  } finally { btn.disabled = false; }
}

function orderCard(o) {
  const card = document.createElement("div");
  card.className = "panel admin-card";
  card.innerHTML = `
    <div class="admin-grid">
      <div><small>Order ID</small><strong class="break">${safe(o.id)}</strong></div>
      <div><small>Customer</small><strong>${safe(o.customer_name)}</strong></div>
      <div><small>Total</small><strong>${money(o.total)}</strong></div>
    </div>
    <p><strong>Phone:</strong> ${safe(o.phone)}</p>
    <p><strong>Address:</strong> ${safe(o.address)}, ${safe(o.city)} - ${safe(o.pin)}</p>
    <div class="order-items">Loading items…</div>
    <div class="status-row">
      <strong>Status:</strong>
      <select class="status-select" aria-label="Order status">${STATUSES.map(s => `<option>${s}</option>`).join("")}</select>
      <button class="small-btn update" type="button">Update</button>
      <span class="status-msg" role="status"></span>
    </div>
    <small>${safe(o.created_at ? new Date(o.created_at).toLocaleString() : "")}</small>`;
  const sel = card.querySelector(".status-select");
  sel.value = STATUSES.includes(o.status) ? o.status : "Pending";
  card.querySelector(".update").addEventListener("click", ev => updateStatus(o.id, card, ev.currentTarget));
  return card;
}

async function loadOrders() {
  const box = $("orders");
  box.innerHTML = '<div class="panel">Loading orders…</div>';
  try {
    const r = await rpc("get_admin_orders");
    if (r.status === 401) return showLogin("Your session expired. Please log in again.");
    const orders = await r.json();
    if (!r.ok) throw new Error(r.status === 403 ? "This account is not allowed to view orders." : (orders && orders.message) || "Request failed");
    if (!orders.length) { box.innerHTML = '<div class="panel empty">No orders found.</div>'; return; }
    box.innerHTML = "";
    for (const o of orders) {
      const card = orderCard(o);
      box.appendChild(card);
      loadItems(o.id, card.querySelector(".order-items"));
    }
  } catch (e) {
    box.innerHTML = `<div class="error" role="alert">Unable to load orders.<br>${safe(String(e.message).slice(0, 300))}</div>`;
  }
}

async function loadItems(id, box) {
  try {
    const r = await rpc("get_admin_order_items", { p_order_id: id });
    const items = await r.json();
    if (!r.ok) throw new Error("failed");
    box.innerHTML = (items || []).map(x => `<div class="order-item"><span>${safe(x.product_name)} × ${safe(x.quantity)}</span><b>${money(x.unit_price)} each</b></div>`).join("") || "No products found.";
  } catch (e) { box.textContent = "Unable to load order items."; }
}

async function updateStatus(id, card, btn) {
  const status = card.querySelector(".status-select").value, out = card.querySelector(".status-msg");
  btn.disabled = true; out.textContent = "Saving…"; out.className = "status-msg";
  try {
    const r = await rpc("update_order_status", { p_order_id: id, p_status: status });
    if (r.status === 401) return showLogin("Your session expired. Please log in again.");
    if (!r.ok) throw new Error("failed");
    out.textContent = "Saved ✓"; out.className = "status-msg ok";
  } catch (e) { out.textContent = "Update failed — try again."; out.className = "status-msg bad"; }
  finally { btn.disabled = false; }
}

document.addEventListener("DOMContentLoaded", () => {
  $("login-form").addEventListener("submit", login);
  $("logout").addEventListener("click", () => showLogin(""));
  $("refresh").addEventListener("click", loadOrders);
});
