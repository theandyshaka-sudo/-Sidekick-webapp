-- Lets clients browse real, active worker listings. A SECURITY DEFINER function (same pattern as
-- email_for_username) so it can join worker_services + users without opening up direct table
-- access to other users' rows — exposes only the narrow, non-sensitive subset a client should see
-- (HANDOFF.md §11 PII walls): no email, phone, dob, or billing info.

create or replace function public.discover_services()
returns table (
  service_id uuid,
  worker_id uuid,
  business_name text,
  worker_first_name text,
  avatar_uri text,
  city text,
  age integer,
  bio text,
  title text,
  price_type text,
  price_amount numeric,
  avail_from smallint,
  avail_to smallint,
  photo_uri text
)
language sql
security definer
set search_path = public
as $$
  select
    s.id as service_id,
    u.id as worker_id,
    u.business_name,
    u.first_name as worker_first_name,
    u.avatar_uri,
    u.city,
    u.self_reported_age as age,
    u.bio,
    s.title,
    s.price_type,
    s.price_amount,
    s.avail_from,
    s.avail_to,
    s.photo_uri
  from worker_services s
  join users u on u.id = s.worker_id
  where s.active = true
  order by s.created_at desc;
$$;

grant execute on function public.discover_services() to authenticated;
