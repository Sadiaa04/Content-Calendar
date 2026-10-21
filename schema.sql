-- Content Calendar database.
-- Paste this whole file into Supabase → SQL Editor → New query, then press Run.
-- Each account only ever sees and changes its own videos (row-level security).

create table if not exists public.videos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null,
  kind        text,
  on_screen   text,
  caption     text,
  keywords    text,
  film_date   date,
  edit_date   date,
  post_date   date,
  post_time   time,
  filmed      boolean not null default false,
  edited      boolean not null default false,
  posted      boolean not null default false,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists videos_user_idx on public.videos (user_id, post_date);

alter table public.videos enable row level security;

drop policy if exists "Own videos: read"   on public.videos;
drop policy if exists "Own videos: insert" on public.videos;
drop policy if exists "Own videos: update" on public.videos;
drop policy if exists "Own videos: delete" on public.videos;

create policy "Own videos: read"   on public.videos for select using (auth.uid() = user_id);
create policy "Own videos: insert" on public.videos for insert with check (auth.uid() = user_id);
create policy "Own videos: update" on public.videos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own videos: delete" on public.videos for delete using (auth.uid() = user_id);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists videos_touch on public.videos;
create trigger videos_touch before update on public.videos for each row execute function public.touch_updated_at();

-- Live sync: changes on your phone show up on your laptop without refreshing.
do $$ begin
  alter publication supabase_realtime add table public.videos;
exception when duplicate_object then null; end $$;
