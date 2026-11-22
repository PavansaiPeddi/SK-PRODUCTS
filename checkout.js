"use strict";
let placing = false;

function showSummary() {
  const c = cart(), s = document.getElementById("summary"), form = document.getElementById("checkout-form");
  if (!c.length) {
    s.innerHTML = '<p>Your cart is empty.</p><a class="text-btn" href="index.html#shop">Shop now →</a>';
    form.hidden = true;
    return;
  }
  form.hidden = false;
  let total = 0;
  s.innerHTML = c.map(p => {
    const t = p.price * p.quantity; total += t;
    return `<div class="summary-row"><span>${safe(p.name)} × ${p.quantity}</span><b>${money(t)}</b></div>`;
  }).join("") + `<div class="cart-total">${money(total)}</div>`;
}

function extractOrderId(r) {
  if (r == null) return "";
  if (typeof r === "string" || typeof r === "number") return String(r);
  if (Array.isArray(r)) return extractOrderId(r[0]);
  return String(r.order_id ?? r.id ?? "");
}

function friendlyError(status, bodyText) {
  let body = null;
  try { body = JSON.parse(bodyText); } catch (e) { /* not JSON */ }
  // P0001 = an error the order function raised on purpose (e.g. not enough stock), safe to show.
  if (body && body.code === "P0001" && body.message) return String(body.message).slice(0, 200);
  if (status === 404) return "The ordering service was not found. Please contact the store.";
  return "Something went wrong on our side. Please try again in a moment.";
}

async function placeOrder(e) {
  e.preventDefault();
  if (placing) return;
  const c = cart(), msg = document.getElementById("message"), btn = document.getElementById("place-btn");
  if (!c.length) return;

  if (c.some(p => isDemoId(p.id))) {
    msg.innerHTML = '<div class="error"><strong>These are sample products.</strong><br>The live store could not be reached when they were added, so they can’t be ordered. Please clear your cart and add products again once the shop loads normally.</div>';
    return;
  }
  const payment = (document.querySelector("input[name=payment]:checked") || {}).value;
  if (payment !== "cod") { msg.innerHTML = '<div class="error" role="alert">Please choose a payment method.</div>'; return; }
  const val = id => document.getElementById(id).value.trim();
  const body = {
  p_customer_name: val("name"),
  p_email: val("email"),
  p_phone: val("phone"),
  p_address: val("address"),
  p_city: val("city"),
  p_pin: val("pin"),
  p_items: c.map(p => ({
    product_id: String(p.id),
    quantity: Number(p.quantity)
  }))
};
  placing = true; btn.disabled = true; btn.textContent = "Placing order…";
  msg.innerHTML = '<div class="success" role="status">Placing your order…</div>';
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_order`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const text = await r.text();
    if (!r.ok) throw Object.assign(new Error(text), { status: r.status, bodyText: text });
    let result = text; try { result = JSON.parse(text); } catch (e) { /* plain text id */ }
    const id = extractOrderId(result);
    localStorage.removeItem("cart"); updateCartCount();
    document.getElementById("checkout-form").reset();
    msg.innerHTML = `<div class="success" role="status"><h3>Order placed successfully 🎉</h3><p>Thank you for shopping with Srikala Organics.</p><p>Payment: <strong>Cash on Delivery</strong> — please keep the amount ready when your order arrives.</p>${id ? `<p>Your Order ID: <strong>${safe(id)}</strong></p>` : ""}<a class="text-btn" href="index.html">Back to home →</a></div>`;
    showSummary();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    console.error(err);
    msg.innerHTML = `<div class="error" role="alert"><strong>Order could not be placed.</strong><br>${safe(friendlyError(err.status, err.bodyText))}</div>`;
  } finally {
    placing = false; btn.disabled = false; btn.textContent = "Place order →";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  showSummary();
  try { const u = JSON.parse(localStorage.getItem("srikala_user") || "null"); const n = u && u.user_metadata && u.user_metadata.full_name; if (n) document.getElementById("name").value = n; } catch (e) { /* ignore */ }
  document.getElementById("checkout-form").addEventListener("submit", placeOrder);
});
