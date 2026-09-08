alter table public.tour_spots
  add column geometry_type text not null default 'POINT'
    check (geometry_type in ('POINT', 'AREA')),
  add column check_in_enabled boolean not null default true,
  add column check_in_radius_m integer not null default 100
    check (check_in_radius_m > 0),
  add column reviewed_override boolean not null default false;

comment on column public.tour_spots.reviewed_override is
  'Protects manually reviewed location and check-in policy from TourAPI synchronization.';
