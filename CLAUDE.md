@AGENTS.md

## Session notes — where we left off (2026-08-20)

Read this first so you don't have to be re-briefed. Supabase migrations listed below have
already been run by hand in the Supabase SQL Editor (this repo's Supabase project doesn't
auto-deploy migrations from GitHub — treat every new migration file as needing a manual run,
and tell the user exactly what SQL to paste).

**2026-08-20:** did the recommended next step from 2026-08-19 — wired real reviews into Discover
and the provider profile page (`20260820120000_add_worker_reviews.sql`). `discover_services()`
now returns real `rating_avg`/`rating_count` aggregated from completed, rated bookings instead of
hardcoded zeros (`ClientDataContext.tsx` `rowToNearbyWorker`). A new `worker_reviews(target_worker_id)`
RPC returns real review text/authors for a worker's completed+rated+reviewed bookings; the provider
profile screen (`app/provider/[id].tsx`) fetches it on mount instead of reading a mock
`worker.reviews` array, which was removed from the `NearbyWorker` type entirely. Also cleaned up
the rating display in `WorkerListingCard.tsx` and `app/provider/[id].tsx` to show `X.X (count)` or
"No reviews yet" instead of a raw unformatted Postgres numeric.

Then built real distance: `20260820130000_add_geo_distance.sql` adds `users.lat`/`lng` and makes
`discover_services()` return a real haversine `distance_miles` instead of the old hardcoded 0,
using a Mapbox forward-geocode of each user's zip/city (`src/lib/geocode.ts`,
`EXPO_PUBLIC_MAPBOX_TOKEN` already set in `.env`). Only the worker's Edit Profile screen had
zip/city fields, so the client's (`app/settings/client-edit-profile.tsx`) was missing entirely —
added it, mirroring the worker version.

Found and fixed a real bug during testing: both edit-profile screens only re-geocoded when the
zip/city **text** changed, so an account whose zip/city predates this feature (saved before
geocoding existed) would silently keep null lat/lng forever, since re-saving without editing the
text never triggered a lookup. Now it also re-geocodes whenever a location is set but coordinates
are still missing (`worker-edit-profile.tsx` / `client-edit-profile.tsx` `locationChanged`).
**Anyone testing distance needs to open Edit Profile and hit Save at least once (even without
changing anything) to pick up real coordinates for the first time.**

