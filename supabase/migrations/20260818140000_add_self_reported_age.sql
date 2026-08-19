-- Persists the worker's self-reported age (chip picker + confirmation, see AgeSelector) so the
-- once-a-month change cooldown survives app restarts instead of resetting on every reload.

alter table users
  add column self_reported_age integer,
  add column age_confirmed_at timestamptz,
  add column age_last_changed_at timestamptz;
