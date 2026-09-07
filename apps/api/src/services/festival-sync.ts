import { addKstDays, festivalStatus, kstDate } from '../domain/festival.js';
import { calculateSpotScore } from '../domain/spot-score.js';
import type { TourApiClient } from '../integrations/tour-api/client.js';
import { normalizeTourApiSpot } from '../integrations/tour-api/normalizer.js';
import type { TourismRepository } from '../repositories/tourism-repository.js';

type FestivalClient = Pick<TourApiClient, 'searchFestival' | 'detailCommon' | 'detailIntro' | 'detailInfo' | 'detailImage'>;

export class FestivalSyncService {
  constructor(private readonly client: FestivalClient, private readonly repository: TourismRepository, private readonly now = () => new Date()) {}
  async run(pageSize = 100, sourceLimit?: number) {
    if (sourceLimit !== undefined && (!Number.isSafeInteger(sourceLimit) || sourceLimit <= 0)) {
      throw new Error('Festival sync source limit must be a positive integer.');
    }
    const batchRunId = await this.repository.createBatchRun('FESTIVALS_SYNC');
    let successCount = 0; let failureCount = 0; let pageNo = 1; let selectedCount = 0;
    try {
      let hasNext: boolean;
      do {
        const today = this.now();
        const page = await this.client.searchFestival(addKstDays(today, -3).replaceAll('-', ''), pageNo, pageSize);
        hasNext = page.hasNext;
        const remaining = sourceLimit === undefined ? page.items.length : sourceLimit - selectedCount;
        const selectedItems = sourceLimit === undefined ? page.items : page.items.slice(0, Math.max(0, remaining));
        selectedCount += selectedItems.length;
        for (const list of selectedItems) {
          try {
            const contentId = Number(list.contentid);
            const [common, intro, info, images] = await Promise.all([
              this.client.detailCommon(contentId), this.client.detailIntro(contentId, 15),
              this.client.detailInfo(contentId, 15), this.client.detailImage(contentId),
            ]);
            const normalized = normalizeTourApiSpot({ list: { ...list, contenttypeid: 15 }, common,
              intro: { ...list, ...intro }, info, images });
            if (!normalized.ok || !normalized.value.eventStartDate || !normalized.value.eventEndDate) {
              failureCount += 1; continue;
            }
            const status = festivalStatus(normalized.value.eventStartDate, normalized.value.eventEndDate, kstDate(today));
            await this.repository.upsertSpotAndScore(batchRunId, normalized.value, calculateSpotScore(normalized.value), status);
            successCount += 1;
          } catch { failureCount += 1; }
        }
        if (sourceLimit !== undefined && selectedCount >= sourceLimit) break;
        pageNo += 1;
      } while (hasNext);
      await this.repository.finishBatchRun(batchRunId, { status: 'SUCCESS', successCount, failureCount });
      return { batchRunId, successCount, failureCount };
    } catch (error) {
      await this.repository.finishBatchRun(batchRunId, { status: 'FAILED', successCount, failureCount,
        errorSummary: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}

export async function recalculateSpotScores(repository: TourismRepository) {
  const batchRunId = await repository.createBatchRun('SPOT_SCORES_RECALCULATE');
  try {
    const successCount = await repository.recalculateScores(batchRunId);
    await repository.finishBatchRun(batchRunId, { status: 'SUCCESS', successCount, failureCount: 0 });
    return { batchRunId, successCount, failureCount: 0 };
  } catch (error) {
    await repository.finishBatchRun(batchRunId, { status: 'FAILED', successCount: 0, failureCount: 1,
      errorSummary: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}
