SRIKALA ORGANICS — STOREFRONT
=============================

A static website (HTML/CSS/JavaScript) that talks to your Supabase project.
No build step. Open the folder in VS Code and use "Live Server" on index.html
(or run:  python3 -m http.server 8000  and visit http://localhost:8000).

PAGES
  index.html           Home + product catalogue
  product.html?id=...  Product details
  cart.html            Cart (quantity +/-, remove)
  checkout.html        Delivery details + places the order
  auth.html            Customer login / create account
  account.html         Customer account (name, email, logout)
  signup-success.html  "Check your email" page after sign-up
  admin.html           Private order dashboard (not linked from the public menu)

FILES
  config.js            Supabase URL + publishable key (safe to be public — see "Security")
  app.js               Shared code: catalogue, cart, toasts, header/menu
  product.js cart.js checkout.js auth.js admin.js   Page-specific code
  style.css            All styling (responsive: phone / tablet / desktop)
  images/              Product illustrations (SVG) + favicon
  tests/e2e.py         Automated browser tests (see "Testing")

WHAT SUPABASE MUST PROVIDE
  Table  products   columns used: id, name, price, weight, stock, description, image_url, active
  RPC    create_order(p_customer_name, p_phone, p_address, p_city, p_pin, p_items)
           p_items = [{product_id, quantity}]   -> returns JSON containing order_id
           It must work out prices and check/reduce stock ON THE SERVER.
  RPC    get_admin_orders()
  RPC    get_admin_order_items(p_order_id)
  RPC    update_order_status(p_order_id, p_status)   statuses: Pending, Confirmed, Shipped, Delivered, Cancelled
  Auth   email + password enabled (email confirmation on or off both work)

SECURITY — PLEASE READ
  * The key in config.js is a *publishable* key; it is meant to be in browser code.
    What actually protects your data is Row Level Security (RLS) and your RPC functions.
  * Make sure RLS is ON for the orders / order items tables, and that get_admin_orders,
    get_admin_order_items and update_order_status check that the caller is an admin
    (the admin page cannot enforce this by itself).
  * Never put a "secret"/service_role key in any file in this folder.
  * Pages use a Content-Security-Policy that only allows this site's scripts and your Supabase
    project. If you change the Supabase URL, update it in config.js AND in the CSP <meta> tag of each page.

PRODUCT IMAGES
  If a product has no image_url (or the file is missing), the site shows a matching illustration
  from images/ (honey, turmeric, peanut, rice) or a neutral placeholder. To use real photos,
  put them in images/ and set image_url (e.g. images/honey.jpg) on the product in Supabase,
  or use a full https:// URL.

PAYMENT
  Currently available: Cash on Delivery (shown on cart, checkout, summary and confirmation).
  Online payment (UPI / cards) is NOT enabled. It needs a payment-gateway account (e.g. Razorpay),
  secret keys kept on the server (a Supabase Edge Function), payment verification before an order
  is marked paid, and a payment_method / payment_status column on the orders table.
  Do not put gateway secret keys in any file in this folder.

OFFLINE BEHAVIOUR
  If the live catalogue can't be loaded, a SAMPLE catalogue is shown with a notice. Sample items can
  be browsed but cannot be ordered (they don't exist in your database).

TESTING
  pip install playwright && playwright install chromium
  python tests/e2e.py
  The tests mock Supabase, so they verify this site's code and flows, not your real database.
