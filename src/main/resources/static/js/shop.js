/* shop.js
   Full client script: products, auth UI, per-user cart, and login handling.
*/

/* ---------- Small helpers ---------- */
function onId(id, cb) {
  const el = document.getElementById(id);
  if (!el) return null;
  try { cb(el); } catch (e) { console.error('handler error for', id, e); }
  return el;
}
function onSel(sel, cb) {
  const el = document.querySelector(sel);
  if (!el) return null;
  try { cb(el); } catch (e) { console.error('handler error for', sel, e); }
  return el;
}
function escapeHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ---------- JWT parsing ---------- */
function parseJwt(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (payload.length % 4) payload += '=';
    const json = decodeURIComponent(atob(payload).split('').map(function(c){
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

/* ---------- Auth-aware fetch ---------- */
async function fetchWithAuth(url, opts = {}) {
  opts.headers = opts.headers || {};

  const token = localStorage.getItem('token');
  if (token && token.trim() !== '' && token !== 'null' && token !== 'undefined') {
    opts.headers['Authorization'] = 'Bearer ' + token;
  }

  if (opts.body && !(opts.body instanceof FormData) && !opts.headers['Content-Type']) {
    opts.headers['Content-Type'] = 'application/json';
  }

  return fetch(url, opts);
}


function handleUnauthorizedResponse(res) {
  if (res && res.status === 401) {
    console.warn('Unauthorized response — clearing token and updating UI.');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    updateAuthUI();
    return true;
  }
  return false;
}

/* ---------- CART (localStorage) - per-user carts ---------- */
const GUEST_CART_KEY = 'cart_guest';

function currentCartKey() {
  const username = localStorage.getItem('username');
  if (username) return `cart_user_${username}`;
  const token = localStorage.getItem('token');
  if (token) {
    const decoded = parseJwt(token) || {};
    const id = decoded.sub || decoded.username || decoded.name || decoded.id;
    if (id) return `cart_user_${id}`;
  }
  return GUEST_CART_KEY;
}

function getCart() {
  const key = currentCartKey();
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch (e) {
    console.warn('Invalid cart JSON for key', key, e);
    return [];
  }
}

function setCart(cart) {
  const key = currentCartKey();
  localStorage.setItem(key, JSON.stringify(cart || []));
  updateCartCount();
}

function updateCartCount() {
  const cart = getCart();
  const count = cart.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  const el = document.getElementById('cartCount');
  if (el) el.textContent = count;
}

function migrateGuestCartToUser() {
  const username = localStorage.getItem('username');
  if (!username) return;
  const guest = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]');
  if (!guest || guest.length === 0) return;
  const userKey = `cart_user_${username}`;
  const userCart = JSON.parse(localStorage.getItem(userKey) || '[]');
  const map = new Map();
  userCart.forEach(i => map.set(String(i.productId), { ...i }));
  guest.forEach(g => {
    const pid = String(g.productId);
    if (map.has(pid)) {
      map.get(pid).quantity = (Number(map.get(pid).quantity) || 0) + (Number(g.quantity) || 0);
    } else {
      map.set(pid, { ...g });
    }
  });
  const merged = Array.from(map.values());
  localStorage.setItem(userKey, JSON.stringify(merged));
  localStorage.removeItem(GUEST_CART_KEY);
}

/* ---------- AUTH UI (improved) ---------- */
function createNavUserElement(name) {
  const span = document.createElement('span');
  span.id = 'navUser';
  span.style.display = 'inline-block';
  span.style.marginLeft = '10px';
  const initial = escapeHtml((name || 'U').charAt(0).toUpperCase());
  span.innerHTML = `<span class="nav-avatar" aria-hidden="true" style="display:inline-block;width:28px;height:28px;border-radius:50%;background:#e8f6e9;color:#1b5e20;text-align:center;line-height:28px;margin-right:8px">${initial}</span>
                    <span class="nav-username">${escapeHtml(name)}</span>
                    <button id="btnLogout" class="btn small" style="margin-left:8px">Logout</button>`;
  return span;
}

function safeAttachLogout(btn) {
  if (!btn) return;
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    updateAuthUI();
    updateCartCount();
    renderCartItems();
    window.location = '/';
  });
}

function hideHeroAuthIfPresent() {
  const sel = '.hero-actions a[href="/auth.html"], .hero-actions a[href$="auth.html"]';
  document.querySelectorAll(sel).forEach(a => {
    a.style.display = 'none';
    a.setAttribute('aria-hidden', 'true');
  });
}
function showHeroAuthIfNeeded() {
  const sel = '.hero-actions a[href="/auth.html"], .hero-actions a[href$="auth.html"]';
  document.querySelectorAll(sel).forEach(a => {
    a.style.display = '';
    a.removeAttribute('aria-hidden');
  });
}

function updateAuthUI() {
  try {
    const token = localStorage.getItem('token');
    const decoded = parseJwt(token) || {};
    const usernameStored = localStorage.getItem('username');
    const username = usernameStored || decoded.username || decoded.sub || decoded.name || 'Me';
    const navAuth = document.getElementById('navAuth');
    const navAdmin = document.getElementById('navAdmin');

    if (token && decoded) {
      if (navAuth) navAuth.style.display = 'none';
      hideHeroAuthIfPresent();

      let navUser = document.getElementById('navUser');
      if (!navUser) {
        navUser = createNavUserElement(username);
        const nav = document.querySelector('.top-nav');
        const cartBtn = document.getElementById('cartBtn');
        if (nav && cartBtn) nav.insertBefore(navUser, cartBtn);
        else if (nav) nav.appendChild(navUser);
      } else {
        const usernameSpan = navUser.querySelector('.nav-username');
        if (usernameSpan) usernameSpan.textContent = username;
        else navUser.innerHTML = `Me (${escapeHtml(username)}) <button id="btnLogout" class="btn small">Logout</button>`;
      }

      safeAttachLogout(document.getElementById('btnLogout'));

      const roles = decoded.roles || decoded.authorities || decoded.role || [];
      const roleArray = Array.isArray(roles) ? roles : (typeof roles === 'string' ? [roles] : []);
      const isAdmin = roleArray.some(r => String(r).toUpperCase().includes('ADMIN'));
      if (navAdmin) navAdmin.style.display = isAdmin ? 'inline-block' : 'none';
    } else {
      if (navAuth) navAuth.style.display = 'inline-block';
      showHeroAuthIfNeeded();
      const navUser = document.getElementById('navUser');
      if (navUser) navUser.remove();
      if (navAdmin) navAdmin.style.display = 'none';
    }
  } catch (e) {
    console.error('updateAuthUI error', e);
  }
}

window.addEventListener('storage', (e) => {
  if (e.key === 'token' || e.key === 'username') {
    updateAuthUI();
    updateCartCount();
    renderCartItems();
  }
});

/* ---------- CART (UI + manipulation) ---------- */
function renderCartItems() {
  const list = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');
  if (!list || !totalEl) return;
  const cart = getCart();
  list.innerHTML = '';
  if (!cart.length) {
    list.innerHTML = '<p>Your cart is empty.</p>';
    totalEl.textContent = '0.00';
    return;
  }
  let total = 0;
  cart.forEach(item => {
    const itemTotal = (Number(item.price) || 0) * (item.quantity || 0);
    total += itemTotal;
    const row = document.createElement('div');
    row.className = 'cart-item-row';
    row.dataset.productId = String(item.productId);
    row.innerHTML = `
      <div class="cart-item-info">
        <div class="cart-item-name">${escapeHtml(item.name)}</div>
        <div class="cart-item-price">₹ ${Number(item.price).toFixed(2)} × <span class="cart-item-qty">${item.quantity}</span> = <strong class="cart-item-sub">${itemTotal.toFixed(2)}</strong></div>
      </div>
      <div class="cart-item-controls">
        <button class="btn small decrease-btn" title="Decrease">−</button>
        <button class="btn small increase-btn" title="Increase">+</button>
        <button class="btn small danger remove-btn" title="Remove">Remove</button>
      </div>
    `;
    list.appendChild(row);
  });
  totalEl.textContent = total.toFixed(2);
}

function changeQuantity(productId, delta) {
  const cart = getCart();
  const idx = cart.findIndex(i => String(i.productId) === String(productId));
  if (idx === -1) return;
  cart[idx].quantity = (cart[idx].quantity || 0) + delta;
  if (cart[idx].quantity <= 0) cart.splice(idx, 1);
  setCart(cart);
  renderCartItems();
}
function removeItem(productId) {
  const cart = getCart();
  const idx = cart.findIndex(i => String(i.productId) === String(productId));
  if (idx === -1) return;
  cart.splice(idx, 1);
  setCart(cart);
  renderCartItems();
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.increase-btn, .decrease-btn, .remove-btn');
  if (!btn) return;
  const row = btn.closest('.cart-item-row');
  if (!row) return;
  const pid = row.dataset.productId;
  if (!pid) return;
  if (btn.classList.contains('increase-btn')) {
    changeQuantity(pid, +1);
  } else if (btn.classList.contains('decrease-btn')) {
    changeQuantity(pid, -1);
  } else if (btn.classList.contains('remove-btn')) {
    if (confirm('Remove this item from cart?')) removeItem(pid);
  }
});

