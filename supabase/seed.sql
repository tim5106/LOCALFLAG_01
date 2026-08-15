insert into public.flag_skins (id, name, description, price, asset_url)
values
  ('default-red', 'Local Red', '모든 사용자에게 제공되는 기본 깃발', 0, '/assets/flags/default-red.svg'),
  ('explorer', 'Explorer', '새로운 길을 찾는 탐험가 깃발', 800, '/assets/flags/explorer.svg')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  asset_url = excluded.asset_url;

