-- Validy: derived BRF health scores
-- One of many possible insight layers on top of the core data. Output of
-- a scheduled job (Edge Function / pg_cron) that joins annual_reports,
-- brf_loans, brf_fees, transactions, and time_series.

set search_path = public;

create table brf_health_scores (
    id              bigserial primary key,
    brf_org_nummer  text not null references brfs(org_nummer) on delete cascade,
    as_of_date      date not null,

    -- Component metrics (kr unless noted)
    debt_per_kvm                numeric(12,2),
    interest_share_floating_pct numeric(5,2),       -- 0..100
    rate_shock_3pp_sensitivity  numeric(12,2),     -- delta interest cost if +3pp
    fee_change_18m_pct          numeric(7,2),
    fee_change_36m_pct          numeric(7,2),
    debt_to_market_value_pct    numeric(7,2),       -- vs sum of recent transaction values
    cash_buffer_months          numeric(6,2),
    interest_coverage_ratio     numeric(8,2),

    -- Composite outputs
    composite_risk_score   int,                          -- 0..100
    risk_band              text not null,                -- 'low' | 'medium' | 'high' | 'unknown'

    -- Why this score? Human-readable narrative + structured signals
    rationale       jsonb not null default '{}'::jsonb,

    -- Methodology versioning so old scores stay reproducible
    model_version   text not null default 'v0',

    calculated_at   timestamptz not null default now(),
    constraint brf_health_scores_unique
        unique (brf_org_nummer, as_of_date, model_version),
    constraint brf_health_scores_band_check
        check (risk_band in ('low', 'medium', 'high', 'unknown'))
);

create index brf_health_scores_brf_idx
    on brf_health_scores (brf_org_nummer, as_of_date desc);
create index brf_health_scores_band_idx
    on brf_health_scores (risk_band, as_of_date desc);
create index brf_health_scores_as_of_idx
    on brf_health_scores (as_of_date desc);

comment on table brf_health_scores is
    'Snapshot of BRF risk metrics. One row per (BRF, date, model_version). '
    'Model_version lets us regenerate scores under a new methodology without '
    'losing the old ones — important for traceability with bank/insurance customers.';
