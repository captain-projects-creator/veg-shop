// /js/auth.js
const api = '/api/auth';

/* ---------- Small helpers ---------- */
function escapeHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showStatus(message, type = 'error') {
  const container = document.getElementById('statusMessage');
  if (!container) return;
  const cls = type === 'ok' ? 'message ok' : 'message error';
  container.innerHTML = `<div class="${cls}">${escapeHtml(message)}</div>`;
  // remove after a while
  setTimeout(() => { if (container.firstChild) container.removeChild(container.firstChild); }, 7000);
}

// parse JSON safely
function safeJson(text) {
  try { return text ? JSON.parse(text) : null; } catch (e) { return null; }
}

/* Parse JWT payload (client-side only, no validation) */
function parseJwt(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(payload).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

/* Do fetch and return { res, text, json, error } */
async function fetchSafe(url, opts = {}) {
  const result = { res: null, text: null, json: null, error: null };
  try {
    const res = await fetch(url, opts);
    result.res = res;
    const text = await res.text();
    result.text = text;
    result.json = safeJson(text);
  } catch (err) {
    result.error = err;
  }
  return result;
}

/* ---------- LOGIN ---------- */
document.getElementById('btnLogin')?.addEventListener('click', async () => {
  const btn = document.getElementById('btnLogin');
  btn.disabled = true;

  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;

  if (!username || !password) {
    showStatus('Please enter username and password');
    btn.disabled = false;
    return;
  }

  // POST JSON
  const { res, text, json, error } = await fetchSafe(api + '/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  btn.disabled = false;

  if (error) {
    showStatus('Network error: ' + error.message);
    console.error('Login network error', error);
    return;
  }

  if (!res.ok) {
    // try to show server JSON message if present
    let bodyText = '(no response body)';
    if (json && typeof json === 'object') bodyText = JSON.stringify(json);
    else if (text) bodyText = text;

    // give a friendly message for 401/403
    if (res.status === 401 || res.status === 403) {
      showStatus('Login failed: invalid credentials or access denied. ' + bodyText);
    } else {
      showStatus(`Login failed: status ${res.status} — ${bodyText}`);
    }
    console.warn('Login failed', res.status, text, json);
    return;
  }

  // success -> expect JSON with token
  if (json && json.token) {
    localStorage.setItem('token', json.token);

    // optional: store username/email for convenience (from response or decode token)
    const payload = parseJwt(json.token);
    if (payload && payload.username) {
      localStorage.setItem('username', payload.username);
    } else if (json.username) {
      localStorage.setItem('username', json.username);
    }

    showStatus('Logged in: ' + (json.username || username), 'ok');

    // short delay so user sees message, then redirect to home
    setTimeout(() => window.location = '/', 600);
    return;
  }

  showStatus('Login succeeded but server did not provide token');
});

/* ---------- REGISTER ---------- */
document.getElementById('btnReg')?.addEventListener('click', async () => {
  const btn = document.getElementById('btnReg');
  btn.disabled = true;

  const username = document.getElementById('regUser').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPass').value;

  if (!username || !email || !password) {
    showStatus('Please fill username, email and password');
    btn.disabled = false;
    return;
  }

  const { res, text, json, error } = await fetchSafe(api + '/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });

  btn.disabled = false;

  if (error) {
    showStatus('Network error during register: ' + error.message);
    console.error('Register network error', error);
    return;
  }

  if (!res.ok) {
    let bodyText = '(no response body)';
    if (json && typeof json === 'object') bodyText = JSON.stringify(json);
    else if (text) bodyText = text;
    showStatus(`Register failed: status ${res.status} — ${bodyText}`);
    console.warn('Register failed', res.status, text, json);
    return;
  }

  if (json && json.token) {
    localStorage.setItem('token', json.token);
    // store username too if present
    if (json.username) localStorage.setItem('username', json.username);
    showStatus('Registered & logged in as ' + (json.username || username), 'ok');
    setTimeout(() => window.location = '/', 600);
    return;
  }

  showStatus('Registered but server did not return token', 'ok');
});

/* ---------- Clear buttons ---------- */
document.getElementById('btnLoginClear')?.addEventListener('click', () => {
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
});
document.getElementById('btnRegClear')?.addEventListener('click', () => {
  document.getElementById('regUser').value = '';
  document.getElementById('regEmail').value = '';
  document.getElementById('regPass').value = '';
});