"use strict";
(async () => {
  const box = document.getElementById("product-detail");
  const id = new URLSearchParams(location.search).get("id");
  const products = await getProducts();
  const p = products.find(x => String(x.id) === String(id));
  if (!p) {
    box.innerHTML = `<div class="empty">Product not found.<br><br><a class="btn primary" href="index.html#shop">Back to shop</a></div>`;
    return;
  }
  document.title = `${p.name} | Srikala Organics`;
  const out = !(Number(p.stock) > 0);
  box.innerHTML = `
    <div class="detail-grid">
      <div class="product-img detail-img"><img src="${safe(productImage(p))}" alt="${safe(p.name)}" width="400" height="400"></div>
      <div>
        <span class="eyebrow">SRIKALA ORGANICS</span>
        <h1>${safe(p.name)}</h1>
        <div class="weight">${safe(p.weight || "")}</div>
        <p class="desc detail-desc">${safe(p.description || "")}</p>
        <div class="price detail-price">${money(p.price)}</div>
        <p class="stock${out ? " out" : ""}">${out ? "Out of stock" : Number(p.stock) + " available"}</p>
        <div class="detail-actions">
          <button class="btn primary" type="button" id="add"${out ? " disabled" : ""}>${out ? "Sold out" : "Add to cart"}</button>
          <a class="text-btn" href="index.html#shop">← Keep shopping</a>
        </div>
      </div>
    </div>`;
  const add = document.getElementById("add");
  if (add) add.addEventListener("click", () => addToCart(p));
})();
