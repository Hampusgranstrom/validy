-- Validy: finance & BRF-economy
-- Årsredovisningar, lån, avgiftshistorik. Filled by future importers
-- (Bolagsverket, Allabrf scrape, BRF-emitted reports).

set search_path = public;

-- ---------------------------------------------------------------------------
-- annual_reports: one row per BRF per fiscal year
-- The line items differ between BRFs, so we keep canonical aggregates as
-- columns and full statements in jsonb.
-- ---------------------------------------------------------------------------
create table annual_reports (
    id              bigserial primary key,
    brf_org_nummer  text not null references brfs(org_nummer) on delete cascade,
    fiscal_year     int not null,                     -- the year the report covers
    period_start    date,
    period_end      date,

    -- Aggregate financials (kr)
    total_revenue           bigint,
    total_expenses          bigint,
    interest_expense        bigint,
    net_result              bigint,
    total_assets            bigint,
    total_debt              bigint,
    equity                  bigint,
    cash_and_equivalents    bigint,

    -- Derived helpers (kept here for fast index lookups; calc'd on insert)
    debt_per_kvm            numeric(12,2),
    interest_coverage_ratio numeric(8,2),

    -- Full statements / notes
    balance_sheet           jsonb default '{}'::jsonb,
    income_statement        jsonb default '{}'::jsonb,
    notes                   jsonb default '{}'::jsonb,

    -- Provenance
    source_id       int not null references data_sources(id) on delete restrict,
    source_url      text,
    document_url    text,                             -- link to the PDF
    imported_at     timestamptz not null default now(),

    constraint annual_reports_unique unique (brf_org_nummer, fiscal_year)
);

create index annual_reports_brf_idx on annual_reports (brf_org_nummer);
create index annual_reports_year_idx on annual_reports (fiscal_year);

-- ---------------------------------------------------------------------------
-- brf_loans: lånestruktur per BRF, snapshot in time
-- Multiple loans per BRF; each loan has its own rate, type, maturity.
-- ---------------------------------------------------------------------------
create table brf_loans (
    id              bigserial primary key,
    brf_org_nummer  text not null references brfs(org_nummer) on delete cascade,
    snapshot_date   date not null,
    lender          text,                             -- 'SBAB', 'SEB', 'Handelsbanken', ...
    principal       bigint not null,                  -- kr
    interest_rate   numeric(6,4),                     -- 0.0395 = 3.95%
    rate_type       text not null,                    -- 'rorlig' | 'bunden_3m' | 'bunden_1y' | 'bunden_3y' | 'bunden_5y'
    rate_reset_date date,                             -- next reset (for bunden)
    maturity_date   date,                             -- when loan ends
    source_id       int references data_sources(id) on delete set null,
    metadata        jsonb not null default '{}'::jsonb,
    created_at      timestamptz not null default now()
);

create index brf_loans_brf_idx on brf_loans (brf_org_nummer);
create index brf_loans_snapshot_idx on brf_loans (snapshot_date);
create index brf_loans_rate_type_idx on brf_loans (rate_type);

-- ---------------------------------------------------------------------------
-- brf_fees: avgiftshistorik
-- We track every observed monthly fee with the date it became effective.
-- One row per (BRF, effective_from). For per-apartment granularity store
-- in metadata or extend with apartment_id later.
-- ---------------------------------------------------------------------------
create table brf_fees (
    id              bigserial primary key,
    brf_org_nummer  text not null references brfs(org_nummer) on delete cascade,
    effective_from  date not null,
    arsavg_per_kvm  numeric(8,2),                     -- kr/m²/year (canonical)
    monthly_avg     numeric(10,2),                    -- if known for a "typical" apt
    boa_kvm         numeric(7,1),                     -- reference apt size for monthly_avg
    change_pct      numeric(6,2),                     -- vs previous observation
    source_id       int references data_sources(id) on delete set null,
    metadata        jsonb not null default '{}'::jsonb,
    created_at      timestamptz not null default now(),
    constraint brf_fees_unique unique (brf_org_nummer, effective_from)
);

create index brf_fees_brf_idx on brf_fees (brf_org_nummer);
create index brf_fees_date_idx on brf_fees (effective_from);
