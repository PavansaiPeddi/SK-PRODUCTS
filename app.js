"use strict";
/* Srikala Organics — shared storefront code (catalogue, cart, header behaviour) */

const IMAGE_BY_KEYWORD = [
  ["honey", "images/honey.svg"],
  ["turmeric", "images/turmeric.svg"],
  ["haldi", "images/turmeric.svg"],
  ["peanut", "images/peanut.svg"],
  ["rice", "images/brownrice.svg"]
];
const PLACEHOLDER_IMAGE = "images/placeholder.svg";

/* Sample catalogue, shown only when the live store cannot be reached.
   Items flagged `demo` can be browsed but not ordered. */
const fallbackProducts = [
  { id: "demo-honey", demo: true, name: "Pure Honey", price: 299, weight: "500g", stock: 50, description: "Naturally sourced honey with no added sugar.", image_url: "images/honey.svg" },
  { id: "demo-turmeric", demo: true, name: "Turmeric", price: 149, weight: "250g", stock: 75, description: "Quality turmeric powder for everyday cooking.", image_url: "images/turmeric.svg" },
  { id: "demo-peanut", demo: true, name: "Peanut Butter", price: 249, weight: "500g", stock: 40, description: "Roasted peanut butter made for everyday use.", image_url: "images/peanut.svg" },
  { id: "demo-rice", demo: true, name: "Brown Rice", price: 199, weight: "1 kg", stock: 40, description: "Minimally processed brown rice.", image_url: "images/brownrice.svg" }
];

/* ---------- helpers ---------- */
function safe(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}
function money(n) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }
function isDemoId(id) { return String(id).startsWith("demo-"); }

function imageByName(name) {
  const n = String(name || "").toLowerCase();
  const hit = IMAGE_BY_KEYWORD.find(([k]) => n.includes(k));
  return hit ? hit[1] : PLACEHOLDER_IMAGE;
}
function productImage(p) { return p.image_url || imageByName(p.name); }

/* If an image fails to load (missing/empty file), fall back to a name-based
   illustration, then to the generic placeholder. `error` doesn't bubble, so capture it. */
document.addEventListener("error", e => {
  const img = e.target;
  if (!img || img.tagName !== "IMG") return;
  const step = Number(img.dataset.fb || 0);
  if (step === 0) { img.dataset.fb = "1"; img.src = imageByName(img.alt); }
  else if (step === 1) { img.dataset.fb = "2"; img.src = PLACEHOLDER_IMAGE; }
}, true);

/* ---------- toast ---------- */
function toast(message, type) {
  let box = document.getElementById("toast-box");
  if (!box) {
    box = document.createElement("div");
    box.id = "toast-box";
    box.setAttribute("role", "status");
    box.setAttribute("aria-live", "polite");
    document.body.appendChild(box);
  }
  const t = document.createElement("div");
  t.className = "toast" + (type === "error" ? " toast-error" : "");
  t.textContent = message;
  box.appendChild(t);
  setTimeout(() => { t.classList.add("hide"); setTimeout(() => t.remove(), 300); }, 2600);
}

/* ---------- cart (localStorage) ---------- */
function cart() {
  try {
    const raw = JSON.parse(localStorage.getItem("cart") || "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(p => p && p.id != null && Number.isFinite(Number(p.price)) && Number(p.quantity) > 0)
      .map(p => ({ ...p, price: Number(p.price), quantity: Math.floor(Number(p.quantity)), stock: Number(p.stock) || 999 }));
  } catch (e) { return []; }
}
function saveCart(c) {
  try { localStorage.setItem("cart", JSON.stringify(c)); } catch (e) { toast("Could not save your cart (browser storage is blocked).", "error"); }
  updateCartCount();
}
function updateCartCount() {
  const n = cart().reduce((s, p) => s + p.quantity, 0);
  document.querySelectorAll(".cart-count").forEach(e => { e.textContent = n; });
}
function addToCart(p, qty) {
  qty = qty || 1;
  const stock = Number(p.stock);
  if (!(stock > 0)) { toast(`${p.name} is out of stock.`, "error"); return; }
  const c = cart();
  const existing = c.find(x => String(x.id) === String(p.id));
  const have = existing ? existing.quantity : 0;
  if (have + qty > stock) { toast("Maximum available stock reached.", "error"); return; }
  if (existing) { existing.quantity += qty; existing.stock = stock; }
  else c.push({ id: p.id, name: p.name, price: Number(p.price), weight: p.weight || "", image_url: productImage(p), quantity: qty, stock });
  saveCart(c);
  toast(`${p.name} added to cart.`);
}

/* ---------- catalogue ---------- */
async function getProducts() {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/products?active=eq.true&select=*&order=name.asc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      signal: ctl.signal
    });
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    if (Array.isArray(data) && data.length) { window.srikalaOffline = false; return data; }
  } catch (e) {
    console.warn("Live products unavailable; showing sample catalogue.", e);
  } finally { clearTimeout(timer); }
  window.srikalaOffline = true;
  return fallbackProducts;
}

function productCard(p) {
  const out = !(Number(p.stock) > 0);
  return `
    <article class="product-card">
      <a class="product-img" href="product.html?id=${encodeURIComponent(p.id)}" aria-label="View ${safe(p.name)}"><img src="${safe(productImage(p))}" alt="${safe(p.name)}" loading="lazy" width="300" height="225"></a>
      <div class="product-body">
        <h3>${safe(p.name)}</h3><div class="weight">${safe(p.weight || "")}</div>
        <p class="desc">${safe(p.description || "Quality everyday essential.")}</p>
        <div class="price-row"><span class="price">${money(p.price)}</span><span class="stock${out ? " out" : ""}">${out ? "Out of stock" : Number(p.stock) + " in stock"}</span></div>
        <div class="card-actions">
          <a class="small-btn" href="product.html?id=${encodeURIComponent(p.id)}">View</a>
          <button class="add-btn" type="button" data-id="${safe(p.id)}"${out ? " disabled" : ""}>${out ? "Sold out" : "Add to cart"}</button>
        </div>
      </div>
    </article>`;
}

async function loadProducts() {
  const box = document.getElementById("products");
  if (!box) return;
  const products = await getProducts();
  box.innerHTML = products.map(productCard).join("");
  box.addEventListener("click", e => {
    const b = e.target.closest(".add-btn");
    if (!b) return;
    const p = products.find(x => String(x.id) === String(b.dataset.id));
    if (p) addToCart(p);
  });
  const note = document.getElementById("offline-note");
  if (note) note.hidden = !window.srikalaOffline;
}

/* ---------- header ---------- */
function setupHeader() {
  const user = (() => { try { return JSON.parse(localStorage.getItem("srikala_user") || "null"); } catch (e) { return null; } })();
  document.querySelectorAll("[data-account-link]").forEach(a => {
    a.textContent = user ? "My Account" : "Login";
    a.setAttribute("href", user ? "account.html" : "auth.html");
  });
  const btn = document.getElementById("menu-btn"), nav = document.getElementById("mobile-nav");
  if (btn && nav) {
    btn.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
      btn.textContent = open ? "✕" : "☰";
    });
    nav.addEventListener("click", e => { if (e.target.closest("a")) { nav.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); btn.textContent = "☰"; } });
  }
}

document.addEventListener("DOMContentLoaded", () => { setupHeader(); updateCartCount(); loadProducts(); });
