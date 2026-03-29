-- ================================================================
-- Caravana — Repairs Table Migration
-- Run in Supabase Dashboard: SQL Editor > New Query
-- ================================================================

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

-- ✅ Done! Run SELECT * FROM repairs; to verify.
