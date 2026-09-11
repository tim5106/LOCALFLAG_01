-- Controlled offline-demo venue. This record is intentionally separate from the Jongno MVP seed.
insert into public.tour_spots (
  content_id,
  content_type_id,
  title,
  address,
  location,
  area_code,
  sigungu_code,
  is_declining_area,
  status,
  raw_json,
  geometry_type,
  check_in_enabled,
  check_in_radius_m,
  reviewed_override
)
values (
  9000000000388,
  12,
  '커피빈 고대안암병원신관점',
  '서울특별시 성북구 고려대로 73',
  extensions.st_setsrid(
    extensions.st_makepoint(127.026357234716, 37.5871109699535),
    4326
  )::extensions.geography,
  1,
  17,
  false,
  'ACTIVE',
  jsonb_build_object(
    'source', 'Coffee Bean Korea store locator',
    'sourceStoreNo', 388,
    'purpose', 'controlled-offline-demo'
  ),
  'POINT',
  true,
  100,
  true
)
on conflict (content_id) do update set
  content_type_id = excluded.content_type_id,
  title = excluded.title,
  address = excluded.address,
  location = excluded.location,
  area_code = excluded.area_code,
  sigungu_code = excluded.sigungu_code,
  is_declining_area = excluded.is_declining_area,
  status = excluded.status,
  raw_json = public.tour_spots.raw_json || excluded.raw_json,
  geometry_type = excluded.geometry_type,
  check_in_enabled = excluded.check_in_enabled,
  check_in_radius_m = excluded.check_in_radius_m,
  reviewed_override = excluded.reviewed_override;

insert into public.spot_scores (
  content_id,
  category_weight,
  media_weight,
  detail_weight,
  class_weight,
  quiet_weight,
  spot_score,
  grade,
  score_version,
  calculated_at
)
values (
  9000000000388,
  1.5,
  0,
  0.2,
  0.2,
  1,
  210,
  'S',
  'spot-score-v1',
  now()
)
on conflict (content_id) do update set
  category_weight = excluded.category_weight,
  media_weight = excluded.media_weight,
  detail_weight = excluded.detail_weight,
  class_weight = excluded.class_weight,
  quiet_weight = excluded.quiet_weight,
  spot_score = excluded.spot_score,
  grade = excluded.grade,
  score_version = excluded.score_version,
  calculated_at = excluded.calculated_at;
