import type { Pool } from 'pg';

export class ReversalRuleError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = 'ReversalRuleError'; }
}

export class PostgresPointReversalRepository {
  constructor(private readonly pool: Pool) {}
  async reverse(input: { originalLedgerId: string; idempotencyKey: string; reason: string; now: Date }) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const original = await client.query<{ id: string; user_id: string; amount: number }>(
        `select id, user_id, amount from public.point_ledger where id = $1 and type <> 'REVERSAL' for update`,
        [input.originalLedgerId],
      );
      const row = original.rows[0];
      if (!row) throw new ReversalRuleError('LEDGER_NOT_REVERSIBLE', '되돌릴 거래를 찾을 수 없습니다.');
      const profile = await client.query<{ point_balance: number }>(
        `select point_balance from public.profiles where id = $1 for update`, [row.user_id],
      );
      const existing = await client.query<{ balance_after: number; amount: number }>(
        `select balance_after, amount from public.point_ledger where user_id = $1 and type = 'REVERSAL'
          and metadata ->> 'reversesLedgerId' = $2`, [row.user_id, row.id],
      );
      if (existing.rows[0]) {
        await client.query('commit');
        return { amount: Number(existing.rows[0].amount), balance: Number(existing.rows[0].balance_after), repeated: true };
      }
      const reversalAmount = -Number(row.amount);
      const currentBalance = Number(profile.rows[0]?.point_balance);
      if (currentBalance + reversalAmount < 0) throw new ReversalRuleError('REVERSAL_INSUFFICIENT_BALANCE', '잔액 부족으로 거래를 되돌릴 수 없습니다.');
      const updated = await client.query<{ point_balance: number }>(
        `update public.profiles set point_balance = point_balance + $2 where id = $1 returning point_balance`,
        [row.user_id, reversalAmount],
      );
      const balance = Number(updated.rows[0]?.point_balance);
      await client.query(`insert into public.point_ledger (
          user_id, type, amount, balance_after, policy_version, idempotency_key, metadata, created_at
        ) values ($1, 'REVERSAL', $2, $3, 'reversal-v1', $4, $5::jsonb, $6)`,
      [row.user_id, reversalAmount, balance, input.idempotencyKey,
        JSON.stringify({ reversesLedgerId: row.id, reason: input.reason.slice(0, 200) }), input.now]);
      await client.query('commit');
      return { amount: reversalAmount, balance, repeated: false };
    } catch (error) { await client.query('rollback'); throw error; }
    finally { client.release(); }
  }
}
