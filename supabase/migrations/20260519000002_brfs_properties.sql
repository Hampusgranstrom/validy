-- Validy: bostadsrättsföreningar och fastigheter
-- org_nummer is the join key to Bolagsverket annual reports.

set search_path = public;

-- ---------------------------------------------------------------------------
-- brfs: bostadsrättsföreningar
-- org_nummer is the natural key (Swedish organisationsnummer NNNNNN-NNNN).
-- Use a UUID surrogate only if you need to handle org_nummer changes; for
-- now the natural key is simpler.
-- ---------------------------------------------------------------------------
create table brfs (
    org_nummer      text primary key,                 -- 'NNNNNN-NNNN'
    name            text not null,
    municipality_id int references municipalities(id) on delete set null,
    byggar          int,                              -- earliest known build year
    -- Bolagsverket / Skatteverket details (filled later)
    registered_at   date,
    registered_office text,
    sni_code        text,
    -- Free-form for source-specific extras (board members, etc.)
    metadata        jsonb not null default '{}'::jsonb,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    constraint brfs_org_nummer_format
        check (org_nummer ~ '^[0-9]{6}-[0-9]{4}$')
);

create index brfs_municipality_idx on brfs (municipality_id);
create index brfs_name_idx on brfs (name);

comment on column brfs.org_nummer is
    'Swedish organisationsnummer NNNNNN-NNNN. Stable join key for Bolagsverket annual reports.';

-- updated_at trigger
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

create trigger brfs_set_updated_at
    before update on brfs
    for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- properties: fastigheter
-- Fastighetsbeteckning is unique within a municipality.
-- ---------------------------------------------------------------------------
create table properties (
    id              bigserial primary key,
    municipality_id int not null references municipalities(id) on delete restrict,
    fastighetsbeteckning text not null,
    -- Many properties belong to a BRF, but not all (villas, radhus, ägarlägenheter)
    brf_org_nummer  text references brfs(org_nummer) on delete set null,
    -- Lookup helpers
    address_block   text,                             -- common street label
    postnummer      text,
    lat             numeric,
    lng             numeric,
    metadata        jsonb not null default '{}'::jsonb,
    created_at      timestamptz not null default now(),
    constraint properties_unique_in_municipality
        unique (municipality_id, fastighetsbeteckning)
);

create index properties_brf_idx on properties (brf_org_nummer);
create index properties_municipality_idx on properties (municipality_id);
create index properties_beteckning_idx on properties (fastighetsbeteckning);