/* open/close cart */
onId('cartBtn', (btn) => {
  btn.addEventListener('click', () => {
    const drawer = document.getElementById('cartDrawer');
    if (!drawer) return;
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    btn.setAttribute('aria-expanded', 'true');
    renderCartItems();
  });
});
onId('closeCart', (btn) => {
  btn.addEventListener('click', () => {
    const drawer = document.getElementById('cartDrawer');
    if (!drawer) return;
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) cartBtn.setAttribute('aria-expanded', 'false');
  });
});

/* add-to-cart */
function addToCart(product) {
  const cart = getCart();
  const found = cart.find(i => String(i.productId) === String(product.id));
  if (found) found.quantity++;
  else cart.push({ productId: product.id, name: product.name, price: product.price, quantity: 1 });
  setCart(cart);
  updateCartCount();
  alert('Added "' + product.name + '" to cart');
}

/* ---------- PRODUCTS listing ---------- */
async function loadAll(q = '') {
  const url = q ? `/api/products/search?q=${encodeURIComponent(q)}` : '/api/products';
  try {
    const res = await fetchWithAuth(url);
    if (handleUnauthorizedResponse(res)) return;
    if (!res.ok) {
      const txt = await res.text();
      console.warn('Failed to load products', res.status, txt);
      renderProducts([]);
      return;
    }
    const text = await res.text();
    const products = text ? JSON.parse(text) : [];
    renderProducts(products);
  } catch (err) {
    console.error(err);
    renderProducts([]);
  }
}


