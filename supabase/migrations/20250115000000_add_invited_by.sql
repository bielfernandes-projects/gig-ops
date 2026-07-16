-- Migration: Add invited_by column to go_profiles
-- Purpose: link viewer accounts to the admin that invited them,
-- so we can resolve their go_members.id during getUserInfo()
-- and admin can list their invited users on /profile.

ALTER TABLE go_profiles
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES go_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_go_profiles_invited_by
  ON go_profiles(invited_by);
