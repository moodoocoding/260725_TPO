create extension if not exists pgcrypto;

create table if not exists public.story_runs (
  id uuid primary key default gen_random_uuid(),
  guest_id text,
  scenario_slug text not null,
  selected_item_ids jsonb not null default '[]'::jsonb,
  elapsed_seconds integer not null check (elapsed_seconds between 0 and 60),
  score_total integer not null check (score_total between 0 and 100),
  score_breakdown jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists story_runs_scenario_score_idx
  on public.story_runs (scenario_slug, score_total desc);

alter table public.story_runs enable row level security;

-- The browser cannot write scores directly. The server-side score endpoint
-- inserts with SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.
