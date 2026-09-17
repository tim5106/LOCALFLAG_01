create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  signup_balance integer;
  default_skin_id text;
begin
  insert into public.profiles (id, nickname)
  values (new.id, nullif(new.raw_user_meta_data ->> 'nickname', ''));

  update public.profiles
  set point_balance = point_balance + 1000
  where id = new.id
  returning point_balance into signup_balance;

  insert into public.point_ledger (
    user_id, type, amount, balance_after, policy_version, idempotency_key
  ) values (
    new.id, 'SIGNUP', 1000, signup_balance, 'signup-v1', 'signup-reward-v1'
  );

  insert into public.user_skins (user_id, skin_id)
  select new.id, id from public.flag_skins where id = 'default-red'
  returning skin_id into default_skin_id;

  insert into public.user_map_settings (user_id, equipped_skin_id)
  values (new.id, default_skin_id);

  return new;
end;
$$;
