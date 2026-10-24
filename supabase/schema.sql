-- =====================================================================
-- Δίκτυο Γραφείων Διασύνδεσης ΑΕΙ — σχήμα βάσης δεδομένων (Supabase)
-- Εκτελέστε ολόκληρο το αρχείο μία φορά στο Supabase → SQL Editor → Run.
-- =====================================================================

-- ---------- Γραφεία (ένα ανά ΑΕΙ) ----------
create table if not exists public.offices (
  id          text primary key,
  short       text not null,
  name        text not null,
  city        text,
  region      text,
  domains     text[] not null default '{}',   -- επιτρεπόμενα domains email
  responsible text,
  email       text,
  phone       text,
  website     text,
  logo_url    text,
  about       text,
  updated_at  timestamptz not null default now()
);

-- ---------- Χρήστες (στελέχη γραφείων) ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  email      text not null,
  full_name  text not null default '',
  office_id  text not null references public.offices,
  status     text not null default 'pending' check (status in ('pending','approved','rejected')),
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Αναρτήσεις: δράσεις, ανοιχτά σεμινάρια, δημόσιες ευκαιρίες ----------
create table if not exists public.posts (
  id         bigint generated always as identity primary key,
  office_id  text not null references public.offices,
  author     uuid not null default auth.uid() references public.profiles on delete cascade,
  kind       text not null check (kind in ('drasi','seminario','eykairia')),
  title      text not null check (char_length(title) between 3 and 200),
  body       text not null default '' check (char_length(body) <= 4000),
  event_date date,
  event_time text,
  link       text,
  source     text,
  created_at timestamptz not null default now()
);
create index if not exists posts_kind_created on public.posts (kind, created_at desc);

-- ---------- Συζήτηση ----------
create table if not exists public.threads (
  id         bigint generated always as identity primary key,
  office_id  text not null references public.offices,
  author     uuid not null default auth.uid() references public.profiles on delete cascade,
  title      text not null check (char_length(title) between 3 and 200),
  created_at timestamptz not null default now()
);
create table if not exists public.messages (
  id         bigint generated always as identity primary key,
  thread_id  bigint not null references public.threads on delete cascade,
  office_id  text not null references public.offices,
  author     uuid not null default auth.uid() references public.profiles on delete cascade,
  body       text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

-- ---------- Δελτίο του Δικτύου ----------
create table if not exists public.bulletins (
  id          bigint generated always as identity primary key,
  month       text not null,                 -- π.χ. 2026-11
  content     text not null,                 -- απλό κείμενο με # ## - **
  status      text not null default 'draft' check (status in ('draft','approved')),
  created_by  uuid default auth.uid() references public.profiles,
  approved_by uuid references public.profiles,
  approved_at timestamptz,
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- Βοηθητικές συναρτήσεις
-- =====================================================================
create or replace function public.my_office() returns text
language sql stable security definer set search_path = public as $$
  select office_id from profiles where id = auth.uid() and status = 'approved'
$$;

create or replace function public.is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and status = 'approved')
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and status = 'approved' and is_admin)
$$;

-- Νέος χρήστης: επιτρέπεται μόνο ιδρυματικό email και μπαίνει σε αναμονή έγκρισης
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  dom text := lower(split_part(new.email, '@', 2));
  oid text;
begin
  select o.id into oid
  from offices o
  where exists (select 1 from unnest(o.domains) d where dom = d or dom like '%.' || d)
  limit 1;
  if oid is null then
    raise exception 'NOT_ACADEMIC_EMAIL';
  end if;
  insert into profiles (id, email, full_name, office_id)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), oid);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Σφραγίδα χρόνου ενημέρωσης στοιχείων γραφείου
create or replace function public.touch_office() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists offices_touch on public.offices;
create trigger offices_touch before update on public.offices
  for each row execute function public.touch_office();

-- =====================================================================
-- Κανόνες πρόσβασης (Row Level Security)
-- =====================================================================
alter table public.offices   enable row level security;
alter table public.profiles  enable row level security;
alter table public.posts     enable row level security;
alter table public.threads   enable row level security;
alter table public.messages  enable row level security;
alter table public.bulletins enable row level security;

