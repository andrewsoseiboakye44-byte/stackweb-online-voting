/**
 * STACKWEB Online Voting System
 * supabase-client.js — Central database & auth abstraction layer
 * All pages import from this file.
 */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../../config/supabase.js';
import { TOKEN_STATUS, ELECTION_STATUS } from '../../../config/constants.js';

// ──────────────────────────────────────────────────────────────
// Client (singleton — reused everywhere)
// ──────────────────────────────────────────────────────────────
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ──────────────────────────────────────────────────────────────
// ELECTIONS
// ──────────────────────────────────────────────────────────────
export async function fetchElections(statusFilter = null) {
  let q = supabase.from('elections').select('*').order('created_at', { ascending: false });
  if (statusFilter) q = q.eq('status', statusFilter);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function fetchActiveElection() {
  // FIX: was .single() which throws PGRST116 when no active election exists
  const { data, error } = await supabase
    .from('elections')
    .select('*')
    .eq('status', ELECTION_STATUS.ACTIVE)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function createElection(payload) {
  const { data, error } = await supabase.from('elections').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateElection(id, payload) {
  const { data, error } = await supabase.from('elections').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function updateElectionStatus(id, status) {
  const updates = { status };
  if (status === ELECTION_STATUS.ACTIVE) updates.started_at = new Date().toISOString();
  if (status === ELECTION_STATUS.CLOSED)  updates.closed_at  = new Date().toISOString();
  const { data, error } = await supabase.from('elections').update(updates).eq('id', id).select().single();
  if (error) throw error;
  await logAudit(`election_${status}`, `Election set to "${status}"`);
  return data;
}

export async function deleteElection(id) {
  const { error } = await supabase.from('elections').delete().eq('id', id);
  if (error) throw error;
  await logAudit('delete_election', `Election ${id} deleted`);
}

// ──────────────────────────────────────────────────────────────
// POSITIONS
// ──────────────────────────────────────────────────────────────
export async function fetchPositions(electionId) {
  const { data, error } = await supabase
    .from('positions')
    .select('*, candidates(id, name, photo_url, bio, manifesto, is_active)')
    .eq('election_id', electionId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  // Filter to only active candidates on the ballot
  return (data || []).map(p => ({
    ...p,
    candidates: (p.candidates || []).filter(c => c.is_active !== false),
  }));
}

export async function createPosition(payload) {
  const { data, error } = await supabase.from('positions').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updatePosition(id, payload) {
  const { data, error } = await supabase.from('positions').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deletePosition(id) {
  const { error } = await supabase.from('positions').delete().eq('id', id);
  if (error) throw error;
}

// ──────────────────────────────────────────────────────────────
// CANDIDATES
// ──────────────────────────────────────────────────────────────
export async function createCandidate(payload) {
  const { data, error } = await supabase.from('candidates').insert(payload).select().single();
  if (error) throw error;
  await logAudit('add_candidate', `Candidate "${payload.name}" added`);
  return data;
}

export async function updateCandidate(id, payload) {
  const { data, error } = await supabase.from('candidates').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCandidate(id) {
  const { error } = await supabase.from('candidates').delete().eq('id', id);
  if (error) throw error;
  await logAudit('delete_candidate', `Candidate ${id} deleted`);
}

export async function uploadCandidatePhoto(file, candidateName) {
  const ext   = file.name.split('.').pop();
  const path  = `candidates/${Date.now()}-${candidateName.replace(/\s+/g, '-').toLowerCase()}.${ext}`;
  const { error: uploadErr } = await supabase.storage.from('candidate-photos').upload(path, file, { upsert: true });
  if (uploadErr) throw uploadErr;
  const { data } = supabase.storage.from('candidate-photos').getPublicUrl(path);
  return data.publicUrl;
}

// Upload institution logo to the 'logos' storage bucket.
// Always overwrites the same fixed path so the public URL never changes.
export async function uploadInstitutionLogo(file) {
  const ext  = file.name.split('.').pop().toLowerCase();
  const path = `institution/logo.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from('logos')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadErr) throw uploadErr;
  // Add a cache-busting timestamp so browsers reload the new image immediately
  const { data } = supabase.storage.from('logos').getPublicUrl(path);
  return data.publicUrl + '?t=' + Date.now();
}

// ──────────────────────────────────────────────────────────────
// VOTERS / TOKENS
// ──────────────────────────────────────────────────────────────
export function generateTokenString() {
  const seg = () => Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g,'X').padEnd(4,'X').slice(0,4);
  return `SW-${seg()}-${seg()}-${seg()}`;
}

export async function generateTokens(electionId, voterList, expiryMins = null) {
  // If no expiry passed, read the global setting from the DB
  let mins = expiryMins;
  if (mins === null || mins === undefined) {
    mins = await fetchTokenExpiryMinutes();
  } else {
    // Support decimal hours (e.g. 0.5) or integer minutes (e.g. 30, 1440)
    if (typeof mins === 'number' && mins > 0 && mins < 100 && !Number.isInteger(mins)) {
      mins = Math.round(mins * 60);
    }
  }
  const totalMins = Math.max(1, Math.round(mins));
  const expiresAt = new Date(Date.now() + totalMins * 60 * 1000).toISOString();
  const durationLabel = formatExpiryMins(totalMins);

  // voterList = [{name, email, class}]
  const records = voterList.map(v => ({
    election_id:  electionId,
    student_name: v.name  || 'Voter',
    email:        v.email || null,
    class:        v.class || null,
    token:        generateTokenString(),
    status:       TOKEN_STATUS.UNUSED,
    expires_at:   expiresAt,
  }));
  // Insert in batches of 50
  const results = [];
  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const { data, error } = await supabase.from('voters').insert(batch).select();
    if (error) throw error;
    results.push(...(data || []));
  }
  await logAudit('generate_tokens', `${results.length} token${results.length!==1?'s':''} generated for election ${electionId} (expires in: ${durationLabel})`);
  return results;
}

export async function revokeToken(voterId) {
  const { error } = await supabase.from('voters').update({ status: TOKEN_STATUS.REVOKED }).eq('id', voterId);
  if (error) throw error;
  await logAudit('revoke_token', `Token for voter ${voterId} revoked`);
}

export async function revokeAllUnusedTokens(electionId) {
  const { error } = await supabase.from('voters').update({ status: TOKEN_STATUS.REVOKED }).eq('election_id', electionId).eq('status', TOKEN_STATUS.UNUSED);
  if (error) throw error;
  await logAudit('revoke_tokens_bulk', `All unused tokens revoked for election ${electionId}`);
}

export async function markTokenUsed(voterId) {
  const { error } = await supabase
    .from('voters')
    .update({ status: TOKEN_STATUS.USED, used_at: new Date().toISOString() })
    .eq('id', voterId);
  if (error) throw error;
}

export async function fetchVoters(electionId = null) {
  let q = supabase.from('voters').select('*, elections(name)').order('created_at', { ascending: false });
  if (electionId) q = q.eq('election_id', electionId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

// Validate voter token — returns { valid, reason, voter }
// reason: 'ok' | 'not_found' | 'used' | 'revoked' | 'expired'
export async function validateToken(tokenString, electionId = null) {
  const cleaned = tokenString.trim().toUpperCase();
  let q = supabase.from('voters').select('*').eq('token', cleaned);
  if (electionId) q = q.eq('election_id', electionId);
  // FIX: was .single() which crashes when token not found — use .maybeSingle()
  const { data, error } = await q.limit(1).maybeSingle();
  if (error || !data) return { valid: false, reason: 'not_found', voter: null };

  // Check explicit DB status first
  if (data.status === TOKEN_STATUS.USED)    return { valid: false, reason: TOKEN_STATUS.USED,    voter: data };
  if (data.status === TOKEN_STATUS.REVOKED) return { valid: false, reason: TOKEN_STATUS.REVOKED, voter: data };
  if (data.status === TOKEN_STATUS.EXPIRED) return { valid: false, reason: TOKEN_STATUS.EXPIRED, voter: data };

  // Check expiry timestamp (in case DB status hasn't been updated yet)
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    // Mark as expired in DB (fire-and-forget)
    supabase.from('voters').update({ status: TOKEN_STATUS.EXPIRED }).eq('id', data.id).then(() => {});
    return { valid: false, reason: TOKEN_STATUS.EXPIRED, voter: { ...data, status: TOKEN_STATUS.EXPIRED } };
  }

  return { valid: true, reason: 'ok', voter: data };
}

// Fetch global token expiry in MINUTES (integer)
export async function fetchTokenExpiryMinutes() {
  try {
    const settings = await fetchSettings();
    const raw = settings.token_expiry_hrs ?? 1440; // default 1440 min (24h)
    // Legacy migration check: If raw is 24 (old default hours value), treat as 24h = 1440 min
    if (raw === 24) return 1440;
    return Math.max(1, parseInt(raw) || 1440);
  } catch {
    return 1440;
  }
}

// Fetch the global token expiry setting in HOURS (decimal) for backwards compatibility
export async function fetchTokenExpiryHours() {
  const mins = await fetchTokenExpiryMinutes();
  return mins / 60;
}

// Format total minutes into a human-readable duration string (e.g. 30 -> "30 min", 90 -> "1 h 30 min", 1440 -> "1 day")
export function formatExpiryMins(mins) {
  const totalMins = Math.round(mins || 0);
  if (totalMins >= 1440 && totalMins % 1440 === 0) {
    const d = Math.floor(totalMins / 1440);
    return `${d} day${d > 1 ? 's' : ''}`;
  }
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

// Extend expiry for a single unused token (admin action)
export async function extendTokenExpiry(voterId, duration, unit = 'minutes') {
  let totalMins = duration;
  if (unit === 'hours' || (typeof duration === 'number' && duration < 100 && !Number.isInteger(duration))) {
    totalMins = Math.round(duration * 60);
  }
  totalMins = Math.max(1, Math.round(totalMins));
  const expiresAt = new Date(Date.now() + totalMins * 60 * 1000).toISOString();
  const { error } = await supabase
    .from('voters')
    .update({ expires_at: expiresAt, status: TOKEN_STATUS.UNUSED })
    .eq('id', voterId);
  if (error) throw error;
  const label = formatExpiryMins(totalMins);
  await logAudit('extend_token_expiry', `Token ${voterId} extended by ${label}`);
}

// ──────────────────────────────────────────────────────────────
// VOTER SESSION (localStorage-based, no auth required for voters)
// ──────────────────────────────────────────────────────────────
const SESSION_KEY = 'sw_voter_session';

export function setVoterSession(voterRecord) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(voterRecord));
}

export function getVoterSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearVoterSession() {
  localStorage.removeItem(SESSION_KEY);
}

// ──────────────────────────────────────────────────────────────
// VOTES
// ──────────────────────────────────────────────────────────────

// In-memory guard to prevent double-submit race conditions within the same page session
const _voteSubmitLock = new Set();

export async function castVotes(voteRecords) {
  // voteRecords = [{election_id, position_id, candidate_id, voter_id}]
  if (!voteRecords || voteRecords.length === 0) throw new Error('No vote records provided.');

  const voterId    = voteRecords[0]?.voter_id;
  const electionId = voteRecords[0]?.election_id;

  if (!voterId || !electionId) throw new Error('Invalid vote records: missing voter_id or election_id.');

  const lockKey = `${voterId}-${electionId}`;

  // Double-submit guard — prevents race condition on slow networks
  if (_voteSubmitLock.has(lockKey)) {
    throw new Error('Your vote is already being submitted. Please wait.');
  }
  _voteSubmitLock.add(lockKey);

  try {
    // Re-check voter status immediately before inserting (prevents race condition)
    const { data: voter, error: voterErr } = await supabase
      .from('voters')
      .select('status')
      .eq('id', voterId)
      .single();

    if (voterErr) throw new Error('Could not verify voter status. Please try again.');

    if (voter?.status === TOKEN_STATUS.USED) {
      throw new Error('This token has already been used. Each voter may only vote once.');
    }
    if (voter?.status === TOKEN_STATUS.REVOKED) {
      throw new Error('This token has been revoked. Please contact your administrator.');
    }
    if (voter?.status === TOKEN_STATUS.EXPIRED) {
      throw new Error('This token has expired. Please contact your administrator.');
    }

    // Insert all vote records atomically
    const { data, error } = await supabase.from('votes').insert(voteRecords).select();
    if (error) throw error;

    // CRITICAL FIX: Mark token as USED immediately after successful vote insertion
    // This prevents double-voting — token status was never updated before this fix
    await markTokenUsed(voterId);

    return data;
  } finally {
    // Always release the lock, even on error
    _voteSubmitLock.delete(lockKey);
  }
}

export async function hasVoted(voterId, electionId) {
  const { data } = await supabase
    .from('voters')
    .select('status')
    .eq('id', voterId)
    .eq('election_id', electionId)
    .single();
  return data?.status === TOKEN_STATUS.USED;
}

export async function fetchVoteCounts(electionId) {
  const { data, error } = await supabase
    .from('votes')
    .select('candidate_id, candidates(name, positions(title))')
    .eq('election_id', electionId);
  if (error) throw error;
  return data || [];
}

export async function fetchTotalVotes(electionId) {
  const { count, error } = await supabase
    .from('votes')
    .select('id', { count: 'exact', head: true })
    .eq('election_id', electionId);
  if (error) throw error;
  return count || 0;
}

// ──────────────────────────────────────────────────────────────
// DASHBOARD STATS
// ──────────────────────────────────────────────────────────────
export async function fetchDashboardStats() {
  const [
    { count: totalElections },
    { count: activeElections },
    { count: totalVoters },
    { count: totalVotes },
    { count: totalCandidates },
  ] = await Promise.all([
    supabase.from('elections').select('id', { count: 'exact', head: true }),
    supabase.from('elections').select('id', { count: 'exact', head: true }).eq('status', ELECTION_STATUS.ACTIVE),
    supabase.from('voters').select('id',    { count: 'exact', head: true }),
    supabase.from('votes').select('id',     { count: 'exact', head: true }),
    supabase.from('candidates').select('id',{ count: 'exact', head: true }),
  ]);
  return {
    totalElections: totalElections || 0,
    activeElections: activeElections || 0,
    totalVoters:    totalVoters    || 0,
    totalVotes:     totalVotes     || 0,
    totalCandidates:totalCandidates|| 0,
    turnoutPct:     totalVoters > 0 ? ((totalVotes / totalVoters) * 100).toFixed(1) : '0.0',
  };
}

// ──────────────────────────────────────────────────────────────
// SETTINGS
// ──────────────────────────────────────────────────────────────
export async function fetchSettings() {
  // FIX: was .single() which throws if settings row is missing — use maybeSingle()
  const { data, error } = await supabase.from('settings').select('*').limit(1).maybeSingle();
  if (error) throw error;
  return data || {};
}

export async function saveSettings(payload) {
  // Upsert single settings row
  const { data: existing } = await supabase.from('settings').select('id').limit(1).maybeSingle();
  if (existing?.id) {
    const { error } = await supabase.from('settings').update(payload).eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('settings').insert(payload);
    if (error) throw error;
  }
  await logAudit('system', 'System settings updated');
}

// ──────────────────────────────────────────────────────────────
// AUDIT LOGS
// ──────────────────────────────────────────────────────────────
export async function logAudit(action, description = '') {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('audit_logs').insert({
      action,
      description,
      admin_id: user?.id || null,
    });
  } catch (e) {
    // Non-blocking — log to console in dev so we know about failures
    console.warn('[STACKWEB Audit] Failed to log audit entry:', action, e?.message);
  }
}

export async function fetchAuditLogs(limit = 200) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// ──────────────────────────────────────────────────────────────
// REAL-TIME SUBSCRIPTIONS & AUTOMATIC LIFECYCLE TEARDOWN
// ──────────────────────────────────────────────────────────────
const _activeChannels = new Set();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    _activeChannels.forEach(ch => {
      try { supabase.removeChannel(ch); } catch {}
    });
    _activeChannels.clear();
  });
}

function _registerChannel(channel) {
  _activeChannels.add(channel);
  return () => {
    _activeChannels.delete(channel);
    try { supabase.removeChannel(channel); } catch {}
  };
}

export function subscribeToVotes(electionId, callback) {
  const channel = supabase
    .channel(`votes-${electionId}-${Date.now()}`)
    .on('postgres_changes', {
      event:  'INSERT',
      schema: 'public',
      table:  'votes',
      filter: `election_id=eq.${electionId}`,
    }, callback)
    .subscribe();
  return _registerChannel(channel);
}

export function subscribeToElection(electionId, callback) {
  const channel = supabase
    .channel(`election-${electionId}-${Date.now()}`)
    .on('postgres_changes', {
      event:  'UPDATE',
      schema: 'public',
      table:  'elections',
      filter: `id=eq.${electionId}`,
    }, callback)
    .subscribe();
  return _registerChannel(channel);
}

export function subscribeToVoters(electionId, callback) {
  const channel = supabase
    .channel(`voters-${electionId}-${Date.now()}`)
    .on('postgres_changes', {
      event:  '*',
      schema: 'public',
      table:  'voters',
      filter: `election_id=eq.${electionId}`,
    }, callback)
    .subscribe();
  return _registerChannel(channel);
}
