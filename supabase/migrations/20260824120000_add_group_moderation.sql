-- Groups, third slice: real mute/kick/ban, a rejoin gate for kicked users even on public groups,
-- a two-step FAQ (ask vs answer, gated by a new per-member can_answer_faq flag), and a real
-- personal name alongside the existing (business-name-first) display name so the ownership
-- transfer picker can show both. Keep this file free of long prose comments — a prior migration
-- broke when its comments got line-wrapped by a terminal copy/paste; short comments only here.

alter table group_members add column can_answer_faq boolean not null default false;
alter table group_members add column muted_until timestamptz;
alter table group_members add column real_name text not null default '';

update group_members gm set real_name = coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), u.first_name, '')
  from users u where u.id = gm.user_id and gm.real_name = '';

alter table group_requests add column real_name text not null default '';

update group_requests gr set real_name = coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), u.first_name, '')
  from users u where u.id = gr.user_id and gr.real_name = '';

-- Owner needs write access to a member's row for mute/can_answer_faq. role_id/name stay
-- client-enforced-only (same trust boundary the rest of this table already relies on).
create policy "owner can update a member's row" on group_members
  for update using (
    exists (select 1 from groups g where g.id = group_members.group_id and g.owner_id = auth.uid())
  );

drop policy "you can join a public group yourself" on group_members;
create policy "you can join a public group yourself" on group_members
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from groups g where g.id = group_members.group_id and g.is_private = false)
    and not exists (select 1 from group_bans b where b.group_id = group_members.group_id and b.user_id = auth.uid())
    and not exists (select 1 from group_kicked_users k where k.group_id = group_members.group_id and k.user_id = auth.uid())
  );

drop policy "you can request to join a group" on group_requests;
create policy "you can request to join a group" on group_requests
  for insert with check (
    auth.uid() = user_id
    and not exists (select 1 from group_bans b where b.group_id = group_requests.group_id and b.user_id = auth.uid())
  );

-- Muted members can't send. Flagged messages become permanent (no delete, only dismiss-flag).
drop policy "members can send messages in their groups" on group_messages;
create policy "members can send messages in their groups" on group_messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from group_members gm
      where gm.group_id = group_messages.group_id and gm.user_id = auth.uid()
        and (gm.muted_until is null or gm.muted_until < now())
    )
  );

drop policy "sender or group owner can edit/delete a message" on group_messages;
create policy "sender or group owner can edit/delete a message" on group_messages
  for update using (
    auth.uid() = sender_id
    or exists (select 1 from groups g where g.id = group_messages.group_id and g.owner_id = auth.uid())
  )
  with check (not (flagged and deleted));

