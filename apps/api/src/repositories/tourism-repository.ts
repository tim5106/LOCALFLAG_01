import type { Pool, PoolClient } from 'pg';
import type { NormalizedTourSpot, SpotScore } from '../domain/tourism.js';

export interface BatchProgress {
  pageNo: number;
  totalCount: number;
  processedCount: number;
}

export interface FinishBatchInput {
  status: 'SUCCESS' | 'FAILED';
  successCount: number;
  failureCount: number;
  cursor?: BatchProgress;
  errorSummary?: string;
}

export interface TourismRepository {
  createBatchRun(jobType: string): Promise<string>;
  finishBatchRun(batchRunId: string, input: FinishBatchInput): Promise<void>;
  upsertSpotAndScore(batchRunId: string, spot: NormalizedTourSpot, score: SpotScore, status?: 'SCHEDULED' | 'ACTIVE' | 'EXPIRED'): Promise<void>;
  recalculateScores(batchRunId: string): Promise<number>;
}

export class PostgresTourismRepository implements TourismRepository {
  constructor(private readonly pool: Pool) {}

  async createBatchRun(jobType: string): Promise<string> {
    const result = await this.pool.query<{ id: string }>(
      `insert into public.batch_runs (job_type, status)
       values ($1, 'RUNNING') returning id`,
      [jobType],
    );
    const id = result.rows[0]?.id;
    if (!id) throw new Error('Database did not return a batch run ID.');
    return id;
  }

  async finishBatchRun(batchRunId: string, input: FinishBatchInput): Promise<void> {
    await this.pool.query(
      `update public.batch_runs
       set status = $2,
           success_count = $3,
           failure_count = $4,
           cursor = $5::jsonb,
           error_summary = $6,
           finished_at = now()
       where id = $1`,
      [
        batchRunId,
        input.status,
        input.successCount,
        input.failureCount,
        input.cursor ? JSON.stringify(input.cursor) : null,
        input.errorSummary?.slice(0, 2_000) ?? null,
      ],
    );
  }

  async upsertSpotAndScore(batchRunId: string, spot: NormalizedTourSpot, score: SpotScore, status: 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' = 'ACTIVE'): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const declining = await this.isDecliningArea(client, spot.areaCode, spot.sigunguCode);
      await client.query(
        `insert into public.tour_spots (
           content_id, content_type_id, title, address, location,
           area_code, sigungu_code, is_declining_area, image_url, thumbnail_url,
           status, event_start_date, event_end_date, raw_json, last_batch_run_id, synced_at
         ) values (
           $1, $2, $3, $4,
           extensions.st_setsrid(extensions.st_makepoint($5, $6), 4326)::extensions.geography,
           $7, $8, $9, $10, $11, $16, $12, $13, $14::jsonb, $15, now()
         )
         on conflict (content_id) do update set
           content_type_id = excluded.content_type_id,
           title = excluded.title,
           address = excluded.address,
           location = excluded.location,
           area_code = excluded.area_code,
           sigungu_code = excluded.sigungu_code,
           is_declining_area = excluded.is_declining_area,
           image_url = excluded.image_url,
           thumbnail_url = excluded.thumbnail_url,
           status = excluded.status,
           event_start_date = excluded.event_start_date,
           event_end_date = excluded.event_end_date,
           raw_json = excluded.raw_json,
           last_batch_run_id = excluded.last_batch_run_id,
           synced_at = excluded.synced_at`,
        [
          spot.contentId, spot.contentTypeId, spot.title, spot.address,
          spot.longitude, spot.latitude, spot.areaCode, spot.sigunguCode, declining,
          spot.imageUrl, spot.thumbnailUrl, spot.eventStartDate, spot.eventEndDate,
          JSON.stringify(spot.rawJson), batchRunId, status,
        ],
      );
      await client.query(
        `insert into public.spot_scores (
           content_id, category_weight, media_weight, detail_weight, class_weight,
           quiet_weight, spot_score, grade, score_version, calculated_at
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
         on conflict (content_id) do update set
           category_weight = excluded.category_weight,
           media_weight = excluded.media_weight,
           detail_weight = excluded.detail_weight,
           class_weight = excluded.class_weight,
           quiet_weight = excluded.quiet_weight,
           spot_score = excluded.spot_score,
           grade = excluded.grade,
           score_version = excluded.score_version,
           calculated_at = excluded.calculated_at`,
        [
          spot.contentId, score.categoryWeight, score.mediaWeight, score.detailWeight,
          score.classWeight, score.quietWeight, score.spotScore, score.grade, score.scoreVersion,
        ],
      );
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async recalculateScores(batchRunId: string): Promise<number> {
    const result = await this.pool.query(
      `update public.spot_scores sc set
         spot_score = round((100 * category_weight) * (1 + media_weight + detail_weight + class_weight), 2),
         grade = case
           when (100 * category_weight) * (1 + media_weight + detail_weight + class_weight) >= 200 then 'S'
           when (100 * category_weight) * (1 + media_weight + detail_weight + class_weight) >= 130 then 'A'
           when (100 * category_weight) * (1 + media_weight + detail_weight + class_weight) >= 80 then 'B'
           else 'C' end,
         score_version = 'spot-score-v1', calculated_at = now()
       where exists (select 1 from public.tour_spots s where s.content_id = sc.content_id)
       returning content_id`,
    );
    void batchRunId;
    return result.rowCount ?? result.rows.length;
  }

  private async isDecliningArea(
    client: PoolClient,
    areaCode: number | null,
    sigunguCode: number | null,
  ): Promise<boolean> {
    if (areaCode === null || sigunguCode === null) return false;
    const result = await client.query<{ matches: boolean }>(
      `select exists (
         select 1 from public.declining_areas
         where tour_area_code = $1 and tour_sigungu_code = $2
           and effective_from <= current_date
           and (effective_to is null or effective_to >= current_date)
       ) as matches`,
      [areaCode, sigunguCode],
    );
    return result.rows[0]?.matches ?? false;
  }
}
