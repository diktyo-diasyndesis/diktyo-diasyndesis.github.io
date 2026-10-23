-- =====================================================================
-- Ενημέρωση: Δελτίο χωρίς έγκριση + τεχνητή νοημοσύνη
-- Εκτελέστε ολόκληρο το αρχείο μία φορά στο Supabase → SQL Editor → Run.
-- =====================================================================

-- Αγγλική εκδοχή αναρτήσεων
alter table public.posts add column if not exists body_en text;
alter table public.posts add column if not exists title_en text;

-- Δελτίο: ένα ανά μήνα, το γράφει μόνο ο διακομιστής
alter table public.bulletins add column if not exists source_sig text;
alter table public.bulletins add column if not exists generated_at timestamptz;
alter table public.bulletins add column if not exists ai boolean not null default false;
delete from public.bulletins a using public.bulletins b where a.month = b.month and a.id < b.id;
create unique index if not exists bulletins_month_key on public.bulletins (month);

-- Όλοι οι εγκεκριμένοι διαβάζουν· κανείς (ούτε διαχειριστής) δεν γράφει ή αλλάζει από την εφαρμογή
drop policy if exists bulletins_read on public.bulletins;
create policy bulletins_read on public.bulletins for select using (public.is_approved());
drop policy if exists bulletins_admin on public.bulletins;
