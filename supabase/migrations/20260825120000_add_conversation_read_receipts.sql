-- Real read-receipts for direct conversations. Unread tracking was purely client-side/session
-- state ("lastReadAt" in MessagesContext, in-memory only) — it reset on every login/reload, so
-- every past message counted as unread again, firing the unread badge/notification on every login
-- even for messages already read in a prior session.

alter table conversations
  add column worker_last_read_at timestamptz,
  add column client_last_read_at timestamptz;

-- Security definer so a participant can update only their own side of the row without needing a
-- broader update policy on `conversations` (there wasn't one before this).
create or replace function public.mark_conversation_read(target_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update conversations
  set
    worker_last_read_at = case when worker_id = auth.uid() then now() else worker_last_read_at end,
    client_last_read_at = case when client_id = auth.uid() then now() else client_last_read_at end
  where id = target_conversation_id
    and (worker_id = auth.uid() or client_id = auth.uid());
end;
$$;

grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- The RETURNS TABLE column list is changing, which create-or-replace doesn't allow — drop first.
drop function if exists public.my_conversations();

create function public.my_conversations()
returns table (
  id uuid,
  counterpart_id uuid,
  counterpart_business_name text,
  counterpart_first_name text,
  counterpart_avatar_uri text,
  job_context text,
  listing_price numeric,
  listing_price_type text,
  last_read_at timestamptz,
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
    c.listing_price,
    c.listing_price_type,
    case when c.worker_id = auth.uid() then c.worker_last_read_at else c.client_last_read_at end as last_read_at,
    c.created_at
  from conversations c
  join users u on u.id = case when c.worker_id = auth.uid() then c.client_id else c.worker_id end
  where c.worker_id = auth.uid() or c.client_id = auth.uid()
  order by c.created_at desc;
$$;

grant execute on function public.my_conversations() to authenticated;
