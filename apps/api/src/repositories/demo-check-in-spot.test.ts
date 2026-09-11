import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  '../../supabase/migrations/202609090001_demo_check_in_spot.sql',
);

describe('controlled demo check-in spot migration', () => {
  it('upserts the reviewed venue and S score without replacing the row', () => {
    const migration = readFileSync(migrationPath, 'utf8');

    expect(migration).toContain('9000000000388');
    expect(migration).toContain("'커피빈 고대안암병원신관점'");
    expect(migration).toContain("'서울특별시 성북구 고려대로 73'");
    expect(migration).toContain('extensions.st_makepoint(127.026357234716, 37.5871109699535)');
    expect(migration).toContain("'ACTIVE'");
    expect(migration).toContain("'POINT'");
    expect(migration).toMatch(/'POINT',\s+true,\s+100,\s+true/);
    expect(migration).toMatch(/210,\s+'S',\s+'spot-score-v1'/);
    expect(migration.match(/on conflict \(content_id\) do update set/g)).toHaveLength(2);
    expect(migration).not.toMatch(/\bdelete\s+from\b/i);
  });
});
