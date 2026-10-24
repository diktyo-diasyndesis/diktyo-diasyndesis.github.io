-- =====================================================================
-- Ενημέρωση: ανάρτηση από σύνδεσμο + αυτόματη μεταφορά ανακοινώσεων (RSS)
-- =====================================================================
alter table public.offices add column if not exists feed_url text;
alter table public.offices add column if not exists feed_enabled boolean not null default false;
alter table public.offices add column if not exists feed_checked_at timestamptz;
alter table public.posts add column if not exists source_url text;
alter table public.posts add column if not exists auto boolean not null default false;
alter table public.posts alter column author drop not null;
create unique index if not exists posts_office_source on public.posts (office_id, source_url);
create table if not exists public.feed_seen (office_id text not null, source_url text not null, primary key (office_id, source_url));
alter table public.feed_seen enable row level security;
create table if not exists public.sync_state (id int primary key, last_run timestamptz);
alter table public.sync_state enable row level security;
insert into public.sync_state (id, last_run) values (1, null) on conflict do nothing;