// inside your existing shop.js replace renderProducts with this version
// improved renderProducts - shows price, stock, category, image and Add to cart
function renderProducts(products) {
  const container = document.getElementById('products');
  if (!container) return;
  container.innerHTML = '';

  // small helper to format price (fallbacks to 'N/A')
  function fmtPrice(v) {
    if (v === null || v === undefined || v === '') return 'N/A';
    const n = Number(v);
    return Number.isFinite(n) ? `₹ ${n.toFixed(2)}` : 'N/A';
  }

  products.forEach(p => {
    const card = document.createElement('article');
    card.className = 'card product-card';
    card.dataset.productId = String(p.id ?? p.productId ?? '');

    const imgHtml = p.image
      ? `<div class="card-image"><img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name || 'product')}" style="width:100%;height:140px;object-fit:cover;border-radius:8px 8px 0 0;"></div>`
      : '';

    const nameHtml = `<h3 class="product-name" style="margin:8px 0 4px">${escapeHtml(p.name || 'Untitled')}</h3>`;
    const descHtml = `<div class="product-desc" style="color:#556;min-height:36px">${escapeHtml(p.description || '')}</div>`;

    const metaParts = [];
    if (p.category) metaParts.push(escapeHtml(p.category));
    if (p.stock !== undefined && p.stock !== null) metaParts.push(`Stock: ${escapeHtml(String(p.stock))}`);
    const metaHtml = metaParts.length ? `<div class="product-meta" style="font-size:0.9em;margin-top:6px">${metaParts.join(' • ')}</div>` : '';

    const priceHtml = `<div class="product-price" style="font-weight:700;margin-top:10px">${fmtPrice(p.price)}</div>`;

    const btnHtml = `<div style="margin-top:10px">
        <button class="btn small add-to-cart" data-id="${escapeHtml(String(p.id ?? p.productId ?? ''))}">Add to cart</button>
      </div>`;

    card.innerHTML = `
      ${imgHtml}
      <div style="padding:12px">
        ${nameHtml}
        ${descHtml}
        ${metaHtml}
        ${priceHtml}
        ${btnHtml}
      </div>
    `;

    // attach click handler for add-to-cart button (use the product object itself)
    const btn = card.querySelector('.add-to-cart');
    if (btn) {
      btn.addEventListener('click', () => {
        // use the product object so addToCart has name, price, id
        addToCart({
          id: p.id ?? p.productId,
          name: p.name,
          price: p.price,
        });
      });
    }

    container.appendChild(card);
  });
}



/* ---------- small utils & events ---------- */
function showMessage(msg) { console.info(msg); }

onId('btnSearch', (btn) => {
  btn.addEventListener('click', () => {
    const q = (document.getElementById('search')?.value || '').trim();
    loadAll(q);
  });
});
onId('btnRefresh', (btn) => {
  btn.addEventListener('click', () => loadAll());
});
onId('checkoutBtn', (btn) => {
  btn.addEventListener('click', () => alert('Checkout not implemented'));
});

/* ---------- LOGIN (example) ---------- */
async function login(username, password) {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error('Login failed: ' + res.status + ' ' + txt);
    }
    const json = await res.json();
    handleLoginResponse(json);
    return true;
  } catch (err) {
    console.error('login error', err);
    alert('Login failed: ' + (err.message || 'unknown'));
    return false;
  }
}

function handleLoginResponse(json) {
  const token = json.token || json.accessToken || json.jwt;
  const username = json.username || (json.user && json.user.username) || (parseJwt(token) && (parseJwt(token).username || parseJwt(token).sub));
  if (!token) {
    console.error('No token in login response', json);
    alert('Login response missing token');
    return;
  }

  localStorage.setItem('token', token);
  if (username) localStorage.setItem('username', username);

  // migrate guest cart into this user's cart (optional)
  migrateGuestCartToUser();

  updateAuthUI();
  updateCartCount();
  renderCartItems();
}

/* ---------- Init on load ---------- */
updateCartCount();
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  loadAll();
  renderCartItems();

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const form = ev.target;
      const username = form.querySelector('[name="username"]')?.value;
      const password = form.querySelector('[name="password"]')?.value;
      if (!username || !password) {
        alert('Please enter username and password');
        return;
      }
      await login(username, password);
      window.location = '/';
    });
  }
});