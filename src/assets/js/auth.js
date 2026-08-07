/**
 * STACKWEB Online Voting System
 * auth.js — Admin authentication, session management, and route guard
 */
import { supabase, logAudit } from './supabase-client.js';
import { TOKEN_STATUS, ELECTION_STATUS } from '../../../config/constants.js';

// ──────────────────────────────────────────────────────────────
// ADMIN LOGIN
// ──────────────────────────────────────────────────────────────
export async function adminLogin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  // Verify admin role in profiles table
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileErr || !profile) {
    await supabase.auth.signOut();
    throw new Error('Profile not found. Contact your administrator.');
  }

  if (!['admin','superadmin'].includes(profile.role)) {
    await supabase.auth.signOut();
    throw new Error('Access denied. This account does not have admin privileges.');
  }

  await logAudit('admin_login', `Admin "${email}" logged in`);
  return { user: data.user, profile };
}

// ──────────────────────────────────────────────────────────────
// ADMIN LOGOUT
// ──────────────────────────────────────────────────────────────
export async function adminLogout() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      await logAudit('admin_logout', `Admin "${profile?.email || user.email}" logged out`);
    }
  } catch { /* non-blocking */ }
  await supabase.auth.signOut();
  // FIX: use relative path detection instead of hardcoded absolute path
  redirectToLogin();
}

// ──────────────────────────────────────────────────────────────
// ROUTE GUARD — call at the top of every admin page
// Returns the admin profile or null (and redirects to login)
// ──────────────────────────────────────────────────────────────
export async function requireAdmin() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirectToLogin();
    return null;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error || !profile || !['admin','superadmin'].includes(profile.role)) {
    await supabase.auth.signOut();
    redirectToLogin();
    return null;
  }

  return { ...profile, email: session.user.email };
}

// ──────────────────────────────────────────────────────────────
// VOTER TOKEN GATE — call on voter landing page
// ──────────────────────────────────────────────────────────────
export async function validateVoterAccess(tokenString) {
  const token = (tokenString || '').trim().toUpperCase();
  if (!token || !token.startsWith('SW-')) {
    return { valid: false, error: 'Invalid token format. Tokens look like SW-XXXX-XXXX-XXXX.' };
  }

  const { data: voter, error } = await supabase
    .from('voters')
    .select('*, elections(id, name, status)')
    .eq('token', token)
    .maybeSingle();

  if (error || !voter) {
    return { valid: false, error: 'Token not found. Please check and try again.' };
  }

  if (voter.status === TOKEN_STATUS.USED) {
    return { valid: false, error: 'This token has already been used. Each token can only be used once.' };
  }

  if (voter.status === TOKEN_STATUS.REVOKED) {
    return { valid: false, error: 'This token has been revoked. Please contact your administrator.' };
  }

  if (voter.status === TOKEN_STATUS.EXPIRED) {
    return { valid: false, error: 'This token has expired. Please contact your administrator.' };
  }

  // Also check expires_at timestamp directly (catches tokens not yet marked expired in DB)
  if (voter.expires_at && new Date(voter.expires_at) < new Date()) {
    // Mark as expired in DB (fire-and-forget, non-blocking)
    supabase.from('voters').update({ status: TOKEN_STATUS.EXPIRED }).eq('id', voter.id).then(() => {});
    const expiredAt = new Date(voter.expires_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    return { valid: false, error: `This token expired on ${expiredAt}. Please contact your administrator for a new one.` };
  }

  const election = voter.elections;
  if (!election) {
    return { valid: false, error: 'No election linked to this token.' };
  }

  if (election.status !== ELECTION_STATUS.ACTIVE) {
    const msgs = {
      [ELECTION_STATUS.DRAFT]:  'Voting has not started yet. Please wait for the administrator to open the election.',
      [ELECTION_STATUS.PAUSED]: 'Voting is currently paused. Please try again shortly.',
      [ELECTION_STATUS.CLOSED]: 'This election has ended. Voting is no longer possible.',
    };
    return { valid: false, error: msgs[election.status] || 'Election is not currently active.' };
  }

  return { valid: true, voter, election };
}

// ──────────────────────────────────────────────────────────────
// GET CURRENT USER
// ──────────────────────────────────────────────────────────────
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return data ? { ...data, email: user.email } : null;
}

// ──────────────────────────────────────────────────────────────
// BRUTE-FORCE LOCKOUT (localStorage-based)
// ──────────────────────────────────────────────────────────────
const LOCKOUT_KEY      = 'sw_login_attempts';
const LOCKOUT_UNTIL    = 'sw_lockout_until';
const MAX_ATTEMPTS_DEF = 5;
const LOCKOUT_MS_DEF   = 15 * 60 * 1000; // 15 minutes

export function recordFailedAttempt(maxAttempts = MAX_ATTEMPTS_DEF, lockoutMs = LOCKOUT_MS_DEF) {
  const attempts = (parseInt(localStorage.getItem(LOCKOUT_KEY)) || 0) + 1;
  localStorage.setItem(LOCKOUT_KEY, String(attempts));
  if (attempts >= maxAttempts) {
    localStorage.setItem(LOCKOUT_UNTIL, String(Date.now() + lockoutMs));
  }
  return attempts;
}

export function clearFailedAttempts() {
  localStorage.removeItem(LOCKOUT_KEY);
  localStorage.removeItem(LOCKOUT_UNTIL);
}

export function isLockedOut() {
  const until = parseInt(localStorage.getItem(LOCKOUT_UNTIL)) || 0;
  if (!until) return false;
  if (Date.now() < until) return true;
  clearFailedAttempts();
  return false;
}

export function lockoutRemainingSeconds() {
  const until = parseInt(localStorage.getItem(LOCKOUT_UNTIL)) || 0;
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

// ──────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────

/**
 * FIX: Removed hardcoded absolute path (/STACKWEB-ONLINE-VOTING-SYSTEM/...).
 * Now uses relative redirect that works on any server/subfolder configuration.
 */
function redirectToLogin() {
  const path = window.location.pathname;
  if (path.includes('/admin/')) {
    window.location.href = 'index.html';
  } else {
    // Fallback: navigate relative from wherever we are
    const depth = path.split('/').filter(Boolean).length;
    const prefix = depth > 2 ? '../'.repeat(depth - 2) : './';
    window.location.href = `${prefix}admin/index.html`;
  }
}

// Auth state listener — auto-redirect if session expires
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    // Only redirect if we're on a protected admin page (not the login page itself)
    const path = window.location.pathname;
    const isAdminPage  = path.includes('/admin/');
    const isLoginPage  = path.includes('/admin/index.html');
    if (isAdminPage && !isLoginPage) {
      window.location.href = 'index.html';
    }
  }
});
