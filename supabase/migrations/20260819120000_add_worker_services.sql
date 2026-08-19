-- Persists worker service listings (previously only in-memory / seeded mock data, wiped on every
-- reload — same bug class the self-reported-age migration fixed) to Supabase. Columns mirror
-- WorkerDataContext's WorkerServiceItem.

create table worker_services (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references users (id) on delete cascade,
  title text not null,
  price_type text not null check (price_type in ('hour', 'job')),
  price_amount numeric not null,
  avail_from smallint not null,
  avail_to smallint not null,
  days smallint[] not null default '{}',
  photo_uri text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index worker_services_worker_id_idx on worker_services (worker_id);

alter table worker_services enable row level security;

-- Owner-only for now — client-facing discovery policies land with M2 search/browse
-- (HANDOFF.md §12) once that screen exists.
create policy "workers can view own services" on worker_services
  for select using (auth.uid() = worker_id);

create policy "workers can insert own services" on worker_services
  for insert with check (auth.uid() = worker_id);

create policy "workers can update own services" on worker_services
  for update using (auth.uid() = worker_id);

create policy "workers can delete own services" on worker_services
  for delete using (auth.uid() = worker_id);
