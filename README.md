# SideKick

Two-sided local services marketplace for young independent business owners (14–20) and the
clients (25+) who hire them. Full product/legal/technical blueprint lives in
[HANDOFF.md](./HANDOFF.md) — read that first for the "why" behind everything here.

## Stack

Expo (React Native) + `expo-router` + `react-native-web`, Supabase (Postgres/PostGIS/Auth/RLS/
Storage/Realtime), NativeWind for a shared, role-themed design system.

## Status: M0 — scaffold

- [x] Expo + expo-router + react-native-web project
- [x] NativeWind design system with two role themes (worker / client)
- [x] Role selection screen ("Which are you?")
- [x] Legal-acceptance onboarding gate (`legal_acceptances` table + draft copy)
- [x] Supabase client wired against placeholder env vars
- [x] Worker-side visual design pass: branded welcome hero, polished legal screen, and a full
      tabbed dashboard (Home / Jobs / Earnings / Profile) with mock data
- [x] Worker profile fully wired: edit profile, services & pricing (add/edit/remove/toggle),
      notifications, legal documents, help — all backed by `WorkerDataContext` (in-memory state,
      resets on reload; not yet persisted to a backend)
- [x] Client side built out to the same level: tabbed Discover (search + category filter + request
      booking) / Bookings (status groups, cash "I paid" confirmation, star rating) / Profile
      (addresses, notifications, legal, help), backed by `ClientDataContext`
- [x] Step 2 fundamentals (per `App Checklist.y`):
    - In-app **messaging** for both roles (Messages tab → chat thread), with phone-number/email
      redaction (`src/lib/sanitizeMessage.ts`, per HANDOFF.md §11) and report-conversation
    - **Dark/light mode** toggle (Profile → Appearance), persisted per device; every screen themed
      for both schemes in both role palettes
    - Services priced **per job ("From $15") or per hour ("$25/hr")** with an inline type selector
    - **Client customer rating** surfaced only to business owners (worker job cards + chat header);
      the client never sees their own number
- [x] Step 2 booking/scheduling epic — a single shared **`JobsContext`** now backs both the worker
      Jobs screen and the client Bookings screen (replacing the two disconnected data sets), so:
    - Client **Request booking** → opens the worker's chat and creates a timeless "new request"
      that shows on both sides; time is agreed in chat, not at request time
    - **Job offers** in chat (the `+` button → service / per-job-or-hour price / date / time);
      accepting an offer schedules the job on both the calendar and the scheduled list
    - Worker can **accept/decline/propose-time** on incoming requests and **manually add** a job
    - Worker **edits the final price before Mark Complete**, and completed jobs drive the
      **earnings** buckets (week/month/lifetime) — the total is derived, not hardcoded
    - Worker **rating is the mean** of all completed-job ratings (not a static number)
    - **Month calendar** view on both Bookings and Jobs (upcoming + past, dots on active days)
    - Client **location** (zip + city) moved to a box beside the Discover search bar (the old
      addresses page is gone)
    - Messaging gains **edit** ("· edited"), **delete** ("You/{name} deleted a message"),
      **report with a reason picker**, and **block/unblock** (blocking disables the composer)
- [x] Step 3 additions:
    - Worker can **add a job directly onto a calendar day** (the add-job form prefills the tapped day)
    - **Alarms** settings (Profile → Alarms): on/off, lead time (15/30/45/60/90 min or custom),
      and a sound picker (Chime / Bell / Marimba / Radar / Digital / Beep) — stored in
      `WorkerDataContext` (device-notification scheduling itself lands with the notifications integration)
    - Hidden **developer console**: Profile → Help & support → "Developer sign in" (passcode `1458`)
      → a moderation dashboard listing every submitted report (platform seed + any filed this
      session) with stats, plus a functional **"Ban messaging for 24h"** per user that disables the
      banned user's chat composer platform-wide (`MessagesContext.banMessaging` / `banStatus`)
