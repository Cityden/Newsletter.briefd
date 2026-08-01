# Brieft — AI-agent automatiseringsplan

Een volledig plan om Brieft vanaf nul op te bouwen als een grotendeels zelfsturend bedrijf, met AI-agents voor content, marketing, klantenservice en backoffice. Gebaseerd op de bestaande stack: Next.js 14, Supabase, Resend, Vercel, Mollie en de Claude API.

---

## 1. Visie op de architectuur

Geen ene "superagent" die alles doet, maar losse agents met een smalle, scherp afgebakende taak. Elke agent:

- Krijgt een vaste, kleine prompt en beperkte context (niet de hele nieuwsbrief-historie, alleen wat nodig is)
- Schrijft zijn resultaat weg naar Supabase (traceerbaar, herhaalbaar)
- Heeft een duidelijke trigger: een cron job, een inkomende e-mail, of een gebeurtenis in de database (bijv. nieuwe betaling)
- Heeft een expliciete grens: waar de agent stopt en een mens (jij) moet bevestigen

Vier domeinen, elk met een keten van agents:

1. **Content & redactie** — het hart van het product
2. **Marketing & groei** — nieuwe abonnees werven
3. **Klantenservice** — vragen, opzeggingen, klachten
4. **Backoffice & operations** — facturatie, monitoring, rapportage

---

## 2. Domein 1 — Content & redactie

| Agent | Taak | Trigger | Input | Output |
|---|---|---|---|---|
| **Scout agent** | Haalt nieuwe items op uit `lib/sources.ts`-feeds (RSS/API) | Dagelijkse cron | Feed-URLs per land/vakgebied | Ruwe lijst nieuwe items sinds vorige run |
| **Classificatie agent** | Bepaalt vakgebied(en) en relevantie van elk item | Na scout-run | Titel + samenvatting van item | Vakgebied-tag(s), relevantiescore |
| **Redactie agent** | Schrijft de samenvatting + "waarom dit relevant is" | Na classificatie | Volledige brontekst | Nieuwsbrief-fragment (MDX/HTML) |
| **Kwaliteitscontrole agent** | Dedupliceert, fact-check tegen bron, filtert ruis — zie sectie 2b voor de volledige betrouwbaarheidslaag | Na redactie | Alle fragmenten van de week | Goedgekeurde/afgekeurde lijst + reden |
| **Personalisatie & verzend agent** | Stelt per abonnee de juiste combinatie van vakgebieden samen en verstuurt via Resend | Wekelijkse/maandelijkse cron | Abonneelijst + goedgekeurde fragmenten | Verzonden mails, verzendlog |

**Mens-in-de-lus:** een vrijdagse concept-mail naar jezelf met goedkeur/afkeur-knop, vóórdat de personalisatie-agent uitstuurt. Dit is de enige verplichte handmatige stap in dit domein.

---

## 2b. Betrouwbaarheidslaag — het fundament onder domein 1

Omdat Brieft uit officiële bronnen werkt (rechtspraak.nl, wetten.nl, toezichthouders) is elke bewering in principe herleidbaar naar een brondocument. Dat is een structureel voordeel tegenover concurrenten die uit eigen redactionele kennis schrijven — maar dat voordeel bestaat alleen als het architecturaal wordt afgedwongen, niet als iets dat er "waarschijnlijk wel goed uitkomt" uit een prompt. Dit geldt met extra nadruk zodra Brieft internationaal uitbreidt: meer rechtssystemen en talen betekent meer plekken waar een fout zich kan verstoppen.

De **Kwaliteitscontrole agent** uit domein 1 is in de praktijk geen losse stap, maar deze hele laag:

