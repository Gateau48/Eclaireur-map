-- À exécuter dans le SQL editor de Supabase (Partie 6 du brief).
create table purchases (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  edition_id text not null,
  chariow_sale_id text not null unique, -- GARDE-FOU : idempotence
  status text not null check (status in ('active', 'refunded')),
  created_at timestamptz default now()
);

create index on purchases (email, edition_id);

-- Dédoublonnage des livraisons de Pulses Chariow, sur x-pulse-delivery-id
-- (voir app/api/webhooks/chariow/route.ts et
-- https://chariow.dev/en/guides/pulse-security).
create table pulse_deliveries (
  id text primary key,
  received_at timestamptz default now()
);
