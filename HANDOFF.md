# HANDOFF.md — Local Services Marketplace for Young Independent Business Owners
### Working title: **Hustl** (placeholder — rename freely)

> A two-sided local marketplace where **young people (14–20) advertise and run their own independent service businesses**, and **clients (25+) discover and hire them**. One app, two role-specific frontends. Progressive Web App + native iOS/Android from a single codebase, launching in **New York State** (single-metro pilot recommended).
>
> **The platform is an advertising + introduction venue — not an employer, agency, or staffing service.** Workers are independent business owners who define their own services, set their own prices, use their own equipment, and control how they do the work. The platform connects supply and demand and takes a fee; it does not direct, supervise, or control the work. This posture is load-bearing for the entire legal model (see §0 and §7) and must be preserved in every product decision.

---

## 0. Read this first — the operating principles that shape everything

**This product's moat is trust, safety, and compliance-by-design — not marketplace mechanics.** Build those as first-class features.

### 0.1 The "no control" principle (preserve independent-business status)
Employer/vicarious liability turns largely on **control**. To keep workers defensibly independent, the platform MUST NOT:
- set or cap prices (workers set their own),
- assign or route jobs to specific workers (clients choose; workers accept/decline freely),
- dictate methods, tools, uniforms, or how the work is performed,
- supervise or manage the work,
- guarantee the work or the worker.

The platform MAY: provide the listing/advertising surface, matching/discovery, in-app comms, payment-confirmation tooling (without ever touching the money itself — job payment is cash, direct client→worker, see §10), verification, ratings, and safety tooling. Keep this line bright everywhere in the UX and copy.

### 0.2 What the legal-agreements + insurance stack can and cannot do
No contract makes a platform "legally unable to be in trouble for anything." In particular: pre-injury releases signed by or for **minors are frequently unenforceable** (NY voids many on public-policy grounds), and liability for your **own negligence or statutory violations cannot be waived**. What the stack in §7 *does* achieve:
1. **Structure** the platform as a marketplace, not an employer → minimizes vicarious/employer liability.
2. **Allocate** risk to the parties via assumption-of-risk + indemnification each side accepts at onboarding.
3. **Backstop** residual risk with **insurance** — the thing that actually pays when a waiver fails.
This is strong, legitimate risk-*reduction*, not immunity. **Every agreement in §7 must be drafted by licensed counsel.** This document is engineering input, not legal advice.

### 0.3 NY compliance inputs (verify with counsel; keep in config, not code)
- **Supply band 14–20.** Under-14 employment is broadly prohibited in NY; 14 is the floor.
- **14–17 are minors:** guardian layer required; capture "working papers"/employment-certificate status as a compliance artifact (school-issued today; NYSDOL electronic system from May 2027); hazardous categories barred.
- **18–20 are legal adults:** no guardian layer; may access all categories they qualify for.
- **Hazardous / elevated / power-equipment categories → 18+** (pressure washing, gutter cleaning, above-ground window cleaning, roof/ladder work). NY bars under-18s from cleaning buildings from elevated surfaces and operating power-driven machinery. "18+" is served by the 18–20 adult pool.
- **Document-based age verification** gates every age-restricted category — never self-reported DOB alone.
- **ID documents are sensitive PII** — minimize, encrypt, restrict, and define a retention/purge policy; never expose raw documents across the marketplace.

> The independent-contractor classification and the category→age table are the two highest-leverage legal items. Do not launch without a counsel opinion on both. Keep both in editable config so corrections need no redeploy.

---

## 1. Product scope (v1)

### Two account types, chosen at signup
1. **Business Owner (worker, 14–20)** — supply side; advertises an independent service business.
2. **Client (25+)** — demand side; discovers and hires.

Signup asks "Which are you?" → routes to one of two role-specific frontends sharing one design system, themed and copy-tuned per audience (§8). One app, two skins.

### v1 service categories (config-driven; age gates in §4)
Yard work, interior/general cleaning, moving help, babysitting, tutoring, pet care/dog walking, deliveries & errands, basic tech setup, garbage/trash-can cleaning, car washing (ground level), window cleaning, gutter cleaning, pressure washing. The elevated / power-equipment ones — pressure washing, gutter cleaning, above-ground window cleaning — are the age-sensitive **18+** categories (see §4); ground-level window/car washing is not.

