-- Real conversations + messages between a worker and a client. Previously chat lived entirely in
-- local per-session state keyed by counterpart *name*, so nothing sent by one account was ever
-- visible to the other. This backs the discovery-originated chat flow (client messages/requests a
-- real worker) with actual persistence; other chat entry points (jobs/bookings/groups, which are
-- still local mock data themselves) are unaffected and keep working as local-only threads.

create table conversations (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references users (id) on delete cascade,
  client_id uuid not null references users (id) on delete cascade,
  job_context text not null default '',
  created_at timestamptz not null default now(),
  unique (worker_id, client_id)
);

create index conversations_worker_id_idx on conversations (worker_id);
create index conversations_client_id_idx on conversations (client_id);

alter table conversations enable row level security;

create policy "participants can view their conversations" on conversations
  for select using (auth.uid() = worker_id or auth.uid() = client_id);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references users (id) on delete cascade,
  kind text not null check (kind in ('text', 'offer')) default 'text',
  text text,
  offer_service text,
  offer_price numeric,
  offer_price_type text,
  offer_scheduled_at timestamptz,
  offer_status text check (offer_status in ('pending', 'accepted', 'declined')),
  edited boolean not null default false,
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);

create index messages_conversation_id_idx on messages (conversation_id);

alter table messages enable row level security;

create policy "participants can view messages in their conversations" on messages
  for select using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.worker_id = auth.uid() or c.client_id = auth.uid())
    )
  );

create policy "participants can send messages in their conversations" on messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.worker_id = auth.uid() or c.client_id = auth.uid())
    )
  );

-- Both participants (not just the sender) can update a message row — accepting/declining an
-- offer is done by whoever didn't send it.
create policy "participants can update messages in their conversations" on messages
  for update using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.worker_id = auth.uid() or c.client_id = auth.uid())
    )
  );

-- Client-initiated: finds or creates the (worker, me) conversation. Security definer so it can
-- insert into `conversations` without a broader insert policy — this is the only sanctioned way a
-- conversation gets created.
create or replace function public.start_conversation(target_worker_id uuid, initial_job_context text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  conv_id uuid;
begin
  select id into conv_id from conversations
    where worker_id = target_worker_id and client_id = auth.uid();
  if conv_id is null then
    insert into conversations (worker_id, client_id, job_context)
    values (target_worker_id, auth.uid(), initial_job_context)
    returning id into conv_id;
  end if;
  return conv_id;
end;
$$;

grant execute on function public.start_conversation(uuid, text) to authenticated;

-- Lists my conversations with the counterpart's safe public info (users RLS is own-row-only, so a
-- plain join wouldn't see the other side) — same security-definer pattern as email_for_username.
create or replace function public.my_conversations()
returns table (
  id uuid,
  counterpart_id uuid,
  counterpart_business_name text,
  counterpart_first_name text,
  counterpart_avatar_uri text,
  job_context text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    case when c.worker_id = auth.uid() then c.client_id else c.worker_id end as counterpart_id,
    u.business_name,
    u.first_name,
    u.avatar_uri,
    c.job_context,
    c.created_at
  from conversations c
  join users u on u.id = case when c.worker_id = auth.uid() then c.client_id else c.worker_id end
  where c.worker_id = auth.uid() or c.client_id = auth.uid()
  order by c.created_at desc;
$$;

grant execute on function public.my_conversations() to authenticated;
