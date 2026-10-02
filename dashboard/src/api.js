const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
const TOKEN_KEY = 'affiliate_admin_token';

export const auth = {
  get token() {
    return localStorage.getItem(TOKEN_KEY);
  },
  set(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
  },
};

export async function request(path, { method = 'GET', body, query, form, raw } = {}) {
  let url = `${BASE}${path}`;
  if (query) {
    const q = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== '' && v != null));
    if (q.size) url += `?${q}`;
  }
  const headers = {};
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, { method, headers, body: form || (body !== undefined ? JSON.stringify(body) : undefined) });
  if (res.status === 401 && !path.includes('/auth/login')) {
    auth.clear();
    window.dispatchEvent(new Event('auth:logout'));
  }
  if (raw) {
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return res;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const admin = (path, opts) => request(`/api/admin${path}`, opts);

export async function download(path, filename, query) {
  const res = await admin(path, { raw: true, query });
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
