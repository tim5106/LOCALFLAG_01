import { describe, expect, it, vi } from 'vitest';
import type { NormalizedTourSpot, SpotScore } from '../domain/tourism.js';
import type { TourApiPage } from '../integrations/tour-api/client.js';
import type {
  FinishBatchInput,
  TourismRepository,
} from '../repositories/tourism-repository.js';
import { TourismSyncService } from './tourism-sync.js';

class MemoryRepository implements TourismRepository {
  readonly spots = new Map<number, { spot: NormalizedTourSpot; score: SpotScore }>();
  finishes: FinishBatchInput[] = [];

  async createBatchRun(): Promise<string> { return 'batch-1'; }
  async finishBatchRun(_id: string, input: FinishBatchInput): Promise<void> { this.finishes.push(input); }
  async recalculateScores(): Promise<number> { return this.spots.size; }
  async upsertSpotAndScore(_id: string, spot: NormalizedTourSpot, score: SpotScore): Promise<void> {
    this.spots.set(spot.contentId, { spot, score });
  }
}

function page(items: Record<string, unknown>[]): TourApiPage {
  return { items, pageNo: 1, numOfRows: 100, totalCount: items.length, hasNext: false };
}

function client(items: Record<string, unknown>[]) {
  return {
    areaBasedList: vi.fn().mockResolvedValue(page(items)),
    detailCommon: vi.fn().mockResolvedValue(undefined),
    detailIntro: vi.fn().mockResolvedValue(undefined),
    detailInfo: vi.fn().mockResolvedValue([]),
    detailImage: vi.fn().mockResolvedValue([]),
  };
}

const source = {
  contentid: '7', contenttypeid: '12', title: 'Original', mapy: '37.5', mapx: '127.1',
};

describe('TourismSyncService', () => {
  it('upserts the spot and its score, and remains idempotent on repeated sync', async () => {
    const repository = new MemoryRepository();
    const firstClient = client([source]);
    await new TourismSyncService(firstClient, repository).run();
    expect(repository.spots.size).toBe(1);
    expect(repository.spots.get(7)?.score).toMatchObject({ spotScore: 150, grade: 'A' });

    const updatedClient = client([{ ...source, title: 'Updated' }]);
    await new TourismSyncService(updatedClient, repository).run();
    expect(repository.spots.size).toBe(1);
    expect(repository.spots.get(7)?.spot.title).toBe('Updated');
    expect(repository.finishes.at(-1)).toMatchObject({ status: 'SUCCESS', successCount: 1, failureCount: 0 });
  });

  it('counts invalid coordinates without persisting fake locations', async () => {
    const repository = new MemoryRepository();
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const invalidClient = client([{ ...source, mapx: '0' }]);
    const result = await new TourismSyncService(invalidClient, repository, logger).run();
    expect(result).toMatchObject({ successCount: 0, failureCount: 1 });
    expect(repository.spots.size).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith('Skipping unusable TourAPI spot.', expect.objectContaining({
      reason: 'MISSING_OR_ZERO_COORDINATES',
    }));
  });

  it('marks a batch failed when pagination terminates unexpectedly', async () => {
    const repository = new MemoryRepository();
    const brokenClient = client([]);
    brokenClient.areaBasedList.mockRejectedValue(new Error('upstream down'));
    await expect(new TourismSyncService(brokenClient, repository).run()).rejects.toThrow('upstream down');
    expect(repository.finishes).toEqual([expect.objectContaining({
      status: 'FAILED', successCount: 0, failureCount: 0, errorSummary: 'upstream down',
    })]);
  });
});
