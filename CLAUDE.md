@AGENTS.md

## Session notes — where we left off (2026-08-24)

**⚠️ NEXT STEP — the 2026-08-21 Groups batch (announcements/rules/FAQ/photos/flagging/ownership
transfer) was confirmed tested and working before this session started. This session's migration,
`20260824120000_add_group_moderation.sql`, has NOT been run yet and NOTHING below has been tested
in the app.** Run the migration (paste from the actual file in your editor, not from a chat window
— a copy from chat mangled comment line-wraps earlier this project and broke the SQL Editor twice
in a row), then walk the checklist at the bottom of this entry.

### What's new today, in order

The user dictated a batch of UI/permission fixes for Groups in one message; all were built without
checking in, per that message. What follows is what was built, plus a few explicit interpretation
calls made where the ask was ambiguous — flagged as such below, not silently assumed.

1. **Tab bar is no longer tall.** The Chat/Announcements/FAQ/Rules/Members strip was a horizontally
   scrolling underline-tab row that rendered far taller than intended. Replaced with a single
   fixed-height row of 5 compact pill/box buttons spanning the full width (`app/groups/[id]/index.tsx`),
   active tab filled with the primary color, others outlined. Labels were shortened
   ("Announcements" → "Announce", "Members (N)" → "Members", the count already shows in the header)
   so five boxes fit one row without truncating badly — a presentational call beyond "just resize
   it," flagging it as an assumption.

