alter table public.check_ins
  add column review_decision text check (review_decision in ('APPROVE', 'REJECT')),
  add column reviewed_at timestamptz,
  add column review_original_risk_code text;
