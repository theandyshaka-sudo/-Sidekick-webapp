-- M0 extension: signup already collects a fuller profile (name, business, dob, username,
-- location, avatar, bio, plan) than the M0 `users` table stores. These columns hold that data
-- until the richer M1 split (worker_profiles/guardians/client_profiles per HANDOFF.md §3) lands.

alter table users
  add column first_name text,
  add column last_name text,
  add column business_name text,
  add column dob date,
  add column username text,
  add column zip text,
  add column city text,
  add column country text,
  add column avatar_uri text,
  add column bio text,
  add column plan text,
  add column billing_cycle text,
  add column two_factor_enabled boolean not null default false;

create unique index users_username_lower_key on users (lower(username));

create policy "users can update own row" on users
  for update using (auth.uid() = id);

-- Login collects a username, but Supabase Auth signs in by email. This resolves username -> email
-- for an unauthenticated caller without exposing any other column on the users table.
create or replace function public.email_for_username(lookup_username text)
returns text
language sql
security definer
set search_path = public
as $$
  select email from users where lower(username) = lower(lookup_username) limit 1;
$$;

grant execute on function public.email_for_username(text) to anon, authenticated;