-- Γραφεία: τα βλέπουν όλοι οι εγκεκριμένοι· κάθε γραφείο αλλάζει μόνο τα δικά του
drop policy if exists offices_read on public.offices;
create policy offices_read on public.offices for select using (public.is_approved());
drop policy if exists offices_edit_own on public.offices;
create policy offices_edit_own on public.offices for update
  using (id = public.my_office()) with check (id = public.my_office());

-- Χρήστες: ο καθένας βλέπει τον εαυτό του· οι διαχειριστές βλέπουν και εγκρίνουν όλους
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_admin on public.profiles;
create policy profiles_admin on public.profiles for update using (public.is_admin()) with check (public.is_admin());

-- Αναρτήσεις
drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select using (public.is_approved());
drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert
  with check (office_id = public.my_office() and author = auth.uid());
drop policy if exists posts_own on public.posts;
create policy posts_own on public.posts for delete using (office_id = public.my_office() or public.is_admin());

-- Συζήτηση
drop policy if exists threads_read on public.threads;
create policy threads_read on public.threads for select using (public.is_approved());
drop policy if exists threads_insert on public.threads;
create policy threads_insert on public.threads for insert
  with check (office_id = public.my_office() and author = auth.uid());
drop policy if exists threads_delete on public.threads;
create policy threads_delete on public.threads for delete using (author = auth.uid() or public.is_admin());

drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages for select using (public.is_approved());
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert
  with check (office_id = public.my_office() and author = auth.uid());
drop policy if exists messages_delete on public.messages;
create policy messages_delete on public.messages for delete using (author = auth.uid() or public.is_admin());

-- Δελτίο: όλοι βλέπουν τα εγκεκριμένα· μόνο διαχειριστές συντάσσουν και εγκρίνουν
drop policy if exists bulletins_read on public.bulletins;
create policy bulletins_read on public.bulletins for select
  using (public.is_approved() and (status = 'approved' or public.is_admin()));
drop policy if exists bulletins_admin on public.bulletins;
create policy bulletins_admin on public.bulletins for all
  using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- Λογότυπα: κάθε γραφείο ανεβάζει μόνο στον δικό του φάκελο
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

drop policy if exists logos_read on storage.objects;
create policy logos_read on storage.objects for select using (bucket_id = 'logos');
drop policy if exists logos_write on storage.objects;
create policy logos_write on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = public.my_office());
drop policy if exists logos_update on storage.objects;
create policy logos_update on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = public.my_office());

