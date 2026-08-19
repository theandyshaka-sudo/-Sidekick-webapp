@AGENTS.md

## Session notes — where we left off (2026-08-19)

Read this first so you don't have to be re-briefed. Supabase migrations listed below have
already been run by hand in the Supabase SQL Editor (this repo's Supabase project doesn't
auto-deploy migrations from GitHub — treat every new migration file as needing a manual run,
and tell the user exactly what SQL to paste).

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
- Distance/geo (PostGIS radius matching) — `distanceMiles` is hardcoded to 0 everywhere, no real
  location-based filtering yet.
- Plans/checkout — still the demo Stripe-less checkout (`app/checkout.tsx`), no real billing.
- Guardian consent flow for minors, background checks — removed earlier per HANDOFF §6 gap; not
  in scope unless the user asks to build toward a real launch (see legal caveat below).

**Recommended next step:** wire real reviews into Discover and the provider profile page.
Ratings/review text already save for real to `bookings.rating` / `bookings.review_text` (built in
item 6 above), but `discover_services()` still returns a hardcoded `rating: 0` / empty reviews
array — nothing aggregates the real booking data back onto a worker's public listing yet. That's
the natural next piece since bookings are now real.

**Standing legal caveat (don't relitigate on small changes, but don't forget it either):** this
app matches minors (self-reported ages down to 14) with adult strangers for in-person jobs, with
no ID/document verification — pure self-report. If the user starts talking about a real launch,
proactively raise guardian consent, background checks, and counsel review as still-open gaps
before treating anything here as launch-ready.

