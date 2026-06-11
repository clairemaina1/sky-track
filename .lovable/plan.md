This is a large amount of work — roughly 2–3 weeks of build if done all at once. I'll ship it in **4 phases** so you can test each one before the next lands, and so we don't break what's already working. After you approve, I'll start Phase 1 immediately and pause at each phase boundary for you to verify.

## Phase 1 — Live data + AOG persistence (Critical #1 + #2)
The fastest, highest-impact wins. No schema changes, no auth changes.

- Replace hardcoded arrays in **Fleet, MRO, Crew, Cargo** with live Supabase queries (TanStack Query + server functions, RLS-scoped to the signed-in user).
- "Declare AOG" button → `UPDATE aircraft SET status='AOG'` + still fires the cascade (cargo notif + WO creation already in `eventEngine`).
- Realtime: pages refresh automatically when any row changes (already partly wired in `eventEngine`).
- Loading skeletons + empty states on every page.

## Phase 2 — Multi-tenancy / orgs (High #4)
This is the biggest structural change and unblocks onboarding + admin.

- New `organizations` table (id, name, tier: `commercial` | `flight_school`, created_by).
- New `organization_members` table (user_id, org_id, role).
- Add `org_id` to: `aircraft`, `crew`, `flights`, `maintenance`, `cargo`, `alerts`.
- Rewrite all RLS policies to scope by org membership (via security-definer `user_in_org()` function — no recursion).
- Backfill existing 8 aircraft into a "SkyTrack Demo" org so nothing disappears.
- Org switcher in the top bar (for users in multiple orgs).

## Phase 3 — Onboarding + Admin panel (Critical #3 + High #5)
Depends on Phase 2.

- **Onboarding wizard** after first signup: org name → tier (commercial / flight school) → add first aircraft (reg, type, base) → land on dashboard.
- **Admin panel** at `/admin` (gated by `admin` role): list members, invite by email, promote/demote roles (admin / dispatcher / maintenance / crew), remove members.
- Invites use signed tokens, no Supabase Auth Admin API exposure to client.

## Phase 4 — Polish (High #6, #7 + Nice-to-haves #8, #9, #10)
- Mobile sidebar: drawer below 768px, proper safe-area padding.
- Wire `/settings` toggles (notification prefs, default airport, units).
- Light theme + theme toggle (currently `--background` etc. are dark-locked — needs a light token set).
- EN/FR i18n with `react-i18next`, language toggle in top bar.
- PDF export (fleet snapshot, AOG compensation letter) via `pdf-lib`.
- Branded SkyTrack auth email templates (signup, magic link, recovery).

## Technical notes
- All server-side reads/writes use `createServerFn` + `requireSupabaseAuth` (per project conventions — no Edge Functions for app logic).
- All new public-schema tables get explicit `GRANT` + RLS in the same migration.
- Each phase ends with a working build; I'll verify before moving on.
- I won't touch the auto-generated Supabase client files or `_authenticated/route.tsx`.

## What I need from you
Just **"go"** to start Phase 1. I'll check in after each phase before continuing — if you want to skip something or change priority, that's the moment to say so.

(Custom domain `skytrack.com` is almost certainly taken — we'll search for available `skytrack.*` variants after publishing, separately from this work.)