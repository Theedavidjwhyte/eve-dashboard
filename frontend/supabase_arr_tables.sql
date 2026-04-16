-- Run this in your Supabase SQL editor to enable ARR cross-device sync

-- ARR import metadata
create table if not exists eve_arr_imports (
  id text primary key,
  import_date timestamptz not null,
  row_count integer default 0,
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

-- Enable RLS (adjust policies to match your existing setup)
alter table eve_arr_imports enable row level security;
alter table eve_arr_deals enable row level security;
alter table eve_arr_dupes enable row level security;
alter table eve_arr_exempt enable row level security;

-- Allow all authenticated and anon users to read/write (same as other tables)
create policy "allow_all_arr_imports" on eve_arr_imports for all using (true) with check (true);
create policy "allow_all_arr_deals" on eve_arr_deals for all using (true) with check (true);
create policy "allow_all_arr_dupes" on eve_arr_dupes for all using (true) with check (true);
create policy "allow_all_arr_exempt" on eve_arr_exempt for all using (true) with check (true);
