# SkyTrack AAOS — Build Plan

A production-grade aviation command center with live fleet ops, MRO, crew, disruption recovery, routing, and cargo modules — wired end-to-end to Lovable Cloud (Postgres + Realtime + Auth).

## Stack note
Project template is **TanStack Start** (file-based routing in `src/routes/`), not Vite + React Router. I'll keep the spec's intent and folder layout for `lib/`, `stores/`, `components/`, `modules/`, but routes live as `src/routes/fleet.tsx`, `src/routes/mro.tsx`, etc., under an `_authenticated` layout. Everything else (Tailwind, Supabase JS, React Query, Recharts, Lucide, Zustand, react-leaflet, date-fns) maps 1:1.

## 1. Backend (Lovable Cloud)
Enable Cloud, then migrations for:
- Enums: `aircraft_status`, `crew_status`, `cargo_status`, `work_order_status`, `app_role`
- Tables: `aircraft`, `crew`, `flights`, `maintenance`, `cargo`, `alerts`, `user_roles` (separate role table — never on profiles)
- RLS on every table; `has_role()` security-definer function for admin/dispatcher/crew/maintenance gating
- Realtime publication on `aircraft`, `alerts`, `flights`, `crew`
- Seed: 8 aircraft (incl. one AOG `5Y-KQA`), 15 crew, 6 flights, 4 cargo, 3 work orders — East African ops (HKJK/HKNW/HTDA/HAAB/HRYR/HUEN/HSSS/FZAA)

## 2. Design System ("Simplicity is Luxury")
- `src/styles.css`: full token set (`--bg-void`, `--accent-primary`, status colors, etc.) as oklch where feasible; fonts via Google import (Rajdhani, JetBrains Mono, DM Sans)
- Tactical grid overlay on body via repeating-linear-gradient
- Tailwind v4 `@theme inline` mappings so `bg-void`, `text-accent`, `border-subtle`, `font-display`, `font-mono` all work as utilities
- Custom button variants (`primary` outline+glow, `destructive`, `ghost`) — no rounded-full, all `rounded-sm`, transitions 200ms

## 3. Layout Shell
- `_authenticated.tsx` route guard → redirects to `/login` if no session
- `Shell.tsx`: CSS grid sidebar/main, grid-overlay bg
- `Sidebar.tsx`: SKY//TRACK logo + pulse dot, 8 nav items (Lucide), collapsible
- `TopBar.tsx`: breadcrumb + `CommandInput` + live UTC clock + alert bell w/ unread badge
- `StatusStrip.tsx`: bottom bar w/ version, UTC, alert count, supabase status

## 4. Event Engine + Stores
- `lib/supabase.ts` — uses generated client
- `stores/alertStore.ts` — Zustand: alerts[], unreadCount, push/ack
- `stores/fleetStore.ts` — filters, selected aircraft, panel open state
- `lib/eventEngine.ts` + `useEventEngine()` — subscribes to `aircraft` + `flights` realtime channels; on `status→AOG` runs the full cascade (auto WO, fatigue-hold crew, delay cargo, broadcast alert); on `health_score<10` predictive WO; on flight delayed cargo notify
- `declareAOG(aircraftId)` exported for UI buttons
- `AlertToast.tsx` listens to alertStore and renders critical red banner

## 5. Modules (each wired to live Supabase data via React Query)
1. **Fleet** (`/fleet`): KPI strip, sortable table w/ AOG row tint+pulse, slide-in `AircraftDetailPanel` with health sparkline, work orders, crew, cargo, [DECLARE AOG] action
2. **MRO** (`/mro`): horizontal health bar chart w/ 80% target line, RUL area chart using `health(t) = h * e^(-0.002·Δhrs)` w/ critical threshold marker, parts-at-risk list, work orders table w/ priority badges + filter tabs
3. **Crew** (`/crew`): card grid, SVG arc duty-time gauge, fatigue-hold styling, `CrewMatcher` running the 6-step scoring algorithm and writing `current_assignment`
4. **Disruption** (`/disruption`): live alerts feed (realtime), recovery panel with 3 hardcoded route alternatives (Direct / alt-waypoint / altitude-optimized), compensation generator (KES tiers) w/ downloadable letters
5. **Routing** (`/routing`): react-leaflet + CartoDB Dark Matter, 8 airport markers, animated dashed flight polylines, interpolated aircraft dots, AOG pulsing red marker; side `FuelSimulator` w/ breakdown table + scatter chart
6. **Cargo** (`/cargo`): KPI strip + table with special-handling tags + delayed row tint
7. **Command Center** (`/`): summary tiles aggregating all modules

## 6. Auth + Roles
- `/login` page styled per spec, email+password
- Roles stored in `user_roles` table (admin/dispatcher/crew/maintenance)
- `useUserRole()` hook gates sidebar items + module access
- Auto-create default `dispatcher` role on signup

## 7. Command Input NL Parser
`parseCommand()` — keyword + regex (`/5Y-[A-Z]{3}/i`) → `{action, target, params}` dispatched to router + `fleetStore`

## 8. Scalability stubs
`lib/aiBackend.ts` — `callPredictionEngine`, `callRouteOptimizer`, `callCrewOptimizer` returning mocks but shaped for FastAPI swap

## Build sequence
Cloud + schema + seed → design tokens → shell/sidebar/topbar/statusstrip → stores + event engine + toast → Fleet → MRO → Crew → Disruption → Routing → Cargo → Login + role guards → CommandInput → aiBackend stubs.

## Technical notes
- TanStack Start routes; `_authenticated` layout for guards; `__root.tsx` wraps QueryClientProvider + Toaster + `useEventEngine()`
- Realtime channels created once in event engine; cleaned on unmount
- All status colors driven by tokens; no hard-coded hex in components
- Recharts theming via CSS vars passed as `stroke`/`fill`
- Leaflet CSS imported in routing route only

Ready to build on approval.