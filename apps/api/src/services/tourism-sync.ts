import { calculateSpotScore } from '../domain/spot-score.js';
import type { TourApiClient, TourApiPage } from '../integrations/tour-api/client.js';
import { normalizeTourApiSpot, type TourApiSpotSource } from '../integrations/tour-api/normalizer.js';
import type { BatchProgress, TourismRepository } from '../repositories/tourism-repository.js';

export interface TourismSyncLogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export interface TourismSyncResult {
  batchRunId: string;
  successCount: number;
  failureCount: number;
}

type TourApiReader = Pick<TourApiClient, 'areaBasedList' | 'detailCommon' | 'detailIntro' | 'detailInfo' | 'detailImage'>;

const defaultLogger: TourismSyncLogger = {
  info: (message, context) => console.info(message, context ?? ''),
  warn: (message, context) => console.warn(message, context ?? ''),
  error: (message, context) => console.error(message, context ?? ''),
};

export class TourismSyncService {
  constructor(
    private readonly client: TourApiReader,
    private readonly repository: TourismRepository,
    private readonly logger: TourismSyncLogger = defaultLogger,
  ) {}

  async run(pageSize = 100): Promise<TourismSyncResult> {
    const batchRunId = await this.repository.createBatchRun('TOUR_SPOTS_SYNC');
    let successCount = 0;
    let failureCount = 0;
    let pageNo = 1;
    let progress: BatchProgress | undefined;

    try {
      let page: TourApiPage;
      do {
        page = await this.client.areaBasedList(pageNo, pageSize);
        for (const listItem of page.items) {
          try {
            const contentId = Number(listItem.contentid);
            const contentTypeId = Number(listItem.contenttypeid);
            const source: TourApiSpotSource = { list: listItem };
            if (Number.isSafeInteger(contentId) && contentId > 0 && Number.isSafeInteger(contentTypeId)) {
              const [common, intro, info, images] = await Promise.all([
                this.client.detailCommon(contentId),
                this.client.detailIntro(contentId, contentTypeId),
                this.client.detailInfo(contentId, contentTypeId),
                this.client.detailImage(contentId),
              ]);
              source.common = common;
              source.intro = intro;
              source.info = info;
              source.images = images;
            }

            const normalized = normalizeTourApiSpot(source);
            if (!normalized.ok) {
              failureCount += 1;
              this.logger.warn('Skipping unusable TourAPI spot.', {
                contentId: listItem.contentid ?? null,
                reason: normalized.reason,
              });
              continue;
            }
            await this.repository.upsertSpotAndScore(
              batchRunId,
              normalized.value,
              calculateSpotScore(normalized.value),
            );
            successCount += 1;
          } catch (error) {
            failureCount += 1;
            this.logger.error('Failed to ingest TourAPI spot.', {
              contentId: listItem.contentid ?? null,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        progress = {
          pageNo: page.pageNo,
          totalCount: page.totalCount,
          processedCount: successCount + failureCount,
        };
        pageNo += 1;
      } while (page.hasNext);

      await this.repository.finishBatchRun(batchRunId, {
        status: 'SUCCESS', successCount, failureCount, ...(progress ? { cursor: progress } : {}),
      });
      this.logger.info('TourAPI sync completed.', { batchRunId, successCount, failureCount });
      return { batchRunId, successCount, failureCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.repository.finishBatchRun(batchRunId, {
        status: 'FAILED', successCount, failureCount, ...(progress ? { cursor: progress } : {}),
        errorSummary: message,
      });
      throw error;
    }
  }
}
