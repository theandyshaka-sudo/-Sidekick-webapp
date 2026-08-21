-- Groups, second slice: real photos (group avatar reuses the existing `uploads` bucket; chat
-- messages can now carry a photo), a single group "rules" text blob, an owner-only announcements
-- feed, a member-writable FAQ/common-questions board, basic auto-flagging of profane chat text
-- (client computes the flag before insert — see src/lib/moderateText.ts — this is a wordlist
-- check, not real content moderation), and ownership transfer.
--
-- Note on flagging: there's no group_bans-style admin role in this app yet, so "visible only to
-- admins" is approximated as "visible only to the sender and the real group owner" — everyone
-- else sees a placeholder client-side (GroupsContext still fetches the real row; the hiding is a
-- render-time decision in app/groups/[id]/index.tsx). Photo content isn't scanned for anything —
-- there's no vision-moderation service wired up — so inappropriate photos rely on manual "Report"
-- like everything else already did, not automatic detection.

alter table group_messages add column image_url text;
alter table group_messages add column flagged boolean not null default false;

alter table groups add column rules text not null default '';

-- Widen who can update a message: previously only the sender could edit/delete their own row.
-- The group owner now also needs update access so they can unflag or remove a flagged message
-- during moderation, even though they didn't send it.
drop policy "sender can edit or delete their own message" on group_messages;
create policy "sender or group owner can edit/delete a message" on group_messages
  for update using (
    auth.uid() = sender_id
    or exists (select 1 from groups g where g.id = group_messages.group_id and g.owner_id = auth.uid())
  );

create table group_announcements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  author_id uuid not null references users (id) on delete cascade,
  author_name text not null,
  text text not null,
  created_at timestamptz not null default now()
);

alter table group_announcements enable row level security;

create policy "members can view announcements" on group_announcements
  for select using (
    exists (select 1 from group_members gm where gm.group_id = group_announcements.group_id and gm.user_id = auth.uid())
  );

create policy "owner can post an announcement" on group_announcements
  for insert with check (
    auth.uid() = author_id
    and exists (select 1 from groups g where g.id = group_announcements.group_id and g.owner_id = auth.uid())
  );

create policy "owner can delete an announcement" on group_announcements
  for delete using (
    exists (select 1 from groups g where g.id = group_announcements.group_id and g.owner_id = auth.uid())
  );

create table group_faqs (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  author_id uuid not null references users (id) on delete cascade,
  author_name text not null,
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);

alter table group_faqs enable row level security;

create policy "members can view faq entries" on group_faqs
  for select using (
    exists (select 1 from group_members gm where gm.group_id = group_faqs.group_id and gm.user_id = auth.uid())
  );

create policy "members can post a faq entry" on group_faqs
  for insert with check (
    auth.uid() = author_id
    and exists (select 1 from group_members gm where gm.group_id = group_faqs.group_id and gm.user_id = auth.uid())
  );

create policy "author or owner can delete a faq entry" on group_faqs
  for delete using (
    auth.uid() = author_id
    or exists (select 1 from groups g where g.id = group_faqs.group_id and g.owner_id = auth.uid())
  );

-- Only the real owner, and only to someone who's actually a member. Moves owner_id and swaps the
-- president/member role rows so the (still-mock) role display stays consistent with who's really
-- in charge. Irreversible from the old owner's side — they become a regular member.
create or replace function public.transfer_group_ownership(target_group_id uuid, new_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from groups where id = target_group_id and owner_id = auth.uid()) then
    raise exception 'not authorized';
  end if;
  if not exists (select 1 from group_members where group_id = target_group_id and user_id = new_owner_id) then
    raise exception 'target is not a member of this group';
  end if;

  update groups set owner_id = new_owner_id where id = target_group_id;
  update group_members set role_id = 'member' where group_id = target_group_id and user_id = auth.uid();
  update group_members set role_id = 'president' where group_id = target_group_id and user_id = new_owner_id;
end;
$$;

grant execute on function public.transfer_group_ownership(uuid, uuid) to authenticated;