2. **FAQ is now ask/answer, not post-both-at-once.** Any member can ask a question
   (`askFaq` in `GroupsContext`); it starts unanswered and renders as a greyed, dashed "Awaiting
   response" card. A new per-member `can_answer_faq` flag (owner grants/revokes it from a member's
   action sheet — tap their name in Members → "Allow answering FAQs") plus the owner (who can
   always answer, flag or not) can see pending questions and answer them
   (`answerFaq`); everyone else never receives the row at all until it's answered — enforced by the
   new `group_faqs` RLS select policy, not just client-side hiding. The FAQ tab shows a small red
   dot when there's ≥1 pending question visible to you. A flagged (profane-wordlist) question still
   shows to answerers, just with a flag icon — it isn't hidden the way flagged chat messages are.
   **Interpretation call:** rather than wiring this into the existing local-only custom-roles/powers
   system (which isn't persisted server-side at all — see the "still local-only" note further down),
   `can_answer_faq` is a plain boolean column on `group_members`, real and RLS-enforced. Simpler,
   and consistent with how kick/ban were already real while the rest of the role system stayed mock.

3. **Ownership transfer picker now shows both names.** `app/groups/[id]/transfer.tsx` shows the
   member's existing display name (bold, same as before — effectively their business name) plus
   their real personal name underneath (muted), matching the primary/secondary convention
   `WorkerListingCard` already uses for business-name-vs-real-name. Needed a new `real_name` column
   on `group_members`/`group_requests`, backfilled in the migration for existing rows.

4. **Chat composer now genuinely starts at 1 line and grows to 5.** The group chat composer
   (`app/groups/[id]/index.tsx`) previously had no `onContentSizeChange` handler at all — just a
   static `minHeight:40/maxHeight:120`, which is why it never actually behaved like "starts at one
   line." Ported the same dynamic-height pattern the direct-message composer
   (`src/screens/ChatThread.tsx`) already used successfully, recalibrated to an explicit 40–120px
   range (empirically ≈ 1–5 lines at this app's default text size). Past 5 lines the box stops
   growing and scrolls internally (native TextInput behavior once height is capped). Added
   `textAlignVertical: "top"` to both composers for consistency. **Caveat:** the 40/120 bounds are
   fixed pixel values, not wired into the app's dynamic text-size scaling system
   (`src/theme/textSize.ts`) — if the user has "Large" or "Extra Large" text size set, "1 line" may
   look slightly cramped or "5 lines" may clip a touch early. Not fixed here (out of scope for what
   was asked); worth a follow-up if it turns out to matter in practice.

5. **Flagged messages are now permanent — no delete, only dismiss-flag.** Enforced at the RLS layer
   (`group_messages` update policy now has `with check (not (flagged and deleted))`), not just
   client-side: neither the owner nor the sender can delete a flagged message anymore, from the
   chat menu or from the developer Reports console (its "Delete" button on flagged messages was
   removed). Only "Dismiss flag" remains. A user's own *unflagged* messages are untouched — still
   deletable exactly as before. **Interpretation call:** also blocked *editing* a flagged message's
   text (removed the "Edit message" option for flagged messages in the chat long-press menu) since
   "permanent" read as covering content, not just the deleted flag — not explicitly asked for,
   flagging it in case that reads as too strict.

6. **Real mute, kick, and ban**, all owner-only, gated on `isOwner` directly in the UI (not the mock
   role/power system — the existing kick/ban options are still gated by the mock powers as before,
   unchanged; mute and the FAQ-answer toggle are new and were gated on real ownership instead, to
   avoid extending the mock-power system's promises further than intended):
   - **Mute**: owner picks 3 hours / 1 day / 1 week / 1 month from a member's action sheet →
     `muted_until` on `group_members`. A muted member's composer is replaced with "You're muted
     until <date/time>" instead of letting them type; enforced server-side too (message insert RLS
     now checks `muted_until`).
   - **Ban**: already removed membership before; now also inserts a permanent `group_bans` row that
     blocks rejoining entirely, both instant-join and request-to-join, checked server-side. **Added
     unban** (not explicitly requested — flagging this addition specifically): a new "Banned
     members" row in group Settings (owner-only) → `app/groups/[id]/banned.tsx`, listing everyone
     banned with an Unban button. An irreversible ban with zero way back felt like a bad default to
     ship silently.
   - **Kick + rejoin gate**: kicking now also inserts a `group_kicked_users` row. Joining a group
     that's still nominally public no longer goes through a direct client-side insert — it now
     calls a new `join_public_group()` RPC that checks bans and prior-kick status server-side and
     routes a previously-kicked user into the normal request/approval flow instead of letting them
     back in instantly, even though the group itself is still public. This person needs owner
     approval to get back in from now on, every time, permanently (their `group_kicked_users` row
     is never cleared, per the ask).

### Exact SQL to run

Paste `supabase/migrations/20260824120000_add_group_moderation.sql` into the Supabase SQL Editor —
copy it from the file in your editor, not from a chat window (see the warning at the top of this
entry). The file is deliberately light on long prose comments for exactly that reason.

### Still local-only/mock, unchanged today

Custom roles beyond president/member, the mock power system's kick/ban/deleteMessages gating for
non-owner "officers," and activity logs are all still local-only, same as every prior session —
not touched today.

### Testing checklist for next session

1. Confirm the migration above has been run (ask — don't assume).
2. Tab bar: open any group you're a member of, confirm the 5 tabs render as one compact row of
   boxes, not a tall strip.
3. FAQ ask: as a plain member, ask a question from the FAQ tab; confirm it shows as a greyed
   "Awaiting response" card with no answer visible, and that a *third* member (not owner, no
   answer permission) does not see the question at all.
4. FAQ permission: as owner, open a member's action sheet from Members, tap "Allow answering FAQs";
   confirm that member can now see and answer pending questions; confirm the FAQ tab's red dot
   shows for anyone who can currently see a pending question, and disappears once it's answered.
5. FAQ answer: answer a pending question as the owner or a can_answer_faq member; confirm it now
   shows normally (question/answer/answered-by) to every member, including ones who couldn't see
   it while pending.
6. Ownership transfer: Settings → Give up ownership → confirm each row shows both the business name
   and, underneath, the person's real name.
7. Composer: open group chat, confirm the input starts at a single visible line, grows smoothly up
   to about 5 lines as you type a long message, then stops growing and scrolls internally past that.
8. Flagged message: trigger a flag (send an obvious wordlist word from a non-owner account),
   confirm the owner sees "Dismiss flag" only — no delete option — on that message, and that the
   developer Reports console's flagged-messages section also only offers "Dismiss flag" now.
9. Mute: as owner, mute a member for 3 hours; switch to that account, confirm the composer is
   replaced with a "You're muted until…" notice and sending is blocked.
10. Ban + unban: ban a member, confirm they can no longer join or request to join (even after
    leaving and trying again); as owner, go to Settings → Banned members, unban them, confirm they
    can request/join again afterward.
11. Kick + rejoin gate: kick a member from a **public** group, then from that member's account try
    to join it again — confirm it now goes through "Request sent" instead of joining instantly, and
    that the owner sees it appear as a normal join request to accept/decline.

## Session notes — where we left off (2026-08-21)

**⚠️ NEXT STEP WHEN THIS PICKS BACK UP — READ THIS FIRST, THE USER HAS NOT TESTED ANY OF TODAY'S
GROUPS WORK:** the user asked for a large batch of new Groups features late in this session, said
explicitly they will NOT look at or test any of it today, and won't run any more SQL today either.
So as of right now: `20260821130000_add_groups.sql` (core groups/members/requests/chat — earlier in
the day) **was confirmed run** by the user. `20260821150000_add_group_content.sql` (photos,
announcements, rules, FAQ, flagging, ownership transfer — the later batch) **was written but the
user has not run it yet and has not tested any of it.** Do not assume any of the second migration's
features work. First thing next session: confirm whether `20260821150000_add_group_content.sql`
has been run yet (ask, don't assume), walk them through running it if not (exact SQL Editor steps
are the same pattern used all session: SQL Editor → New query → paste → Run), then test the whole
new batch end-to-end (see the checklist near the bottom of this entry) before building anything
further.

### What's new today, in order

**Bug/UX fixes (all tested and confirmed working by the user before the Groups batch started):**
- Accent color picker no longer snaps back to orange when dragging the saturation/value square
  right after moving the hue slider (stale-closure bug in `AccentColorPicker.tsx`'s PanResponder).
- Removed a stray "service/[id]" tab that was leaking into the worker bottom nav
  (`app/worker/_layout.tsx` now hides it with `href: null`).
- **Real bug, now fixed:** 2FA wasn't actually gating login — `signInWithPassword` created a live
  session immediately, before the emailed code was ever checked, so the OTP screen was cosmetic.
  `AuthContext.logIn` now withholds `currentUser` via a `pendingTwoFactorRef` until
  `completeTwoFactorLogin()` runs post-verification. Also fixed: the OTP code box was hard-truncated
  to 6 digits and required exactly 6, but this Supabase project's actual email OTPs are 8 digits —
  verification could never succeed. Now accepts up to 10 digits. Also added a proper back/cancel
  button (top-right circular chevron, matching the rest of the app) since there was previously no
  way off that screen.
- Hourly job completion now asks "hours worked" and computes rate × hours, instead of a dollar
  field mislabeled "$X/hr" that actually just set the total price directly.
- Password reset: `requestPasswordReset` now passes an explicit `redirectTo` (the running app's own
  origin) instead of relying on Supabase's dashboard Site URL (which is still localhost); added
  `app/reset-password.tsx` to actually handle that link (manually parses the URL `#hash` since
  `detectSessionInUrl: false` is set in `src/lib/supabase.ts`); finishing a reset now signs the
  session back out instead of silently logging the user in, and shows "Password successfully
  changed" + a "Go back to log in" button.
- Settings "Security" renamed "Privacy & Security" (it already had password/email/username, just
  wasn't labeled in a way the user noticed).
- Password fields everywhere (login, signup, change password, reset password) now have a
  click-to-toggle eye icon (`FormField.tsx`) to reveal/hide the typed password.
- Wrong password on login now clears the field and refocuses it instead of leaving bad text sitting
  there.
- **Still needs the user to do two things in the Supabase dashboard, unrelated to any migration —
  ask if these are done before assuming password-reset/2FA email are fully fixed:**
  1. Authentication → URL Configuration → Site URL + Redirect URLs set to the Vercel domain
     (`https://sidekick-webapp.vercel.app`) — confirmed done by the user this session.
  2. Custom SMTP (Resend) connected + the Magic Link email template edited to show `{{ .Token }}`
     instead of a link — confirmed set up and the user reported it worked ("2fa was nicer") this
     session, so treat this as done.

**Groups — first batch, tested and confirmed working by the user:** turned `GroupsContext` from
100% local/mock into "core real" — `groups`, `group_members`, `group_requests`, `group_messages`
tables + RLS (`20260821130000_add_groups.sql`), `create_group`/`accept_group_request` as
security-definer RPCs (same pattern as `start_conversation`). Real: creating a group, joining a
public group instantly, requesting/accepting/declining/canceling for private groups, leaving,
kicking (owner-enforced), sending/editing/deleting your own messages. `me.userId` switched from
`currentUser.username` to the real `currentUser.id` (uuid) to match the new foreign keys.

**Groups — second batch, NOT YET TESTED, migration NOT YET CONFIRMED RUN:** the user asked for a
big list of additional features in one message and said to build all of it without checking in.
What was built (`20260821150000_add_group_content.sql` + code, all pushed):
- **Real group photo**: camera/library upload replacing the old preset-avatar cycling, both on
  create and edit (`pickAndUploadPhoto`, same helper profile/service photos already use).
- **Announcements tab**: owner-only broadcast posts, all members can read (`group_announcements`
  table). Compose modal + delete via long-press (owner only).
- **Rules tab**: a single rules text blob per group, editable by the owner from the group's Edit
  screen, visible to everyone including non-members (it's just a plain column on `groups`, not
  gated behind membership like the other new tables).
- **FAQ tab**: any member can post a question+answer "common question" entry (`group_faqs` table);
  author or owner can delete their own.
- **Chat photos**: the composer now has a camera icon that sends a photo message
  (`group_messages.image_url`), same upload path as the group avatar.
- **Auto-flagging**: an obvious-cases wordlist check (`src/lib/moderateText.ts`) runs client-side on
  every sent message; a flagged message is hidden from everyone except its sender and the real
  group owner (this is a client-side render decision in `app/groups/[id]/index.tsx`, not an RLS
  restriction — the row is still fetched, just not shown). Owner can dismiss the flag or delete the
  message, from either the chat itself or a new "Flagged group messages" section on the developer
  Reports console (Profile → Help → Developer sign-in, passcode 1458).
  **Explicitly NOT real moderation** — there's no vision/image scanning at all (no API wired up for
  that), so a bad photo relies entirely on someone using "Report message" (added to the chat
  message menu, reuses the existing report flow). The wordlist itself is short and deliberately
  blunt — expect both false negatives (creative misspellings) and it only covers English profanity.
- **Ownership transfer**: owner-only "Give up ownership" row in group Settings → pick a member →
  confirm screen ("cannot take this back after") → `transfer_group_ownership` RPC (security
  definer, re-verifies caller is really the owner and the target is really a member server-side).
- **Chat composer** now starts at one line and grows with content instead of defaulting tall.
- **Real (pre-existing) bug fixed while in there**: both group AND direct-message chat bubble text
  had a color class but no Tailwind *size* class, so neither ever actually responded to the
  Appearance → text size setting. Added `text-base` to both (`app/groups/[id]/index.tsx` and
  `src/screens/ChatThread.tsx`). This was likely also true elsewhere in the app in isolated spots —
  only did a grep sweep, not an exhaustive per-screen audit, so if the user still finds a spot that
  doesn't scale with text size, that's the first thing to check.
- **Text size scale overhaul**: the old three tiers (small/default/large) were barely distinguishable
  from each other, which is what the user complained about. Replaced with an explicit 4-tier
  50%/100%/150%/200% scale (`src/theme/textSize.ts`, labeled Small/Medium/Large/Extra Large in
  Appearance) — every one of the 8 underlying font-size steps is now a literal percentage of the
  100% column, computed with one `scaled(factor)` helper instead of 3 separately hand-tuned tables.
  This is a much bigger visual jump than before, by design/request — if it reads as too extreme
  (especially "Extra Large" at 2×), that's a real possibility worth asking the user about, not
  necessarily a bug.

**Still local-only/mock in Groups, unchanged, by deliberate scope decision the user made earlier
this session ("core first" over "everything at once"):** custom roles beyond the built-in
president/member split, the ban list itself (kicking is real, but nothing stops a banned user from
immediately re-requesting), activity logs, and any non-owner "officer" action gated only by the
mock power system (kicking, editing group settings, deleting others' messages) — these appear to
work locally in the UI but won't survive a page refresh, since only the real `groups.owner_id` is
enforced server-side. If the user wants this finished: a `group_roles` table, a `group_bans` table,
persisting logs, and replacing the current owner-only RLS checks with real rank/power lookups.

### Testing checklist for next session (walk the user through this before anything else)

1. Confirm `20260821150000_add_group_content.sql` has been run (ask — don't assume).
2. Group photo: create or edit a group, tap the camera icon, take/choose a photo, confirm it
   uploads and shows (not the old preset picsum images).
3. Announcements: as the group owner, post one from the Announcements tab; switch to a non-owner
   member account, confirm they can see it but have no post/delete controls.
4. Rules: as owner, add rules text via Edit group; confirm it shows in the Rules tab, including to
   an account that isn't even a member of the group yet (Discover → open the group → Rules tab).
5. FAQ: as any member, add a question+answer entry; confirm another member can see it; confirm
   delete only works for the entry's author or the owner.
6. Chat photo: send a photo in group chat from the camera icon next to the composer; confirm it
   uploads and displays inline.
7. Flagging: send a message containing an obvious flagged word (check `src/lib/moderateText.ts` for
   the exact list) from a non-owner account; confirm the OWNER sees it (with the flagged badge) and
   a THIRD member sees only "Message hidden — under review"; confirm the owner can dismiss the flag
   or delete it, and that it also shows up on the admin Reports console under "Flagged group
   messages."
8. Ownership transfer: as owner with at least one other member, Settings → Give up ownership → pick
   someone → confirm screen → confirm. Verify the new owner now sees owner-only controls (Edit
   group, Announcements compose, Give up ownership) and the old owner no longer does.
9. Chat composer: confirm it now starts as a single line and grows as you type a longer message.
10. Text size: cycle through all four Appearance → Text size options and confirm the jump between
    them is now obviously visible (this was the whole point of the change) — including inside group
    and direct-message chat bubbles specifically, since those were the two screens found not to be
    scaling at all before this session's fix.

### Ideas not built, worth mentioning to the user

The user said "anything else useful, add it but tell me after" — these weren't built (scope was
already very large for one session), just flagged as candidates for later: read receipts / unread
badges on group tabs (announcements/FAQ currently don't indicate "new since you last opened"),
@mentions in group chat, pinning a message or announcement, a real image-moderation API integration
(would need a paid third-party service — Sightengine, AWS Rekognition, etc. — to make photo
flagging actually real instead of report-only), group invite links, and photo compression/thumbnails
before upload (currently uploads at `quality: 0.8` full-size, same as profile photos — fine for a
handful of images but could add up in Storage usage at scale).

## Session notes — where we left off (2026-08-20)

**⚠️ NEXT STEP WHEN THIS PICKS BACK UP
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

