# SkyTrack — Rewiring the Operating System of Global Aviation

> A white paper on the operational, financial and regulatory failures inside the modern aviation stack — and how SkyTrack, a multi-tenant aviation operations platform, closes them.

---

## Part I — What is actually broken in aviation today

Aviation runs the world's most complex physical logistics network, but the software behind it is stuck in the 1990s. Below is a full inventory of the problems SkyTrack was designed to solve, grouped by function.

### 1. Flight delays are compounding, not shrinking
- The average commercial delay in 2025 costs an airline **~$101/minute**, and 30% of all delays are avoidable — caused by late crew, unnotified weather, or missing paperwork rather than mechanical failure.
- Airlines still use email, WhatsApp and phone calls to reassign a crew after a disruption. The median recovery time for a single AOG (Aircraft-on-Ground) event is **4–7 hours**.
- Delay reasons are logged **after** the flight, not predicted before it — so the same pattern repeats every week.

### 2. Aircraft utilisation is a black box
- Most operators cannot answer "what is the block-hour cost of tail 5Y-KZE this month?" without an accountant, a spreadsheet, and 48 hours.
- Fuel burn variance versus the OFP (Operational Flight Plan) is only reconciled monthly. By then the money is gone.
- Maintenance schedules are driven by calendar dates, not by real health data — leading to either over-servicing (wasted money) or under-servicing (AOGs).

### 3. Crew management is chaos wrapped in a spreadsheet
- Pilot rosters are built in Excel and Google Sheets. FDP (Flight Duty Period) limits are checked manually.
- Crew are informed of flight assignments by SMS and WhatsApp with no acceptance countdown, no auto-cascade to a backup, and no audit trail — a regulator's nightmare.
- Cabin crew allocation and flight-deck allocation live in two different systems that don't talk.

### 4. Compliance is expensive theatre
- CORSIA CO₂ reporting requires airlines to hand-compile flight-by-flight fuel data every quarter. Small operators spend **weeks** on it.
- ICAO Annex 6 evidence (crew credentials, maintenance releases, weight & balance) is scattered across PDFs on shared drives.
- Regulator audits still involve physical binders in 2026.

### 5. Cross-operator ecosystem is closed
- When an airline has a spare aircraft or a broken schedule they need to sub-charter, they call three friends. There is **no functioning marketplace** for wet-lease, charter or contract crew.
- ADS-B data is available for free from open networks, but almost no operator actually maps it against their own registered fleet — so "dark" tails go unnoticed for hours.

### 6. Flight schools and micro-operators are ignored by the industry
- Existing platforms (Sabre, Jeppesen, AIMS, NAVBLUE) are priced for major airlines. A 6-aircraft flight school in Nairobi or a 12-tail cargo operator in Lagos cannot afford them.
- These smaller operators are forced back onto spreadsheets and paper logbooks — with predictable safety and compliance consequences.

### 7. The data never leaves the airline
- Airlines sit on huge quantities of operational data (fuel, delay codes, health scores) that could train predictive models. But because every system is siloed and on-premise, none of it ever becomes intelligence.

---

## Part II — How SkyTrack solves each problem, function by function

SkyTrack is a **single, multi-tenant, browser-native aviation operations platform**. Every operator — airline, flight school, ICAO regulator, cargo carrier — lives inside their own tenant with row-level isolation, but shares a common intelligence layer.

### Against #1 — Delay mitigation
- **Weather-aware delay predictor** flags every flight departing in the next 3 hours against real METAR / TAF conditions and highlights the ones likely to slip.
- **Disruption Recovery Assistant** (AI, tenant-scoped): describe an event in plain English ("KQ312 diverted to Entebbe"), receive a ranked recovery plan — aircraft swap, crew reassignment, passenger rebook — in seconds.
- **Push-notification crew acceptance loop**: when ops offers a pilot a flight, the pilot's phone buzzes with a countdown they set per-airline. If the pilot declines or the timer expires, SkyTrack auto-cascades to the next qualified pilot within the FDP limit.

### Against #2 — Asset utilisation
- **Fuel-burn heatmap** compares actual kg/block-hour to OFP-planned burn per tail, per route, per month.
- **Predictive Maintenance dashboard** scores every tail 0–100 based on airframe hours, cycles, open work orders and event history — with explainable drivers ("high airframe hours + 3 open MEL items").
- **What-If Simulator** models the financial impact of an AOG before you commit to a recovery plan.

