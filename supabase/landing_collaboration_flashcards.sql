-- Bac-pedia 2027: collaborator applications and student-owned flashcards.
-- Existing student_profiles, student_progress, and AI quota data remain unchanged.

create table if not exists public.collaborator_applications (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (char_length(trim(display_name)) between 2 and 100),
 organization text not null check (char_length(trim(organization)) between 2 and 150),
 contribution_type text not null check (contribution_type in ('student','teacher','club','organization','other')),
 motivation text not null check (char_length(trim(motivation)) between 15 and 2000),
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz
);
alter table public.collaborator_applications enable row level security;
revoke all on public.collaborator_applications from public, anon, authenticated;
grant select on public.collaborator_applications to authenticated;
grant insert (user_id,display_name,organization,contribution_type,motivation) on public.collaborator_applications to authenticated;
drop policy if exists "Applicants read their applications" on public.collaborator_applications;
create policy "Applicants read their applications" on public.collaborator_applications
 for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Applicants submit applications" on public.collaborator_applications;
create policy "Applicants submit applications" on public.collaborator_applications
 for insert to authenticated with check ((select auth.uid()) = user_id and status = 'pending');

create table if not exists public.collaborator_resources (
 id uuid primary key default gen_random_uuid(),
 contributor_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(trim(title)) between 4 and 180),
 subject text not null check (char_length(trim(subject)) between 2 and 100),
 description text not null default '' check (char_length(description) <= 2000),
 resource_url text not null check (resource_url ~ '^https://drive\.google\.com/(drive/folders/|file/d/)'),
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz
);
create index if not exists collaborator_resources_status_created on public.collaborator_resources(status,created_at desc);
create index if not exists collaborator_resources_contributor on public.collaborator_resources(contributor_id,created_at desc);
alter table public.collaborator_resources enable row level security;
revoke all on public.collaborator_resources from public, anon, authenticated;
grant select on public.collaborator_resources to authenticated;
grant insert (contributor_id,title,subject,description,resource_url) on public.collaborator_resources to authenticated;
drop policy if exists "Students see approved or own submissions" on public.collaborator_resources;
create policy "Students see approved or own submissions" on public.collaborator_resources
 for select to authenticated
 using (status='approved' or contributor_id=(select auth.uid()));
drop policy if exists "Approved collaborators submit resources" on public.collaborator_resources;
create policy "Approved collaborators submit resources" on public.collaborator_resources
 for insert to authenticated
 with check (
  contributor_id=(select auth.uid()) and status='pending'
  and exists(select 1 from public.collaborator_applications ca
    where ca.user_id=(select auth.uid()) and ca.status='approved')
 );

create table if not exists public.flashcard_decks (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(trim(title)) between 2 and 120),
 subject text not null default 'عام' check (char_length(subject) <= 100),
 description text not null default '' check (char_length(description) <= 600),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists flashcard_decks_owner_updated on public.flashcard_decks(owner_id,updated_at desc);
alter table public.flashcard_decks enable row level security;
revoke all on public.flashcard_decks from public, anon, authenticated;
grant select,insert,update,delete on public.flashcard_decks to authenticated;
drop policy if exists "Owners manage flashcard decks" on public.flashcard_decks;
create policy "Owners manage flashcard decks" on public.flashcard_decks
 for all to authenticated
 using ((select auth.uid())=owner_id)
 with check ((select auth.uid())=owner_id);

create table if not exists public.flashcard_cards (
 id uuid primary key default gen_random_uuid(),
 deck_id uuid not null references public.flashcard_decks(id) on delete cascade,
 front text not null check (char_length(trim(front)) between 2 and 2000),
 back text not null check (char_length(trim(back)) between 1 and 4000),
 due_at timestamptz not null default now(),
 interval_days integer not null default 0 check (interval_days between 0 and 3650),
 reviews integer not null default 0 check (reviews between 0 and 100000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists flashcard_cards_deck_due on public.flashcard_cards(deck_id,due_at);
alter table public.flashcard_cards enable row level security;
revoke all on public.flashcard_cards from public, anon, authenticated;
grant select,insert,update,delete on public.flashcard_cards to authenticated;
drop policy if exists "Deck owners manage own flashcards" on public.flashcard_cards;
create policy "Deck owners manage own flashcards" on public.flashcard_cards
 for all to authenticated
 using (exists(select 1 from public.flashcard_decks d where d.id=deck_id and d.owner_id=(select auth.uid())))
 with check (exists(select 1 from public.flashcard_decks d where d.id=deck_id and d.owner_id=(select auth.uid())));

-- PostgREST uses grants and RLS together. Status/review columns intentionally
-- cannot be updated by browser roles; only an administrator with database-level
-- privileges can approve collaborator applications and contributed resources.
