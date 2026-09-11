import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { applyJongnoMvpSeed } from './jongno-mvp-seed.js';

const sourcePath = resolve(process.cwd(), '../../data/jongno_mvp_shortlist.json');
const migrationPath = resolve(process.cwd(), '../../supabase/migrations/202609080001_jongno_check_in_policy.sql');

describe('Jongno MVP reviewed seed', () => {
  it('applies exactly the verified 15-record policy from the authoritative JSON', async () => {
    const source = JSON.parse(readFileSync(sourcePath, 'utf8')) as unknown;
    const query = vi.fn().mockResolvedValue({ rows: [{ applied_count: 15 }] });

    await expect(applyJongnoMvpSeed({ query } as unknown as Pool, source)).resolves.toBe(15);

    const sql = String(query.mock.calls[0]?.[0]);
    const records = JSON.parse(String(query.mock.calls[0]?.[1]?.[0])) as Array<{
      contentId: number; title: string; lat: number; lng: number;
      geometryType: 'POINT' | 'AREA'; checkInEnabled: boolean; checkInRadiusM: number;
    }>;
    expect(records).toHaveLength(15);
    expect(records.filter((spot) => spot.geometryType === 'POINT' && spot.checkInEnabled)).toHaveLength(12);
    expect(records.filter((spot) => spot.geometryType === 'AREA' && !spot.checkInEnabled)).toHaveLength(3);
    expect(records.find((spot) => spot.title === '국립기상박물관')).toMatchObject({
      contentId: 3038260, lat: 37.571416, lng: 126.966261, checkInRadiusM: 100,
    });
    expect(records.find((spot) => spot.title === '윤동주 하숙집 터')).toMatchObject({
      contentId: 2993372, lat: 37.58148, lng: 126.965722,
      geometryType: 'POINT', checkInEnabled: true, checkInRadiusM: 60,
    });
    expect(sql).toContain('on conflict (content_id) do update set');
    expect(sql).toContain('reviewed_override = true');
    expect(sql).toContain('on conflict (content_id) do nothing');
  });

  it('gives existing non-reviewed spots the legacy-safe defaults', () => {
    const migration = readFileSync(migrationPath, 'utf8');
    expect(migration).toContain("geometry_type text not null default 'POINT'");
    expect(migration).toContain('check_in_enabled boolean not null default true');
    expect(migration).toContain('check_in_radius_m integer not null default 100');
    expect(migration).toContain('check (check_in_radius_m > 0)');
    expect(migration).toContain('reviewed_override boolean not null default false');
  });
});