-- =====================================================================
-- Αρχικά δεδομένα: τα 25 δημόσια ΑΕΙ
-- (Ελέγξτε τα domains email· μπορείτε να προσθέσετε όσα λείπουν.)
-- =====================================================================
insert into public.offices (id, short, name, city, region, domains) values
 ('ekpa','ΕΚΠΑ','Εθνικό και Καποδιστριακό Πανεπιστήμιο Αθηνών','Αθήνα','Αττική','{uoa.gr}'),
 ('emp','ΕΜΠ','Εθνικό Μετσόβιο Πολυτεχνείο','Αθήνα','Αττική','{ntua.gr}'),
 ('opa','ΟΠΑ','Οικονομικό Πανεπιστήμιο Αθηνών','Αθήνα','Αττική','{aueb.gr}'),
 ('papei','ΠΑΠΕΙ','Πανεπιστήμιο Πειραιώς','Πειραιάς','Αττική','{unipi.gr}'),
 ('panteio','ΠΑΝΤ','Πάντειο Πανεπιστήμιο','Αθήνα','Αττική','{panteion.gr}'),
 ('hua','ΧΠ','Χαροκόπειο Πανεπιστήμιο','Καλλιθέα','Αττική','{hua.gr}'),
 ('aua','ΓΠΑ','Γεωπονικό Πανεπιστήμιο Αθηνών','Αθήνα','Αττική','{aua.gr}'),
 ('askt','ΑΣΚΤ','Ανωτάτη Σχολή Καλών Τεχνών','Αθήνα','Αττική','{asfa.gr}'),
 ('uniwa','ΠΑΔΑ','Πανεπιστήμιο Δυτικής Αττικής','Αιγάλεω','Αττική','{uniwa.gr}'),
 ('aspete','ΑΣΠΑΙΤΕ','Ανωτάτη Σχολή Παιδαγωγικής και Τεχνολογικής Εκπαίδευσης','Μαρούσι','Αττική','{aspete.gr}'),
 ('auth','ΑΠΘ','Αριστοτέλειο Πανεπιστήμιο Θεσσαλονίκης','Θεσσαλονίκη','Κεντρική Μακεδονία','{auth.gr}'),
 ('uom','ΠΑΜΑΚ','Πανεπιστήμιο Μακεδονίας','Θεσσαλονίκη','Κεντρική Μακεδονία','{uom.edu.gr,uom.gr}'),
 ('ihu','ΔΙΠΑΕ','Διεθνές Πανεπιστήμιο της Ελλάδος','Θεσσαλονίκη','Κεντρική Μακεδονία','{ihu.gr,ihu.edu.gr}'),
 ('uowm','ΠΔΜ','Πανεπιστήμιο Δυτικής Μακεδονίας','Κοζάνη','Δυτική Μακεδονία','{uowm.gr}'),
 ('duth','ΔΠΘ','Δημοκρίτειο Πανεπιστήμιο Θράκης','Κομοτηνή','Αν. Μακεδονία & Θράκη','{duth.gr}'),
 ('uth','ΠΘ','Πανεπιστήμιο Θεσσαλίας','Βόλος','Θεσσαλία','{uth.gr}'),
 ('uoi','ΠΙ','Πανεπιστήμιο Ιωαννίνων','Ιωάννινα','Ήπειρος','{uoi.gr}'),
 ('ionio','ΙΠ','Ιόνιο Πανεπιστήμιο','Κέρκυρα','Ιόνια Νησιά','{ionio.gr}'),
 ('upatras','ΠΠ','Πανεπιστήμιο Πατρών','Πάτρα','Δυτική Ελλάδα','{upatras.gr,upnet.gr}'),
 ('eap','ΕΑΠ','Ελληνικό Ανοικτό Πανεπιστήμιο','Πάτρα','Δυτική Ελλάδα','{eap.gr}'),
 ('uop','ΠΑΠΕΛ','Πανεπιστήμιο Πελοποννήσου','Τρίπολη','Πελοπόννησος','{uop.gr}'),
 ('aegean','ΠΑΙΓ','Πανεπιστήμιο Αιγαίου','Μυτιλήνη','Νησιά Αιγαίου','{aegean.gr}'),
 ('uoc','ΠΚ','Πανεπιστήμιο Κρήτης','Ηράκλειο · Ρέθυμνο','Κρήτη','{uoc.gr}'),
 ('tuc','ΠΟΛΚ','Πολυτεχνείο Κρήτης','Χανιά','Κρήτη','{tuc.gr}'),
 ('hmu','ΕΛΜΕΠΑ','Ελληνικό Μεσογειακό Πανεπιστήμιο','Ηράκλειο','Κρήτη','{hmu.gr}')
on conflict (id) do nothing;

-- =====================================================================
-- ΜΕΤΑ την πρώτη σας εγγραφή στην εφαρμογή, κάντε τον εαυτό σας διαχειριστή
-- (αντικαταστήστε το email και εκτελέστε μόνο αυτή τη γραμμή):
--
-- update public.profiles set status = 'approved', is_admin = true
-- where email = 'to-email-sas@uowm.gr';
-- =====================================================================

-- =====================================================================
-- Ενημέρωση για AI και Δελτίο χωρίς έγκριση (ίδιο με το update-ai.sql)
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

-- =====================================================================
-- Ενημέρωση: νέα είδη αναρτήσεων
-- =====================================================================
alter table public.posts drop constraint if exists posts_kind_check;
alter table public.posts add constraint posts_kind_check
  check (kind in ('drasi','kalipraktiki','ekdilosi','seminario','eykairia','yliko','diakrisi','nea'));

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