### Trust model
**Open marketplace, but "verified" carries weight.** Anyone joins; nobody transacts until verified. Workers verify **age via document**; clients verify **identity + pass a background check** before booking. Repeat/vouched clients earn a visible trust boost so workers can self-select safer jobs.

### Out of scope for v1
Multi-state expansion, W-2/payroll, in-app tax filing, worker↔worker subcontracting, crew/team accounts, non-NY rule packs.

---

## 2. Recommended tech stack

Single codebase across PWA + iOS + Android, fast iteration in Claude Code, built-in geo/auth/storage/realtime.

| Layer | Recommendation | Why |
|---|---|---|
| App (all platforms) | **Expo (React Native) + `expo-router` + `react-native-web`** | iOS, Android, installable PWA from one codebase; role-based theming |
| Backend/data | **Supabase (Postgres + PostGIS + Auth + RLS + Storage + Realtime)** | RLS enforces worker/client/guardian data walls; PostGIS radius matching; Storage for ID docs; Realtime chat |
| Age / ID verification | **Stripe Identity** (or Persona/Veriff) | Document (passport/ID/license) capture + age extraction |
| Client background checks | **Checkr** (or Persona) | Client-side safety gate |
| Job payment | **Cash, paid directly client → worker** | The platform never processes, holds, or moves job payment — this keeps SideKick a pure introduction/advertising venue and reinforces the "no control" posture (§0.1). Client taps "I paid" in-app after the job to unlock reviews; that's a status confirmation, not a transaction. |
| Monetization billing | **Stripe Billing** (plain subscriptions, not Connect) | Recurring subscription/listing fee — e.g. a client membership (unlimited bookings, priority support) and/or a guardian "Plus" plan (priority placement, enhanced safety features) for their teen's listing. Single-party billing; no marketplace payout complexity. |
| Maps / geocoding | **Mapbox** (or Google Maps) | Geocoding + map UI; distance in PostGIS |
| Push / comms | **Expo Notifications**; in-app chat over Supabase Realtime | In-app-only comms (no contact-info exchange) |

**Higher-control alternative:** Next.js PWA + Capacitor, Node/Express + Prisma + Postgres/PostGIS, same third parties. Slower to MVP.

---

## 3. Data model (Postgres)

Category→age rules live in `service_categories` (data, not code). Cross-role isolation via RLS. Legal acceptances are versioned and timestamped.

```
users
  id, email, phone, role ENUM('worker','client'), created_at

worker_profiles
  user_id FK, dob DATE,                            -- self-reported at signup
  verified_dob DATE NULL,                          -- DOB confirmed by document; compute age from this (NEVER store a static age)
  -- is_minor + current age are COMPUTED from verified_dob at read time, not stored (they change as the worker ages)
  guardian_id FK NULL,                             -- required while the worker is a minor (< 18)
  business_name, display_name, bio,
  work_area GEOGRAPHY(Point), service_radius_miles NUMERIC,
  working_papers_status ENUM('n/a','pending','on_file','not_required'),
  rating_avg NUMERIC, rating_count INT,
  status ENUM('draft','pending_verify','active','suspended')

guardians
  id, user_id FK NULL, full_name, email, phone, relationship

guardian_consents
  id, worker_id FK, guardian_id FK,
  type ENUM('signup','booking','category_unlock'),
  ref_id UUID NULL, status ENUM('requested','granted','denied'), granted_at

client_profiles
  user_id FK, dob DATE, full_name,
  home_address, home_geo GEOGRAPHY(Point),
  id_verified BOOL, background_check_status ENUM('none','pending','clear','flagged'),
  trust_tier ENUM('new','verified','trusted')

service_categories                 -- CONFIG TABLE, editable without deploy
  id, slug, name, description,
  min_age INT,                     -- 14 default; hazardous = 18
  hazard_flags TEXT[],             -- ['elevated','power_equipment','chemicals']
  requires_age_document BOOL,
  ny_note TEXT

worker_services                    -- a worker's advertised listing
  id, worker_id FK, category_id FK, title, price NUMERIC,
  price_unit ENUM('flat','hour','sqft','job'), description, active BOOL
  -- NOTE: price is set by the worker only. Platform never sets/caps it.

bookings
  id, client_id FK, worker_id FK, service_id FK,
  status ENUM('requested','accepted','declined','scheduled','in_progress',
              'completed','cancelled','disputed'),
  job_geo GEOGRAPHY(Point), job_address, scheduled_at, price NUMERIC,
  -- job payment is cash, worker <-> client, off-platform — no payment_intent/transfer/escrow fields
  cash_confirmed_by_client BOOL DEFAULT false,   -- client taps "I paid" post-job; unlocks review flow
  checkin_at, checkout_at

messages            id, booking_id FK, sender_id FK, body, created_at
reviews             id, booking_id FK, rater_id FK, ratee_id FK, stars INT, body, created_at
verifications       id, subject_id FK, type ENUM('age_document','client_id','background_check'),
                    provider, external_ref, status, evidence_url, created_at
safety_events       id, booking_id FK, type ENUM('checkin','checkout','location_ping','sos'),
                    geo GEOGRAPHY(Point), created_at

subscriptions                      -- monetization: recurring fee, independent of job payment (cash)
  id, account_id FK,                -- references users.id (client or guardian)
  account_role ENUM('client','guardian'),
  plan ENUM('client_plus','guardian_plus'),
  status ENUM('active','canceled','past_due'),
  stripe_subscription_id, current_period_end, created_at

legal_acceptances                  -- the "agreed at the beginning" record
  id, user_id FK, agreement_key ENUM('tos','worker_ibo_agreement',
       'client_agreement','guardian_consent_aor'),
  version TEXT, accepted_at, ip_address, user_agent
```