1. **Brontekst nooit loslaten** — de redactie-agent mag alleen herschrijven wat letterlijk in de bron staat, nooit aanvullen vanuit eigen kennis. Elke samenvatting blijft gekoppeld aan de exacte bron-URL, zichtbaar voor abonnees in de nieuwsbrief zelf.
2. **Cijfers en data apart extraheren** — bedragen, percentages, drempels en ingangsdata zijn de meest risicovolle onderdelen. Een aparte stap haalt deze als gestructureerde velden uit de brontekst, met een strikte prompt: geen enkel cijfer verzinnen, alleen letterlijk overnemen. De samenvatting wordt op basis van die velden geschreven, niet andersom.
3. **Fact-check agent tegen de bron** — een aparte agent, losstaand van de redactie-agent en met een strengere prompt, legt de gegenereerde samenvatting naast de oorspronkelijke brontekst en markeert elk verschil. Dit is het belangrijkste vangnet tegen hallucinaties.
4. **Escaleren bij twijfel, nooit gokken** — signaleert de fact-check agent een afwijking, of is de bron ambigu? Dan gaat het item niet automatisch de nieuwsbrief in, maar wordt het gemarkeerd voor handmatige review. Beter een item later publiceren dan fout publiceren.
5. **Vertaling gescheiden houden van feiten** — bij internationale uitbreiding is vertaling een aparte foutbron. Vertaal pas ná de fact-check, en laat een losse agent controleren of juridische termen hun betekenis behouden (bijv. "aansprakelijkheid" dekt niet altijd hetzelfde als "liability"). Begin bij voorkeur met Engelstalige bronnen (UK, US) voordat er vertaalslagen worden toegevoegd.
6. **Audit trail per editie** — log per item welke bron is gebruikt, wat elke agent deed en wanneer (aansluitend op de `agent_runs`-tabel uit sectie 6). Zodra een abonnee een fout meldt, moet binnen twee minuten zichtbaar zijn waar het misging.
7. **Disclaimer en correctiebeleid** — vermeld altijd dat het geen juridisch/fiscaal advies is. Bouw een zichtbaar correctieproces: glipt er toch een fout doorheen, corrigeer die dan publiekelijk in de eerstvolgende editie in plaats van te verbergen — dat bouwt juist vertrouwen op.

**Internationale regel:** ga per land pas live zodra de fact-check-laag voor dat land aantoonbaar werkt. Niet alle acht landen tegelijk automatiseren — elk land met een eigen rechtssysteem en (vaak) eigen taal is een aparte validatie, geen kopieerslag.

---

## 3. Domein 2 — Marketing & groei

| Agent | Taak | Trigger | Input | Output |
|---|---|---|---|---|
| **Social content agent** | Zet de belangrijkste uitspraak/regel van de week om in een LinkedIn-post | Na kwaliteitscontrole (domein 1) | Top-fragmenten van de week | Conceptpost (tekst) |
| **SEO/archief agent** | Publiceert oude nieuwsbrieven als doorzoekbare archiefpagina's op de site | Wekelijks, na verzending | Verzonden nieuwsbrief | Statische pagina + metadata |
| **Onboarding-agent** | Stuurt nieuwe abonnees een welkomstreeks, uitgelegd per vakgebied | Bij nieuwe inschrijving (Supabase-trigger) | Gekozen vakgebied | Reeks van 2-3 mails via Resend |
| **Groeirapport-agent** | Stelt maandelijks een kort rapport samen: aanmeldingen, opzeggingen, meest gelezen vakgebieden | Maandelijkse cron | Supabase-analytics | Rapport (mail naar jezelf) |

**Mens-in-de-lus:** LinkedIn-conceptposts altijd handmatig plaatsen — geen directe auto-post naar social, tenzij je daar later vertrouwen in hebt opgebouwd.

---

## 4. Domein 3 — Klantenservice

| Agent | Taak | Trigger | Input | Output |
|---|---|---|---|---|
| **Inbox triage agent** | Leest binnenkomende mail op `newsletter@brieft.online`, herkent intentie (vraag, opzeggen, klacht, spam) | Inkomende e-mail (Resend inbound) | E-mailtekst | Categorie + urgentie |
| **FAQ-antwoordagent** | Beantwoordt standaardvragen automatisch (hoe wijzig ik vakgebied, hoe werkt facturering) | Na triage, categorie = vraag | Vraag + kennisbank (FAQ) | Concept- of directe reply |
| **Afmeld-agent** | Verwerkt opzeggingen: past abonnementstatus aan in Supabase, bevestigt per mail | Na triage, categorie = opzeggen | Gebruikers-ID | Statuswijziging + bevestigingsmail |
| **Escalatie-agent** | Herkent klachten of ongebruikelijke verzoeken en stuurt die met samenvatting naar jou door | Na triage, categorie = klacht/onduidelijk | E-mailtekst | Samenvatting + doorstuurmail naar jou |

