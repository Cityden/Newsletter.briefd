# Migratie naar agent-architectuur — wat is er veranderd

Gebaseerd op `brieft-ai-agent-plan.md`, domein 1 (Content & redactie) + sectie 2b
(betrouwbaarheidslaag). Dit is fase 1 uit de fasering (sectie 7): de content-kern
plus de fact-check-laag, vóór klantenservice/marketing/facturatie-automatisering.

## Wat is nieuw

- **`lib/agents/`** — vijf losse agent-modules i.p.v. één grote functie:
  - `scout.ts` — ongewijzigde logica (wrapt `fetchArtikelen`), nu met logging
  - `classificatie.ts` — **nieuw**: goedkope/snelle relevantiescoring per artikel,
    vóór de dure redactie-stap. Voorheen deed de redactie-prompt selectie én
    schrijven in één call.
  - `redactie.ts` — schrijft nu alleen nog, op basis van wat classificatie al
    heeft goedgekeurd. Strengere prompt: nooit een cijfer verzinnen dat niet
    letterlijk in de bron staat.
  - `kwaliteitscontrole.ts` — **volledig nieuw**. Bestond nog nergens. Dit is de
    fact-check-agent uit sectie 2b: legt elke samenvatting naast de brontekst en
    keurt af bij afwijking. Bij twijfel of een technische fout: **afkeuren**, niet
    doorlaten. Dit is de grootste kwaliteitsverbetering t.o.v. de oude flow.
  - `personalisatie.ts` — bouwt de HTML en verstuurt, alleen voor
    QC-goedgekeurde items.
- **`lib/agents/logging.ts`** + **`agent_runs` tabel** (toegevoegd aan
  `schema.sql`, niet-destructief) — audit trail per agent-run: welke agent,
  welke input, gelukt/mislukt/geëscaleerd, met reden. Basis voor de
  watchdog-agent uit fase 3.
- **`app/api/send-newsletter/route.agents.ts`** — nieuwe orchestratie die de vijf
  agents na elkaar aanroept. Draait **nog niet** live: hernoem pas naar
  `route.ts` (en verwijder/backup de oude) zodra je hebt getest.

## Wat is bewust ongewijzigd gelaten

- `fetcher.ts`, `sources.ts` — scout-logica werkt prima, geen aanleiding om te
  herschrijven.
- `buildHTML()` en de i18n-helpers in `generator.ts` — puur rendering, geen
  agent-logica. Hergebruikt door `personalisatie.ts` (nu `export`).
- De oude `route.ts` en `genereerNieuwsbrief()` blijven intact als fallback
  tijdens de overgang.

## Kostenkanttekening — belangrijk voor het businessplan

De kwaliteitscontrole-agent doet **één Claude-call per item**, niet gebatcht.
Bij bijv. 4 items per nieuwsbrief is dat 4 extra calls bovenop classificatie (1)
en redactie (1) = 6 Claude-calls per verzonden nieuwsbrief, i.p.v. de huidige 1.
Dat is een reële kostenstijging per verstuurde mail — zie het businessplan voor
de concrete impact op de unit economics. Batchen van de fact-check (meerdere
items in één call) is de voor de hand liggende volgende optimalisatie zodra
volume dat rechtvaardigt, maar gaat ten koste van de striktheid van de check per
item — bewuste trade-off, niet nu al doorvoeren.

## Update — vier extra agents (fase 2/3 uit de fasering, vervroegd)

Op verzoek zijn vier agents toegevoegd die geen van alle nieuwe externe diensten
nodig hebben (geen Resend Inbound, geen Moneybird-koppeling) — daarom kon dit
al vóór klantenservice/facturatie uit de oorspronkelijke fasering.

- **`lib/agents/watchdog.ts`** — leest dagelijks `agent_runs` en mailt **alleen**
  bij problemen, inclusief een "stille cron"-detectie (geen enkele run in 8
  dagen = de cron draait waarschijnlijk niet). Dit is de belangrijkste
  toevoeging: `agent_runs` werd al beschreven door alle content-agents, maar
  nooit gelezen — je moest zelf inloggen op `/admin` om iets te zien.
- **`lib/agents/herziening.ts`** — controleert periodiek eerder gepubliceerde
  items opnieuw tegen de bron (wetsvoorstel uitgesteld, uitspraak herzien).
  Vergelijkt tegen de **ruwe** brontekst van vóór de redactie-agent, niet tegen
  de herschreven nieuwsbriefzin, om vals-positieve "wijzigingen" te voorkomen.
  Nieuwe tabel: `gepubliceerde_items`. Registratie gebeurt vanuit
  `route.agents.ts`, ná een bevestigd succesvolle verzending.
- **`lib/agents/groeirapport.ts`** — maandelijks rapport: aanmeldingen,
  opzeggingen, vakgebied-verdeling. Bewust **geen** "meest gelezen" beweerd —
  dat vereist open-tracking via een Resend-webhook die er nog niet is.
- **`lib/agents/onboarding.ts`** — dag-3 vervolgmail. De bestaande
  bevestigingsmail bij aanmelding was al mail 1 van de reeks; dit is mail 2.

**Gedeeld:** `lib/agents/alert.ts` bevat nu de mail-shell voor zowel
probleemmeldingen (`stuurAlertMail`) als het maandrapport (`stuurRapportMail`)
— voorheen zat dit alleen lokaal in `route.agents.ts`.

**Schema:** `agent_runs.agent`-check uitgebreid met de vier nieuwe namen,
`subscribers.opgezegd_op` en `subscribers.onboarding_stap` toegevoegd, plus de
nieuwe `gepubliceerde_items`-tabel. Alle wijzigingen zijn additief.

**Cron:** vier nieuwe regels in `vercel.json` (watchdog dagelijks, onboarding
dagelijks, herziening wekelijks op woensdag, groeirapport maandelijks op de 1e).
Vercel Hobby staat maximaal 2 cron-jobs toe — dit was al reden om voor Pro te
kiezen in het businessplan, dus geen extra kostenpost.

**Nog steeds bewust overgeslagen:** klantenservice (triage/FAQ) en
facturatie-automatisering — die hebben Resend Inbound respectievelijk
KVK/Moneybird nodig, wat er nog niet is.

## Volgende stappen (niet in deze levering)

- Testen via `/api/test-newsletter` met een testabonnee vóór je `route.agents.ts`
  live zet.
- Fase 2 (klantenservice-basis: triage + FAQ als concept) en fase 3
  (backoffice: watchdog-agent bovenop `agent_runs`) volgen pas hierna, conform
  de fasering in het automatiseringsplan.
