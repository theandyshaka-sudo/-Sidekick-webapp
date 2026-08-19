-- Real bookings shared between a worker and a client. Jobs previously lived entirely in local
-- per-device state (JobsContext), so accepting an offer on one account never showed up as a
-- scheduled job for the other — same root cause the messaging fix addressed, in a different
-- subsystem. This backs requesting (from Discover) and accepting/scheduling (from chat, when the
-- conversation is real) with actual persistence. Manually-added jobs (worker/jobs.tsx "Add a job",
-- a free-text counterpart with no real account behind it) are unaffected and stay local-only.

create table bookings (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references users (id) on delete cascade,
  client_id uuid not null references users (id) on delete cascade,
  service text not null,
  price numeric not null,
  price_type text not null check (price_type in ('hour', 'job')),
  status text not null check (status in ('requested', 'scheduled', 'completed', 'declined')) default 'requested',
  scheduled_at timestamptz,
  completed_at timestamptz,
  initiated_by uuid not null references users (id),
  rating smallint check (rating between 1 and 5),
  review_text text,
  cash_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

create index bookings_worker_id_idx on bookings (worker_id);
create index bookings_client_id_idx on bookings (client_id);

alter table bookings enable row level security;

create policy "participants can view their bookings" on bookings
  for select using (auth.uid() = worker_id or auth.uid() = client_id);

create policy "participants can insert their bookings" on bookings
  for insert with check (auth.uid() = worker_id or auth.uid() = client_id);

create policy "participants can update their bookings" on bookings
  for update using (auth.uid() = worker_id or auth.uid() = client_id);

-- Lists my bookings with the counterpart's safe public info — same security-definer pattern as
-- my_conversations()/email_for_username (users RLS is own-row-only, so a plain join wouldn't see
-- the other side).
create function public.my_bookings()
returns table (
  id uuid,
  counterpart_id uuid,
  counterpart_business_name text,
  counterpart_first_name text,
  counterpart_avatar_uri text,
  service text,
  price numeric,
  price_type text,
  status text,
  scheduled_at timestamptz,
  completed_at timestamptz,
  initiated_by_me boolean,
  rating smallint,
  review_text text,
  cash_confirmed boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    b.id,
    case when b.worker_id = auth.uid() then b.client_id else b.worker_id end as counterpart_id,
    u.business_name,
    u.first_name,
    u.avatar_uri,
    b.service,
    b.price,
    b.price_type,
    b.status,
    b.scheduled_at,
    b.completed_at,
    b.initiated_by = auth.uid() as initiated_by_me,
    b.rating,
    b.review_text,
    b.cash_confirmed,
    b.created_at
  from bookings b
  join users u on u.id = case when b.worker_id = auth.uid() then b.client_id else b.worker_id end
  where b.worker_id = auth.uid() or b.client_id = auth.uid()
  order by b.created_at desc;
$$;

grant execute on function public.my_bookings() to authenticated;