---

## 4. Age-gating engine (core logic)

A worker may **list** a category only if their **age computed from `verified_dob`** ≥ `category.min_age`, where `verified_dob` is set **only** after successful document verification (§5). Compute age at check time — a worker verified at 17 must auto-unlock 18+ categories the day they turn 18. Unverified workers may browse/draft but cannot publish age-restricted listings or accept bookings in them.

**Proposed NY tiering (config; verify with counsel):**

| Tier | Categories | Min age | Basis |
|---|---|---|---|
| Standard | babysitting, tutoring, pet care/dog walking, yard work (no power tools), garbage-can cleaning, car washing (ground), window cleaning (ground level), errands/deliveries, basic tech setup, interior cleaning | 14 | NY floor for non-hazardous work |
| Physical / moderate | moving help, larger yard jobs | 16 | Lifting/physical; broader access 16–17 |
| **Hazardous (18+)** | **pressure washing, gutter cleaning, above-ground window cleaning, roof/ladder work** | **18** | NY bars under-18 from elevated-surface building cleaning + power-driven machinery; filled by the 18–20 pool |

Engine requirements:
- Rules in `service_categories`; changing a min age = data edit.
- Re-check the gate on publish, on booking-accept, and on category browse (no stale entitlements).
- For 14–17 listings, surface `working_papers_status`; block/flag where config requires it.
- When a category is locked, show a plain-language reason ("Available at 18 — NY safety rules"), never a dead end.

---

## 5. Verification flows

### Worker — age via legal document
1. Signup → role + self-reported DOB.
2. If minor (14–17): guardian invite → guardian grants **signup consent** (§6).
3. **Document age verification** (Stripe Identity/Persona): passport / driver's license / state ID → confirm date of birth → set `verified_dob` (store the DOB, not a static age).
4. Store only the *result* + provider ref; keep raw docs in access-restricted Storage with a purge policy. Never exposed to clients.

### Client — identity + safety
1. Signup → 25+ DOB gate, full name, geocoded home address.
2. **ID verification** (document match).
3. **Background check** (Checkr) → `clear` required before first booking. (FCRA applies: capture written consent before running it, and send adverse-action notices on `flagged`.)
4. Trust tier: `new` → `verified` (ID + check clear) → `trusted` (repeat, high ratings, no flags). Visible to workers/guardians.

---

## 6. Guardian layer (minors 14–17 only; absent for 18–20)

Every 14–17 worker has a linked guardian. Guardian approval gates: **signup**, **each booking** (or a standing pre-approval per client), and **category unlock** for sensitive categories. Guardian view: upcoming jobs, job location + client trust tier, live check-in/out status, cash-payment confirmations (§10), SOS channel. There's no guardian-linked payout account — job payment is cash, direct client→worker; the guardian's role here is visibility, not custody of funds.

---

## 7. Legal & liability architecture

Every user accepts the applicable agreement(s) **at onboarding, before activation**, recorded (versioned, timestamped, IP) in `legal_acceptances`. All agreements **drafted by licensed counsel**. This stack reduces and allocates risk; it is not immunity (see §0.2).

