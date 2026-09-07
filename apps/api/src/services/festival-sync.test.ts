import { describe, expect, it, vi } from 'vitest';
import type { TourismRepository } from '../repositories/tourism-repository.js';
import { FestivalSyncService } from './festival-sync.js';

function repository(): TourismRepository {
  return { createBatchRun: vi.fn().mockResolvedValue('batch'), finishBatchRun: vi.fn(),
    upsertSpotAndScore: vi.fn(), recalculateScores: vi.fn().mockResolvedValue(0) };
}

function pagedClient(totalCount: number) {
  const items = Array.from({ length: totalCount }, (_, index) => ({
    contentid: String(index + 1), contenttypeid: '15', title: `Festival ${index + 1}`,
    mapy: '37', mapx: '127', eventstartdate: '20260825', eventenddate: '20260827',
  }));
  return {
    searchFestival: vi.fn(async (_eventStartDate: string, pageNo: number, pageSize: number) => ({
      items: items.slice((pageNo - 1) * pageSize, pageNo * pageSize),
      pageNo, numOfRows: pageSize, totalCount, hasNext: pageNo * pageSize < totalCount,
    })),
    detailCommon: vi.fn().mockResolvedValue(undefined),
    detailIntro: vi.fn().mockResolvedValue(undefined),
    detailInfo: vi.fn().mockResolvedValue([]),
    detailImage: vi.fn().mockResolvedValue([]),
  };
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

  it('processes all festival pages when no source limit is provided', async () => {
    const client = pagedClient(5);
    const repo = repository();

    const result = await new FestivalSyncService(client, repo, () => new Date('2026-08-25T00:00:00Z')).run(2);

    expect(result).toMatchObject({ successCount: 5, failureCount: 0 });
    expect(client.searchFestival).toHaveBeenCalledTimes(3);
    expect(client.detailCommon).toHaveBeenCalledTimes(5);
    expect(repo.upsertSpotAndScore).toHaveBeenCalledTimes(5);
  });

  it('caps total festival items across pages and stops pagination at the limit', async () => {
    const client = pagedClient(10);
    const repo = repository();

    const result = await new FestivalSyncService(client, repo, () => new Date('2026-08-25T00:00:00Z')).run(3, 5);

    expect(result).toMatchObject({ successCount: 5, failureCount: 0 });
    expect(client.searchFestival).toHaveBeenCalledTimes(2);
    expect(client.searchFestival).not.toHaveBeenCalledWith(expect.any(String), 3, 3);
    expect(client.detailCommon).toHaveBeenCalledTimes(5);
    expect(client.detailIntro).toHaveBeenCalledTimes(5);
    expect(client.detailInfo).toHaveBeenCalledTimes(5);
    expect(client.detailImage).toHaveBeenCalledTimes(5);
    expect(repo.upsertSpotAndScore).toHaveBeenCalledTimes(5);
  });

  it('does not fetch later pages or details beyond a limit smaller than one page', async () => {
    const client = pagedClient(10);
    const repo = repository();

    await new FestivalSyncService(client, repo, () => new Date('2026-08-25T00:00:00Z')).run(10, 2);

    expect(client.searchFestival).toHaveBeenCalledTimes(1);
    expect(client.detailCommon).toHaveBeenCalledTimes(2);
    expect(client.detailCommon).toHaveBeenNthCalledWith(1, 1);
    expect(client.detailCommon).toHaveBeenNthCalledWith(2, 2);
    expect(client.detailIntro).toHaveBeenCalledTimes(2);
    expect(client.detailInfo).toHaveBeenCalledTimes(2);
    expect(client.detailImage).toHaveBeenCalledTimes(2);
  });
});
