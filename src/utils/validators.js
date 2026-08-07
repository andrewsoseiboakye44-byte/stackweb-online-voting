/**
 * STACKWEB Online Voting System
 * src/utils/validators.js — Input validation helpers used across all pages.
 * Re-exports core validators from main.js and adds domain-specific ones.
 */
export { isValidEmail, isStrongPassword } from '../assets/js/main.js';

// ──────────────────────────────────────────────────────────────
// TOKEN VALIDATORS
// ──────────────────────────────────────────────────────────────

/**
 * Check if a string looks like a valid STACKWEB voter token.
 * Valid format: PREFIX-XXX-XXX  (prefix 1-5 alphanum, segments 3 alphanum each)
 * e.g. "SW-8A9-2K4"
 */
export function isValidToken(token) {
  if (!token || typeof token !== 'string') return false;
  return /^[A-Z0-9]{1,5}-[A-Z0-9]{3}-[A-Z0-9]{3}$/i.test(token.trim());
}

/**
 * Normalize a token string: uppercase + trim whitespace.
 */
export function normalizeToken(token) {
  return (token || '').trim().toUpperCase();
}

// ──────────────────────────────────────────────────────────────
// ELECTION VALIDATORS
// ──────────────────────────────────────────────────────────────

/**
 * Validate a date range: start must be before end, both must be valid dates.
 * Returns { valid: boolean, error?: string }
 */
export function validateDateRange(startsAt, endsAt) {
  if (!startsAt && !endsAt) return { valid: true };
  const start = startsAt ? new Date(startsAt) : null;
  const end   = endsAt   ? new Date(endsAt)   : null;
  if (start && isNaN(start.getTime())) return { valid: false, error: 'Start date is not a valid date.' };
  if (end   && isNaN(end.getTime()))   return { valid: false, error: 'End date is not a valid date.' };
  if (start && end && start >= end)    return { valid: false, error: 'Start date must be before end date.' };
  return { valid: true };
}

/**
 * Validate an election name.
 * Must be 3–120 characters, non-empty.
 */
export function isValidElectionName(name) {
  const n = (name || '').trim();
  return n.length >= 3 && n.length <= 120;
}

// ──────────────────────────────────────────────────────────────
// CANDIDATE VALIDATORS
// ──────────────────────────────────────────────────────────────

/**
 * Validate a candidate name: 2–80 chars.
 */
export function isValidCandidateName(name) {
  const n = (name || '').trim();
  return n.length >= 2 && n.length <= 80;
}

/**
 * Check if a file is an acceptable candidate photo.
 * Allowed types: JPEG, PNG, WebP. Max size 5 MB.
 */
export function isValidPhotoFile(file) {
  if (!file) return { valid: false, error: 'No file selected.' };
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, or WebP images are accepted.' };
  }
  if (file.size > MAX_BYTES) {
    return { valid: false, error: 'Photo must be smaller than 5 MB.' };
  }
  return { valid: true };
}

// ──────────────────────────────────────────────────────────────
// GENERAL
// ──────────────────────────────────────────────────────────────

/**
 * Check if a value is a non-empty string.
 */
export function isNonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Clamp a numeric string to the given range (inclusive).
 * Returns the clamped number or null if invalid.
 */
export function clampInt(value, min, max) {
  const n = parseInt(value, 10);
  if (isNaN(n)) return null;
  return Math.min(Math.max(n, min), max);
}
