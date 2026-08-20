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

**Recommended next step:** reviews, real distance, and a worker travel-radius cutoff (with a
1-mile "soft zone" that shows a polite note instead of a hard hide) are all done as of 2026-08-20
— see above. Discover's core loop (listings, chat, bookings, ratings, distance, radius) is now
fully real. Groups and notification prefs are the biggest remaining mock surfaces if the user
wants to keep going.

**Standing legal caveat (don't relitigate on small changes, but don't forget it either):** this
app matches minors (self-reported ages down to 14) with adult strangers for in-person jobs, with
no ID/document verification — pure self-report. If the user starts talking about a real launch,
proactively raise guardian consent, background checks, and counsel review as still-open gaps
before treating anything here as launch-ready.

