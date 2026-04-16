-- ── E.V.E Complete Supabase Schema ───────────────────────────────────────────
-- Run this in Supabase SQL Editor to create all required tables
-- Safe to run multiple times (IF NOT EXISTS)

-- ARR imports metadata
create table if not exists eve_arr_imports (
  id text primary key,
  import_date timestamptz,
  row_count integer,
  updated_at timestamptz default now()
);

-- ARR deals
create table if not exists eve_arr_deals (
  opportunity_id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- ARR duplicates log
create table if not exists eve_arr_dupes (
  opportunity_id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- ARR exempt log
create table if not exists eve_arr_exempt (
  opportunity_id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Forecast posts
create table if not exists eve_forecast_posts (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Deal qualifications
create table if not exists eve_deal_qualifications (
  opp_id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Manual ARR deals
create table if not exists eve_manual_arr_deals (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);
