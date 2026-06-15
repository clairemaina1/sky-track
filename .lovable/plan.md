# SkyTrack — Super-Admin Lockdown, Categories, Approvals & Logbook

Big architectural pass. Four interlocking pieces — best to land together so RLS stays consistent.

## 1. Super-admin (only you)

- New `app_role` value: `super_admin`. Hardcoded email in a migration seed grants it to your account on first sign-in (trigger on `auth.users` matches the email → inserts into `user_roles`).
- **What email should I hardcode?** Need that before I run the migration.
- Helper: `public.is_super_admin(uid) → bool` (SECURITY DEFINER). Used in every RLS policy as an unconditional bypass so you see everything across every org and every category.
- A `/superadmin` route, hidden from everyone else, shows: all orgs, all users, all pending approvals, cross-org KPIs.

## 2. Sign-up & invitations

- Public sign-up stays **enabled** but every new `auth.users` row triggers a row in `public.pending_users` with `status='pending'`, no org, no role. They land on a "Waiting for approval" screen — zero data access (RLS denies everything until approved).
- Two approval paths:
  - You (super_admin) approve from `/superadmin` → assign org(s), category access, and role. Role is **permanent**; only you can change it afterwards (RLS on `user_roles` UPDATE/DELETE = super_admin only).
  - You can also send invites directly (`invitations` table already exists) with org + category + role pre-baked.
- Org admins can request to add a user, but the request goes to your queue — they cannot finalise role assignment.

## 3. Categories (multi-category orgs)

- New table `categories` with fixed rows: `flight_school`, `icao`, `airline`, `cargo`.
- New table `organization_categories(org_id, category_id, brand_label)` — an org can hold any subset. `brand_label` lets each show as e.g. "SkyTrack Cargo".
- New table `user_category_access(user_id, org_id, category_id)` — gates which categories a member sees. RLS on every domain table adds a category check (e.g. `flights` rows tagged with `category`; users only read rows whose category is in their access set).
- Top bar gets a **category switcher** (only categories the user has access to). The whole shell rebrands: logo wordmark, nav manifest, accent color all swap per category. One org with multiple categories = one switcher; single-category orgs = no switcher, name is fixed.
- `tierGuard.ts` is replaced by `categoryGuard.ts` with the four categories driving nav visibility. Existing `tier` column on `organizations` is kept for back-compat but no longer drives UI.
- **Cross-tenant isolation:** every domain table already has `org_id` + RLS. I'll add a category column where missing (`flights`, `aircraft`, `cargo`, `maintenance`, etc.) and extend policies so a user can only read rows in `(their org) AND (a category they have access to)`. Super_admin bypasses both.

## 4. Approval workflow (everything by default)

- New columns on every user-writable table: `approval_status` ('pending'|'approved'|'rejected'), `approved_by`, `approved_at`, `created_by`.
- RLS SELECT policy changes: non-admins see `approved` rows + their own pending rows. Org admins / higher roles see all pending in their org. Super_admin sees everything.
- INSERT defaults `approval_status='pending'` unless the inserter is admin/super_admin (their inserts auto-approve).
- A single `/approvals` inbox per role:
  - Super_admin: every pending row, every org.
  - Org admin: pending rows in their org.
  - Higher-role-than-creator: pending rows from their subordinates (e.g. instructor approves student's logbook entry).
- Approval/reject is one click → flips status, stamps `approved_by`.

## 5. Pilot Logbook (Flight School category)

- New table `pilot_logbook_entries`: date, aircraft_id, pic/sic, departure, arrival, route, total_time, day/night, IFR/VFR, sim time, instructor sign-off, remarks. Tied to org + flight_school category + user_id + `approval_status`.
- New dashboard widget on Command (when active category = flight_school) showing recent entries + totals (last 30d, last 90d, total PIC, total night, etc.).
- New route `/logbook` (flight_school only): table with inline editing (reuses `EditableCell`), "Add Entry" dialog, PDF export of last N entries.
- Entries are pending until an instructor or admin signs them off.

## Technical Plan

**Migrations (single batch, in order):**
1. Add `super_admin` enum + hardcoded-email seed trigger + `is_super_admin()` helper.
2. `categories`, `organization_categories`, `user_category_access` tables + GRANTs + RLS.
3. `pending_users` table + trigger on `auth.users` insert.
4. Add `category_id`, `approval_status`, `approved_by`, `approved_at`, `created_by` to domain tables; backfill existing rows as `approved` so nothing disappears.
5. Replace all existing RLS policies on domain tables with the new (org + category + approval + super_admin bypass) versions.
6. `pilot_logbook_entries` table + RLS.
7. Lock `user_roles` mutations to super_admin only.

**Code:**
- `src/lib/categoryGuard.ts` (replaces `tierGuard.ts` — old file deleted).
- `src/hooks/use-category.ts` (current category + switcher).
- `src/components/layout/CategorySwitcher.tsx` in TopBar.
- `src/components/layout/Shell.tsx`, `Sidebar.tsx`, `SkytrackLogo.tsx`: brand per category.
- `src/routes/_authenticated/superadmin.tsx` (gated to super_admin).
- `src/routes/_authenticated/approvals.tsx`.
- `src/routes/_authenticated/logbook.tsx` + dashboard widget.
- `src/routes/_authenticated/pending.tsx` (the "waiting for approval" screen — `_authenticated/route.tsx` redirects here when the user has no approved access).
- Updates to `_authenticated/route.tsx` gate to check approval status.

## What I need from you

1. **Your email** for the super_admin seed (will be hardcoded in the migration).
2. Confirm the four category brand labels exactly: "SkyTrack Flight Schools", "SkyTrack ICAO", "SkyTrack Airlines", "SkyTrack Cargo" — or your preferred wording.

Reply with those two and I'll run the migrations and ship the code in one pass.
