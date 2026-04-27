# Regelgeving Nieuwsbrief

Gepersonaliseerde wekelijkse nieuwsbrief over wetswijzigingen en juridische uitspraken, gegenereerd met Claude AI op basis van officiële overheidsbronnen.

## Hoe het werkt

1. Iemand meldt zich aan via `/inschrijven` en vult vakgebied, organisatie en frequentie in
2. De app bepaalt automatisch welke officiële bronnen (RSS-feeds) relevant zijn
3. Elke maandag om 08:00 haalt de cron job de publicaties van de afgelopen week op
4. Claude leest de bronnen, filtert wat relevant is en schrijft een gepersonaliseerde nieuwsbrief
5. De mail wordt verstuurd via Resend, met een link naar `/voorkeuren?token=...`
6. Via die link kan iemand zijn voorkeuren aanpassen of zich uitschrijven

## Setup

### 1. Installeer dependencies

```bash
npm install
```

### 2. Maak accounts aan

- **Supabase**: supabase.com — gratis tier volstaat
- **Resend**: resend.com — gratis tot 3.000 mails/maand
- **Vercel**: vercel.com — gratis tier volstaat
- **Anthropic API**: console.anthropic.com

### 3. Database instellen

Ga naar Supabase > SQL Editor en plak de inhoud van `supabase/schema.sql`.

### 4. Environment variables

Kopieer `.env.example` naar `.env.local` en vul de waarden in.

Voeg dezelfde variabelen toe in Vercel > Settings > Environment Variables.

### 5. Deploy

```bash
git init && git add . && git commit -m "init"
# Verbind met GitHub en importeer in Vercel
```

De cron job draait automatisch elke maandag om 08:00 (UTC).

## Projectstructuur

```
app/
  inschrijven/page.tsx      — aanmeldpagina
  voorkeuren/page.tsx       — voorkeurenbeheer (via token uit mail)
  api/
    subscribers/route.ts           — POST: aanmelden
    subscribers/[token]/route.ts   — GET/PATCH: profiel ophalen/updaten
    send-newsletter/route.ts       — GET: cron job verstuurt mails

lib/
  supabase.ts     — database client
  sources.ts      — bronnen per vakgebied + Claude-fallback voor onbekende vakgebieden
  fetcher.ts      — RSS feeds ophalen en parsen
  generator.ts    — Claude genereert nieuwsbrief HTML vanuit artikelen + profiel

supabase/
  schema.sql      — database tabellen

vercel.json       — cron job configuratie (elke maandag 08:00)
```

## Kosten (schatting voor 10 ontvangers)

| Dienst | Kosten |
|--------|--------|
| Supabase | Gratis |
| Vercel | Gratis |
| Resend | Gratis (< 3.000 mails/mnd) |
| Anthropic API | ~€0,50–1,00/mnd |
| **Totaal** | **< €1/mnd** |
