-- Subscribers table
create table subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  naam text not null,
  vakgebied text not null,
  organisatie text not null check (organisatie in ('zzp', 'mkb', 'groot', 'overheid')),
  frequentie text not null check (frequentie in ('wekelijks', 'maandelijks')),
  actief boolean default true,
  token uuid default gen_random_uuid() unique not null, -- voor de voorkeurenlink in de mail
  land text default 'NL',                               -- landcode (ISO 3166-1 alpha-2), bepaalt bronnen en taal
  bronnen jsonb default '[]'::jsonb,                    -- opgeslagen bronnenlijst per profiel
  bronnen_gegenereerd_op timestamptz,
  aangemeld_op timestamptz default now(),
  laatste_mail_op timestamptz
);

-- Newsletter log
create table nieuwsbrief_log (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references subscribers(id) on delete cascade,
  verstuurd_op timestamptz default now(),
  onderwerp text,
  status text default 'verstuurd'
);

-- Enable RLS
alter table subscribers enable row level security;
alter table nieuwsbrief_log enable row level security;

-- Subscribers can read/update their own row via token (no auth needed)
create policy "token toegang" on subscribers
  for all using (true); -- API routes valideren het token zelf

-- Index for fast token lookups
create index on subscribers(token);
create index on subscribers(email);

-- Agent runs — audit trail voor de agent-architectuur (automatiseringsplan sectie 6/2b).
-- Eén tabel voor alle agents: scout, classificatie, redactie, kwaliteitscontrole, personalisatie.
-- Basis voor zowel de (nog te bouwen) watchdog-agent als handmatige debugging.
create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent text not null check (agent in ('scout', 'classificatie', 'redactie', 'kwaliteitscontrole', 'personalisatie')),
  input_ref text not null,          -- subscriber-id, artikel-url, of andere traceerbare referentie
  output jsonb,                     -- korte samenvatting van het resultaat (geen volledige content)
  status text not null check (status in ('gelukt', 'mislukt', 'geëscaleerd')),
  reden text,                       -- waarom mislukt/geëscaleerd — cruciaal voor de audit trail
  duration_ms integer,
  aangemaakt_op timestamptz default now()
);

alter table agent_runs enable row level security;

-- Alleen server-side (service role) mag hier in schrijven/lezen — geen publieke policy nodig
-- zolang de API routes met de service-role key werken zoals nu al het geval is.

create index on agent_runs(agent);
create index on agent_runs(status);
create index on agent_runs(input_ref);
create index on agent_runs(aangemaakt_op);

-- Uitbreiding voor watchdog/herziening/groeirapport/onboarding-agents
alter table agent_runs drop constraint if exists agent_runs_agent_check;
alter table agent_runs add constraint agent_runs_agent_check
  check (agent in ('scout', 'classificatie', 'redactie', 'kwaliteitscontrole', 'personalisatie',
                    'watchdog', 'herziening', 'groeirapport', 'onboarding'));

-- Voor het groeirapport (opzeggingen deze maand) en de onboarding-agent (dag-3 mail)
alter table subscribers add column if not exists opgezegd_op timestamptz;
alter table subscribers add column if not exists onboarding_stap integer not null default 0;

-- Gepubliceerde items — basis voor de herzieningsagent. bron_snapshot is de RUWE
-- samenvatting van het bronartikel op publicatiemoment (vóór de redactie-agent
-- het herschreef), zodat latere vergelijkingen tegen de bron niet worden
-- verstoord door verschillen in schrijfstijl.
create table gepubliceerde_items (
  id uuid primary key default gen_random_uuid(),
  bron_url text unique not null,
  bron_naam text,
  titel text,
  samenvatting text,          -- de gepubliceerde (herschreven) tekst, voor menselijke referentie
  bron_snapshot text,         -- de ruwe brontekst op moment van publicatie, gebruikt voor vergelijking
  eerst_gepubliceerd_op timestamptz default now(),
  laatst_gecontroleerd_op timestamptz,
  status text not null default 'actief_gemonitord'
    check (status in ('actief_gemonitord', 'afgehandeld', 'rectificatie_nodig')),
  rectificatie_notitie text
);

