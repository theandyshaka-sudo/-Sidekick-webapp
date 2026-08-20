-- Real distance for Discover. `distanceMiles` has been hardcoded to 0 everywhere since the
-- discover_services() RPC was first built (20260819130000) — this repo already provisions a
-- Mapbox token (EXPO_PUBLIC_MAPBOX_TOKEN, see .env.example) per HANDOFF.md's geocoding plan, so
-- the app geocodes a user's zip/city into lat/lng client-side (src/lib/geocode.ts) whenever they
-- save their location, and this migration adds the columns to store that plus the haversine
-- distance calc so discover_services() can return a real number instead of a placeholder.

alter table users
  add column lat double precision,
  add column lng double precision;

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
  distance_miles numeric
)
language sql
security definer
set search_path = public
as $$
  with me as (
    select lat, lng from users where id = auth.uid()
  )
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
    coalesce(r.rating_count, 0) as rating_count,
    case
      when me.lat is null or me.lng is null or u.lat is null or u.lng is null then null
      -- Haversine great-circle distance in miles (earth radius 3958.8 mi). Clamped into
      -- [-1, 1] before acos() since floating-point rounding can nudge the cosine sum a hair
      -- outside that domain for near-identical points, which would otherwise error.
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
  order by s.created_at desc;
$$;

grant execute on function public.discover_services() to authenticated;
