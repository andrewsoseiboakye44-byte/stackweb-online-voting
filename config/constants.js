// ============================================================
// STACKWEB — Application-Wide Constants
// ============================================================

export const APP_NAME = 'STACKWEB Online Voting System';
export const APP_VERSION = '1.1.0';

// User Roles
export const ROLES = {
  ADMIN: 'admin',
  VOTER: 'voter',
};

// Election Status
export const ELECTION_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  CLOSED: 'closed',
};

// Token Status
export const TOKEN_STATUS = {
  UNUSED: 'unused',
  USED: 'used',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
};

// Vote Status
export const VOTE_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
};

// Audit Log Actions
export const AUDIT_ACTIONS = {
  LOGIN: 'admin_login',
  LOGOUT: 'admin_logout',
  CREATE_ELECTION: 'create_election',
  UPDATE_ELECTION: 'update_election',
  DELETE_ELECTION: 'delete_election',
  CREATE_CANDIDATE: 'create_candidate',
  UPDATE_CANDIDATE: 'update_candidate',
  DELETE_CANDIDATE: 'delete_candidate',
  GENERATE_TOKENS: 'generate_tokens',
  START_VOTING: 'start_voting',
  STOP_VOTING: 'stop_voting',
  PAUSE_VOTING: 'pause_voting',
  CAST_VOTE: 'cast_vote',
  EXPORT_REPORT: 'export_report',
};

// Storage Paths
export const STORAGE_PATHS = {
  CANDIDATES: 'candidates/',
  LOGOS: 'logos/',
  AVATARS: 'avatars/',
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};
