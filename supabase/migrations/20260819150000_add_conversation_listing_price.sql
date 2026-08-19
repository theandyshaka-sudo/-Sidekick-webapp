-- Carries the worker's listed price into the conversation it was started from, so the client's
-- in-chat "Request booking" can fix the price to it instead of offering a free-form amount (only
-- the business owner sets a price — HANDOFF §0.1).

alter table conversations
  add column listing_price numeric,
  add column listing_price_type text;

-- Adds two new trailing optional params — safe to `create or replace` since the existing params
-- and return type are unchanged.
create or replace function public.start_conversation(
  target_worker_id uuid,
  initial_job_context text default '',
  initial_price numeric default null,
  initial_price_type text default null
)
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
    insert into conversations (worker_id, client_id, job_context, listing_price, listing_price_type)
    values (target_worker_id, auth.uid(), initial_job_context, initial_price, initial_price_type)
    returning id into conv_id;
  end if;
  return conv_id;
end;
$$;

grant execute on function public.start_conversation(uuid, text, numeric, text) to authenticated;

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
    c.created_at
  from conversations c
  join users u on u.id = case when c.worker_id = auth.uid() then c.client_id else c.worker_id end
  where c.worker_id = auth.uid() or c.client_id = auth.uid()
  order by c.created_at desc;
$$;

grant execute on function public.my_conversations() to authenticated;
