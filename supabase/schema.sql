create extension if not exists "pgcrypto";

create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  date text,
  word text,
  feeling text,
  note text default '',
  media_url text,
  media_type text,
  created_at timestamptz not null default now()
);

-- If you plan to add authentication later, you can add:
-- user_id uuid references auth.users(id) on delete cascade
-- and then apply RLS policies for per-user access.

