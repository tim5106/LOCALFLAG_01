create table public.skin_purchase_receipts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  idempotency_key varchar(100) not null,
  skin_id text not null references public.flag_skins(id) on delete restrict,
  balance_after integer not null check (balance_after >= 0),
  acquired_at timestamptz not null,
  primary key (user_id, idempotency_key)
);

alter table public.skin_purchase_receipts enable row level security;
