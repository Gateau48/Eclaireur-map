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

-- ---------------------------------------------------------------------------
-- Contenu immobilier — promoteurs et projets (voir lib/schema.ts pour la
-- forme complète, source de vérité unique pour la structure des données ;
-- ce DDL ne duplique QUE les colonnes nécessaires à la recherche/au
-- filtrage rapide, le reste du détail vit en JSONB pour éviter d'avoir à
-- maintenir deux schémas en parallèle).
--
-- Nécessite l'extension pg_trgm (recherche floue insensible à la casse) :
create extension if not exists pg_trgm;

create table promoters (
  id text primary key,               -- même id que dans le JSON source (lib/schema.ts)
  edition_id text not null,
  name text not null,
  legal_name text,
  photo_url text,
  -- Reste du Promoter (company, public_information, sources) — forme
  -- exacte de PromoterSchema moins {id, name, legal_name, photo_url, projects}.
  data jsonb not null,
  updated_at timestamptz default now()
);

create table projects (
  id text primary key,
  promoter_id text not null references promoters(id) on delete cascade,
  edition_id text not null,
  name text not null,
  address text,
  district text,
  city text,
  latitude double precision,
  longitude double precision,
  location_precision text not null check (location_precision in ('exact', 'approximate', 'district')),
  -- Reste du Project (cover_image_url, status, pricing, characteristics,
  -- timeline, public_information, data_quality, last_verified, sources) —
  -- forme exacte de ProjectSchema moins {id, name, location}.
  data jsonb not null,
  updated_at timestamptz default now()
);

create index projects_edition_idx on projects (edition_id);
create index projects_promoter_idx on projects (promoter_id);
create index promoters_edition_idx on promoters (edition_id);

-- Recherche floue (accents/casse/fautes de frappe tolérées) sur les champs
-- qu'un visiteur tape réellement dans la barre de recherche.
create index promoters_name_trgm on promoters using gin (name gin_trgm_ops);
create index projects_name_trgm on projects using gin (name gin_trgm_ops);
create index projects_district_trgm on projects using gin (district gin_trgm_ops);