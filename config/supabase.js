/**
 * STACKWEB Online Voting System
 * Supabase Configuration
 *
 * HOW TO SETUP:
 * 1. Go to https://supabase.com → Your Project → Settings → API
 * 2. Copy "Project URL" and paste it as SUPABASE_URL below
 * 3. Copy "anon public" key and paste it as SUPABASE_ANON_KEY below
 * 4. Run the SQL in /database/schema.sql in your Supabase SQL Editor
 * 5. Create an admin user in Supabase Auth → Users → Add User
 * 6. In the SQL Editor run: INSERT INTO profiles (id, role, full_name) VALUES ('<user-id>', 'admin', 'Admin Name');
 */

export const SUPABASE_URL      = 'https://uvluvkivfxvyygnjfmju.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bHV2a2l2Znh2eXlnbmpmbWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjE0NjYsImV4cCI6MjA5NTAzNzQ2Nn0.X_sCNeGfFeQ_rM7nNZRDkiYVKEySZqz655pWKhAyqDY';

/**
 * App-wide configuration constants
 * NOTE: APP_VERSION and APP_NAME are defined in config/constants.js (single source of truth).
 */
export const APP_CONFIG = {
  APP_NAME:        'STACKWEB Online Voting System',
  TOKEN_PREFIX:    'SW',
  MAX_PHOTO_SIZE:  2 * 1024 * 1024,   // 2MB
  MAX_BATCH_TOKENS: 1000,
  DEFAULT_LOCKOUT_ATTEMPTS: 5,
  DEFAULT_LOCKOUT_MINUTES:  15,
};