- [ ] M1 — identity & onboarding (guardian invite, document age verification, category catalog +
      age-gating engine, real auth to replace the in-memory contexts above)
- [ ] M2 — listings & geo (PostGIS radius matching)
- [ ] M3 — booking & comms (real backend behind the Discover → request → bookings loop)
- [ ] M4 — money & safety gates (background checks; billing per HANDOFF.md §10)
- [ ] M5 — reputation & safety (SOS, live location, guardian visibility)
- [ ] M6 — harden & pilot

See HANDOFF.md §12 for the full milestone plan.

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` — from your Supabase project
  settings. Without these the app runs against a placeholder client and the legal-acceptance
  gate logs locally instead of writing to the database (auth isn't wired up until M1, so there's
  no user to attach the row to yet either way).
- `EXPO_PUBLIC_MAPBOX_TOKEN` — not used until M2 (geo/maps).

Apply the schema in [supabase/migrations/0001_init.sql](./supabase/migrations/0001_init.sql) to
your Supabase project (via the SQL editor or `supabase db push` if you're using the CLI).

Run it:

```bash
npm run web    # or: npm run ios / npm run android
```

## Project layout

```
app/                   expo-router screens/layouts
  _layout.tsx           root layout — theme + Stack
  index.tsx             redirect logic (role-select → legal → role home)
  role-select.tsx        "Which are you?"
  legal.tsx              legal-acceptance gate
  worker/                worker tab navigator (guarded): home, jobs, messages, earnings, profile
  client/                client tab navigator (guarded): home (discover), bookings, messages, profile
  chat/[id].tsx           shared full-screen chat thread (pushed over the tab bar)
  settings/               pushed sub-screens for both roles' profile settings (edit profile,
                         services/addresses, notifications, appearance, legal, help) — root-level
                         so they cover the tab bar when navigated to
src/
  theme/                 design tokens, NativeWind theme vars, and a literal-color palette
                         per role (for icon/gradient props NativeWind's className can't reach)
  context/                AppStateContext (role + legal-acceptance + color scheme),
                         WorkerDataContext, ClientDataContext, MessagesContext, and JobsContext
                         (the shared jobs/bookings store both roles read from) — in-memory state
                         until M1 wires up real auth + a backend. Note: because a session is one
                         role at a time, cross-side propagation is demoed via seeded received
                         offers rather than live two-way sync (that needs the backend).
  components/             shared UI: Avatar, Badge, JobCard, StatTile, RoleCard, Toggle, etc.
  screens/                role-shared screen bodies (MessagesList, ChatThread) used by thin routes
  data/                   mock data + seed state for the worker/client/messages contexts above
  lib/                    supabase client, legal-acceptance recorder, chat contact-info sanitizer
supabase/migrations/      SQL schema, applied in order
```

## Notes

- The legal copy in `app/legal.tsx` is placeholder text, not an approved agreement — per
  HANDOFF.md §7, every agreement must be drafted by licensed counsel before launch.
- Category → age gating, guardian consent, Stripe Connect escrow, and background checks are not
  implemented yet — see the milestone checklist above.
- Worker dashboard photos (`src/data/workerMock.ts`) are stock placeholders (Lorem Picsum /
  pravatar, seeded for consistency) standing in for real or licensed photography — swap before
  launch.
- `expo-linear-gradient`'s `<LinearGradient>` does not support NativeWind's `className` prop
  (only core React Native components do) — style it with the `style` prop, not `className`.
- Profile edits, service/address management, notification toggles, and the booking → cash-payment
  → review loop are all real interactions, just backed by in-memory React context instead of a
  database — refresh the page and they reset. `Toggle` (`src/components/Toggle.tsx`) is a custom
  component rather than React Native's `Switch`, which on web renders as a bare native
  `<input type="checkbox" role="switch">` that some browsers style with their own colors,
  ignoring `trackColor`/`thumbColor` entirely.
