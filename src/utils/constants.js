/**
 * STACKWEB Online Voting System
 * src/utils/constants.js — Re-exports shared constants from the central config.
 * Import from here instead of directly from /config/constants.js when inside src/.
 */
export { ROLES, ELECTION_STATUS, TOKEN_STATUS, AUDIT_ACTIONS } from '../../config/constants.js';

// ── Additional UI-facing label maps ─────────────────────────────

export const ELECTION_STATUS_LABELS = {
  draft:   '⚪ Draft',
  active:  '🟢 Active',
  paused:  '🟡 Paused',
  closed:  '🔴 Closed',
};

export const TOKEN_STATUS_LABELS = {
  unused:  '🔵 Unused',
  used:    '✅ Used',
  revoked: '🚫 Revoked',
  expired: '⏰ Expired',
};

export const ROLE_LABELS = {
  admin:    '👑 Administrator',
  operator: '🔑 Token Operator',
  viewer:   '👁 Viewer',
};
