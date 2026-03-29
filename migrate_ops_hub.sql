-- ================================================================
-- Caravana Schedule Hub — Operations Hub Migration
-- Run this in the Supabase Dashboard: SQL Editor > New Query
-- ================================================================

-- 1. Add new columns to deliveries table
ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS "orderNumber"      text,
  ADD COLUMN IF NOT EXISTS "orderSource"      text DEFAULT 'in_store',
  ADD COLUMN IF NOT EXISTS "deliveryTeam"     text,
  ADD COLUMN IF NOT EXISTS items              jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "trialExpires"     date,
  ADD COLUMN IF NOT EXISTS "day1Sent"         boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "day3Sent"         boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "reviewRequested"  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS flagged            text,
  ADD COLUMN IF NOT EXISTS "flagReason"       text,
  ADD COLUMN IF NOT EXISTS "flagDate"         date,
  ADD COLUMN IF NOT EXISTS inspection         jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS condition          text,
  ADD COLUMN IF NOT EXISTS "damageNotes"      text,
  ADD COLUMN IF NOT EXISTS "deliveryNotes"    text,
  ADD COLUMN IF NOT EXISTS "signatureUrl"     text,
  ADD COLUMN IF NOT EXISTS "printName"        text,
  ADD COLUMN IF NOT EXISTS "signDate"         date,
  ADD COLUMN IF NOT EXISTS "completedAt"      timestamptz;

-- 2. Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Enable RLS on team_members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- 4. Allow anonymous read/write for team_members (same pattern as deliveries)
CREATE POLICY "Allow all for team_members"
  ON team_members
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- 5. Seed initial team members (edit these as needed)
INSERT INTO team_members (name) VALUES
  ('Juan'),
  ('Erik'),
  ('Ulises'),
  ('Moises')
ON CONFLICT DO NOTHING;

-- ✅ Done! Run SELECT * FROM team_members; to verify.
