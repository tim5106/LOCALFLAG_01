create unique index point_ledger_single_reversal_unique
  on public.point_ledger ((metadata ->> 'reversesLedgerId'))
  where type = 'REVERSAL' and metadata ? 'reversesLedgerId';
