/**
 * STACKWEB Online Voting System
 * main.js — Shared utility functions used across all pages
 */

// ──────────────────────────────────────────────────────────────
// TOAST NOTIFICATIONS
// ──────────────────────────────────────────────────────────────
export function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem;';
    document.body.appendChild(container);
  }
  const icons = { success: '&#10003;', error: '&#10007;', warning: '&#9888;', info: '&#9432;' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.style.cssText = `background:#161b22;border:1px solid #21262d;border-radius:8px;padding:0.75rem 1rem;min-width:240px;display:flex;align-items:center;gap:0.6rem;box-shadow:0 4px 20px rgba(0,0,0,0.4);font-size:0.83rem;font-family:'Inter',sans-serif;color:#e6edf3;animation:toastIn 0.3s ease;`;
  if (type === 'success') toast.style.borderLeft = '3px solid #3fb950';
  if (type === 'error')   toast.style.borderLeft = '3px solid #f85149';
  if (type === 'warning') toast.style.borderLeft = '3px solid #d29922';
  toast.innerHTML = `<span>${icons[type] || '&#9432;'}</span><span>${message}</span>`;
  if (!document.getElementById('toast-keyframes')) {
    const s = document.createElement('style');
    s.id = 'toast-keyframes';
    s.textContent = '@keyframes toastIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}';
    document.head.appendChild(s);
  }
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
  return toast;
}

