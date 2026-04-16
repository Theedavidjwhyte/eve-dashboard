-- ── E.V.E New Sync Tables ─────────────────────────────────────────────────────
-- Run this in your Supabase SQL editor

-- Forecast Posts
create table if not exists eve_forecast_posts (
  id text primary key,
  week_label text,
  month text,
  quarter text,
  period text,
  generated_at timestamptz,
  content text,
  summary jsonb,
  updated_at timestamptz default now()
);

-- Deal Qualifications (MEDDPICC reviews)
create table if not exists eve_deal_qualifications (
  opportunity_id text primary key,
  opp_name text,
  data jsonb,
  updated_at timestamptz default now()
);

-- Manual ARR Deals
create table if not exists eve_manual_arr_deals (
  opportunity_id text primary key,
  data jsonb,
  updated_at timestamptz default now()
);

-- Enable RLS (optional but recommended)
alter table eve_forecast_posts enable row level security;
alter table eve_deal_qualifications enable row level security;
alter table eve_manual_arr_deals enable row level security;

-- Allow all authenticated and anonymous reads/writes (team access)
create policy "allow_all" on eve_forecast_posts for all using (true) with check (true);
create policy "allow_all" on eve_deal_qualifications for all using (true) with check (true);
create policy "allow_all" on eve_manual_arr_deals for all using (true) with check (true);
