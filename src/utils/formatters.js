/**
 * STACKWEB Online Voting System
 * src/utils/formatters.js — Date, number, percent, and text formatting utilities.
 * Re-exports shared formatters from main.js and adds additional helpers.
 */
export {
  formatNumber,
  formatPercent,
  formatDate,
  formatDateTime,
  timeAgo,
  truncate,
} from '../assets/js/main.js';

// ──────────────────────────────────────────────────────────────
// TOKEN DISPLAY
// ──────────────────────────────────────────────────────────────

/**
 * Format a raw token string into display groups.
 * e.g. "SWABCD1234EFGH" → "SW-ABCD-1234-EFGH" (if not already formatted)
 */
export function formatToken(token) {
  if (!token) return '—';
  const clean = token.replace(/-/g, '');
  if (clean.length >= 11) {
    // Attempt to restore the SW-XXXX-XXXX-XXXX structure
    return `${clean.slice(0, 2)}-${clean.slice(2, 6)}-${clean.slice(6, 10)}-${clean.slice(10, 14)}`;
  }
  return token;
}

// ──────────────────────────────────────────────────────────────
// FILE SIZE
// ──────────────────────────────────────────────────────────────

/**
 * Format bytes to human-readable file size.
 * e.g. 1048576 → "1.0 MB"
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// ──────────────────────────────────────────────────────────────
// ELECTION STATUS
// ──────────────────────────────────────────────────────────────

/**
 * Map an election status string to a display label with emoji.
 */
export function formatElectionStatus(status) {
  const map = {
    draft:   '⚪ Draft',
    active:  '🟢 Active',
    paused:  '🟡 Paused',
    closed:  '🔴 Closed',
  };
  return map[status] || status;
}

// ──────────────────────────────────────────────────────────────
// TOKEN STATUS
// ──────────────────────────────────────────────────────────────

/**
 * Map a voter token status to a display label.
 */
export function formatTokenStatus(status) {
  const map = {
    unused:  '🔵 Unused',
    used:    '✅ Used',
    revoked: '🚫 Revoked',
    expired: '⏰ Expired',
  };
  return map[status] || status;
}

// ──────────────────────────────────────────────────────────────
// INITIALS
// ──────────────────────────────────────────────────────────────

/**
 * Extract up to 2 initials from a name or email string.
 * e.g. "John Doe"    → "JD"
 *      "admin@x.com" → "AD"
 */
export function initials(nameOrEmail = '') {
  if (!nameOrEmail) return '?';
  const parts = nameOrEmail.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
