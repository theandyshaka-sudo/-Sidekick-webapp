-- Groups, fourth slice: real per-role permissions (kick/mute/ban, answer FAQs, view+act on
-- flagged messages), a kick/ban/mute audit log, kick reasons + rejoin-review visibility, and
-- widened flagged-message delete rights. Comment-light on purpose (past copy/paste breakage).

create table group_roles (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  name text not null,
  can_kick boolean not null default false,
  can_answer_faq boolean not null default false,
  can_view_flagged boolean not null default false,
  created_at timestamptz not null default now()
);

alter table group_roles enable row level security;

create policy "members can view permission roles" on group_roles
  for select using (
    exists (select 1 from group_members gm where gm.group_id = group_roles.group_id and gm.user_id = auth.uid())
  );

create policy "owner can manage permission roles" on group_roles
  for all using (
    exists (select 1 from groups g where g.id = group_roles.group_id and g.owner_id = auth.uid())
  ) with check (
    exists (select 1 from groups g where g.id = group_roles.group_id and g.owner_id = auth.uid())
  );

alter table group_members add column custom_role_id uuid references group_roles (id) on delete set null;
alter table group_members drop column can_answer_faq;

-- create_group() referenced the now-dropped column — redefine without it. The owner never needs a
-- custom_role_id: group_can_moderate() and the client's hasRealPower() both special-case owner_id.
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

  insert into group_members (group_id, user_id, name, real_name, avatar_uri, role_id)
  values (new_id, auth.uid(), me_name, me_real_name, me_avatar, 'president');

  return new_id;
end;
$$;

create table group_moderation_log (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  action text not null check (action in ('kick', 'ban', 'mute', 'unban', 'unmute')),
  target_user_id uuid not null references users (id),
  target_name text not null default '',
  target_real_name text not null default '',
  actor_id uuid not null references users (id),
  actor_name text not null default '',
  actor_real_name text not null default '',
  reason text,
  mute_until timestamptz,
  created_at timestamptz not null default now()
);

alter table group_moderation_log enable row level security;

create policy "owner or moderator can view the moderation log" on group_moderation_log
  for select using (
    exists (select 1 from groups g where g.id = group_moderation_log.group_id and g.owner_id = auth.uid())
    or exists (
      select 1 from group_members gm join group_roles gr on gr.id = gm.custom_role_id
      where gm.group_id = group_moderation_log.group_id and gm.user_id = auth.uid()
        and (gr.can_kick = true or gr.can_view_flagged = true)
    )
  );

alter table group_kicked_users add column reason text;
alter table group_kicked_users add column kicked_by uuid references users (id);
alter table group_kicked_users add column kicked_by_name text not null default '';
alter table group_kicked_users add column kicked_by_real_name text not null default '';
alter table group_kicked_users add column acknowledged_at timestamptz;

create policy "kicked user can acknowledge their own kick" on group_kicked_users
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Owner or a can_view_flagged-role member can now delete a flagged message (dismiss stays too);
-- the sender of a flagged message can never delete it themselves.
drop policy "sender or group owner can edit/delete a message" on group_messages;
create policy "sender, owner, or viewer role can edit/delete a message" on group_messages
  for update using (
    auth.uid() = sender_id
    or exists (select 1 from groups g where g.id = group_messages.group_id and g.owner_id = auth.uid())
    or exists (
      select 1 from group_members gm join group_roles gr on gr.id = gm.custom_role_id
      where gm.group_id = group_messages.group_id and gm.user_id = auth.uid() and gr.can_view_flagged = true
    )
  )
  with check (
    not (auth.uid() = sender_id and flagged and deleted)
  );

-- FAQ answer-permission moves from a per-member flag to a real per-role flag.
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
      select 1 from group_members gm join group_roles gr on gr.id = gm.custom_role_id
      where gm.group_id = group_faqs.group_id and gm.user_id = auth.uid() and gr.can_answer_faq = true
    )
  );

