-- Validy: analytical views
-- Convenience layers on top of the raw tables. Don't put heavy aggregates
-- here (yet) — use materialized views for those once data volume grows.

set search_path = public;

-- Per-BRF rolling transaction stats (last 24 months)
create view brf_transaction_stats_24m as
select
    b.org_nummer,
    b.name                                                          as brf_name,
    m.name                                                          as kommun,
    count(t.id)                                                     as n_sales,
    avg(t.kr_per_kvm)::int                                          as avg_kr_per_kvm,
    percentile_cont(0.5) within group (order by t.kr_per_kvm)::int  as median_kr_per_kvm,
    avg(t.boa_kvm)::numeric(6,1)                                    as avg_boa_kvm,
    avg(t.arsavg_per_kvm)::int                                      as avg_arsavg_per_kvm,
    avg(t.manadsavg)::int                                           as avg_manadsavg,
    avg(t.annonstid_dagar)::int                                     as avg_annonstid_dagar,
    avg(t.budpremie_pct)::numeric(6,2)                              as avg_budpremie_pct,
    min(t.kontraktsdatum)                                           as first_sale,
    max(t.kontraktsdatum)                                           as latest_sale
from brfs b
left join municipalities m on m.id = b.municipality_id
left join transactions t
    on t.brf_org_nummer = b.org_nummer
    and t.kontraktsdatum >= current_date - interval '24 months'
group by b.org_nummer, b.name, m.name;

-- Kommun-level price index by quarter, per bostadstyp
create view kommun_quarterly_price_index as
select
    m.id                                                            as municipality_id,
    m.name                                                          as kommun,
    t.bostadstyp,
    date_trunc('quarter', t.kontraktsdatum)::date                   as quarter,
    count(*)                                                        as n_sales,
    avg(t.kr_per_kvm)::int                                          as avg_kr_per_kvm,
    percentile_cont(0.5) within group (order by t.kr_per_kvm)::int  as median_kr_per_kvm,
    sum(t.slutpris)::bigint                                         as total_volume_kr
from transactions t
join municipalities m on m.id = t.municipality_id
where t.kr_per_kvm is not null
group by m.id, m.name, t.bostadstyp, date_trunc('quarter', t.kontraktsdatum);

-- Latest health score per BRF (independent of model version)
create view brf_latest_health as
select distinct on (brf_org_nummer)
    *
from brf_health_scores
order by brf_org_nummer, as_of_date desc, calculated_at desc;
