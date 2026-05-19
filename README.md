# Validy

Bostadsmarknadsdata för Sverige — transaktioner, BRF-ekonomi, makrodata.
Insiktsplattform för mäklare, banker, försäkringsbolag, förvaltare och
institutionella aktörer.

Initial datakälla: VD Pro-export för Gävle (4 786 transaktioner,
321 BRF:er, 2014–2023).

## Datamodell — översikt

```
data_sources ──┬─→ imports
               │
               └─→ transactions ─→ properties ─→ brfs ─→ municipalities
                                                   │
                                                   ├─→ annual_reports
                                                   ├─→ brf_loans
                                                   ├─→ brf_fees
                                                   └─→ brf_health_scores

time_series ─→ time_series_observations          (reporänta, KPI, …)
regional_indicators                              (kommun-nivå, SCB-data)
```

Designad för att inte vara låst till en användning. BRF-hälsoindex är
ett av flera möjliga insiktslager ovanpå samma kärna — andra exempel:
prisindex per kommun/typ, budpremieanalys, annonstidstrender, makro-
överlägg mot transaktioner, hyresjämförelser, energideklarationer.

Flexibilitetspunkter:
- `metadata jsonb` på varje fakta-tabell — nya fält från en källa landar
  här tills de är värda en egen kolumn.
- `data_sources` + `imports` — varje rad spårar sitt ursprung.
- `time_series` är generisk — en tabell för alla makroserier, ingen
  ny tabell per indikator.
- `model_version` på `brf_health_scores` — gamla bedömningar kan
  reproduceras när metodologin uppdateras.

## Setup

1. **Skapa Supabase-projekt** (en gång):
   - Dashboard → New project → "Validy" → region `eu-north-1` (Stockholm).
   - Spara `SUPABASE_URL` och `service_role` key i `.env`.

2. **Länka och pusha schema** (kräver Supabase CLI):

   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```

   Eller kopiera in varje migration från `supabase/migrations/` i SQL-editorn
   i ordning.

3. **Förbered data** (xlsx → CSV):

   ```bash
   pip install -r scripts/requirements.txt
   python scripts/prepare_gavle.py \
       --input /path/till/Gävle/ \
       --output data/gavle
   ```

4. **Ladda upp till Supabase**:

   ```bash
   export SUPABASE_URL="https://<ref>.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="..."
   python scripts/upload_to_supabase.py --data-dir data/gavle
   ```

   Skriptet är idempotent — kör om så uppdateras befintliga rader.

## Vad ligger var

```
supabase/migrations/
  20260519000001_core_sources_geo.sql   # data_sources, imports, kommuner, geographies
  20260519000002_brfs_properties.sql    # BRF, fastighet
  20260519000003_transactions.sql       # transaktionsfakta (huvudtabell)
  20260519000004_finance_domain.sql     # årsredovisning, lån, avgift
  20260519000005_macro_timeseries.sql   # generisk tidsseriestore
  20260519000006_health_scores.sql      # BRF-hälsoindex output
  20260519000007_views.sql              # analytical convenience views
  20260519000008_rls.sql                # RLS: public read, service-role write
  20260519000009_seed.sql               # alla 290 kommuner + data sources

scripts/
  prepare_gavle.py        # xlsx → CSV
  upload_to_supabase.py   # CSV → Supabase via PostgREST

data/gavle/               # rensad data, redo att laddas
```

## Nästa steg

- `scripts/import_bolagsverket.py` — årsredovisningar in i `annual_reports`
- `scripts/import_riksbanken.py` — reporänta/prognoser till `time_series_observations`
- `scripts/import_scb.py` — kommunal indikator-data till `regional_indicators`
- BRF-hälsoindex: SQL eller Edge Function som läser från
  `annual_reports + brf_loans + brf_fees + time_series` och skriver till
  `brf_health_scores`.
- Importera transaktionsdata för fler kommuner — samma `transactions`-tabell.