drop policy "owner or qualified member can answer a question" on group_faqs;
create policy "owner or qualified member can answer a question" on group_faqs
  for update using (
    exists (select 1 from groups g where g.id = group_faqs.group_id and g.owner_id = auth.uid())
    or exists (
      select 1 from group_members gm join group_roles gr on gr.id = gm.custom_role_id
      where gm.group_id = group_faqs.group_id and gm.user_id = auth.uid() and gr.can_answer_faq = true
    )
  )
  with check (answered_by_id = auth.uid());

drop policy "author, owner, or qualified member can delete a faq entry" on group_faqs;
create policy "author, owner, or qualified member can delete a faq entry" on group_faqs
  for delete using (
    auth.uid() = author_id
    or exists (select 1 from groups g where g.id = group_faqs.group_id and g.owner_id = auth.uid())
    or exists (
      select 1 from group_members gm join group_roles gr on gr.id = gm.custom_role_id
      where gm.group_id = group_faqs.group_id and gm.user_id = auth.uid() and gr.can_answer_faq = true
    )
  );

-- Shared authorization check for kick/mute/ban: owner or can_kick role can act on anyone; a
-- can_view_flagged-only role can act only on the sender of a specific flagged message they're
-- acting through (via_message_id).
create or replace function public.group_can_moderate(target_group_id uuid, target_user_id uuid, via_message_id uuid default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from groups where id = target_group_id and owner_id = auth.uid()) then
    return true;
  end if;

  if exists (
    select 1 from group_members gm join group_roles gr on gr.id = gm.custom_role_id
    where gm.group_id = target_group_id and gm.user_id = auth.uid() and gr.can_kick = true
  ) then
    return true;
  end if;

  if via_message_id is not null and exists (
    select 1 from group_members gm join group_roles gr on gr.id = gm.custom_role_id
    where gm.group_id = target_group_id and gm.user_id = auth.uid() and gr.can_view_flagged = true
  ) then
    return exists (
      select 1 from group_messages
      where id = via_message_id and group_id = target_group_id and flagged = true and sender_id = target_user_id
    );
  end if;

  return false;
end;
$$;