alter table gepubliceerde_items enable row level security;

create index on gepubliceerde_items(status);
create index on gepubliceerde_items(bron_url);
create index on gepubliceerde_items(laatst_gecontroleerd_op);

-- Concept nieuwsbrieven — voor de pre-send goedkeurflow (vrijdagcron → goedkeuring → maandagverzending).
-- batch_token wordt gedeeld door alle concepten in één run; één klik keurt de hele batch goed.
create table concept_nieuwsbrieven (
  id uuid primary key default gen_random_uuid(),
  batch_token uuid not null,
  subscriber_id uuid references subscribers(id) on delete cascade,
  email text not null,
  naam text not null,
  onderwerp text not null,
  html text not null,
  items_preview jsonb,           -- [{titel, impact, bronNaam}] voor de preview in de goedkeurmail
  aangemaakt_op timestamptz default now(),
  status text not null default 'in_afwachting'
    check (status in ('in_afwachting', 'goedgekeurd', 'verzonden', 'geannuleerd'))
);

alter table concept_nieuwsbrieven enable row level security;

create index on concept_nieuwsbrieven(batch_token);
create index on concept_nieuwsbrieven(status);
create index on concept_nieuwsbrieven(aangemaakt_op);

-- ── Rechten voor de service role ──────────────────────────────────────────
-- RLS aanzetten is niet genoeg: de service role heeft óók table-privileges
-- nodig. Zonder deze grants geven agent_runs, gepubliceerde_items en
-- concept_nieuwsbrieven "permission denied for table" (42501), waardoor de
-- Agents-tab in het dashboard leeg blijft en logAgentRun stil faalt.
grant select, insert, update, delete on public.agent_runs to service_role;
grant select, insert, update, delete on public.gepubliceerde_items to service_role;
grant select, insert, update, delete on public.concept_nieuwsbrieven to service_role;

-- ── Bronnencatalogus ─────────────────────────────────────────────────────
-- De bronnenlijst stond in lib/sources.ts, waardoor elke wijziging een deploy
-- vereiste en agents er niets aan konden veranderen. Hier staat hij als data,
-- met per bron zijn gezondheid, zodat de watchdog een dode feed in quarantaine
-- kan zetten en een verkenner-agent een nieuwe kan voorstellen.
--
-- Bewust gedenormaliseerd: één rij per (url, land, categorie). Een bron die in
-- vijf categorieën zit, staat er vijf keer in. Dat houdt de query triviaal, en
-- de gezondheidsvelden worden per url in één keer bijgewerkt.
create table if not exists bronnen (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  url text not null,
  land text not null,                    -- nl, eu, uk, us, be, de, it_land, internationaal
  categorie text not null,               -- fiscaal, finance, hr, privacy, marketing, it, techniek, esg, zorg, algemeen
  is_basis boolean not null default false, -- basisset: gaat naar elke abonnee, ongeacht land/categorie
  status text not null default 'actief'
    check (status in ('actief', 'quarantaine', 'voorgesteld', 'afgewezen')),
  herkomst text not null default 'catalogus'
    check (herkomst in ('catalogus', 'agent', 'handmatig')),
  notitie text,                          -- bv. waarom een niet-overheidsbron is toegelaten
  laatst_gecontroleerd_op timestamptz,
  laatst_gelukt_op timestamptz,
  laatste_aantal_artikelen integer,
  opeenvolgende_fouten integer not null default 0,
  aangemaakt_op timestamptz default now(),
  unique (url, land, categorie)
);

alter table bronnen enable row level security;

create index if not exists bronnen_land_categorie_idx on bronnen(land, categorie) where status = 'actief';
create index if not exists bronnen_basis_idx on bronnen(is_basis) where status = 'actief';
create index if not exists bronnen_url_idx on bronnen(url);

-- Zonder deze grant geeft de tabel "permission denied" en valt de code stil terug
-- op de catalogus in lib/sources.ts. Zie de grants hierboven voor dezelfde les.
grant select, insert, update, delete on public.bronnen to service_role;
