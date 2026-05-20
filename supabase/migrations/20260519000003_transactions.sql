-- Validy: transaktionsfakta
-- One row per sale. Designed to fit any Swedish residential transaction
-- (lägenhet, villa, radhus, fritidshus). Source-specific extras go in
-- the jsonb metadata column.

set search_path = public;

create table transactions (
    id              bigserial primary key,

    -- Provenance & dedupe
    source_id       int not null references data_sources(id) on delete restrict,
    import_id       bigint references imports(id) on delete set null,
    source_row_hash text not null,                    -- sha1(address|date|price|org_nummer)

    -- Dates
    kontraktsdatum      date not null,
    publiceringsdatum   date,
    tilltradesdatum     date,

    -- Location
    municipality_id int not null references municipalities(id) on delete restrict,
    property_id     bigint references properties(id) on delete set null,
    brf_org_nummer  text references brfs(org_nummer) on delete set null,
    adress          text not null,

    -- Prices (kr)
    slutpris        bigint,                           -- final price
    utgangspris     bigint,                           -- asking price
    pris_idag       bigint,                           -- inflation-adjusted to today by source
    kr_per_kvm      int,
    budpremie_kr    bigint,
    budpremie_pct   numeric(7,2),

    -- Physical attributes
    rum             numeric(4,1),
    boa_kvm         numeric(7,1),
    vaning          int,
    vaningar        int,
    hiss            boolean,
    balkong         boolean,
    varme_gemensam  boolean,                          -- shared heating cost in BRF
    bostadstyp      text not null,                    -- 'lagenhet'|'radhus'|'villa'|'fritidshus'|'ovrigt'|...
    byggar          int,
    nyprod          boolean,

    -- BRF fees
    manadsavg       int,                              -- kr/month
    arsavg_per_kvm  int,                              -- kr/m² per year

    -- Market behavior
    annonstid_dagar int,

    -- Free-form for source-specific fields (mäklare, objektnr, ...)
    metadata        jsonb not null default '{}'::jsonb,

    imported_at     timestamptz not null default now(),

    constraint transactions_source_row_unique
        unique (source_id, source_row_hash)
);

-- Indexes built for the common query patterns:
--  * "show me all sales in kommun X between dates Y..Z"
--  * "show me all sales for BRF org_nummer N"
--  * "show me kr/kvm trends for bostadstyp T in kommun X over time"
create index transactions_kontraktsdatum_idx on transactions (kontraktsdatum);
create index transactions_municipality_date_idx
    on transactions (municipality_id, kontraktsdatum);
create index transactions_brf_idx
    on transactions (brf_org_nummer) where brf_org_nummer is not null;
create index transactions_property_idx
    on transactions (property_id) where property_id is not null;
create index transactions_bostadstyp_idx on transactions (bostadstyp);
create index transactions_kommun_typ_date_idx
    on transactions (municipality_id, bostadstyp, kontraktsdatum);
-- jsonb GIN for ad-hoc filtering on metadata
create index transactions_metadata_gin on transactions using gin (metadata);

comment on column transactions.source_row_hash is
    'Stable hash from the source — guarantees idempotent re-imports per source.';
comment on column transactions.metadata is
    'Source-specific extras. Keep canonical columns above; new fields go here until promoted.';
