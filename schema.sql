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
