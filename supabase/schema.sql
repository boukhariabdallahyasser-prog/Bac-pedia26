-- Execute in the Supabase SQL Editor for Bac-pedia 2027.
-- Supabase Auth manages passwords, email confirmation, and sessions.
-- RLS ensures every student accesses only their own progress.
create table if not exists public.student_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.student_progress enable row level security;
revoke all on public.student_progress from anon, authenticated;
grant select, insert, update, delete on public.student_progress to authenticated;
drop policy if exists "Students can read own progress" on public.student_progress;
drop policy if exists "Students can insert own progress" on public.student_progress;
drop policy if exists "Students can update own progress" on public.student_progress;
drop policy if exists "Students can delete own progress" on public.student_progress;
create policy "Students can read own progress" on public.student_progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Students can insert own progress" on public.student_progress
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Students can update own progress" on public.student_progress
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Students can delete own progress" on public.student_progress
  for delete to authenticated using ((select auth.uid()) = user_id);
create index if not exists student_progress_updated_at_idx on public.student_progress(updated_at desc);

-- Atomic per-student daily AI quota. No direct table access is granted to clients.
create table if not exists public.ai_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, usage_date)
);
alter table public.ai_usage_daily enable row level security;
revoke all on public.ai_usage_daily from anon, authenticated;

create or replace function public.consume_ai_quota(p_daily_limit integer default 30)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_daily_limit < 1 or p_daily_limit > 1000 then
    raise exception 'Invalid quota limit';
  end if;
  insert into public.ai_usage_daily (user_id, usage_date, request_count)
  values (v_user_id, (timezone('utc', now()))::date, 1)
  on conflict (user_id, usage_date)
  do update set request_count = public.ai_usage_daily.request_count + 1
    where public.ai_usage_daily.request_count < p_daily_limit
  returning request_count into v_count;
  return v_count is not null;
end;
$$;
revoke all on function public.consume_ai_quota(integer) from public, anon;
grant execute on function public.consume_ai_quota(integer) to authenticated;

create policy "AI usage records are server-managed"
on public.ai_usage_daily
for all
to anon, authenticated
using (false)
with check (false);
