-- Groups, core slice: creating, joining/requesting, membership, and group chat now persist to
-- Supabase. Custom roles beyond the built-in president/member split, bans, and activity logs stay
-- local-only/mock (GroupsContext seeds them fresh on every fetch) — a smaller, testable slice,
-- matching how reviews/distance/bookings were rolled out incrementally rather than all at once.
-- Member/request rows denormalize the user's name + avatar (same shape the old mock data already
-- used) so the client never needs to join against `users`, whose RLS is own-row-only.

create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  avatar_uri text not null default '',
  is_private boolean not null default false,
  owner_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table groups enable row level security;

-- Groups are a public directory (like Discover) — any signed-in account can browse them to decide
-- whether to join or request. Nothing sensitive lives on this row.
create policy "signed-in users can view groups" on groups
  for select using (auth.uid() is not null);

create policy "owner can update their group" on groups
  for update using (auth.uid() = owner_id);

-- No insert policy: groups are only ever created through create_group() below, which also seeds
-- the owner's membership row in the same transaction.

create table group_members (
  group_id uuid not null references groups (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  name text not null,
  avatar_uri text not null default '',
  role_id text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_members_user_id_idx on group_members (user_id);

alter table group_members enable row level security;

create policy "signed-in users can view group members" on group_members
  for select using (auth.uid() is not null);

create policy "you can join a public group yourself" on group_members
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from groups g where g.id = group_members.group_id and g.is_private = false)
  );

create policy "you can leave, or the owner can remove you" on group_members
  for delete using (
    auth.uid() = user_id
    or exists (select 1 from groups g where g.id = group_members.group_id and g.owner_id = auth.uid())
  );

create table group_requests (
  group_id uuid not null references groups (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  name text not null,
  avatar_uri text not null default '',
  requested_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table group_requests enable row level security;

create policy "requester and group owner can view a request" on group_requests
  for select using (
    auth.uid() = user_id
    or exists (select 1 from groups g where g.id = group_requests.group_id and g.owner_id = auth.uid())
  );

create policy "you can request to join a group" on group_requests
  for insert with check (auth.uid() = user_id);

create policy "requester can cancel, or owner can decline" on group_requests
  for delete using (
    auth.uid() = user_id
    or exists (select 1 from groups g where g.id = group_requests.group_id and g.owner_id = auth.uid())
  );

create table group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  sender_id uuid not null references users (id) on delete cascade,
  text text not null,
  edited boolean not null default false,
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);

create index group_messages_group_id_idx on group_messages (group_id);

alter table group_messages enable row level security;

create policy "members can view messages in their groups" on group_messages
  for select using (
    exists (select 1 from group_members gm where gm.group_id = group_messages.group_id and gm.user_id = auth.uid())
  );

create policy "members can send messages in their groups" on group_messages
  for insert with check (
    auth.uid() = sender_id
    and exists (select 1 from group_members gm where gm.group_id = group_messages.group_id and gm.user_id = auth.uid())
  );

-- Only the sender can edit/soft-delete their own message — deleting *someone else's* message
-- (a moderator power in the mock role system) stays a local-only, non-persisted action for now.
create policy "sender can edit or delete their own message" on group_messages
  for update using (auth.uid() = sender_id);

-- Creates a group and seeds the creator as its president in one step. Security definer because
-- there's deliberately no general insert policy on `groups` — this function is the only
-- sanctioned way a group gets created (same pattern as start_conversation).
create or replace function public.create_group(
  group_name text,
  group_description text default '',
  group_avatar_uri text default '',
  group_is_private boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  me_name text;
  me_avatar text;
begin
  select coalesce(nullif(business_name, ''), nullif(first_name, ''), 'You'), coalesce(avatar_uri, '')
    into me_name, me_avatar
    from users where id = auth.uid();

  insert into groups (name, description, avatar_uri, is_private, owner_id)
  values (group_name, group_description, group_avatar_uri, group_is_private, auth.uid())
  returning id into new_id;

  insert into group_members (group_id, user_id, name, avatar_uri, role_id)
  values (new_id, auth.uid(), me_name, me_avatar, 'president');

  return new_id;
end;
$$;

grant execute on function public.create_group(text, text, text, boolean) to authenticated;

-- Only the real group owner can accept a request (full role/power-based permissions for this stay
-- mock — see GroupsContext). Security definer so it can add the requester as a member on the
-- owner's say-so, which no per-row insert policy could express for a user_id that isn't auth.uid().
create or replace function public.accept_group_request(target_group_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req group_requests;
begin
  if not exists (select 1 from groups where id = target_group_id and owner_id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  select * into req from group_requests
    where group_id = target_group_id and user_id = target_user_id;
  if req is null then
    return;
  end if;

  delete from group_requests where group_id = target_group_id and user_id = target_user_id;

  insert into group_members (group_id, user_id, name, avatar_uri, role_id)
  values (target_group_id, target_user_id, req.name, req.avatar_uri, 'member')
  on conflict (group_id, user_id) do nothing;
end;
$$;

grant execute on function public.accept_group_request(uuid, uuid) to authenticated;
