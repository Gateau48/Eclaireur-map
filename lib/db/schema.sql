create table purchases (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  edition_id text not null,
  chariow_sale_id text not null unique,
  status text not null check (status in ('active', 'refunded')),
  created_at timestamptz default now()
);

create index on purchases (email, edition_id);
