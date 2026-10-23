-- =====================================================================
-- Ενημέρωση: νέα είδη αναρτήσεων
-- =====================================================================
alter table public.posts drop constraint if exists posts_kind_check;
alter table public.posts add constraint posts_kind_check
  check (kind in ('drasi','kalipraktiki','ekdilosi','seminario','eykairia','yliko','diakrisi','nea'));