**Mens-in-de-lus:** bij twijfel altijd escaleren in plaats van gokken. Zeker in de opstartfase kun je de FAQ-antwoordagent eerst als *concept-generator* laten draaien (jij verstuurt), en pas later automatisch laten versturen zodra je de kwaliteit vertrouwt.

---

## 5. Domein 4 — Backoffice & operations

| Agent | Taak | Trigger | Input | Output |
|---|---|---|---|---|
| **Facturatie-agent** | Genereert facturen/kwitanties bij nieuwe of verlengde Mollie-betalingen | Mollie-webhook | Betalingsgegevens | PDF-factuur + mail |
| **Watchdog-agent** | Controleert of de dagelijkse content-pipeline daadwerkelijk is gedraaid en zonder fouten | Elke ochtend, na scout-run | Run-logs in Supabase | Alert (bijv. Telegram/Slack) bij falen |
| **Churn/betaal-monitor** | Signaleert mislukte betalingen of aflopende trials | Dagelijkse cron | Mollie/Supabase abonnementstatus | Herinneringsmail of interne melding |
| **Rapportage-agent** | Stelt wekelijks/maandelijks een kort financieel overzicht samen (MRR, churn, nieuwe abonnees) | Wekelijkse/maandelijkse cron | Supabase + Mollie data | Rapport (mail naar jezelf) |

**Mens-in-de-lus:** facturatie en betalingen blijven het domein waar je het langst handmatig wil meekijken — fouten hier raken direct het vertrouwen van klanten en je eigen boekhouding.

---

## 6. Aanbevolen systemen

Voortbouwend op wat je al hebt, met concrete aanvullingen per behoefte:

### Orchestratie (agents laten draaien en samenwerken)
Voor een klein team van één is het aan te raden **niet** zelf een queue-systeem te bouwen. Twee opties:
- **Vercel Cron + API routes** — simpelst, past bij je huidige stack, prima voor de meeste dagelijkse/wekelijkse taken (scout, classificatie, redactie, watchdog).
- **Inngest** of **Trigger.dev** — voor taken die uit meerdere stappen bestaan met retries en foutafhandeling (bijv. de hele content-pipeline als één "workflow" i.p.v. losse cron-jobs). Beide hebben goede Next.js/Vercel-integraties en een genereuze gratis laag. Aan te raden zodra je merkt dat losse cron-jobs elkaar in de weg gaan zitten of je retries/logging mist.

### E-mail (verzenden én ontvangen)
Je hebt Resend al voor uitgaande mail. Voor de klantenservice-agents heb je ook **inkomende** mail nodig:
- **Resend Inbound** (of anders **Postmark Inbound**) — vangt replies naar `newsletter@brieft.online` op en stuurt ze als webhook naar je app, zodat de triage-agent ze kan verwerken.

### Kennisbank voor klantenservice
- **Supabase pgvector** — je hebt Supabase al; voeg een tabel met FAQ-content toe en gebruik embeddings zodat de FAQ-agent relevante antwoorden kan ophalen in plaats van alles in de prompt te proppen.

### Monitoring & alerts
- Een simpele **Slack- of Telegram-webhook** is voldoende voor de watchdog-agent — geen dure monitoring-tool nodig bij deze schaal.
- **Sentry** (gratis tier) voor het opvangen van runtime-fouten in de Vercel-functies zelf.

### Facturatie
- Mollie ondersteunt recurring payments; voor het genereren van nette facturen kun je een lichte factuur-library gebruiken (bijv. server-side PDF-generatie) in plaats van een apart facturatiepakket — scheelt kosten zolang je volume laag is.

