-- M0: minimal users + legal_acceptances tables.
-- Full schema (worker_profiles, guardians, service_categories, bookings, etc.)
-- lands with M1+ per HANDOFF.md §3 and §12.

create extension if not exists pgcrypto;

create type user_role as enum ('worker', 'client');

create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  phone text,
  role user_role not null,
  created_at timestamptz not null default now()
);

create type legal_agreement_key as enum (
  'tos',
  'worker_ibo_agreement',
  'client_agreement',
  'guardian_consent_aor'
);

create table legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  agreement_key legal_agreement_key not null,
  version text not null,
  accepted_at timestamptz not null default now(),
  ip_address text,
  user_agent text
);

alter table users enable row level security;
alter table legal_acceptances enable row level security;

-- Users can only see/write their own row. Broader policies (guardian visibility,
-- worker/client PII isolation, etc.) land in M1+ alongside the rest of the schema.
create policy "users can view own row" on users
  for select using (auth.uid() = id);

create policy "users can insert own row" on users
  for insert with check (auth.uid() = id);

create policy "users can view own legal acceptances" on legal_acceptances
  for select using (auth.uid() = user_id);

create policy "users can insert own legal acceptances" on legal_acceptances
  for insert with check (auth.uid() = user_id);
