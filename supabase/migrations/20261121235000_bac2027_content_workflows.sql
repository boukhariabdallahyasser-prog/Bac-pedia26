-- BAC-PEDIA 2027: additive, private-by-default contribution workflows.
-- No existing records or columns are deleted or rewritten.
create table if not exists public.contributor_drafts (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '' check(length(title)<=180),
  subject text not null default '' check(length(subject)<=100),
  academic_branch text not null default 'جميع الشعب' check(length(academic_branch)<=100),
  resource_kind text not null default 'other' check(resource_kind in ('lesson','summary','exercise','exam','video','other')),
  unit_title text not null default '' check(length(unit_title)<=120),
  description text not null default '' check(length(description)<=2000),
  resource_url text not null default '' check(length(resource_url)<=2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contributor_drafts_owner_idx on public.contributor_drafts(contributor_id,updated_at desc);
alter table public.contributor_drafts enable row level security;
revoke all on public.contributor_drafts from public,anon,authenticated;
grant select,insert,update,delete on public.contributor_drafts to authenticated;
create policy "Contributor owns drafts select" on public.contributor_drafts for select to authenticated using (contributor_id=(select auth.uid()));
create policy "Contributor owns drafts insert" on public.contributor_drafts for insert to authenticated with check (
 contributor_id=(select auth.uid()) and exists (
 select 1 from public.collaborator_applications a where a.user_id=(select auth.uid()) and a.status='approved'));
create policy "Contributor owns drafts update" on public.contributor_drafts for update to authenticated
 using(contributor_id=(select auth.uid()))
 with check(contributor_id=(select auth.uid()) and exists (
 select 1 from public.collaborator_applications a where a.user_id=(select auth.uid()) and a.status='approved'));
create policy "Contributor owns drafts delete" on public.contributor_drafts for delete to authenticated using(contributor_id=(select auth.uid()));

create table if not exists public.contributor_resource_versions (
  id bigint generated always as identity primary key,
  resource_id uuid not null references public.collaborator_resources(id) on delete cascade,
  contributor_id uuid not null references auth.users(id) on delete cascade,
  old_fields jsonb not null,
  changed_at timestamptz not null default now()
);
create index if not exists contributor_resource_versions_resource_idx on public.contributor_resource_versions(resource_id,changed_at desc);
alter table public.contributor_resource_versions enable row level security;
revoke all on public.contributor_resource_versions from public,anon,authenticated;
grant select on public.contributor_resource_versions to authenticated;
create policy "Version history private to owner or contributor" on public.contributor_resource_versions for select to authenticated using(
 contributor_id=(select auth.uid()) or exists (
 select 1 from public.platform_roles p where p.user_id=(select auth.uid()) and p.role='admin'));
create schema if not exists bac_private;
create or replace function bac_private.capture_resource_version()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if row(new.title,new.subject,new.description,new.resource_url,new.resource_kind,new.unit_title,new.academic_branch,new.status)
 is distinct from row(old.title,old.subject,old.description,old.resource_url,old.resource_kind,old.unit_title,old.academic_branch,old.status) then
  insert into public.contributor_resource_versions(resource_id,contributor_id,old_fields)
  values (old.id,old.contributor_id,jsonb_build_object(
   'title',old.title,'subject',old.subject,'description',old.description,'resource_url',old.resource_url,
   'resource_kind',old.resource_kind,'unit_title',old.unit_title,'academic_branch',old.academic_branch,'status',old.status));
 end if;
 return new;
end $$;
revoke all on function bac_private.capture_resource_version() from public,anon,authenticated;
drop trigger if exists resource_version_audit on public.collaborator_resources;
create trigger resource_version_audit after update on public.collaborator_resources
 for each row execute function bac_private.capture_resource_version();

create table if not exists public.contributor_private_feedback (
 id uuid primary key default gen_random_uuid(),
 resource_id uuid not null references public.collaborator_resources(id) on delete cascade,
 contributor_id uuid not null references auth.users(id) on delete cascade,
 admin_id uuid not null references auth.users(id) on delete cascade,
 message text not null check(length(trim(message)) between 5 and 2000),
 created_at timestamptz not null default now()
);
create index if not exists contributor_feedback_owner_idx on public.contributor_private_feedback(contributor_id,created_at desc);
alter table public.contributor_private_feedback enable row level security;
revoke all on public.contributor_private_feedback from public,anon,authenticated;
grant select,insert on public.contributor_private_feedback to authenticated;
create policy "Contributors see only own private feedback" on public.contributor_private_feedback for select to authenticated using(
 contributor_id=(select auth.uid()) or exists (
 select 1 from public.platform_roles p where p.user_id=(select auth.uid()) and p.role='admin'));
create policy "Verified owner writes contributor feedback" on public.contributor_private_feedback for insert to authenticated with check(
 admin_id=(select auth.uid())
 and exists(select 1 from public.platform_roles p where p.user_id=(select auth.uid()) and p.role='admin')
 and exists(select 1 from public.collaborator_resources r where r.id=resource_id and r.contributor_id=contributor_id));

create table if not exists public.resource_reviews (
 id uuid primary key default gen_random_uuid(),
 resource_id uuid not null references public.collaborator_resources(id) on delete cascade,
 reviewer_id uuid not null references auth.users(id) on delete cascade,
 rating smallint check(rating between 1 and 5),
 report_reason text check(report_reason in ('broken_link','incorrect_solution','copyright','inappropriate','other')),
 report_detail text not null default '' check(length(report_detail)<=1000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint resource_reviews_meaningful check(rating is not null or report_reason is not null),
 constraint resource_reviews_unique_per_student unique(resource_id,reviewer_id)
);
create index if not exists resource_reviews_resource_idx on public.resource_reviews(resource_id);
alter table public.resource_reviews enable row level security;
revoke all on public.resource_reviews from public,anon,authenticated;
grant select,insert,update,delete on public.resource_reviews to authenticated;
create policy "Students see own reviews or admin all" on public.resource_reviews for select to authenticated using(
 reviewer_id=(select auth.uid()) or exists(select 1 from public.platform_roles p where p.user_id=(select auth.uid()) and p.role='admin'));
create policy "Students review approved resources" on public.resource_reviews for insert to authenticated with check(
 reviewer_id=(select auth.uid()) and exists(select 1 from public.collaborator_resources r where r.id=resource_id and r.status='approved'));
create policy "Students change only own reviews" on public.resource_reviews for update to authenticated using(
 reviewer_id=(select auth.uid())) with check(reviewer_id=(select auth.uid()) and
 exists(select 1 from public.collaborator_resources r where r.id=resource_id and r.status='approved'));
create policy "Students delete own reviews" on public.resource_reviews for delete to authenticated using(reviewer_id=(select auth.uid()));

-- Direct PDFs: private storage bucket. Student access is only through approved resource attachments.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('bac-resource-pdfs','bac-resource-pdfs',false,15728640,array['application/pdf'])
on conflict (id) do nothing;
create table if not exists public.resource_pdf_attachments(
 resource_id uuid primary key references public.collaborator_resources(id) on delete cascade,
 contributor_id uuid not null references auth.users(id) on delete cascade,
 storage_path text not null unique,
 file_size integer not null check(file_size between 1 and 15728640),
 created_at timestamptz not null default now(),
 check(storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}[.]pdf$')
);
alter table public.resource_pdf_attachments enable row level security;
revoke all on public.resource_pdf_attachments from public,anon,authenticated;
grant select,insert,delete on public.resource_pdf_attachments to authenticated;
create policy "Read own or approved PDFs or admin" on public.resource_pdf_attachments for select to authenticated using(
 contributor_id=(select auth.uid()) or exists(
 select 1 from public.collaborator_resources r where r.id=resource_id and r.status='approved')
 or exists(select 1 from public.platform_roles p where p.user_id=(select auth.uid()) and p.role='admin'));
create policy "Contributor attaches own pending PDF" on public.resource_pdf_attachments for insert to authenticated with check(
 contributor_id=(select auth.uid()) and storage_path like (select auth.uid())::text||'/%'
 and exists(select 1 from public.collaborator_resources r where r.id=resource_id and r.contributor_id=(select auth.uid()) and r.status='pending')
 and split_part(storage_path,'/',2)=resource_id::text);
create policy "Contributor detaches pending PDF" on public.resource_pdf_attachments for delete to authenticated using(
 contributor_id=(select auth.uid()) and exists(select 1 from public.collaborator_resources r where r.id=resource_id and r.status<>'approved'));

create policy "Verified contributor uploads PDF" on storage.objects for insert to authenticated with check(
 bucket_id='bac-resource-pdfs'
 and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}[.]pdf$'
 and split_part(name,'/',1)=(select auth.uid())::text
 and exists(select 1 from public.collaborator_resources r where r.id::text=split_part(name,'/',2)
 and r.contributor_id=(select auth.uid()) and r.status='pending')
);
create policy "Owner and approved students read PDF" on storage.objects for select to authenticated using(
 bucket_id='bac-resource-pdfs' and (
 split_part(name,'/',1)=(select auth.uid())::text or
 exists(select 1 from public.resource_pdf_attachments a
 join public.collaborator_resources r on r.id=a.resource_id
 where a.storage_path=name and r.status='approved') or
 exists(select 1 from public.platform_roles p where p.user_id=(select auth.uid()) and p.role='admin'))
);
create policy "Contributor deletes pending PDF" on storage.objects for delete to authenticated using(
 bucket_id='bac-resource-pdfs' and split_part(name,'/',1)=(select auth.uid())::text
 and exists(select 1 from public.collaborator_resources r where r.id::text=split_part(name,'/',2)
 and r.contributor_id=(select auth.uid()) and r.status<>'approved')
);


-- Human-verified solution status: AI results cannot write to this table.
create table if not exists public.resource_verifications(
 resource_id uuid primary key references public.collaborator_resources(id) on delete cascade,
 verified_by uuid not null references auth.users(id) on delete cascade,
 verification_note text not null check(length(trim(verification_note)) between 15 and 1200),
 verified_at timestamptz not null default now()
);
alter table public.resource_verifications enable row level security;
revoke all on public.resource_verifications from public,anon,authenticated;
grant select,insert,update,delete on public.resource_verifications to authenticated;
create policy "Read published human verification" on public.resource_verifications for select to authenticated using(
 exists(select 1 from public.collaborator_resources r where r.id=resource_id and
 (r.status='approved' or r.contributor_id=(select auth.uid())))
 or exists(select 1 from public.platform_roles p where p.user_id=(select auth.uid()) and p.role='admin'));
create policy "Owner alone verifies solution" on public.resource_verifications for insert to authenticated with check(
 verified_by=(select auth.uid()) and exists(select 1 from public.platform_roles p where p.user_id=(select auth.uid()) and p.role='admin')
 and exists(select 1 from public.collaborator_resources r where r.id=resource_id and r.resource_kind in ('exercise','exam')));
create policy "Owner alone edits verification" on public.resource_verifications for update to authenticated
 using(verified_by=(select auth.uid()) and exists(select 1 from public.platform_roles p where p.user_id=(select auth.uid()) and p.role='admin'))
 with check(verified_by=(select auth.uid()) and exists(select 1 from public.platform_roles p where p.user_id=(select auth.uid()) and p.role='admin'));
create policy "Owner alone removes verification" on public.resource_verifications for delete to authenticated using(
 exists(select 1 from public.platform_roles p where p.user_id=(select auth.uid()) and p.role='admin'));

-- Read-only reputation based solely on approved, published contributions.
create or replace view public.contributor_reputation with (security_invoker=true) as
select contributor_id,count(*)::integer as approved_contributions,
       (count(*)*10)::integer as reputation_points
from public.collaborator_resources where status='approved'
group by contributor_id;
revoke all on public.contributor_reputation from public,anon,authenticated;
grant select on public.contributor_reputation to authenticated;