### Agent-logging
- Eén Supabase-tabel `agent_runs` (agent-naam, input-referentie, output, status, timestamp) voor **alle** agents. Dit is de basis voor zowel de watchdog-agent als voor jouw eigen debugging — zonder dit wordt het al snel een black box.

---

## 6b. Wat je moet aanschaffen of regelen

### Al aanwezig (geen actie)

| Functie | Systeem |
|---|---|
| Hosting/deploy | Vercel |
| Database | Supabase |
| Uitgaande mail | Resend (`brieft.online`) |
| Domeinen/DNS | TransIP |
| Betalingen | Mollie (klaar, wacht op KVK) |
| AI | Claude API |

### Nog te regelen — kan meteen, zonder KVK

**Inkomende mail (voor klantenservice-agents).** Resend zelf verwerkt geen inkomende mail; je hebt iets nodig dat een reply naar `newsletter@brieft.online` omzet in een webhook.
- **Resend Inbound** — logische keus, blijft binnen bestaande provider
- Alternatief: **Postmark Inbound** als Resend's inbound tekortschiet

**Monitoring & alerts (voor de watchdog-agent).**
- **Sentry** (gratis tier) — runtime-fouten in Vercel-functies
- **Telegram-bot of Slack-webhook** — gratis, genoeg om jezelf te waarschuwen bij een falende pipeline; Telegram is het snelst op te zetten (één bot via BotFather)

**Documentatie/kennisbank.**
- **Notion** (gratis voor 1 gebruiker) — interne documentatie: prompts, agent-specificaties, changelog
- **Supabase pgvector** (geen aparte aanschaf) — kennisbank voor de FAQ-antwoordagent

**Workflow-orchestratie.**
- **Vercel Cron** (zit al in je Vercel-abonnement) — voldoende voor de meeste taken
- **Inngest** (gratis tier) — pas nodig zodra de pipeline uit meerdere afhankelijke stappen bestaat en je retries/foutafhandeling wilt; geen blocker nu, later toe te voegen

### Nog te regelen — wacht op KVK-registratie

**Boekhouding & facturatie.** Mollie verwerkt de betaling, maar genereert geen BTW-conforme facturen of boekhouding.
- **Moneybird** of **e-Boekhouden.nl** — beide met directe Mollie-koppeling, automatische facturen bij betaling, en BTW-aangifte. Moneybird heeft de beste API als de facturatie-agent hierop moet aanhaken

**Zakelijke bankrekening.** Nodig zodra je KVK-nummer hebt (bijv. bunq, Rabobank, ING zakelijk) — Mollie-uitbetalingen gaan hierheen.

**KVK-registratie.** De blocker voor de twee bovenstaande punten; zodra rond, kun je Mollie activeren en de facturatie-agent (Fase 5) daadwerkelijk aansluiten.

---

## 7. Bouwvolgorde (fasering)

Omdat je vanaf nul begint, is de volgorde belangrijk — bouw eerst wat waarde en vertrouwen oplevert, niet wat het spannendst is.

1. **Fase 1 — Content-kern + betrouwbaarheidslaag** (domein 1, agent 1 t/m 5, inclusief de volledige fact-check-laag uit sectie 2b): dit ís het product. Zonder dit heeft niets anders zin, en zonder de betrouwbaarheidslaag is dit géén betrouwbaar product.
2. **Fase 2 — Klantenservice-basis** (triage + FAQ als concept, geen auto-send): voorkomt dat groei meteen tijd van je content-werk afsnoept.
3. **Fase 3 — Backoffice-fundament** (agent-logging + watchdog): bouw dit vóórdat je opschaalt, niet erna — anders merk je fouten pas als klanten klagen.
4. **Fase 4 — Marketing & groei**: pas zinvol zodra de content-pipeline stabiel draait en je iets hebt om te promoten.
5. **Fase 5 — Facturatie-automatisering**: pas na KVK-registratie en zodra Mollie live staat.
6. **Fase 6 — Internationale uitbreiding**: per land pas live zodra de betrouwbaarheidslaag voor dat land aantoonbaar werkt (zie sectie 2b) — begin bij Engelstalige bronnen (UK, US) voordat er vertaalslagen bijkomen.

