-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query)

create table if not exists site_config (
  id int primary key default 1,
  names text default 'Alex & Jordan',
  wedding_date date default '2027-06-12',
  story text default '',
  venue_name text default '',
  venue_address text default '',
  venue_maps_url text default '',
  schedule jsonb default '[]',
  registry_links jsonb default '[]',
  gallery jsonb default '[]',
  admin_code text default 'ADMIN2027',
  constraint single_row check (id = 1)
);

insert into site_config (id) values (1) on conflict (id) do nothing;

create table if not exists guests (
  code text primary key,
  name text not null,
  rsvp_status text default '',
  party_size int default 1,
  max_party int default 2,
  meal text default '',
  dietary text default '',
  message text default '',
  created_at timestamptz default now()
);

create table if not exists planner (
  id int primary key default 1,
  checklist jsonb default '{}',
  budget jsonb default '[]',
  vendors jsonb default '[]',
  timeline jsonb default '[]',
  notes text default '',
  constraint single_row check (id = 1)
);

insert into planner (id) values (1) on conflict (id) do nothing;

create table if not exists gifts (
  id uuid primary key default gen_random_uuid(),
  guest_code text references guests(code) on delete set null,
  guest_name text,
  amount_pence int not null,
  message text default '',
  stripe_session_id text,
  status text default 'pending', -- pending | paid
  created_at timestamptz default now()
);

-- Row Level Security: open for this single-couple use case.
-- Anyone with the anon key can read/write. Fine for a private wedding site
-- behind your own code-based login, but DO NOT reuse these policies for a
-- multi-tenant product without adding real auth + per-tenant restrictions.
alter table site_config enable row level security;
alter table guests enable row level security;
alter table planner enable row level security;
alter table gifts enable row level security;

create policy "public read/write site_config" on site_config for all using (true) with check (true);
create policy "public read/write guests" on guests for all using (true) with check (true);
create policy "public read/write planner" on planner for all using (true) with check (true);
create policy "public read/write gifts" on gifts for all using (true) with check (true);
