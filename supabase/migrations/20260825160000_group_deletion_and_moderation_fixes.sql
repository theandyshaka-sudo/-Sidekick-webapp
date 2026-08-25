-- 1) Two more real role permissions: post/manage announcements, edit rules.
-- 2) Owner protection: nobody (not even a can_kick/can_view_flagged holder) can ever mute, kick,
--    or ban the group owner, and the owner's own flagged message can only be acted on by someone
--    else with the right permission — not by the owner themselves, even though they sent it.
-- 3) Real "delete group" support (owner-only): cascades to every table via existing FKs.

alter table group_roles
  add column can_post_announcements boolean not null default false,
  add column can_edit_rules boolean not null default false;

-- Rules editing joins "edit group" as a second way in — either power can update `groups`, but the
-- client only ever sends a rules-only patch through the can_edit_rules path (see updateGroup()).
drop policy "owner or qualified member can update their group" on groups;
create policy "owner or qualified member can update their group" on groups
  for update using (
    auth.uid() = owner_id
    or exists (
      select 1 from group_members gm join group_roles gr on gr.id = gm.custom_role_id
      where gm.group_id = groups.id and gm.user_id = auth.uid()
        and (gr.can_edit_group = true or gr.can_edit_rules = true)
    )
  );

create policy "owner can delete their group" on groups
  for delete using (auth.uid() = owner_id);

drop policy "owner can post an announcement" on group_announcements;
create policy "owner or qualified member can post an announcement" on group_announcements
  for insert with check (
    auth.uid() = author_id
    and (
      exists (select 1 from groups g where g.id = group_announcements.group_id and g.owner_id = auth.uid())
      or exists (
        select 1 from group_members gm join group_roles gr on gr.id = gm.custom_role_id
        where gm.group_id = group_announcements.group_id and gm.user_id = auth.uid() and gr.can_post_announcements = true
      )
    )
  );

drop policy "owner can delete an announcement" on group_announcements;
create policy "owner or qualified member can delete an announcement" on group_announcements
  for delete using (
    exists (select 1 from groups g where g.id = group_announcements.group_id and g.owner_id = auth.uid())
    or exists (
      select 1 from group_members gm join group_roles gr on gr.id = gm.custom_role_id
      where gm.group_id = group_announcements.group_id and gm.user_id = auth.uid() and gr.can_post_announcements = true
    )
  );

-- Owner protection, part 1: mute/kick/ban. Nobody can ever act on the group owner through
-- group_can_moderate() — checked before anything else, actor included.
create or replace function public.group_can_moderate(target_group_id uuid, target_user_id uuid, via_message_id uuid default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from groups where id = target_group_id and owner_id = target_user_id) then
    return false;
  end if;

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

-- Owner protection, part 2: a flagged message's own sender — owner included — can never act on it
-- themselves (edit, dismiss, or delete); only someone else with the right access can. Previously
-- the sender was only blocked from hard-deleting their own flagged message (the owner, being
-- their own message's "owner-branch", could otherwise dismiss/act on it via a raw API call even
-- though the UI already hid that option).
drop policy "sender, owner, or qualified role can edit/delete a message" on group_messages;
create policy "sender (non-flagged), or non-sender owner/qualified role, can edit/delete a message" on group_messages
  for update using (
    (auth.uid() = sender_id and not flagged)
    or (
      auth.uid() <> sender_id
      and (
        exists (select 1 from groups g where g.id = group_messages.group_id and g.owner_id = auth.uid())
        or exists (
          select 1 from group_members gm join group_roles gr on gr.id = gm.custom_role_id
          where gm.group_id = group_messages.group_id and gm.user_id = auth.uid()
            and (gr.can_view_flagged = true or gr.can_delete_messages = true)
        )
      )
    )
  )
  with check (
    not (auth.uid() = sender_id and flagged)
  );
