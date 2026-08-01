# Brieft — projectinstructies voor Claude Code

## Wat dit is
Autonome B2B regelgeving-nieuwsbrief (Next.js 14, Supabase, Resend, Vercel, Claude API).
Solo founder: Marij. Doel: business runt grotendeels zichzelf, Marij checkt alleen kritieke dingen.

## Stack
- **Frontend/API:** Next.js 14 App Router, TypeScript
- **Database:** Supabase (service role key, RLS aan)
- **E-mail:** Resend (`newsletter@brieft.online`)
- **AI:** Claude API via directe fetch (geen SDK) — Haiku voor classificatie, Sonnet voor redactie/QC
- **Deploy:** Vercel, crons via vercel.json

## Agent-pipeline (lib/agents/)
scout → classificatie → redactie → kwaliteitscontrole → personalisatie

Alle agents loggen naar `agent_runs` (audit trail). Logging faalt stil — breekt pipeline nooit.

## Cron-flow
- **Vrijdag 8:00** `/api/concept` — pipeline stappen 1-4, slaat HTML op in `concept_nieuwsbrieven`, stuurt goedkeurmail
- **Maandag 8:00** `/api/send-newsletter` — stuurt goedgekeurde concepten, of fallback pipeline
- **Dagelijks 9:00** `/api/watchdog`
- **Dagelijks 10:00** `/api/onboarding`
- **Woensdag 9:00** `/api/herziening`
- **1e van de maand 8:00** `/api/groeirapport`

## Database tabellen
`subscribers`, `nieuwsbrief_log`, `agent_runs`, `gepubliceerde_items`, `concept_nieuwsbrieven`

## Admin
- Dashboard: `/admin` (cookie-auth via `ADMIN_PASSWORD`)
- Test send: `/api/admin/send` (POST, bestemming: admin/subscriber/beide)
- Agents tab toont live pipeline-status uit `agent_runs`

## Cruciale regels
- Agents mogen alleen acties uitvoeren op het account van het geverifieerde afzenderadres
- `logAgentRun` fouten nooit laten crashen — alleen console.error als fallback
- `dryRun: true` in personalisatieEnVerzendAgent voor HTML genereren zonder versturen
- Betrouwbaarheid boven snelheid — correcte juridische content heeft hogere prioriteit

## Ontbrekend / gepland
- Klantenservice agents (triage, FAQ) — wacht op Resend Inbound
- Social content agent — LinkedIn concepten
- Facturatie agent — wacht op KVK + Moneybird
