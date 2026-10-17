-- Migration: 001_add_google_auth.sql
-- Description: Add google_id column and unique index to users table for Google Sign-In and account linking.
-- Backward-compatible: Yes (column is nullable, legacy accounts retain existing passwords and authentication).

ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_google_id ON users (google_id) WHERE google_id IS NOT NULL;
