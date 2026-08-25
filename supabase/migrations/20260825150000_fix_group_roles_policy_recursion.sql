-- Fixes a bug from the previous migration: the "owner or qualified member can manage permission
-- roles" policy on group_roles checked can_manage_roles via a subquery that itself selects from
-- group_roles (aliased gr2) — a policy referencing its own table from within its own USING clause.
-- Postgres detects this as "infinite recursion detected in policy for relation group_roles" and
-- errors out on EVERY query against that table, which broke loading every group (group_roles is
-- fetched on every group load), including newly created ones ("Group not found").
--
-- Fix: move the check into a security definer function, same pattern group_can_moderate() already
-- uses elsewhere in this app — the function's own internal query isn't subject to the calling
-- policy's RLS the same way, so the self-reference is broken.

create or replace function public.can_manage_group_roles(target_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from group_members gm join group_roles gr on gr.id = gm.custom_role_id
    where gm.group_id = target_group_id and gm.user_id = auth.uid() and gr.can_manage_roles = true
  );
$$;

grant execute on function public.can_manage_group_roles(uuid) to authenticated;

drop policy "owner or qualified member can manage permission roles" on group_roles;
create policy "owner or qualified member can manage permission roles" on group_roles
  for all using (
    exists (select 1 from groups g where g.id = group_roles.group_id and g.owner_id = auth.uid())
    or public.can_manage_group_roles(group_roles.group_id)
  ) with check (
    exists (select 1 from groups g where g.id = group_roles.group_id and g.owner_id = auth.uid())
    or public.can_manage_group_roles(group_roles.group_id)
  );
