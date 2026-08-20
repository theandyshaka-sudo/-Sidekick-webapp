-- Lets a worker cap how far they're willing to travel from their saved location. Discover now
-- hides a worker entirely past radius + SOFT_ZONE_MILES, and flags them `in_soft_zone` when the
-- client is just past the hard radius but still inside the buffer, so the client UI can show a
-- polite "prefers not to work this far" note instead of a hard block — the client can still ask.
-- A null radius means "no limit" (today's behavior, unchanged).

alter table users
  add column travel_radius_miles integer;

drop function if exists public.discover_services();

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
  rating_count integer,
  distance_miles numeric,
  in_soft_zone boolean
)
language sql
security definer
set search_path = public
as $$
  with me as (
    select lat, lng from users where id = auth.uid()
  ),
  base as (
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
      s.created_at,
      r.rating_avg,
      coalesce(r.rating_count, 0) as rating_count,
      u.travel_radius_miles,
      case
        when me.lat is null or me.lng is null or u.lat is null or u.lng is null then null
        else round(
          (3958.8 * acos(
            least(1.0, greatest(-1.0,
              cos(radians(me.lat)) * cos(radians(u.lat)) * cos(radians(u.lng) - radians(me.lng))
              + sin(radians(me.lat)) * sin(radians(u.lat))
            ))
          ))::numeric,
          1
        )
      end as distance_miles
    from worker_services s
    join users u on u.id = s.worker_id
    left join (
      select worker_id, avg(rating)::numeric as rating_avg, count(*)::integer as rating_count
      from bookings
      where status = 'completed' and rating is not null
      group by worker_id
    ) r on r.worker_id = u.id
    left join me on true
    where s.active = true
  )
  select
    base.service_id, base.worker_id, base.business_name, base.worker_first_name, base.avatar_uri,
    base.city, base.age, base.bio, base.title, base.price_type, base.price_amount,
    base.avail_from, base.avail_to, base.photo_uri, base.rating_avg, base.rating_count,
    base.distance_miles,
    (
      base.distance_miles is not null
      and base.travel_radius_miles is not null
      and base.distance_miles > base.travel_radius_miles
    ) as in_soft_zone
  from base
  -- SOFT_ZONE_MILES = 1: past the hard radius but within this buffer still shows up (soft-zoned);
  -- past radius + buffer is hidden entirely. Unknown radius or unknown distance is never hidden.
  where base.travel_radius_miles is null
     or base.distance_miles is null
     or base.distance_miles <= base.travel_radius_miles + 1
  order by base.created_at desc;
$$;

grant execute on function public.discover_services() to authenticated;