create or replace function public.kick_group_member(target_group_id uuid, target_user_id uuid, reason text default null, via_message_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text; actor_real_name text; target_name text; target_real_name text;
begin
  if not public.group_can_moderate(target_group_id, target_user_id, via_message_id) then
    raise exception 'not authorized';
  end if;

  select name, real_name into actor_name, actor_real_name from group_members where group_id = target_group_id and user_id = auth.uid();
  select name, real_name into target_name, target_real_name from group_members where group_id = target_group_id and user_id = target_user_id;

  delete from group_members where group_id = target_group_id and user_id = target_user_id;

  insert into group_kicked_users (group_id, user_id, reason, kicked_by, kicked_by_name, kicked_by_real_name, kicked_at, acknowledged_at)
  values (target_group_id, target_user_id, reason, auth.uid(), coalesce(actor_name, ''), coalesce(actor_real_name, ''), now(), null)
  on conflict (group_id, user_id) do update set
    reason = excluded.reason, kicked_by = excluded.kicked_by, kicked_by_name = excluded.kicked_by_name,
    kicked_by_real_name = excluded.kicked_by_real_name, kicked_at = now(), acknowledged_at = null;

  insert into group_moderation_log (group_id, action, target_user_id, target_name, target_real_name, actor_id, actor_name, actor_real_name, reason)
  values (target_group_id, 'kick', target_user_id, coalesce(target_name, ''), coalesce(target_real_name, ''), auth.uid(), coalesce(actor_name, ''), coalesce(actor_real_name, ''), reason);
end;
$$;

grant execute on function public.kick_group_member(uuid, uuid, text, uuid) to authenticated;

create or replace function public.mute_group_member(target_group_id uuid, target_user_id uuid, minutes int, reason text default null, via_message_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text; actor_real_name text; target_name text; target_real_name text; until timestamptz;
begin
  if not public.group_can_moderate(target_group_id, target_user_id, via_message_id) then
    raise exception 'not authorized';
  end if;

  until := now() + (minutes || ' minutes')::interval;

  select name, real_name into actor_name, actor_real_name from group_members where group_id = target_group_id and user_id = auth.uid();
  select name, real_name into target_name, target_real_name from group_members where group_id = target_group_id and user_id = target_user_id;

  update group_members set muted_until = until where group_id = target_group_id and user_id = target_user_id;

  insert into group_moderation_log (group_id, action, target_user_id, target_name, target_real_name, actor_id, actor_name, actor_real_name, reason, mute_until)
  values (target_group_id, 'mute', target_user_id, coalesce(target_name, ''), coalesce(target_real_name, ''), auth.uid(), coalesce(actor_name, ''), coalesce(actor_real_name, ''), reason, until);
end;
$$;

grant execute on function public.mute_group_member(uuid, uuid, int, text, uuid) to authenticated;

create or replace function public.ban_group_member(target_group_id uuid, target_user_id uuid, reason text default null, via_message_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text; actor_real_name text; target_name text; target_real_name text;
begin
  if not public.group_can_moderate(target_group_id, target_user_id, via_message_id) then
    raise exception 'not authorized';
  end if;

  select name, real_name into actor_name, actor_real_name from group_members where group_id = target_group_id and user_id = auth.uid();
  select name, real_name into target_name, target_real_name from group_members where group_id = target_group_id and user_id = target_user_id;

  delete from group_members where group_id = target_group_id and user_id = target_user_id;

  insert into group_bans (group_id, user_id, banned_by, name)
  values (target_group_id, target_user_id, auth.uid(), coalesce(target_name, ''))
  on conflict (group_id, user_id) do update set banned_by = excluded.banned_by, name = excluded.name, banned_at = now();

  insert into group_moderation_log (group_id, action, target_user_id, target_name, target_real_name, actor_id, actor_name, actor_real_name, reason)
  values (target_group_id, 'ban', target_user_id, coalesce(target_name, ''), coalesce(target_real_name, ''), auth.uid(), coalesce(actor_name, ''), coalesce(actor_real_name, ''), reason);
end;
$$;

grant execute on function public.ban_group_member(uuid, uuid, text, uuid) to authenticated;

-- Owner-only reversal actions (see the app-side rule: only the owner can unban/unmute).
create or replace function public.unban_group_member(target_group_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text; actor_real_name text; target_name text;
begin
  if not exists (select 1 from groups where id = target_group_id and owner_id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  select name into target_name from group_bans where group_id = target_group_id and user_id = target_user_id;
  select coalesce(nullif(business_name, ''), nullif(first_name, ''), 'You'),
         coalesce(nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''), first_name, '')
    into actor_name, actor_real_name
    from users where id = auth.uid();

  delete from group_bans where group_id = target_group_id and user_id = target_user_id;

  insert into group_moderation_log (group_id, action, target_user_id, target_name, actor_id, actor_name, actor_real_name)
  values (target_group_id, 'unban', target_user_id, coalesce(target_name, ''), auth.uid(), coalesce(actor_name, ''), coalesce(actor_real_name, ''));
end;
$$;

grant execute on function public.unban_group_member(uuid, uuid) to authenticated;

create or replace function public.unmute_group_member(target_group_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text; actor_real_name text; target_name text; target_real_name text;
begin
  if not exists (select 1 from groups where id = target_group_id and owner_id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  select name, real_name into actor_name, actor_real_name from group_members where group_id = target_group_id and user_id = auth.uid();
  select name, real_name into target_name, target_real_name from group_members where group_id = target_group_id and user_id = target_user_id;

  update group_members set muted_until = null where group_id = target_group_id and user_id = target_user_id;

  insert into group_moderation_log (group_id, action, target_user_id, target_name, target_real_name, actor_id, actor_name, actor_real_name)
  values (target_group_id, 'unmute', target_user_id, coalesce(target_name, ''), coalesce(target_real_name, ''), auth.uid(), coalesce(actor_name, ''), coalesce(actor_real_name, ''));
end;
$$;

grant execute on function public.unmute_group_member(uuid, uuid) to authenticated;
