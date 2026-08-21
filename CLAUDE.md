@AGENTS.md

## Session notes — where we left off (2026-08-21)

**⚠️ NEXT STEP WHEN THIS PICKS BACK UP:** `20260821130000_add_groups.sql` was written but the user
had not confirmed running it in the Supabase SQL Editor as of the last message in this session —
check before assuming Groups works. Once it's run, Groups (create/join/request/leave/chat) should
be live; walk the user through testing it end-to-end (two test accounts, one requests to join a
private group the other owns, chat both ways) before moving to the next mock surface
(notification/alarm prefs, or full role/permission/ban/log persistence for Groups if the user wants
to go back and finish that later — see the Groups entry below for exactly what's still mock there).

**Groups — core made real, decorative parts still mock (this session):** `GroupsContext` was
entirely local/mock before this. Added `groups`, `group_members`, `group_requests`,
`group_messages` tables + RLS (`supabase/migrations/20260821130000_add_groups.sql`), with
`create_group` and `accept_group_request` as security-definer RPCs (same pattern as
`start_conversation`/`my_conversations`). Real now: creating a group, joining a public group
instantly, requesting to join a private one, canceling/accepting/declining a request, leaving,
kicking (only enforced server-side for the real DB owner — see caveat below), and sending/editing/
deleting *your own* group messages. `me.userId` switched from `currentUser.username` to
`currentUser.id` (real uuid) to match the new tables' foreign keys.

**Still mock/local, by deliberate scope decision (user chose "core first" over "everything at
once" when asked):** custom roles beyond the built-in president/member split (`createRole`/
`updateRole`/`deleteRole`), the ban list (`banMember` removes real membership but the ban itself
doesn't persist, so a banned user could immediately re-request), activity logs, and any
non-owner "officer" action gated only by the mock power system (e.g. an officer with the mock
"kick" power kicking someone, or editing group settings) — these appear to work locally but won't
survive a page refresh, since only the actual `groups.owner_id` is enforced server-side right now.
If the user wants this finished later, that means: a `group_roles` table, a `group_bans` table,
persisting logs, and replacing the owner-only RLS checks with real rank/power lookups.

Fixed a batch of bugs the user found while testing the 2026-08-20 work on their phone (web build
via Vercel, not Expo Go — see below). All pushed (`0373e70`), no new migrations needed.

**⚠️ TWO MANUAL SUPABASE DASHBOARD STEPS STILL NEEDED — the code is done but won't fully work
until these are set, ask the user to confirm before testing 2FA / password reset again:**
1. Authentication → URL Configuration → add the Vercel deployment's domain to **Redirect URLs**
   (e.g. `https://<their-vercel-domain>/**`) — `requestPasswordReset` now passes an explicit
   `redirectTo`, but Supabase silently falls back to the Site URL (still localhost) if the target
   isn't on this allow list.
2. Authentication → Email Templates → Magic Link — the user wants the 2FA code email to contain
   only a plain 6-digit code, no clickable link. Edit that template to use `{{ .Token }}` instead
   of `{{ .ConfirmationURL }}` (this template is also what `signInWithOtp` uses for the 2FA email).

**Fixed today:**
- **Accent color picker** (`src/components/AccentColorPicker.tsx`): dragging the saturation/value
  square right after moving the hue slider (or vice versa) snapped back to whatever hue was
  current at mount — the PanResponder handlers were frozen via `useRef` and closed over stale
  state. Now reads current hue/sat/val through a ref that's refreshed every render.
- **Stray "service/[id]" tab** on the worker bottom nav: `app/worker/service/[id].tsx` wasn't
  explicitly registered in `app/worker/_layout.tsx`'s `<Tabs>`, so expo-router auto-added it as a
  visible tab. Added `<Tabs.Screen name="service/[id]" options={{ href: null }} />` to hide it.
- **2FA wasn't actually gating login** — the real bug behind "2FA just let me straight into the
  app": `signInWithPassword` establishes a full Supabase session immediately, and the
  `onAuthStateChange` listener in `AuthContext` was unconditionally setting `currentUser` from
  that session the moment it fired, regardless of whether the emailed one-time code had been
  entered yet. `logIn()` now sets a `pendingTwoFactorRef` before calling `signInWithPassword`; the
  listener skips `setCurrentUser` while that ref is true; a new `completeTwoFactorLogin(account)`
  is what actually reveals the account, called from `login.tsx` only after `verifyOtp` succeeds.
  Also added a way to back out of the OTP screen (`cancelTwoFactorLogin` — signs out the
  half-open session), since there was previously no way off that screen if stuck.
- **Hourly job completion math**: "Mark complete" on an hourly job asked for a dollar amount
  labeled "$X/hr" but used it directly as the total price — now asks "hours worked" and computes
  rate × hours as the completed price (`app/worker/jobs.tsx` `ScheduledCard`).
- **Password reset email → localhost**: `requestPasswordReset` now passes `redirectTo:
  window.location.origin + "/reset-password"` instead of relying on Supabase's dashboard Site URL
  default. Added `app/reset-password.tsx` to actually handle that link — since
  `detectSessionInUrl: false` is set in `src/lib/supabase.ts`, it manually parses the
  access/refresh tokens out of the URL `#hash` and calls `setSession` before showing a new-password
  form. Still needs manual step 1 above to actually take effect.
- **Settings discoverability**: renamed "Security" → "Privacy & Security" in both profile screens
  and the screen header — the password/username/email controls the user was looking for
  ("a tab like privacy... with your password info") already existed there under the old name.

**Not done / deliberately skipped:** nothing dropped from this batch — everything the user listed
was addressed in code where it was a code problem. The 2FA "should just give a 6-digit code, no
redirect" behavior depends entirely on manual step 2 above, not on anything further in code.

**Learned about this deployment:** this repo is deployed to **Vercel as a web build**
(`expo export -p web` per `vercel.json`), not distributed via Expo Go or a native build (no
`eas.json` in the repo) — the user tests it by opening the Vercel URL in their phone's browser.
Keep that in mind before suggesting Expo Go / QR-code-based testing flows.

## Session notes — where we left off (2026-08-20)

Read this first so you don't have to be re-briefed. Supabase migrations listed below have
already been run by hand in the Supabase SQL Editor (this repo's Supabase project doesn't
auto-deploy migrations from GitHub — treat every new migration file as needing a manual run,
and tell the user exactly what SQL to paste).

**⚠️ NEXT STEP WHEN THIS PICKS BACK UP — DO THIS FIRST, BEFORE ANY NEW WORK:** everything in
today's "polish/feature notes" batch below (soft-zone dimming, login field errors, account
settings, the service detail page, real photo uploads, real 2-step verification, accent color +
text size) was built, pushed to GitHub, and deployed to Vercel — but **the user has not tried any
of it yet** (ran out of time same day, said they'd test "tomorrow"). They said they'd paste the
photo-uploads SQL migration themselves before ending the session, so check whether
`20260820150000_add_photo_uploads.sql` has actually been run (ask, or take their word for it) —
don't assume it's done just because it's dated today. Walk them through testing all of the
2026-08-20 batch end-to-end and fix anything broken **before** starting any new feature or moving
to "Recommended next step" below — do not treat today's work as done/stable until they've
confirmed it in the actual app.

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

