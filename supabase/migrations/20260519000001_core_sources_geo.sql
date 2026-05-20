-- Validy: core reference data
-- Sources, geography. Everything else hangs off these.

set search_path = public;

-- ---------------------------------------------------------------------------
-- data_sources: every external feed that brought us data
-- ---------------------------------------------------------------------------
create table data_sources (
    id              serial primary key,
    code            text not null unique,             -- 'vd_pro', 'bolagsverket', 'riksbanken_reporanta'
    name            text not null,
    kind            text not null,                    -- 'transactions' | 'annual_report' | 'macro' | 'reference' | 'other'
    homepage        text,
    license         text,                             -- e.g. 'proprietary', 'cc-by'
    metadata        jsonb not null default '{}'::jsonb,
    created_at      timestamptz not null default now()
);

comment on table data_sources is
    'Registry of every external dataset (Mäklarstatistik, Bolagsverket, Riksbanken, SCB, ...). '
    'Every fact table references this for provenance.';

-- ---------------------------------------------------------------------------
-- imports: each batch run of a source, for reproducibility / re-imports
-- ---------------------------------------------------------------------------
create table imports (
    id              bigserial primary key,
    source_id       int not null references data_sources(id) on delete restrict,
    started_at      timestamptz not null default now(),
    finished_at     timestamptz,
    row_count       int,
    file_name       text,
    notes           text,
    metadata        jsonb not null default '{}'::jsonb
);

create index imports_source_idx on imports (source_id);

-- ---------------------------------------------------------------------------
-- municipalities: kommuner. SCB kod is stable, name can move.
-- Populated lazily as data arrives; pre-seeded with all Swedish kommuner
-- via the seed migration.
-- ---------------------------------------------------------------------------
create table municipalities (
    id              serial primary key,
    kod             text unique,                      -- SCB kommunkod, e.g. '2180' (Gävle)
    name            text not null,
    county          text,                             -- Län
    region          text,                             -- Landsdel (Norrland, Götaland, ...)
    metadata        jsonb not null default '{}'::jsonb,
    created_at      timestamptz not null default now(),
    constraint municipalities_name_uniq unique (name)
);

create index municipalities_name_idx on municipalities (name);

-- ---------------------------------------------------------------------------
-- geographies: generic hierarchy for stadsdel / postnummer / tätort / etc.
-- Optional; we don't need it for transactions to work.
-- ---------------------------------------------------------------------------
create table geographies (
    id              bigserial primary key,
    kind            text not null,                    -- 'stadsdel' | 'postnummer' | 'tatort' | 'lan'
    name            text not null,
    parent_id       bigint references geographies(id) on delete set null,
    municipality_id int references municipalities(id) on delete set null,
    external_id     text,                             -- whatever id the source uses
    lat             numeric,
    lng             numeric,
    metadata        jsonb not null default '{}'::jsonb,
    created_at      timestamptz not null default now()
);

create index geographies_kind_idx on geographies (kind);
create index geographies_municipality_idx on geographies (municipality_id);
create unique index geographies_kind_external_uniq
    on geographies (kind, external_id)
    where external_id is not null;
