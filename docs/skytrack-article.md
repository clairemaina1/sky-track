# SkyTrack: The Kenyan-Built Software Trying to Fix Aviation's $30-Billion Delay Problem

Every day, roughly 30% of the world's commercial flights leave the gate late. The cost — in fuel, missed connections, crew fatigue and regulatory fines — has been estimated at more than **$30 billion a year**. Most of those delays aren't caused by weather or mechanical failure. They're caused by *software*: pilots reassigned by WhatsApp, maintenance logged in Excel, and compliance filed in PDF binders.

**SkyTrack** wants to end that. Built as a browser-native, multi-tenant operations platform for airlines, flight schools, cargo carriers and civil aviation regulators, it collapses roster management, live aircraft tracking, predictive maintenance, carbon reporting, and crew allocation into a single tenant-isolated app that any operator can be running in under a day.

## One codebase, four products

SkyTrack ships as four distinct experiences from the same core:

- **SkyTrack Flight Schools** — digital pilot logbooks, credential audits, aircraft utilisation for training fleets.
- **SkyTrack Airlines** — dual-layer crew allocation, disruption recovery, fuel-burn intelligence.
- **SkyTrack Cargo** — shipment tracking, delay notifications, weight-based utilisation.
- **SkyTrack ICAO** — regulator dashboards with cross-operator visibility and CORSIA-ready exports.

Each tenant sees only its own data, but the platform runs on one codebase, so features shipped to one segment reach the others in the same release cycle.

## The pilot magic moment

The clearest example of what SkyTrack does differently is the moment a dispatcher offers a flight to a pilot. On competing platforms, the pilot receives a text message or an email. On SkyTrack, their phone buzzes with a **Web Push notification containing a live countdown** — set per-airline by the ops manager. Accept, decline, or the offer auto-cascades to the next qualified pilot who's still legal on flight duty time. Every step is written to a hash-chained audit log that a regulator can verify hasn't been tampered with.

That single loop — offer, countdown, cascade, audit — replaces about six phone calls and two spreadsheets in a typical airline.

## Compliance without theatre

CORSIA (the international CO₂ scheme for aviation) turns compliance into a quarterly nightmare for small operators. SkyTrack computes emissions per flight, rolls them up per aircraft and per month, and produces a single CSV that satisfies the ICAO template in one click. The signed audit-log export closes the SOC 2 and ISO 27001 loop for operators pursuing enterprise contracts.

## An open ecosystem

SkyTrack ships a **public REST API with an OpenAPI spec** so airlines can pipe their existing ERP into it, and a **Model Context Protocol server** so AI agents can safely read and write to the platform on behalf of a user — with row-level security still enforced. There's a **cross-operator marketplace** for wet-leases, charter and contract crew, gated so private commercial data never leaks between tenants.

## Built for the market nobody serves

The incumbents in aviation software — Sabre, Jeppesen, NAVBLUE, AIMS — were priced and designed for major carriers. A six-aircraft flight school in Nairobi or a twelve-tail cargo operator in Lagos cannot afford them, so they run on spreadsheets. SkyTrack is priced per-tail and designed for exactly that operator, with a codebase that scales up to legacy carriers as it grows.

## Why now

Three forces converge in 2026: **regulatory pressure** (CORSIA mandatory in more countries every year), **cheap AI compute** (a $2 LLM call can now do what a $200-an-hour dispatcher does in five minutes), and the **African and MENA aviation boom** (fleets projected to double by 2035). SkyTrack is the operating system for that decade.

If it works, the safest, greenest, and most audited flights in the world in ten years may well be the ones flown by operators most people have never heard of — routed, crewed, maintained and reported by software built out of Nairobi.
