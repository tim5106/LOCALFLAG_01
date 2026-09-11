insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'dev-test-00000000-0000-0000-0000-000000000001@local-flag.dev', '',
  now(), '{"provider":"email","providers":["email"]}'::jsonb,
  '{"nickname":"테스트유저"}'::jsonb, now(), now()
)
on conflict (id) do nothing;

insert into public.flag_skins (id, name, description, price, asset_url)
values
  ('default-red', 'Local Red', '모든 사용자에게 제공되는 기본 깃발', 0, '/assets/flags/default-red.svg'),
  ('explorer', 'Explorer', '새로운 길을 찾는 탐험가 깃발', 800, '/assets/flags/explorer.svg')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  asset_url = excluded.asset_url;

