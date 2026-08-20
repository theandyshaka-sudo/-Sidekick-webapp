-- Wires real reviews into Discover and the provider profile page (recommended next step from the
-- 2026-08-19 session notes). bookings.rating/review_text have been saving for real since
-- 20260819160000_add_bookings.sql, but discover_services() still returned hardcoded rating: 0 and
-- nothing exposed review text — this aggregates the real booking data back onto a worker's public
-- listing.

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
  photo_uri text,
  rating_avg numeric,
  rating_count integer
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
    s.photo_uri,
    r.rating_avg,
    coalesce(r.rating_count, 0) as rating_count
  from worker_services s
  join users u on u.id = s.worker_id
  left join (
    select worker_id, avg(rating)::numeric as rating_avg, count(*)::integer as rating_count
    from bookings
    where status = 'completed' and rating is not null
    group by worker_id
  ) r on r.worker_id = u.id
  where s.active = true
  order by s.created_at desc;
$$;

grant execute on function public.discover_services() to authenticated;

-- Real review text for a worker's public profile page. Same security-definer pattern as
-- my_bookings() (users/bookings RLS is own-row-only, so a plain join from a browsing client
-- wouldn't see the worker's bookings or the reviewing client's display info).
create or replace function public.worker_reviews(target_worker_id uuid)
returns table (
  reviewer_business_name text,
  reviewer_first_name text,
  reviewer_avatar_uri text,
  rating smallint,
  review_text text,
  completed_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    u.business_name,
    u.first_name,
    u.avatar_uri,
    b.rating,
    b.review_text,
    b.completed_at
  from bookings b
  join users u on u.id = b.client_id
  where b.worker_id = target_worker_id
    and b.status = 'completed'
    and b.rating is not null
    and b.review_text is not null
  order by b.completed_at desc nulls last, b.created_at desc;
$$;

grant execute on function public.worker_reviews(uuid) to authenticated;
