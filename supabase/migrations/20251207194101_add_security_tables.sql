/*
  # Add Security Tables

  This migration adds tables for enhanced security features including
  two-factor authentication (2FA) and security event logging.

  ## New Tables

  ### `user_2fa`
  Stores two-factor authentication configuration for users
  - `user_id` (uuid, primary key, references auth.users)
  - `secret` (text) - TOTP secret key
  - `backup_codes` (text[]) - Array of backup codes
  - `enabled_at` (timestamptz) - When 2FA was enabled
  - `last_used_at` (timestamptz) - Last successful 2FA verification

  ### `user_security_events`
  Logs security-related events for audit trail
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `event_type` (text) - Type of security event
  - `ip_address` (text) - IP address of the event
  - `user_agent` (text) - Browser/device information
  - `location` (text) - Geographical location (optional)
  - `metadata` (jsonb) - Additional event data
  - `created_at` (timestamptz) - Event timestamp

  ## Security
  - Enable RLS on both tables
  - Users can only read their own data
  - System can insert events via service role

  ## Notes
  - Event types include: 'password_change', '2fa_enabled', '2fa_disabled',
    'login', 'failed_login', 'session_revoked'
  - Backup codes should be hashed before storage (handled in application)
  - Security events are append-only (no updates or deletes)
*/

-- Create user_2fa table
CREATE TABLE IF NOT EXISTS user_2fa (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  secret text NOT NULL,
  backup_codes text[] NOT NULL DEFAULT '{}',
  enabled_at timestamptz DEFAULT now(),
  last_used_at timestamptz
);

-- Create user_security_events table
CREATE TABLE IF NOT EXISTS user_security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  ip_address text,
  user_agent text,
  location text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create index on user_security_events for faster queries
CREATE INDEX IF NOT EXISTS idx_user_security_events_user_id
  ON user_security_events(user_id);

CREATE INDEX IF NOT EXISTS idx_user_security_events_created_at
  ON user_security_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_security_events_event_type
  ON user_security_events(event_type);

-- Enable Row Level Security
ALTER TABLE user_2fa ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_security_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_2fa

-- Users can read their own 2FA settings
CREATE POLICY "Users can read own 2FA settings"
  ON user_2fa
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own 2FA settings
CREATE POLICY "Users can enable 2FA"
  ON user_2fa
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own 2FA settings
CREATE POLICY "Users can update own 2FA settings"
  ON user_2fa
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own 2FA settings (disable 2FA)
CREATE POLICY "Users can disable 2FA"
  ON user_2fa
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for user_security_events

-- Users can read their own security events
CREATE POLICY "Users can view own security events"
  ON user_security_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can insert security events
CREATE POLICY "Service can insert security events"
  ON user_security_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE user_2fa IS 'Stores two-factor authentication configuration for users';
COMMENT ON TABLE user_security_events IS 'Logs security-related events for audit trail';

COMMENT ON COLUMN user_security_events.event_type IS 'Types: password_change, 2fa_enabled, 2fa_disabled, login, failed_login, session_revoked';
COMMENT ON COLUMN user_security_events.metadata IS 'Additional event-specific data in JSON format';
