/**
 * STACKWEB Online Voting System
 * src/utils/storage-helpers.js — localStorage / sessionStorage abstractions.
 * Re-exports generic helpers from main.js and adds STACKWEB-specific session helpers.
 */
export { lsGet, lsSet, lsRemove } from '../assets/js/main.js';

// ──────────────────────────────────────────────────────────────
// VOTER SESSION  (localStorage, no Supabase auth for voters)
// ──────────────────────────────────────────────────────────────
export {
  setVoterSession,
  getVoterSession,
  clearVoterSession,
} from '../assets/js/supabase-client.js';

// ──────────────────────────────────────────────────────────────
// OPERATOR SESSION  (sessionStorage, tab-scoped)
// ──────────────────────────────────────────────────────────────
const OP_SESSION_KEY = 'op_session';

/**
 * Read the operator portal session object.
 * Returns null if no valid session is stored.
 */
export function getOperatorSession() {
  try {
    const raw = sessionStorage.getItem(OP_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/**
 * Check whether the operator session is still valid (within 8-hour window).
 */
export function isOperatorSessionValid() {
  const sess = getOperatorSession();
  if (!sess || !sess.valid) return false;
  return Date.now() - (sess.ts || 0) < 8 * 60 * 60 * 1000;
}

/**
 * Persist a new operator session.
 * @param {object} data  Any extra data to store (e.g. { name })
 */
export function setOperatorSession(data = {}) {
  const record = { valid: true, ts: Date.now(), ...data };
  sessionStorage.setItem(OP_SESSION_KEY, JSON.stringify(record));
}

/**
 * Destroy the operator session and remove it from sessionStorage.
 */
export function clearOperatorSession() {
  sessionStorage.removeItem(OP_SESSION_KEY);
}

// ──────────────────────────────────────────────────────────────
// ADMIN LOGIN LOCKOUT  (localStorage, persists across tabs)
// ──────────────────────────────────────────────────────────────
export {
  recordFailedAttempt,
  clearFailedAttempts,
  isLockedOut,
  lockoutRemainingSeconds,
} from '../assets/js/auth.js';

// ──────────────────────────────────────────────────────────────
// MISC PREFERENCE HELPERS
// ──────────────────────────────────────────────────────────────
const PREF_KEY = 'sw_prefs';

/**
 * Get a stored user preference by key.
 * @param {string} key
 * @param {*} fallback
 */
export function getPref(key, fallback = null) {
  try {
    const prefs = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
    return key in prefs ? prefs[key] : fallback;
  } catch { return fallback; }
}

/**
 * Set a stored user preference.
 * @param {string} key
 * @param {*} value
 */
export function setPref(key, value) {
  try {
    const prefs = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
    prefs[key] = value;
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  } catch {}
}