Then added a travel-radius feature at the user's request: a worker can set
`travelRadiusMiles` (Edit Profile, blank = no limit) capping how far they're willing to travel.
`discover_services()` (`20260820140000_add_travel_radius.sql`) now hides a worker from Discover
entirely once the client is more than `radius + 1` mile away, and returns `in_soft_zone: true`
when the client is past the hard radius but still within that 1-mile buffer — the client UI
(`WorkerListingCard.tsx`, `app/provider/[id].tsx`) shows a soft note in that case ("this business
owner prefers not to work this far out — you can still ask") rather than fully hiding them. Null
radius or unknown distance (either side missing a location) is never hidden.

**Still true from 2026-08-19, unchanged today:** Groups, notification/alarm prefs are still mock.
Checkout/billing still demo Stripe-less. Guardian consent/background checks not in scope. See
standing legal caveat below.

**Built and working today, in order:**
1. Self-reported age now persists to Supabase (survives reload) and is cross-checked against the
   DOB given at signup — mismatch is rejected with an error (`20260818140000_add_self_reported_age.sql`,
   `src/context/WorkerDataContext.tsx` setAge).
2. Worker service listings persist to Supabase instead of resetting on reload
   (`20260819120000_add_worker_services.sql`, `worker_services` table, `WorkerDataContext`).
3. Client-side Discover is wired to real listings via a `discover_services()` RPC
   (`20260819130000_add_discover_services_rpc.sql`), replacing the old empty mock array. Category
   chips now come from the real `serviceCatalog.ts` groups instead of a placeholder 6-category list.
4. Real chat between a client and a worker: `conversations` + `messages` tables, RLS, and
   `start_conversation()` / `my_conversations()` RPCs (`20260819140000_add_messaging.sql`,
   `20260819150000_add_conversation_listing_price.sql`). `MessagesContext` merges real threads
   alongside old local-only mock ones (jobs/bookings/groups chats aren't backed by real accounts,
   so those stay session-local). Unread counts feed the existing tab-bar badges (worker + client).
5. Only the worker can set a price in chat now (HANDOFF §0.1) — the client's in-chat "+" button
   opens a price-**locked** request form instead, fixed to the worker's listed price
   (`src/components/OfferForm.tsx` `lockedPrice` prop).
6. Real bookings: a `bookings` table + `my_bookings()` RPC (`20260819160000_add_bookings.sql`).
   `JobsContext` (request/schedule/decline/complete/rate/confirm-cash) persists whenever a real
   counterpart id is known (Discover requests, chat offers/accepts on a real conversation).
   Manually-added jobs stay local-only (no real counterpart). Jobs/Bookings screens refresh on
   mount so each side sees the other's activity without re-logging in.

**Still local-only / not real yet:**
- Groups feature (`GroupsContext`) — entirely mock.
- Worker `notificationPrefs`/`alarmPrefs`, client `notificationPrefs` — local only, not persisted.
- Plans/checkout — still the demo Stripe-less checkout (`app/checkout.tsx`), no real billing.
- Guardian consent flow for minors, background checks — removed earlier per HANDOFF §6 gap; not
  in scope unless the user asks to build toward a real launch (see legal caveat below).

Later the same day, worked through a batch of polish/feature notes the user wrote while using the
app:
- Soft-zone note reworded to "...however you can still ask"; the Discover card now dims
  (`opacity: 0.6`) instead of only showing text, so it visually reads as "still bookable, just not
  ideal" rather than looking identical to a normal listing.
- Login distinguishes "Username incorrect." vs "Password incorrect." (`AuthContext.logIn`) and
  highlights the specific `FormField` red instead of one generic banner (`app/login.tsx`).
- Settings → Security got real account management: change username (checks the existing
  lower(username) unique index, friendly "already taken" error), change email (goes through
  Supabase's own confirm-both-inboxes flow via `auth.updateUser`), change password — all new
  `AuthContext` methods (`updateUsername`/`updateEmail`/`updatePassword`).
- Tapping a service on the worker home screen now opens `app/worker/service/[id].tsx`, a
  dedicated page for that one service (toggle active, pricing, hours, days, delete) instead of
  only reaching it through the flat "manage all services" list.
- Real photo uploads (`20260820150000_add_photo_uploads.sql`): a Storage bucket `uploads`
  (path-scoped per user via RLS) backs two features — (1) profile photo camera/library picker
  (`src/lib/uploadPhoto.ts`, `expo-image-picker`) replacing the old preset-avatar cycling on both
  edit-profile screens, and (2) a `service_photos` table for up to 20 photos per service, managed
  from the new service detail page (add/delete/"set as cover" — cover stays
  `worker_services.photo_uri`, which already existed and was already returned by
  `discover_services()` but had never actually been read on the client side until now —
  `WorkerListingCard` shows it next to "View", the provider profile page shows the full gallery).
- Two-step verification is now actually functional, not just a saved preference: on login, once
  the password checks out, if 2FA is on the app calls `supabase.auth.signInWithOtp()` to email a
  real one-time code and only completes login after `verifyOtp()` succeeds (`app/login.tsx`
  `TwoFactorCodeModal`). **If the user reports never receiving a code**, check Supabase dashboard
  → Authentication → Email Templates → Magic Link — the `{{ .Token }}` placeholder needs to be in
  that template for the emailed message to actually contain a 6-digit code, or Supabase's default
  free-tier email rate limit may be the culprit instead.
- Appearance tab: added an accent-color picker (`src/components/AccentColorPicker.tsx` — a
  saturation/value square + hue slider, built from `PanResponder` + `expo-linear-gradient`, no new
  dependency needed) plus quick presets, and three text-size presets (Small/Default/Large). Both
  work via CSS variables (`src/theme/accentColor.ts`, `src/theme/textSize.ts`) using the same
  runtime-variable trick the color theming already relied on (`tailwind.config.js` `fontSize` now
  also reads CSS vars, same pattern as `colors`) — applies everywhere at once, no per-screen work.

**Recommended next step:** Discover's core loop (listings, chat, bookings, ratings, distance,
radius, photos) plus account settings, real 2FA, and appearance customization are all done as of
2026-08-20. Groups and notification/alarm prefs are the biggest remaining mock surfaces if the
user wants to keep going.

**Standing legal caveat (don't relitigate on small changes, but don't forget it either):** this
app matches minors (self-reported ages down to 14) with adult strangers for in-person jobs, with
no ID/document verification — pure self-report. If the user starts talking about a real launch,
proactively raise guardian consent, background checks, and counsel review as still-open gaps
before treating anything here as launch-ready.

