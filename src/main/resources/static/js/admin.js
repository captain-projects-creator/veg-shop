// admin.js - admin UI for creating/updating products with image file
(function () {
  function el(id) { return document.getElementById(id); }
  function showStatus(msg, ok = true) {
    const s = el('statusMessage');
    if (!s) return;
    s.textContent = msg;
    s.style.color = ok ? '#1f9b4b' : '#e74c3c';
    setTimeout(() => { if (s) s.textContent = ''; }, 6000);
  }

  // helper used across admin script
  async function fetchWithAuth(url, opts = {}) {
    opts = opts || {};
    opts.headers = opts.headers || {};
    const token = localStorage.getItem('token');
    if (token) {
      opts.headers['Authorization'] = 'Bearer ' + token;
    }
    return fetch(url, opts);
  }

  async function removeProduct(id){
    if (!confirm('Delete product #' + id + '?')) return;

    try {
      const token = localStorage.getItem('token');
      console.debug('[removeProduct] id=', id, ' token present=', !!token);
      if (!token) {
        alert('You are not logged in. Please login as admin.');
        window.location = '/auth.html';
        return;
      }

      // Build request (we keep it simple: DELETE with Authorization header)
      const url = '/api/admin/products/' + encodeURIComponent(id);
      const opts = { method: 'DELETE' };

      // For debugging: show headers we'll send (not sent to server)
      console.debug('[removeProduct] sending DELETE to', url);

      const res = await fetchWithAuth(url, opts);

      // Read response text for diagnostics
      const bodyText = await res.text();
      console.debug('[removeProduct] response', res.status, bodyText);

      if (res.ok) {
        alert('Deleted');
        loadAll();
        return;
      }

      // handle 401/403 explicitly
      if (res.status === 401 || res.status === 403) {
        // clear token and go to login
        console.warn('Delete returned', res.status, '- clearing token.');
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        alert('Not authorized to delete. Redirecting to login.');
        window.location = '/auth.html';
        return;
      }

      // otherwise show diagnostic message
      alert('Delete failed: ' + res.status + ' — ' + (bodyText || res.statusText));
    } catch (err) {
      console.error('Network error deleting product', err);
      alert('Network error while deleting. See console for details.');
    }
  }


  async function verifyAdminAccess() {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login as admin. Redirecting to login.');
      window.location = '/auth.html';
      return false;
    }
    try {
      const res = await fetchWithAuth('/api/auth/me');
      if (!res.ok) {
        localStorage.removeItem('token'); localStorage.removeItem('username');
        alert('Not authorized. Redirecting to login.');
        window.location = '/auth.html';
        return false;
      }
      const json = await res.json();
      const roles = json.roles || json.authorities || json.role || [];
      const roleArray = Array.isArray(roles) ? roles : (typeof roles === 'string' ? [roles] : []);
      const isAdmin = roleArray.some(r => String(r).toUpperCase().includes('ADMIN'));
      if (!isAdmin) {
        alert('You do not have admin access. Redirecting to home.');
        window.location = '/';
        return false;
      }
      if (json.username) localStorage.setItem('username', json.username);
      return true;
    } catch (err) {
      console.error('verifyAdminAccess error', err);
      alert('Network error verifying admin. Redirecting to login.');
      window.location = '/auth.html';
      return false;
    }
  }

  async function loadAll() {
    try {
      const res = await fetchWithAuth('/api/products');
      if (!res.ok) { el('adminProducts').innerHTML = '<p>Failed to load</p>'; return; }
      const products = await res.json();
      const out = products.map(p => {
        const img = p.image ? `<img src="${p.image}" alt="${escapeHtml(p.name)}">` : '';
        return `<div class="card" data-id="${p.id}">
            ${img}
            <div style="flex:1">
              <h3>${escapeHtml(p.name)} <small style="color:#6b8a75"> (id: ${p.id})</small></h3>
              <p>${escapeHtml(p.description || '')}</p>
              <p style="margin-top:8px">₹ ${p.price || '—'} — stock: ${p.stock || 0}</p>
              <div class="actions" style="margin-top:8px">
                <button data-edit="${p.id}">Edit in form</button>
                <button data-delete="${p.id}" style="margin-left:8px" class="btn-danger">Delete</button>
              </div>
            </div>
          </div>`;
      }).join('');
      el('adminProducts').innerHTML = out || '<p>No products</p>';

      // attach handlers
      document.querySelectorAll('[data-edit]').forEach(b => {
        b.addEventListener('click', () => editInForm(b.getAttribute('data-edit')));
      });
      document.querySelectorAll('[data-delete]').forEach(b => {
        b.addEventListener('click', () => deleteProduct(b.getAttribute('data-delete')));
      });
    } catch (e) {
      console.error(e);
      el('adminProducts').innerHTML = '<p>Error loading products</p>';
    }
  }

  function escapeHtml(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  async function editInForm(id) {
    const res = await fetchWithAuth('/api/products/' + encodeURIComponent(id));
    if (!res.ok) { alert('Product not found'); return; }
    const p = await res.json();
    el('id').value = p.id || '';
    el('name').value = p.name || '';
    el('price').value = p.price || '';
    el('stock').value = p.stock || '';
    el('category').value = p.category || '';
    el('description').value = p.description || '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteProduct(id) {
    if (!confirm('Delete product #' + id + '?')) return;
    const res = await fetchWithAuth('/api/admin/products/' + encodeURIComponent(id), { method: 'DELETE' });
    if (res.ok) { showStatus('Deleted ' + id); loadAll(); } else {
      const txt = await res.text();
      showStatus('Delete failed: ' + (txt || res.status), false);
    }
  }

  // submit create/update form using multipart/form-data
  async function handleSave(ev) {
    ev.preventDefault();
    const id = el('id').value.trim();
    const productObj = {
      name: el('name').value.trim(),
      description: el('description').value.trim(),
      price: el('price').value ? Number(el('price').value) : null,
      stock: el('stock').value ? Number(el('stock').value) : 0,
      category: el('category').value || ''
    };
    if (!productObj.name) { showStatus('Name required', false); return; }

    const fd = new FormData();
    fd.append('product', new Blob([JSON.stringify(productObj)], { type: 'application/json' }));
    const fileEl = el('image');
    if (fileEl && fileEl.files && fileEl.files[0]) fd.append('image', fileEl.files[0]);

    const url = id ? '/api/admin/products/' + encodeURIComponent(id) : '/api/admin/products';
    const method = id ? 'PUT' : 'POST';
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
      const res = await fetch(url, { method, body: fd, headers });
      if (!res.ok) {
        const txt = await res.text();
        showStatus('Save failed: ' + (txt || res.status), false);
        return;
      }
      const saved = await res.json();
      showStatus((id ? 'Updated' : 'Created') + ' — ' + (saved.name || saved.id));
      el('productForm').reset();
      loadAll();
    } catch (err) {
      console.error(err);
      showStatus('Network error while saving', false);
    }
  }

  function clearForm() { el('productForm').reset(); }

  async function init() {
    const ok = await verifyAdminAccess();
    if (!ok) return;
    el('adminContent').classList.remove('hidden');
    el('btnRefresh').addEventListener('click', loadAll);
    el('btnClear').addEventListener('click', clearForm);
    el('productForm').addEventListener('submit', handleSave);
    loadAll();
  }

  window.addEventListener('load', init);
})();