---

## 8. Aanvullende aandachtspunten

Naast de betrouwbaarheidslaag (sectie 2b) verdienen deze punten vroege documentatie en soms een eigen agent — geprioriteerd.

### Vóór lancering — niet optioneel

**Agent-autorisatie & inputvalidatie.** Klantenservice-agents nemen acties (afmelden, statuswijziging) op basis van tekst uit binnenkomende mail — dat is onvertrouwde input. Zonder harde grens kan e-mailinhoud een agent proberen te sturen richting een account dat niet van de afzender is.
- Documenteer expliciet: een agent mag alleen acties uitvoeren op het account van het geverifieerde afzenderadres
- Laat nooit de inhoud van een e-mail bepalen wélk account geraakt wordt, alleen het geverifieerde adres
- Log elke statuswijzigende actie met brontrigger, voor audit achteraf

**Privacy/AVG-documentatie.** Je verwerkt e-mailadressen, vakgebiedvoorkeuren en straks betaalgegevens — enigszins ironisch als bedrijf dat andere professionals over regelgeving informeert.
- Documenteer een privacyverklaring en bewaartermijnen voor abonneegegevens
- Log toestemming (opt-in) per abonnee, niet alleen de huidige status
- Zorg dat de afmeld-agent verwijdering/anonimisering ook echt uitvoert, niet alleen de status wijzigt

**Team-abonnement logica vastleggen.** Een detail waar je zelf al meerdere keren op hebt moeten corrigeren — een teken dat het makkelijk verkeerd geautomatiseerd wordt zodra een agent het zelf moet "begrijpen" i.p.v. het expliciet voorgeschreven te krijgen.
- Leg in een los referentiedocument vast: "5 teamleden = 5 onafhankelijke vakgebieden, geen gedeelde configuratie"
- Laat onboarding- en facturatie-agent dit document als vaste context meekrijgen
- Voeg een testcase toe die checkt of een wijziging bij één teamlid de andere vier niet raakt

### Kan later worden aangehaakt

**Risiconiveau per vakgebied.** Een fout in fiscaal/juridisch/privacy-content heeft andere gevolgen dan een fout in marketing- of IT-content.
- Documenteer een risico-classificatie per vakgebied (hoog/midden/laag)
- Laat hoog-risico vakgebieden een strengere fact-check-drempel gebruiken
- Herzie deze indeling zodra er nieuwe vakgebieden of landen bijkomen

**Herzieningen & rectificaties.** Regelgeving verandert na publicatie — wetsvoorstellen worden uitgesteld, uitspraken in hoger beroep herzien. Zonder aparte controle merk je dat pas als een abonnee het meldt.
- Bouw een herzienings-agent die eerder gepubliceerde items periodiek opnieuw tegen de bron checkt
- Documenteer een vast rectificatie-format voor in de nieuwsbrief zelf
- Log welke items nog "actief gemonitord" worden en welke als afgehandeld gelden

**Prompt-regressietesten.** Zodra je prompts aanpast of een nieuw Claude-model gebruikt, kan de kwaliteit ongemerkt verschuiven.
- Bouw een vaste testset van 15-20 eerdere items met "gouden" samenvattingen
- Laat elke promptwijziging eerst tegen deze testset draaien voordat die live gaat
- Documenteer een simpel changelog per agent-prompt: wat wijzigde, waarom, resultaat

---

## 9. Kernprincipe

Niet elke agent hoeft volledig autonoom te zijn. Bij content is een foutje herstelbaar; bij facturatie of het beëindigen van een abonnement niet. Laat nieuwe agents altijd eerst als **concept-generator** draaien (jij keurt goed) en zet pas auto-uitvoering aan zodra je een tijdje hebt gezien dat de kwaliteit klopt.