### 7.1 Agreements
- **Platform Terms of Service (all users):** platform is a neutral advertising/introduction marketplace; disclaims employer/agency/partnership relationship with workers; disclaims responsibility for the conduct, methods, quality, or safety of independent providers and clients; disclaimer of warranties; limitation of liability (to the maximum extent permitted; excludes what cannot legally be excluded).
- **Independent Business Owner Agreement (worker):** worker represents they operate an **independent business**, control their own methods/pricing/equipment/schedule, are **not** employed by or an agent of the platform; **collects payment for their services directly from the client, in cash** — the platform is not a party to that payment and does not process, hold, or guarantee it; assume the risks of running their business; agree to operate lawfully and within age/category rules; indemnify the platform for their own conduct.
- **Client Agreement (client):** acknowledges providers are **independent third parties** not employed or supervised by the platform and not vetted as employees; **acknowledges job payment is made directly to the worker in cash** and the platform is not a party to, and has no visibility into or responsibility for, that payment; client is responsible for **premises safety** and the work environment (premises-liability exposure sits with the property owner); assumption of risk; indemnification; consent to background check.
- **Guardian Consent & Assumption-of-Risk (14–17):** guardian consents to the minor's participation and, to the extent legally permissible, assumes risk and indemnifies. **Note honestly:** parental pre-injury releases of a minor's own claims are frequently unenforceable — this reduces but does not eliminate exposure, which is why §7.3 insurance is mandatory, not optional.
- **Mutual arbitration + class-action waiver:** standard marketplace clause; enforceability varies (especially for minors) — counsel to advise.

### 7.2 Design constraints that preserve the legal posture
Enforce §0.1 "no control" in the product: worker sets price; client chooses worker; platform never assigns/directs/supervises; consistent, logged enforcement of rules; complete audit trail via `legal_acceptances`, `verifications`, `safety_events`.

### 7.3 Insurance (the real backstop — required for launch)
- Platform: commercial general liability + professional/tech E&O.
- Marketplace coverage for bodily injury / property damage arising from jobs (per-occurrence), either platform-carried or offered/required to workers.
- Treat insurance as the primary financial protection where waivers fail. Counsel + broker to size.

---

## 8. The two frontends (one design system)

One component library + design tokens; theme selected by `role`. Same nav skeleton and interaction patterns → reads as one app.

**Worker side ("run your business," 14–20):** energetic but not childish (pool includes young adults); dashboard-first home (earnings this week, upcoming jobs, rating, "your services"); set prices, set work area + radius, accept/decline, check in/out, track earnings, grow reputation; light gamification of reputation/streaks.

**Client side ("find trusted local help," 25+):** calmer, trust-forward, review- and safety-centric; discovery-first (search service near me, browse worker profiles with ratings + trust signals), book + reschedule, pay the worker in cash on completion, rate after.

Shared, themed: auth, chat, booking detail, notifications, profile, dispute flow.

---

## 9. Geo work-area + radius matching (PostGIS)

Worker sets a home work point + service radius (e.g., Yonkers + 5 mi). A worker is eligible for a job when within radius AND offers the category AND passes the age gate.

```sql
SELECT w.*
FROM worker_profiles w
JOIN worker_services s ON s.worker_id = w.user_id
WHERE s.category_id = :category
  AND w.status = 'active'
  AND s.active = true
  AND w.verified_dob IS NOT NULL
  AND w.verified_dob <= current_date - make_interval(years => :category_min_age)  -- computed age >= min_age
  AND ST_DWithin(w.work_area, :job_geo::geography, w.service_radius_miles * 1609.34);
```
Client discovery: given client address + category, return active workers whose service area covers the point, sorted by rating/distance/trust.

---

## 10. Booking & payment (cash)

1. Client requests booking (category, time, location, **worker-set price**) → worker accepts (guardian gate if minor).
2. Worker **checks in** (location logged, guardian notified if minor) → works → **checks out**.
3. Client pays the worker **directly in cash** on completion. The platform is not a party to this payment, never touches the money, and has no visibility into whether the agreed price actually changed hands beyond the client's own confirmation — this is deliberate (§0.1).
4. Client taps **"I paid"** in-app → unlocks the review prompt for both sides. This is a status confirmation, not a payment transaction, and creates no money-transmitter exposure.
5. Both sides prompted to **review**.
6. Disputes over whether/how much was paid → `disputed` → manual review. There's no held balance to freeze; resolution leans on the "I paid" timestamp, in-app messages, and the check-in/out log — set that expectation clearly in the UX so it isn't mistaken for buyer/seller protection.

