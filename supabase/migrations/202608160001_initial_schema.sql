create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.profile_status as enum ('ACTIVE', 'SUSPENDED', 'DELETED');
create type public.spot_status as enum ('SCHEDULED', 'ACTIVE', 'INACTIVE', 'EXPIRED');
create type public.check_in_status as enum ('SUCCESS', 'REVIEW', 'REJECTED');
create type public.point_transaction_type as enum ('CHECK_IN', 'PURCHASE', 'REVERSAL', 'ADMIN_ADJUSTMENT');
create type public.batch_status as enum ('RUNNING', 'SUCCESS', 'FAILED');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname varchar(30),
  point_balance integer not null default 0 check (point_balance >= 0),
  status public.profile_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.declining_areas (
  id uuid primary key default gen_random_uuid(),
  area_name text not null,
  sigungu_name text not null,
  tour_area_code integer not null,
  tour_sigungu_code integer not null,
  effective_from date not null,
  effective_to date,
  source text not null,
  verified_at timestamptz not null default now(),
  unique (tour_area_code, tour_sigungu_code, effective_from)
);

create table public.batch_runs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  status public.batch_status not null default 'RUNNING',
  cursor jsonb,
  success_count integer not null default 0 check (success_count >= 0),
  failure_count integer not null default 0 check (failure_count >= 0),
  error_summary text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.tour_spots (
  content_id bigint primary key,
  content_type_id smallint not null,
  title varchar(255) not null,
  address varchar(500) not null default '',
  location extensions.geography(point, 4326) not null,
  area_code integer,
  sigungu_code integer,
  is_declining_area boolean not null default false,
  image_url text,
  thumbnail_url text,
  status public.spot_status not null default 'INACTIVE',
  event_start_date date,
  event_end_date date,
  raw_json jsonb not null default '{}'::jsonb,
  last_batch_run_id uuid references public.batch_runs(id) on delete set null,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (content_type_id in (12, 14, 15, 28, 32, 38, 39)),
  check (event_end_date is null or event_start_date is null or event_end_date >= event_start_date)
);

create index tour_spots_location_gix on public.tour_spots using gist (location);
create index tour_spots_filter_idx on public.tour_spots (status, content_type_id, area_code, sigungu_code);

create table public.spot_scores (
  content_id bigint primary key references public.tour_spots(content_id) on delete cascade,
  category_weight numeric(4, 2) not null,
  media_weight numeric(4, 2) not null default 0,
  detail_weight numeric(4, 2) not null default 0,
  class_weight numeric(4, 2) not null default 0,
  quiet_weight numeric(4, 2) not null default 1,
  spot_score numeric(10, 2) not null check (spot_score >= 0),
  grade char(1) not null check (grade in ('S', 'A', 'B', 'C')),
  score_version varchar(20) not null,
  calculated_at timestamptz not null default now()
);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_id bigint not null references public.tour_spots(content_id) on delete restrict,
  location extensions.geography(point, 4326) not null,
  accuracy_m numeric(8, 2) not null check (accuracy_m > 0),
  distance_m numeric(10, 2) not null check (distance_m >= 0),
  client_captured_at timestamptz not null,
  status public.check_in_status not null,
  risk_code text,
  risk_score numeric(5, 2) not null default 0,
  reward_points integer not null default 0 check (reward_points >= 0),
  idempotency_key varchar(100) not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index check_ins_user_created_idx on public.check_ins (user_id, created_at desc);
create index check_ins_content_created_idx on public.check_ins (content_id, created_at desc);
create unique index check_ins_first_reward_unique
  on public.check_ins (user_id, content_id)
  where status = 'SUCCESS' and reward_points > 0;

create table public.point_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  check_in_id uuid references public.check_ins(id) on delete restrict,
  type public.point_transaction_type not null,
  amount integer not null check (amount <> 0),
  balance_after integer not null check (balance_after >= 0),
  policy_version varchar(20) not null,
  idempotency_key varchar(100) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index point_ledger_user_created_idx on public.point_ledger (user_id, created_at desc);

create table public.flag_skins (
  id text primary key,
  name text not null,
  description text not null default '',
  price integer not null default 0 check (price >= 0),
  asset_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_skins (
  user_id uuid not null references public.profiles(id) on delete cascade,
  skin_id text not null references public.flag_skins(id) on delete restrict,
  acquired_at timestamptz not null default now(),
  primary key (user_id, skin_id)
);

create table public.user_map_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  equipped_skin_id text references public.flag_skins(id) on delete set null,
  map_theme text not null default 'classic',
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger tour_spots_set_updated_at before update on public.tour_spots
for each row execute function public.set_updated_at();
create trigger flag_skins_set_updated_at before update on public.flag_skins
for each row execute function public.set_updated_at();
create trigger user_map_settings_set_updated_at before update on public.user_map_settings
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, nullif(new.raw_user_meta_data ->> 'nickname', ''));

  insert into public.user_map_settings (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.declining_areas enable row level security;
alter table public.batch_runs enable row level security;
alter table public.tour_spots enable row level security;
alter table public.spot_scores enable row level security;
alter table public.check_ins enable row level security;
alter table public.point_ledger enable row level security;
alter table public.flag_skins enable row level security;
alter table public.user_skins enable row level security;
alter table public.user_map_settings enable row level security;

create policy "public reads active spots"
on public.tour_spots for select
to anon, authenticated
using (status in ('SCHEDULED', 'ACTIVE'));

create policy "public reads scores for visible spots"
on public.spot_scores for select
to anon, authenticated
using (
  exists (
    select 1 from public.tour_spots
    where tour_spots.content_id = spot_scores.content_id
      and tour_spots.status in ('SCHEDULED', 'ACTIVE')
  )
);

create policy "public reads active declining areas"
on public.declining_areas for select
to anon, authenticated
using (effective_to is null or effective_to >= current_date);

create policy "users read own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "users update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "users read own check-ins"
on public.check_ins for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users read own point ledger"
on public.point_ledger for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "public reads active flag skins"
on public.flag_skins for select
to anon, authenticated
using (is_active);

create policy "users read own skins"
on public.user_skins for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users read own map settings"
on public.user_map_settings for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users update own map settings with owned skin"
on public.user_map_settings for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    equipped_skin_id is null
    or exists (
      select 1 from public.user_skins
      where user_skins.user_id = (select auth.uid())
        and user_skins.skin_id = user_map_settings.equipped_skin_id
    )
  )
);

revoke update on table public.profiles from authenticated;
grant update (nickname) on table public.profiles to authenticated;
