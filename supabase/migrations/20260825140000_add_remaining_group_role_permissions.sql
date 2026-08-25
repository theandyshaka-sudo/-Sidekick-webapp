-- Makes the rest of the unified role editor's toggles real, matching can_kick/can_answer_faq/
-- can_view_flagged. Before this, "Accept requests", "Edit group", "Delete messages",
-- "Promote & demote", and "Manage roles" only ever patched local React state — nothing was
-- written to the database, so a role that had them "on" reverted to off on any reload, and the
-- underlying action (e.g. actually editing the group) silently never reached the server at all.
-- Comment-light on purpose (past copy/paste breakage from chat/terminal).

alter table group_roles
  add column can_accept_requests boolean not null default false,
  add column can_edit_group boolean not null default false,
  add column can_delete_messages boolean not null default false,
  add column can_assign_roles boolean not null default false,
  add column can_manage_roles boolean not null default false;

-- Edit group: owner or a can_edit_group role holder.
drop policy "owner can update their group" on groups;
create policy "owner or qualified member can update their group" on groups
  for update using (
    auth.uid() = owner_id
    or exists (
      select 1 from group_members gm join group_roles gr on gr.id = gm.custom_role_id
      where gm.group_id = groups.id and gm.user_id = auth.uid() and gr.can_edit_group = true
    )
  );

-- Accept/decline requests: owner or a can_accept_requests role holder, both at the RLS layer
-- (decline = a group_requests delete) and inside accept_group_request() (accept is an RPC because
-- it also inserts the new group_members row on the requester's behalf).
drop policy "requester can cancel, or owner can decline" on group_requests;
create policy "requester can cancel, or owner/qualified member can decline" on group_requests
  for delete using (
    auth.uid() = user_id
    or exists (select 1 from groups g where g.id = group_requests.group_id and g.owner_id = auth.uid())
    or exists (
      select 1 from group_members gm join group_roles gr on gr.id = gm.custom_role_id
      where gm.group_id = group_requests.group_id and gm.user_id = auth.uid() and gr.can_accept_requests = true
    )
  );

create or replace function public.accept_group_request(target_group_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req group_requests;
begin
  if not (
    exists (select 1 from groups where id = target_group_id and owner_id = auth.uid())
    or exists (
      select 1 from group_members gm join group_roles gr on gr.id = gm.custom_role_id
      where gm.group_id = target_group_id and gm.user_id = auth.uid() and gr.can_accept_requests = true
    )
  ) then
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

-- Delete messages: owner, can_view_flagged (unchanged), or now also can_delete_messages.
drop policy "sender, owner, or viewer role can edit/delete a message" on group_messages;
create policy "sender, owner, or qualified role can edit/delete a message" on group_messages
  for update using (
    auth.uid() = sender_id
    or exists (select 1 from groups g where g.id = group_messages.group_id and g.owner_id = auth.uid())
    or exists (
      select 1 from group_members gm join group_roles gr on gr.id = gm.custom_role_id
      where gm.group_id = group_messages.group_id and gm.user_id = auth.uid()
        and (gr.can_view_flagged = true or gr.can_delete_messages = true)
    )
  )
  with check (
    not (auth.uid() = sender_id and flagged and deleted)
  );

-- Assign a role to a member: was a direct client-side group_members update gated owner-only by
-- "owner can update a member's row" — moved to a checked RPC (same pattern as kick/mute/ban)
-- instead of widening that row policy, since that policy also covers mute_until and would let any
-- can_assign_roles holder touch unrelated columns on any member's row.
create or replace function public.assign_member_role(target_group_id uuid, target_user_id uuid, display_role_id text, real_role_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    exists (select 1 from groups where id = target_group_id and owner_id = auth.uid())
    or exists (
      select 1 from group_members gm join group_roles gr on gr.id = gm.custom_role_id
      where gm.group_id = target_group_id and gm.user_id = auth.uid() and gr.can_assign_roles = true
    )
  ) then
    raise exception 'not authorized';
  end if;

  update group_members set role_id = display_role_id, custom_role_id = real_role_id
  where group_id = target_group_id and user_id = target_user_id;
end;
$$;

grant execute on function public.assign_member_role(uuid, uuid, text, uuid) to authenticated;

-- Manage roles: owner or a can_manage_roles role holder can create/edit/delete group_roles rows
-- (a role can grant its own holders the power to edit roles further, including itself — expected
-- for a "Manage roles" permission, and the owner's access here is separate/unconditional anyway).
drop policy "owner can manage permission roles" on group_roles;
create policy "owner or qualified member can manage permission roles" on group_roles
  for all using (
    exists (select 1 from groups g where g.id = group_roles.group_id and g.owner_id = auth.uid())
    or exists (
      select 1 from group_members gm join group_roles gr2 on gr2.id = gm.custom_role_id
      where gm.group_id = group_roles.group_id and gm.user_id = auth.uid() and gr2.can_manage_roles = true
    )
  ) with check (
    exists (select 1 from groups g where g.id = group_roles.group_id and g.owner_id = auth.uid())
    or exists (
      select 1 from group_members gm join group_roles gr2 on gr2.id = gm.custom_role_id
      where gm.group_id = group_roles.group_id and gm.user_id = auth.uid() and gr2.can_manage_roles = true
    )
  );

-- role_id is now a real, persisted, authoritative column (not just a local display value) — keep
-- it consistent when its matching group_roles row is deleted, same as custom_role_id already does
-- automatically via its FK's "on delete set null".
create or replace function public.reset_role_id_on_role_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update group_members set role_id = 'member' where group_id = old.group_id and role_id = old.id::text;
  return old;
end;
$$;

drop trigger if exists group_roles_before_delete on group_roles;
create trigger group_roles_before_delete
before delete on group_roles
for each row execute function public.reset_role_id_on_role_delete();