**Monetization:** a recurring **subscription/listing fee**, not a per-job cut — e.g. a client membership (unlimited bookings, priority support) and/or a guardian "Plus" plan (priority placement, enhanced safety features) for their teen's listing (see `subscriptions` in §3). Never take a cut of the cash a worker collects — the platform has no claim on or visibility into job payment, and skimming it would also contradict "no control" (§0.1).

---

## 11. Safety architecture

- **In-app-only comms** — strip contact info from chat.
- **Live location + check-in/out** on active jobs, visible to guardian (minors).
- **SOS** on active jobs → alerts guardian + platform, logs location.
- **Two-sided ratings** + report/block.
- **Client background-check gate** before booking; trust tiers surfaced.
- **Insurance/guarantee layer** (§7.3).
- **PII walls via RLS:** clients never see worker DOB/documents; workers never see client raw ID; guardians see only their own worker.

---

## 12. Build milestones (Claude Code execution order)

- **M0 — Scaffold:** Expo + expo-router + react-native-web; Supabase; design system + two themes; role selection + routing; `legal_acceptances` + onboarding acceptance gates.
- **M1 — Identity & onboarding:** worker onboarding (+ guardian invite/consent for minors); client onboarding; document age verification; config-driven category catalog + age-gating engine.
- **M2 — Listings & geo:** worker listings (worker-set price); work-area point + radius; PostGIS discovery/search.
- **M3 — Booking & comms:** request/accept/schedule; in-app chat; check-in/out; guardian gates.
- **M4 — Money & safety gates:** cash-payment "I paid" confirmation flow; Stripe Billing subscription/listing fee (`subscriptions`); client ID + Checkr background check.
- **M5 — Reputation & safety:** two-sided reviews; trust tiers; SOS + live location + guardian visibility; push.
- **M6 — Harden & pilot:** dispute flow; PII retention/purge; RLS audit; **counsel review (classification, category tiers, all §7 agreements) + insurance bound**; single-metro NY pilot.

---

## 13. Counsel checklist (do not launch without answers)

1. **Independent-contractor / marketplace classification** — confirm the platform is not an employer/agency; validate §0.1 "no control" design and all §7 agreements.
2. **Category→age tiers (§4)** — validate against current NYLL §133 hazardous lists + federal HO orders; confirm hazardous = 18+.
3. **Enforceability of guardian assumption-of-risk / releases for minors** in NY.
4. **Arbitration + class-waiver** enforceability, especially for minors.
5. **Cash payments to minors** — any guidance needed on minors receiving cash directly from clients (safety), income/tax reporting obligations for a minor's earnings, and confirming the in-app "I paid" confirmation + subscription billing don't create money-transmitter licensing exposure (the platform never touches job payment).
6. **ID/minor-PII handling + background-check FCRA compliance** — retention limits, breach obligations, consent + adverse-action process.
7. **Insurance program** — coverages, limits, whether platform-carried or worker-required.
8. **Working papers (14–17)** — whether/how they apply to independent operators; 2027 NYSDOL transition.

---

## 14. Risk register (top items)

| Risk | Severity | Mitigation |
|---|---|---|
| Minor harmed on a job | Critical | Client background checks, in-app comms, live location, SOS, guardian visibility, trust tiers, insurance |
| Misclassification / child-labor violation | Critical | Counsel opinion, "no control" design, marketplace-not-employer agreements, age-gating engine |
| Over-reliance on waivers that fail | High | Insurance as primary backstop (§7.3); honest framing in §0.2 |
| ID/PII breach (minor documents) | High | Minimize, encrypt, restrict, purge; verifier holds raw docs |
| Cash-payment disputes (no platform payment record) | Medium | In-app "I paid" confirmation + check-in/out log + messages as evidence; no held funds means no escrow backstop — set that expectation clearly in the UX |
| Platform drifting into "control" | Medium | Enforce §0.1: no price-setting, no job assignment, no supervision |
| Off-platform circumvention | Medium | In-app-only comms + pay; on-platform incentives |
| Multi-state assumptions leaking in | Medium | NY-only rule pack in config; gate expansion behind per-state packs |

---

*Working title `Hustl` is a placeholder — alternatives: `Nabor`, `SideKick`, `Odd`, `Chore`. Nothing in the build depends on the name.*
