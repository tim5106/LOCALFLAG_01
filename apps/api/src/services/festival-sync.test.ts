import { describe, expect, it, vi } from 'vitest';
import type { TourismRepository } from '../repositories/tourism-repository.js';
import { FestivalSyncService } from './festival-sync.js';

function repository(): TourismRepository {
  return { createBatchRun: vi.fn().mockResolvedValue('batch'), finishBatchRun: vi.fn(),
    upsertSpotAndScore: vi.fn(), recalculateScores: vi.fn().mockResolvedValue(0) };
}

describe('FestivalSyncService', () => {
  it('normalizes mocked searchFestival2 data and persists lifecycle status', async () => {
    const client = { searchFestival: vi.fn().mockResolvedValue({ items: [{ contentid: '7', contenttypeid: '15',
      title: 'Festival', mapy: '37', mapx: '127', eventstartdate: '20260825', eventenddate: '20260827' }],
      pageNo: 1, numOfRows: 100, totalCount: 1, hasNext: false }),
      detailCommon: vi.fn().mockResolvedValue(undefined), detailIntro: vi.fn().mockResolvedValue(undefined),
      detailInfo: vi.fn().mockResolvedValue([]), detailImage: vi.fn().mockResolvedValue([]) };
    const repo = repository();
    const result = await new FestivalSyncService(client, repo, () => new Date('2026-08-25T00:00:00Z')).run();
    expect(result).toMatchObject({ successCount: 1, failureCount: 0 });
    expect(repo.upsertSpotAndScore).toHaveBeenCalledWith('batch', expect.objectContaining({
      contentId: 7, eventStartDate: '2026-08-25', eventEndDate: '2026-08-27',
    }), expect.any(Object), 'ACTIVE');
  });

  it('accounts for malformed or missing event dates without persistence', async () => {
    const client = { searchFestival: vi.fn().mockResolvedValue({ items: [{ contentid: '7', contenttypeid: '15',
      title: 'Festival', mapy: '37', mapx: '127' }], pageNo: 1, numOfRows: 100, totalCount: 1, hasNext: false }),
      detailCommon: vi.fn(), detailIntro: vi.fn(), detailInfo: vi.fn().mockResolvedValue([]), detailImage: vi.fn().mockResolvedValue([]) };
    const repo = repository();
    const result = await new FestivalSyncService(client, repo).run();
    expect(result.failureCount).toBe(1);
    expect(repo.upsertSpotAndScore).not.toHaveBeenCalled();
  });
});
