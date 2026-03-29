-- ================================================================
-- Caravana — Full Migration (Run this once in Supabase SQL Editor)
-- Includes: ops hub columns + repairs table + missing new columns
-- ================================================================

-- ── STEP 1: Add ALL columns to the deliveries table ────────────
ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS "contactName"      text,
  ADD COLUMN IF NOT EXISTS "contactStatus"    text DEFAULT 'Scheduled',
  ADD COLUMN IF NOT EXISTS email              text,
  ADD COLUMN IF NOT EXISTS "orderNumber"      text,
  ADD COLUMN IF NOT EXISTS "orderSource"      text DEFAULT 'in_store',
  ADD COLUMN IF NOT EXISTS "deliveryTeam"     text,
  ADD COLUMN IF NOT EXISTS "invoiceNumber"    text,
  ADD COLUMN IF NOT EXISTS items              jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "trialEnabled"     boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS "trialExpires"     date,
  ADD COLUMN IF NOT EXISTS flagged            text,
  ADD COLUMN IF NOT EXISTS "flagReason"       text,
  ADD COLUMN IF NOT EXISTS "flagDate"         date,
  ADD COLUMN IF NOT EXISTS "day1Sent"         boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "day3Sent"         boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "reviewRequested"  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS inspection         jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS condition          text,
  ADD COLUMN IF NOT EXISTS "damageNotes"      text,
  ADD COLUMN IF NOT EXISTS "deliveryNotes"    text,
  ADD COLUMN IF NOT EXISTS "signatureUrl"     text,
  ADD COLUMN IF NOT EXISTS "printName"        text,
  ADD COLUMN IF NOT EXISTS "signDate"         date,
  ADD COLUMN IF NOT EXISTS "completedAt"      timestamptz;

-- ── STEP 2: Create team_members table ───────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for team_members"
  ON team_members FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- Seed team members (adjust names as needed — won't duplicate)
INSERT INTO team_members (name) VALUES
  ('Juan'),
  ('Erik'),
  ('Ulises'),
  ('Moises')
ON CONFLICT (name) DO NOTHING;

-- ── STEP 3: Create repairs table ────────────────────────────────
CREATE TABLE IF NOT EXISTS repairs (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "clientName"          text NOT NULL,
  phone                 text,
  email                 text,
  address               text,
  description           text NOT NULL,
  "pickupDate"          date,
  "estimatedCompletion" date,
  "returnDate"          date,
  "returnTimeWindow"    text DEFAULT '10:00 AM - 12:00 PM',
  status                text DEFAULT 'Picked Up',
  team                  text,
  "techNotes"           text,
  "clientNotes"         text,
  "repairCost"          text,
  warranty              boolean DEFAULT false,
  "photoUrls"           jsonb DEFAULT '[]',
  "createdAt"           timestamptz DEFAULT now()
);

ALTER TABLE repairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for repairs"
  ON repairs FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- ── VERIFY ──────────────────────────────────────────────────────
-- Run these to confirm everything was created:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'deliveries' ORDER BY column_name;
-- SELECT * FROM team_members;
-- SELECT * FROM repairs;
