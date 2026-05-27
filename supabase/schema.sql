create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date text,
  word text,
  feeling text,
  note text default '',
  media_url text,
  media_type text,
  created_at timestamptz not null default now()
);

-- Existing projects may already have diary_entries without user_id.
-- Add missing columns safely for migration scenarios.
alter table public.diary_entries
  add column if not exists user_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'diary_entries_user_id_fkey'
  ) then
    alter table public.diary_entries
      add constraint diary_entries_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

alter table public.profiles enable row level security;
alter table public.diary_entries enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "diary_select_own" on public.diary_entries;
create policy "diary_select_own"
  on public.diary_entries for select
  using (auth.uid() = user_id);

drop policy if exists "diary_insert_own" on public.diary_entries;
create policy "diary_insert_own"
  on public.diary_entries for insert
  with check (auth.uid() = user_id);

drop policy if exists "diary_update_own" on public.diary_entries;
create policy "diary_update_own"
  on public.diary_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "diary_delete_own" on public.diary_entries;
create policy "diary_delete_own"
  on public.diary_entries for delete
  using (auth.uid() = user_id);

