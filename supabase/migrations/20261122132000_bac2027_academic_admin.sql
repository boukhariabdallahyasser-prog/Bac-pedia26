-- BAC 2027 academic administration: additive schema, existing resources untouched.
-- Subject IDs follow the preexisting Bac-pedia educational fields. No new ministerial subject changes assumed.
alter table public.collaborator_resources
  add column if not exists subject_key text,
  add column if not exists specialization_code text,
  add column if not exists content_group text,
  add column if not exists exam_year integer;
alter table public.collaborator_resources
  add constraint bac2027_resource_group_check
  check (content_group is null or content_group in ('lessons','exercises','summaries','tests','bac','other'));
alter table public.collaborator_resources
  add constraint bac2027_specialization_code_check
  check (specialization_code is null or specialization_code in ('electrical','civil','mechanical','process','german','spanish','italian'));
alter table public.collaborator_resources
  add constraint bac2027_exam_year_check
  check (exam_year is null or exam_year between 1962 and 2035);
alter table public.collaborator_resources
  add constraint bac2027_subject_key_valid_check
  check (subject_key is null or subject_key in (
    'math_math','math_science','math_lit','math_eco','physics_math','physics_science',
    'natural_math','arabic_sci','arabic_lit','french_sci','french_lit','english_sci','english_lit',
    'history_sci','history_lit','islamic','philo_sci','philo_lit','philo_lang',
    'tech_subject','third_lang','economy_subject','law'
  ));
create index if not exists bac2027_resource_scope_idx
 on public.collaborator_resources (status,academic_branch,subject_key,specialization_code,content_group);

-- Only the verified single owner may publish resources without a contributor application.
drop policy if exists "Verified owner inserts published academic resources" on public.collaborator_resources;
create policy "Verified owner inserts published academic resources"
 on public.collaborator_resources for insert to authenticated
 with check (
  contributor_id=(select auth.uid()) and status='approved' and
  exists (select 1 from public.platform_roles p
     where p.user_id=(select auth.uid()) and p.role='admin')
 );

drop policy if exists "Verified owner edits own published resource" on public.collaborator_resources;
create policy "Verified owner edits own published resource"
 on public.collaborator_resources for update to authenticated
 using (contributor_id=(select auth.uid()) and
   exists(select 1 from public.platform_roles p where p.user_id=(select auth.uid()) and p.role='admin'))
 with check (contributor_id=(select auth.uid()) and status='approved' and
   exists(select 1 from public.platform_roles p where p.user_id=(select auth.uid()) and p.role='admin'));

create table if not exists public.bac_curriculum_units(
 id uuid primary key default gen_random_uuid(),
 branch_code text not null check(branch_code in ('math','science','tech','literature','languages','economy')),
 specialization_code text check(specialization_code is null or specialization_code in ('electrical','civil','mechanical','process','german','spanish','italian')),
 subject_key text not null check (char_length(subject_key) between 3 and 80),
 title text not null check (char_length(btrim(title)) between 3 and 160),
 description text not null default '' check(char_length(description)<=800),
 academic_year text not null default '2026-2027' check(academic_year ~ '^20[0-9]{2}-20[0-9]{2}$'),
 source_type text not null default 'editorial' check(source_type in ('editorial','official_cited')),
 source_url text check(source_url is null or (source_url like 'https://%' and char_length(source_url)<=1800)),
 is_published boolean not null default false,
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint cited_official_unit_requires_link check(source_type<>'official_cited' or source_url is not null),
 constraint specialization_branch_consistency check (
  specialization_code is null
  or branch_code='tech' and specialization_code in ('electrical','civil','mechanical','process')
  or branch_code='languages' and specialization_code in ('german','spanish','italian')
 )
);
create index if not exists bac_curriculum_units_lookup_idx
 on public.bac_curriculum_units (academic_year,branch_code,subject_key,is_published);
alter table public.bac_curriculum_units enable row level security;
revoke all on public.bac_curriculum_units from public,anon,authenticated;
grant select,insert,update on public.bac_curriculum_units to authenticated;
drop policy if exists "Read published units or owner" on public.bac_curriculum_units;
create policy "Read published units or owner"
 on public.bac_curriculum_units for select to authenticated
 using (is_published or exists(select 1 from public.platform_roles p where p.user_id=(select auth.uid()) and p.role='admin'));
drop policy if exists "Owner inserts curriculum units" on public.bac_curriculum_units;
create policy "Owner inserts curriculum units"
 on public.bac_curriculum_units for insert to authenticated
 with check (created_by=(select auth.uid()) and exists(select 1 from public.platform_roles p where p.user_id=(select auth.uid()) and p.role='admin'));
drop policy if exists "Owner edits curriculum units" on public.bac_curriculum_units;
create policy "Owner edits curriculum units"
 on public.bac_curriculum_units for update to authenticated
 using (exists(select 1 from public.platform_roles p where p.user_id=(select auth.uid()) and p.role='admin'))
 with check (exists(select 1 from public.platform_roles p where p.user_id=(select auth.uid()) and p.role='admin'));

-- Admin-owned PDF files can be uploaded directly to a private bucket and are
-- readable by students only after the resource and attachment are approved.
drop policy if exists "Admin uploads approved resource PDF" on storage.objects;
create policy "Admin uploads approved resource PDF"
 on storage.objects for insert to authenticated
 with check(
  bucket_id='bac-resource-pdfs' and
  name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}[.]pdf$' and
  split_part(name,'/',1)=(select auth.uid())::text and
  exists(select 1 from public.platform_roles p where p.user_id=(select auth.uid()) and p.role='admin') and
  exists(select 1 from public.collaborator_resources r
    where r.id::text=split_part(name,'/',2) and r.contributor_id=(select auth.uid()) and r.status='approved')
 );
drop policy if exists "Admin attaches approved resource PDF" on public.resource_pdf_attachments;
create policy "Admin attaches approved resource PDF"
 on public.resource_pdf_attachments for insert to authenticated
 with check(
  contributor_id=(select auth.uid()) and
  split_part(storage_path,'/',1)=(select auth.uid())::text and
  split_part(storage_path,'/',2)=resource_id::text and
  exists(select 1 from public.platform_roles p where p.user_id=(select auth.uid()) and p.role='admin') and
  exists(select 1 from public.collaborator_resources r
   where r.id=resource_id and r.contributor_id=(select auth.uid()) and r.status='approved')
 );

comment on table public.bac_curriculum_units is 'Owner-curated 3AS sections. Owner-curated educational sections require a cited source to be called official.';