create table group_bans (
  group_id uuid not null references groups (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  banned_by uuid not null references users (id) on delete cascade,
  name text not null default '',
  banned_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table group_bans enable row level security;

create policy "owner can view bans, banned user can see their own" on group_bans
  for select using (
    auth.uid() = user_id
    or exists (select 1 from groups g where g.id = group_bans.group_id and g.owner_id = auth.uid())
  );

create policy "owner can ban a member" on group_bans
  for insert with check (
    exists (select 1 from groups g where g.id = group_bans.group_id and g.owner_id = auth.uid())
  );

create policy "owner can unban" on group_bans
  for delete using (
    exists (select 1 from groups g where g.id = group_bans.group_id and g.owner_id = auth.uid())
  );

create table group_kicked_users (
  group_id uuid not null references groups (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  kicked_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table group_kicked_users enable row level security;

create policy "owner can view kicks, kicked user can see their own" on group_kicked_users
  for select using (
    auth.uid() = user_id
    or exists (select 1 from groups g where g.id = group_kicked_users.group_id and g.owner_id = auth.uid())
  );

create policy "owner can record a kick" on group_kicked_users
  for insert with check (
    exists (select 1 from groups g where g.id = group_kicked_users.group_id and g.owner_id = auth.uid())
  );

-- Instant-join for public groups moves server-side so a previously-kicked user gets routed into
-- group_requests instead, even though the group itself is still public.
create or replace function public.join_public_group(target_group_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me_name text;
  me_real_name text;
  me_avatar text;
  target_is_private boolean;
begin
  select is_private into target_is_private from groups where id = target_group_id;
  if target_is_private is null then
    raise exception 'group not found';
  end if;

  if exists (select 1 from group_bans where group_id = target_group_id and user_id = auth.uid()) then
    return 'banned';
  end if;

  select coalesce(nullif(business_name, ''), nullif(first_name, ''), 'You'),
         coalesce(nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''), first_name, ''),
         coalesce(avatar_uri, '')
    into me_name, me_real_name, me_avatar
    from users where id = auth.uid();

  if target_is_private or exists (select 1 from group_kicked_users where group_id = target_group_id and user_id = auth.uid()) then
    insert into group_requests (group_id, user_id, name, real_name, avatar_uri)
    values (target_group_id, auth.uid(), me_name, me_real_name, me_avatar)
    on conflict (group_id, user_id) do nothing;
    return 'requested';
  end if;

  insert into group_members (group_id, user_id, name, real_name, avatar_uri, role_id)
  values (target_group_id, auth.uid(), me_name, me_real_name, me_avatar, 'member')
  on conflict (group_id, user_id) do nothing;
  return 'joined';
end;
$$;

grant execute on function public.join_public_group(uuid) to authenticated;

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
  me_real_name text;
  me_avatar text;
begin
  select coalesce(nullif(business_name, ''), nullif(first_name, ''), 'You'),
         coalesce(nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''), first_name, ''),
         coalesce(avatar_uri, '')
    into me_name, me_real_name, me_avatar
    from users where id = auth.uid();

  insert into groups (name, description, avatar_uri, is_private, owner_id)
  values (group_name, group_description, group_avatar_uri, group_is_private, auth.uid())
  returning id into new_id;

  insert into group_members (group_id, user_id, name, real_name, avatar_uri, role_id, can_answer_faq)
  values (new_id, auth.uid(), me_name, me_real_name, me_avatar, 'president', true);

  return new_id;
end;
$$;

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

  if exists (select 1 from group_bans where group_id = target_group_id and user_id = target_user_id) then
    delete from group_requests where group_id = target_group_id and user_id = target_user_id;
    return;
  end if;

  select * into req from group_requests
    where group_id = target_group_id and user_id = target_user_id;
  if req is null then
    return;
  end if;

  delete from group_requests where group_id = target_group_id and user_id = target_user_id;

  insert into group_members (group_id, user_id, name, real_name, avatar_uri, role_id)
  values (target_group_id, target_user_id, req.name, req.real_name, req.avatar_uri, 'member')
  on conflict (group_id, user_id) do nothing;
end;
$$;

-- FAQ becomes ask/answer: answer starts null, is only visible pending to the asker, the owner, and
-- can_answer_faq members; becomes visible to everyone once answered.
alter table group_faqs alter column answer drop not null;
alter table group_faqs add column flagged boolean not null default false;
alter table group_faqs add column answered_by_id uuid references users (id) on delete set null;
alter table group_faqs add column answered_by_name text;
alter table group_faqs add column answered_at timestamptz;

drop policy "members can view faq entries" on group_faqs;
create policy "members can view faq entries" on group_faqs
  for select using (
    (
      answer is not null
      and exists (select 1 from group_members gm where gm.group_id = group_faqs.group_id and gm.user_id = auth.uid())
    )
    or author_id = auth.uid()
    or exists (select 1 from groups g where g.id = group_faqs.group_id and g.owner_id = auth.uid())
    or exists (
      select 1 from group_members gm
      where gm.group_id = group_faqs.group_id and gm.user_id = auth.uid() and gm.can_answer_faq = true
    )
  );

drop policy "members can post a faq entry" on group_faqs;
create policy "members can ask a question" on group_faqs
  for insert with check (
    auth.uid() = author_id
    and answer is null
    and exists (select 1 from group_members gm where gm.group_id = group_faqs.group_id and gm.user_id = auth.uid())
  );

create policy "owner or qualified member can answer a question" on group_faqs
  for update using (
    exists (select 1 from groups g where g.id = group_faqs.group_id and g.owner_id = auth.uid())
    or exists (
      select 1 from group_members gm
      where gm.group_id = group_faqs.group_id and gm.user_id = auth.uid() and gm.can_answer_faq = true
    )
  )
  with check (answered_by_id = auth.uid());

drop policy "author or owner can delete a faq entry" on group_faqs;
create policy "author, owner, or qualified member can delete a faq entry" on group_faqs
  for delete using (
    auth.uid() = author_id
    or exists (select 1 from groups g where g.id = group_faqs.group_id and g.owner_id = auth.uid())
    or exists (
      select 1 from group_members gm
      where gm.group_id = group_faqs.group_id and gm.user_id = auth.uid() and gm.can_answer_faq = true
    )
  );
