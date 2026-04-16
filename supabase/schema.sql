-- ═══════════════════════════════════════════════════════════════
-- E.V.E — Elevate Value Add Engine
-- Supabase Schema
-- Run this once in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Enable realtime for all tables we want to sync
-- (do this in Supabase Dashboard → Database → Replication)

-- ── 1. Deal imports ──────────────────────────────────────────────
-- Stores the raw CSV + processed deals from each Salesforce import
CREATE TABLE IF NOT EXISTS eve_imports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_at  timestamptz NOT NULL DEFAULT now(),
  imported_by  text,                          -- email of who imported
  raw_csv      text NOT NULL,                 -- full paste content
  row_count    integer NOT NULL DEFAULT 0,
  label        text                            -- optional "Mar 2026" label
);

-- ── 2. Deal rows ─────────────────────────────────────────────────
-- Individual enriched deal rows tied to an import
CREATE TABLE IF NOT EXISTS eve_deals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id    uuid REFERENCES eve_imports(id) ON DELETE CASCADE,
  is_manual    boolean NOT NULL DEFAULT false,
  manual_id    text,                           -- client-side _manualId
  data         jsonb NOT NULL,                 -- full enriched deal object
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS eve_deals_import_id ON eve_deals(import_id);
CREATE INDEX IF NOT EXISTS eve_deals_is_manual ON eve_deals(is_manual);

-- ── 3. Notes ─────────────────────────────────────────────────────
-- Weekly forecast notes (W1-W5 per AD per month)
CREATE TABLE IF NOT EXISTS eve_notes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month        text NOT NULL,                  -- 'Jul', 'Aug' etc
  user_name    text NOT NULL,                  -- full AD name
  week_key     text NOT NULL,                  -- 'W1'–'W5'
  content      text NOT NULL DEFAULT '',
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(month, user_name, week_key)
);

-- ── 4. Free notes ────────────────────────────────────────────────
-- Month summary narrative notes
CREATE TABLE IF NOT EXISTS eve_free_notes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month        text NOT NULL UNIQUE,
  content      text NOT NULL DEFAULT '',
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ── 5. Commit intelligence ───────────────────────────────────────
-- Timestamped weekly commit commentary
CREATE TABLE IF NOT EXISTS eve_commit_notes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month        text NOT NULL,
  text         text NOT NULL,
  day_label    text NOT NULL,
  note_date    text NOT NULL,                  -- YYYY-MM-DD
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS eve_commit_notes_month ON eve_commit_notes(month);

-- ── 6. Commit to company values ──────────────────────────────────
CREATE TABLE IF NOT EXISTS eve_commit_company (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month        text NOT NULL UNIQUE,
  value        numeric NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ── 7. Lost deal reviews ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eve_lost_reviews (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opp_name     text NOT NULL UNIQUE,
  reason       text NOT NULL DEFAULT '',
  detail       text NOT NULL DEFAULT '',
  decision     text NOT NULL DEFAULT '',
  competitor   text NOT NULL DEFAULT '',
  next_steps   text NOT NULL DEFAULT '',
  review_date  text NOT NULL DEFAULT '',
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ── 8. Services required flags ───────────────────────────────────
CREATE TABLE IF NOT EXISTS eve_svc_required (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opp_name     text NOT NULL UNIQUE,
  flag_value   text NOT NULL DEFAULT '',      -- 'yes' | 'no' | 'included' | ''
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ── 9. Budget targets ────────────────────────────────────────────
-- OI and ARR targets (user-editable, team-wide)
CREATE TABLE IF NOT EXISTS eve_budget_targets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type  text NOT NULL,                 -- 'oi' | 'arr'
  month        text NOT NULL,                 -- 'Jul'–'Jun'
  ad_key       text NOT NULL,                 -- 'CS', 'DT' etc
  value        numeric NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(target_type, month, ad_key)
);

-- ── 10. Account match reference ──────────────────────────────────
CREATE TABLE IF NOT EXISTS eve_account_match (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code text NOT NULL DEFAULT '',
  owner        text NOT NULL DEFAULT '',
  account_name text NOT NULL,
  parent       text NOT NULL DEFAULT '',
  elv_id       text NOT NULL DEFAULT '',
  elv_ad       text NOT NULL DEFAULT '',
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_name)
);

-- ── 11. ARR base data ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eve_arr_base (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad           text NOT NULL,
  parent       text NOT NULL DEFAULT '',
  elv_id       text NOT NULL DEFAULT '',
  parent_acc   text NOT NULL DEFAULT '',
  account_name text NOT NULL,
  base_arr     numeric NOT NULL DEFAULT 0,
  uplift_pct   numeric NOT NULL DEFAULT 0.22, -- stored as decimal e.g. 0.22
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_name)
);

-- ── 12. App config (key-value store) ────────────────────────────
-- Stores misc team settings as JSON blobs
CREATE TABLE IF NOT EXISTS eve_config (
  key          text PRIMARY KEY,
  value        jsonb NOT NULL,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- Row Level Security
-- For a team app where everyone has equal access,
-- use anon key with permissive policies.
-- For AD-specific access, upgrade to auth.users integration.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE eve_imports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE eve_deals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE eve_notes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE eve_free_notes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE eve_commit_notes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE eve_commit_company ENABLE ROW LEVEL SECURITY;
ALTER TABLE eve_lost_reviews  ENABLE ROW LEVEL SECURITY;
ALTER TABLE eve_svc_required  ENABLE ROW LEVEL SECURITY;
ALTER TABLE eve_budget_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE eve_account_match ENABLE ROW LEVEL SECURITY;
ALTER TABLE eve_arr_base      ENABLE ROW LEVEL SECURITY;
ALTER TABLE eve_config        ENABLE ROW LEVEL SECURITY;

-- Allow full access with anon key (team internal tool)
-- Replace with user-specific policies when you add Azure AD auth
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'eve_imports','eve_deals','eve_notes','eve_free_notes',
    'eve_commit_notes','eve_commit_company','eve_lost_reviews',
    'eve_svc_required','eve_budget_targets','eve_account_match',
    'eve_arr_base','eve_config'
  ] LOOP
    EXECUTE format('CREATE POLICY "team_access_%s" ON %s FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- Realtime — enable for tables that need live sync
-- ═══════════════════════════════════════════════════════════════
-- Run these in Supabase Dashboard → Database → Replication
-- or uncomment here if your project supports it:
--
-- ALTER PUBLICATION supabase_realtime ADD TABLE eve_deals;
-- ALTER PUBLICATION supabase_realtime ADD TABLE eve_notes;
-- ALTER PUBLICATION supabase_realtime ADD TABLE eve_commit_notes;
-- ALTER PUBLICATION supabase_realtime ADD TABLE eve_commit_company;
-- ALTER PUBLICATION supabase_realtime ADD TABLE eve_lost_reviews;
-- ALTER PUBLICATION supabase_realtime ADD TABLE eve_svc_required;
-- ALTER PUBLICATION supabase_realtime ADD TABLE eve_budget_targets;