### Against #3 — Crew chaos
- **Dual-layer allocation**: pilots get a *Command Choice* portal (accept / decline / countdown); cabin crew are auto-dispatched by the system.
- **FDP enforcement** hard-blocks any assignment that would bust EASA/ICAO duty limits, with a plain-English "why not."
- **Digital logbook** — pilots log flights on their phone; hours flow straight into duty checks and credential audits.
- **Credential auditing** flags any pilot whose licence, medical or type rating expires in the next 7 / 30 / 90 days.

### Against #4 — Compliance
- **One-click regulator export** to CSV covering CORSIA CO₂, ICAO Annex 6, maintenance releases and fleet registers — RLS-scoped so an operator can only export their own data.
- **Signed, hash-chained audit log** — every mutation in SkyTrack is hashed with the previous state (Merkle-style) and the final export is HMAC-signed. Auditors get **provably tamper-evident** evidence, not a PDF.
- **Automated retention & DPA** — data residency selector and downloadable DPA cover GDPR and Kenya's DPA 2019.

### Against #5 — Cross-operator ecosystem
- **Marketplace**: any tenant can post a wet-lease, dry-lease, ad-hoc charter or contract-crew listing. Cross-tenant discovery is by design; contact details are gated behind a "reveal contact" flow so private commercial data never leaks.
- **Real ADS-B match rate dashboard** — SkyTrack pulls open ADS-B feeds and matches Mode-S hex codes against each tenant's registered fleet, so operators see instantly which tails are being tracked live and which are "dark."

### Against #6 — Flight schools and micro-operators
- **Category-segmented UI**: SkyTrack Flight Schools, SkyTrack Airlines, SkyTrack Cargo and SkyTrack ICAO each show only the modules relevant to that operator — same codebase, four products.
- **CSV importer** onboards a fleet, crew and 90-day schedule in **under 15 minutes**.
- **Priced-per-tail** so a 6-aircraft school pays what a 6-aircraft school can afford.

### Against #7 — Data trapped in silos
- **Public API + OpenAPI spec**: airlines can pipe their existing ERP, MRO or roster software into SkyTrack in an afternoon.
- **MCP (Model Context Protocol) server** exposes read/write tools to AI agents. An airline's own AI can now query their fleet, offer flights, or file work orders through SkyTrack — with full RLS and per-user authorisation.
- **Tenant-scoped SkyTrack Copilot** — every user gets a chatbot that can only see their own organisation's data, filtered by their role. A pilot can ask "what's my next flight and duty balance?"; a dispatcher can ask "how many aircraft are AOG?"; the super-admin sees the aggregate view.

---

## Part III — Why now

Three tailwinds make SkyTrack timely rather than early:

1. **Regulatory pressure** — CORSIA becomes mandatory in more jurisdictions each year; small operators are running out of runway for spreadsheet compliance.
2. **AI + cheap compute** — LLM tool-calling makes it possible to give every pilot and dispatcher an intelligent copilot without hiring a data-science team.
3. **The African and MENA aviation boom** — fleets in Sub-Saharan Africa are projected to double by 2035, and none of the incumbents (Sabre, Jeppesen, NAVBLUE) are priced or localised for that market.

SkyTrack is built for that market first, with a codebase that scales up to the legacy carriers.

---

## Part IV — Architecture at a glance

- **Frontend**: TanStack Start (React 19, SSR/SSG), Tailwind v4, PWA-installable, works offline for the crew logbook.
- **Backend**: Supabase (Postgres 15 + Row-Level Security + Realtime), Cloudflare Workers for edge server functions.
- **AI layer**: Lovable AI Gateway (Gemini + GPT), tenant-scoped tool calling with MCP.
- **Push**: Web Push + VAPID + pg_net for sub-second in-database fanout.
- **Compliance**: Hash-chained audit log, HMAC-signed exports, data residency selector.

---

## Part V — Conclusion

Aviation software is where healthcare software was in 2010 — critical, expensive, siloed and stuck. SkyTrack rewires that stack for the operators who can least afford the incumbents but who fly the most safety-critical missions: flight schools, cargo carriers, regional airlines and regulators in emerging markets.

If we succeed, the global aviation network will be safer, greener, cheaper and — for the first time — **interoperable.**
