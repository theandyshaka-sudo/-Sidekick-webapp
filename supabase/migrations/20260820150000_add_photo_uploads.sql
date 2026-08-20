-- Real photo uploads: a public Storage bucket for avatar photos and service listing photos
-- (one bucket, path-prefixed by the uploader's own auth.uid() so RLS can scope writes per user),
-- plus a service_photos table for a service's up-to-20-photo gallery. The "cover" photo shown on
-- the small Discover card stays worker_services.photo_uri (already existed) — uploading a photo
-- sets it as the cover automatically if the service has none yet, and a worker can promote any
-- gallery photo to cover from the service detail page.

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

create policy "anyone can view uploads" on storage.objects
  for select using (bucket_id = 'uploads');

create policy "users can upload to their own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can update their own uploads" on storage.objects
  for update to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete their own uploads" on storage.objects
  for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create table service_photos (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references worker_services(id) on delete cascade,
  worker_id uuid not null references users(id) on delete cascade,
  url text not null,
  created_at timestamptz not null default now()
);

create index service_photos_service_id_idx on service_photos (service_id, created_at);

alter table service_photos enable row level security;

create policy "authenticated users can view service photos" on service_photos
  for select to authenticated using (true);

create policy "workers can insert own service photos" on service_photos
  for insert to authenticated with check (worker_id = auth.uid());

create policy "workers can delete own service photos" on service_photos
  for delete to authenticated using (worker_id = auth.uid());