// ──────────────────────────────────────────────────────────────
// CONFIRM DIALOG
// Shared modal confirm used across all admin pages.
// Usage: const ok = await showConfirm('Title', 'Are you sure?', 'danger');
// ──────────────────────────────────────────────────────────────
export function showConfirm(title, body, variant = 'danger') {
  return new Promise(resolve => {
    // Reuse existing overlay if present, else create inline
    let overlay = document.getElementById('confirm-overlay');
    let created = false;

    if (!overlay) {
      created = true;
      overlay = document.createElement('div');
      overlay.id = 'confirm-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:10000;opacity:0;transition:opacity 220ms ease;';
      overlay.innerHTML = `
        <div style="background:#161b22;border:1px solid #21262d;border-radius:16px;padding:2rem;width:min(420px,90vw);box-shadow:0 24px 64px rgba(0,0,0,0.7);transform:scale(0.95);transition:transform 220ms ease;">
          <div style="font-family:'Poppins',sans-serif;font-size:1.1rem;font-weight:700;margin-bottom:0.5rem;color:#e6edf3" id="_confirm-title"></div>
          <div style="font-size:0.875rem;color:#8b949e;margin-bottom:1.5rem;line-height:1.6" id="_confirm-body"></div>
          <div style="display:flex;gap:0.75rem;justify-content:flex-end">
            <button id="_confirm-cancel" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.6rem 1.25rem;border-radius:8px;font-family:'Inter',sans-serif;font-size:0.875rem;font-weight:600;cursor:pointer;background:transparent;color:#e6edf3;border:1px solid #21262d;transition:all 220ms ease;">Cancel</button>
            <button id="_confirm-ok" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.6rem 1.25rem;border-radius:8px;font-family:'Inter',sans-serif;font-size:0.875rem;font-weight:600;cursor:pointer;border:none;transition:all 220ms ease;">Confirm</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
    }

    // Set content
    const titleEl  = overlay.querySelector('#_confirm-title') || document.getElementById('confirm-title');
    const bodyEl   = overlay.querySelector('#_confirm-body')  || document.getElementById('confirm-body');
    const okBtn    = overlay.querySelector('#_confirm-ok')    || document.getElementById('confirm-ok');
    const cancelBtn= overlay.querySelector('#_confirm-cancel')|| document.getElementById('confirm-cancel');

    if (titleEl)  titleEl.textContent  = title;
    if (bodyEl)   bodyEl.textContent   = body;

    // Style ok button by variant
    const colors = { danger:'#f85149', primary:'#4f46e5', success:'#3fb950', warning:'#d29922' };
    if (okBtn) {
      okBtn.style.background = colors[variant] || colors.danger;
      okBtn.style.color = variant === 'warning' ? '#000' : '#fff';
    }

    // Show overlay
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      overlay.style.pointerEvents = 'all';
      const inner = overlay.querySelector('div');
      if (inner) inner.style.transform = 'scale(1)';
    });

    // Handler factory
    const finish = (result) => {
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
      const inner = overlay.querySelector('div');
      if (inner) inner.style.transform = 'scale(0.95)';
      if (created) setTimeout(() => overlay.remove(), 250);
      resolve(result);
    };

    // Bind — replace handlers to avoid stacking
    const newOk     = okBtn?.cloneNode(true);
    const newCancel = cancelBtn?.cloneNode(true);
    if (okBtn && newOk)         { okBtn.replaceWith(newOk);         newOk.addEventListener('click',     () => finish(true)); }
    if (cancelBtn && newCancel) { cancelBtn.replaceWith(newCancel); newCancel.addEventListener('click',  () => finish(false)); }

    // Click backdrop to cancel
    overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(false); }, { once: true });
  });
}

// ──────────────────────────────────────────────────────────────
// MOBILE SIDEBAR SETUP
// Call once per admin page after DOMContentLoaded.
// Requires: #sidebar, #hamburger, .sidebar-overlay (or auto-creates)
// ──────────────────────────────────────────────────────────────
export function initMobileSidebar() {
  const sidebar   = document.getElementById('sidebar');
  const hamburger = document.getElementById('hamburger');
  if (!sidebar || !hamburger) return;

  // Ensure overlay exists
  let overlay = document.getElementById('sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);z-index:199;opacity:0;transition:opacity 220ms ease;';
    document.body.insertBefore(overlay, document.body.firstChild);
  }

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.style.display = 'block';
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.display = 'none'; }, 220);
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  overlay.addEventListener('click', closeSidebar);

  // Close sidebar on window resize if we go back to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeSidebar();
  });
}

// ──────────────────────────────────────────────────────────────
// DEBOUNCE
// ──────────────────────────────────────────────────────────────
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ──────────────────────────────────────────────────────────────
// NUMBER / PERCENT FORMATTERS
// ──────────────────────────────────────────────────────────────
export function formatNumber(n) {
  if (n == null || isNaN(n)) return '0';
  return Number(n).toLocaleString();
}

export function formatPercent(value, total, decimals = 1) {
  if (!total || total === 0) return '0%';
  return ((value / total) * 100).toFixed(decimals) + '%';
}

// ──────────────────────────────────────────────────────────────
// DATE FORMATTERS
// ──────────────────────────────────────────────────────────────
export function formatDate(dateString, opts = {}) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    ...opts,
  });
}

export function formatDateTime(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(date) {
  const now  = Date.now();
  const then = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 5)   return 'just now';
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ──────────────────────────────────────────────────────────────
// COUNTDOWN TIMER
// Calls cb({d, h, m, s, expired}) every second.
// Returns the interval ID so caller can clearInterval.
// ──────────────────────────────────────────────────────────────
export function startCountdown(targetDateStr, callback) {
  const target = new Date(targetDateStr).getTime();

  function tick() {
    const now  = Date.now();
    const diff = target - now;
    if (diff <= 0) {
      callback({ d: '00', h: '00', m: '00', s: '00', expired: true });
      clearInterval(id);
      return;
    }
    const totalSecs = Math.floor(diff / 1000);
    const d = String(Math.floor(totalSecs / 86400)).padStart(2, '0');
    const h = String(Math.floor((totalSecs % 86400) / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
    const s = String(totalSecs % 60).padStart(2, '0');
    callback({ d, h, m, s, expired: false });
  }

  tick();
  const id = setInterval(tick, 1000);
  return id;
}

// ──────────────────────────────────────────────────────────────
// CSV UTILITIES
// ──────────────────────────────────────────────────────────────

/**
 * Parse a CSV string into an array of objects.
 * First row is treated as headers.
 */
export function parseCSV(text) {
  const lines = text.replace(/\r/g, '').trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const vals = splitCSVLine(line);
    const obj  = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim().replace(/^"|"$/g, ''); });
    return obj;
  }).filter(row => Object.values(row).some(v => v));
}

function splitCSVLine(line) {
  const result = [], re = /("(?:[^"]|"")*"|[^,]*),?/g;
  let match;
  while ((match = re.exec(line)) !== null) {
    if (match.index === re.lastIndex) break;
    result.push(match[1]);
  }
  return result;
}

/**
 * Convert an array of objects to a CSV string.
 * @param {Object[]} rows
 * @param {string[]} columns - column keys to include (in order)
 */
export function toCSV(rows, columns) {
  if (!rows || !rows.length) return '';
  const cols = columns || Object.keys(rows[0]);
  const escape = v => {
    const str = v == null ? '' : String(v);
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const header = cols.join(',');
  const body   = rows.map(r => cols.map(c => escape(r[c])).join(',')).join('\n');
  return `${header}\n${body}`;
}

/**
 * Trigger a browser file download.
 */
export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ──────────────────────────────────────────────────────────────
// FORM VALIDATORS
// ──────────────────────────────────────────────────────────────
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
}

export function isStrongPassword(password) {
  return password && password.length >= 8;
}

// ──────────────────────────────────────────────────────────────
// DOM HELPERS
// ──────────────────────────────────────────────────────────────
export function $(selector, context = document) {
  return context.querySelector(selector);
}

export function $$(selector, context = document) {
  return [...context.querySelectorAll(selector)];
}

export function setInnerHTML(selector, html, context = document) {
  const el = context.querySelector(selector);
  if (el) el.innerHTML = html;
}

export function setTextContent(selector, text, context = document) {
  const el = context.querySelector(selector);
  if (el) el.textContent = text;
}

export function toggleClass(selector, className, force, context = document) {
  const el = context.querySelector(selector);
  if (el) el.classList.toggle(className, force);
}

export function showEl(selectorOrEl) {
  const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
  if (el) el.style.display = '';
}

export function hideEl(selectorOrEl) {
  const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
  if (el) el.style.display = 'none';
}

// ──────────────────────────────────────────────────────────────
// PASSWORD UPDATE (via Supabase Auth)
// FIX: reuse shared supabase client via dynamic import instead of creating a new one
// ──────────────────────────────────────────────────────────────
export async function updatePassword(newPassword) {
  const { supabase: client } = await import('./supabase-client.js');
  const { error } = await client.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// ──────────────────────────────────────────────────────────────
// LOCAL STORAGE HELPERS
// ──────────────────────────────────────────────────────────────
export function lsGet(key, fallback = null) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}

export function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function lsRemove(key) {
  try { localStorage.removeItem(key); } catch {}
}

// ──────────────────────────────────────────────────────────────
// MISC
// ──────────────────────────────────────────────────────────────
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function randomId(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Truncate a string to a max length with ellipsis.
 */
export function truncate(str, maxLen = 80) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}
