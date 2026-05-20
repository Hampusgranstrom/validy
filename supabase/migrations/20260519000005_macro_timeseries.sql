-- Validy: generic time-series store for macro data
-- One table, many series. Avoids one-off tables for every indicator
-- (reporänta, bolåneränta, KPI, byggprisindex, befolkning, ...).

set search_path = public;

-- ---------------------------------------------------------------------------
-- time_series: registry of every named series we track
-- ---------------------------------------------------------------------------
create table time_series (
    id              serial primary key,
    code            text not null unique,             -- 'riksbank.reporanta', 'scb.kpi', 'bolanan.boranta_3m'
    name            text not null,
    unit            text not null,                    -- 'percent', 'index', 'kr', 'count'
    frequency       text not null,                    -- 'daily' | 'monthly' | 'quarterly' | 'yearly'
    source_id       int not null references data_sources(id) on delete restrict,
    description     text,
    metadata        jsonb not null default '{}'::jsonb,
    created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- time_series_observations: the actual data points
-- ---------------------------------------------------------------------------
create table time_series_observations (
    series_id       int not null references time_series(id) on delete cascade,
    observed_at     date not null,
    value           numeric not null,
    is_forecast     boolean not null default false,   -- distinguishes Riksbank prognoses
    metadata        jsonb not null default '{}'::jsonb,
    primary key (series_id, observed_at, is_forecast)
);

create index tso_series_date_idx
    on time_series_observations (series_id, observed_at desc);

comment on table time_series_observations is
    'Wide-format time series. For multi-dimensional data (e.g. per kommun) '
    'create one series per dimension or use metadata for the dimension key.';

-- ---------------------------------------------------------------------------
-- regional_indicators: convenience for kommun-level metrics
-- (befolkning, medianinkomst, nybyggnation). Saves needing one series per
-- kommun.
-- ---------------------------------------------------------------------------
create table regional_indicators (
    id              bigserial primary key,
    municipality_id int not null references municipalities(id) on delete cascade,
    indicator_code  text not null,                    -- 'scb.population', 'scb.median_income'
    observed_at     date not null,
    value           numeric not null,
    source_id       int references data_sources(id) on delete set null,
    metadata        jsonb not null default '{}'::jsonb,
    constraint regional_indicators_unique
        unique (municipality_id, indicator_code, observed_at)
);

create index regional_indicators_lookup_idx
    on regional_indicators (municipality_id, indicator_code, observed_at desc);
create index regional_indicators_code_idx
    on regional_indicators (indicator_code);
