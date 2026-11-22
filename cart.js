"use strict";
function renderCart() {
  const box = document.getElementById("cart-items"), foot = document.getElementById("cart-footer");
  if (!box) return;
  const c = cart();
  updateCartCount();
  if (!c.length) {
    box.innerHTML = '<div class="empty">Your cart is empty.<br><br><a class="btn primary" href="index.html#shop">Continue shopping</a></div>';
    foot.innerHTML = "";
    return;
  }
  let total = 0;
  box.innerHTML = c.map((p, i) => {
    const t = p.price * p.quantity; total += t;
    return `<div class="cart-row">
      <img src="${safe(p.image_url || imageByName(p.name))}" alt="${safe(p.name)}" width="72" height="72">
      <div><strong>${safe(p.name)}</strong><div class="weight">${safe(p.weight || "")}</div></div>
      <div class="qty"><button type="button" data-act="dec" data-i="${i}" aria-label="Decrease quantity of ${safe(p.name)}">−</button><b>${p.quantity}</b><button type="button" data-act="inc" data-i="${i}" aria-label="Increase quantity of ${safe(p.name)}">+</button></div>
      <strong>${money(t)}</strong>
      <button class="remove" type="button" data-act="rm" data-i="${i}">Remove</button>
    </div>`;
  }).join("");
  foot.innerHTML = `<div class="cart-total">Total: ${money(total)}</div>
    <p class="fine-print">Payment: Cash on Delivery. Delivery and final prices are confirmed when your order is placed.</p>
    <div class="cart-cta"><a class="btn primary" href="checkout.html">Proceed to checkout →</a></div>`;
}

function changeQty(i, d) {
  const c = cart();
  if (!c[i]) return;
  const next = c[i].quantity + d;
  if (next <= 0) c.splice(i, 1);
  else if (next > c[i].stock) { toast("Maximum available stock reached.", "error"); return; }
  else c[i].quantity = next;
  saveCart(c); renderCart();
}
function removeItem(i) { const c = cart(); c.splice(i, 1); saveCart(c); renderCart(); }

document.addEventListener("DOMContentLoaded", () => {
  renderCart();
  document.getElementById("cart-items").addEventListener("click", e => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const i = Number(b.dataset.i);
    if (b.dataset.act === "inc") changeQty(i, 1);
    else if (b.dataset.act === "dec") changeQty(i, -1);
    else removeItem(i);
  });
});
