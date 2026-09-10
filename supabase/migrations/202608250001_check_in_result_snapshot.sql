alter table public.check_ins
  add column reward_policy_version varchar(20) not null default 'reward-v1',
  add column reward_factors jsonb not null default '{}'::jsonb,
  add column balance_after integer not null default 0 check (balance_after >= 0);

update public.check_ins ci
set balance_after = pl.balance_after,
    reward_policy_version = pl.policy_version,
    reward_factors = coalesce(pl.metadata -> 'factors', '{}'::jsonb)
from public.point_ledger pl
where pl.check_in_id = ci.id;

comment on column public.check_ins.balance_after is
  'Committed point balance snapshot used to return an exact idempotent check-in response.';
