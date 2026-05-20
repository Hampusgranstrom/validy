-- Validy: row level security
-- Default posture: data is public-readable, writes only by service_role.
-- Adjust per-table when customer accounts / tiering land.

set search_path = public;

-- Supabase creates anon/authenticated automatically; this is a no-op there
-- and lets the file apply against a vanilla Postgres for tests.
do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin;
    end if;
end $$;

-- Helper: enable RLS + read-only policy for anon/authenticated
do $$
declare
    t text;
begin
    for t in
        select table_name from information_schema.tables
        where table_schema = 'public'
          and table_type   = 'BASE TABLE'
    loop
        execute format('alter table public.%I enable row level security', t);
        execute format(
            'create policy %I on public.%I for select to anon, authenticated using (true)',
            t || '_read_public', t);
    end loop;
end $$;

-- Note: service_role bypasses RLS by default — that's how the importers
-- write data. Add per-table write policies as user accounts come online.
