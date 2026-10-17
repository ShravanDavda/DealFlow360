-- Migration Rollback: 001_add_google_auth_rollback.sql
-- Description: Rollback google_id column and unique index from users table.

DROP INDEX IF EXISTS uq_users_google_id;
ALTER TABLE users DROP COLUMN IF EXISTS google_id;
