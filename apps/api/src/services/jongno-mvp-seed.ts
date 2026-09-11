import type { Pool } from 'pg';
import { z } from 'zod';
import { calculateSpotScore } from '../domain/spot-score.js';

const reviewedSpotSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  address: z.string(),
  contentTypeId: z.union([z.literal(12), z.literal(14)]),
  location: z.object({
    lat: z.number().min(33).max(39),
    lng: z.number().min(124).max(132),
  }),
  imageUrl: z.url().nullable(),
  geometryType: z.enum(['POINT', 'AREA']),
  checkInEnabled: z.boolean(),
  checkInRadiusM: z.number().int().positive(),
});

const sourceSchema = z.object({
  meta: z.object({ reviewedAt: z.string().date(), shortlistCount: z.literal(15) }),
  data: z.array(reviewedSpotSchema).length(15),
});

export async function applyJongnoMvpSeed(pool: Pool, source: unknown): Promise<number> {
  const parsed = sourceSchema.parse(source);
  const ids = new Set(parsed.data.map((spot) => spot.id));
  if (ids.size !== parsed.data.length) throw new Error('Jongno MVP source contains duplicate content IDs.');
  const enabledPoints = parsed.data.filter((spot) => spot.geometryType === 'POINT' && spot.checkInEnabled);
  const disabledAreas = parsed.data.filter((spot) => spot.geometryType === 'AREA' && !spot.checkInEnabled);
  const yoonDongJu = parsed.data.find((spot) => spot.id === 2993372);
  if (enabledPoints.length !== 12 || disabledAreas.length !== 3
    || yoonDongJu?.checkInRadiusM !== 60
    || enabledPoints.some((spot) => spot.id !== 2993372 && spot.checkInRadiusM !== 100)) {
    throw new Error('Jongno MVP source does not match the verified check-in policy.');
  }

  const records = parsed.data.map((spot) => {
    const score = calculateSpotScore({
      contentId: spot.id,
      contentTypeId: spot.contentTypeId,
      title: spot.title,
      address: spot.address,
      latitude: spot.location.lat,
      longitude: spot.location.lng,
      areaCode: 1,
      sigunguCode: 23,
      imageUrl: spot.imageUrl,
      thumbnailUrl: null,
      eventStartDate: null,
      eventEndDate: null,
      additionalImageCount: 0,
      detailFieldCount: 0,
      classificationWeight: 0,
      rawJson: {},
    });
    return {
      contentId: spot.id,
      contentTypeId: spot.contentTypeId,
      title: spot.title,
      address: spot.address,
      lat: spot.location.lat,
      lng: spot.location.lng,
      imageUrl: spot.imageUrl,
      geometryType: spot.geometryType,
      checkInEnabled: spot.checkInEnabled,
      checkInRadiusM: spot.checkInRadiusM,
      reviewedAt: parsed.meta.reviewedAt,
      ...score,
    };
  });

  const result = await pool.query<{ applied_count: number }>(
    `with reviewed as (
       select * from jsonb_to_recordset($1::jsonb) as spot(
         "contentId" bigint, "contentTypeId" smallint, title text, address text,
         lat double precision, lng double precision, "imageUrl" text,
         "geometryType" text, "checkInEnabled" boolean, "checkInRadiusM" integer,
         "reviewedAt" date, "categoryWeight" numeric, "mediaWeight" numeric,
         "detailWeight" numeric, "classWeight" numeric, "quietWeight" numeric,
         "spotScore" numeric, grade text, "scoreVersion" text
       )
     ), upserted_spots as (
       insert into public.tour_spots (
         content_id, content_type_id, title, address, location, area_code, sigungu_code,
         image_url, status, raw_json, geometry_type, check_in_enabled,
         check_in_radius_m, reviewed_override
       )
       select "contentId", "contentTypeId", title, address,
         extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography,
         1, 23, "imageUrl", 'ACTIVE',
         jsonb_build_object('reviewedSource', 'data/jongno_mvp_shortlist.json', 'reviewedAt', "reviewedAt"),
         "geometryType", "checkInEnabled", "checkInRadiusM", true
       from reviewed
       on conflict (content_id) do update set
         location = excluded.location,
         geometry_type = excluded.geometry_type,
         check_in_enabled = excluded.check_in_enabled,
         check_in_radius_m = excluded.check_in_radius_m,
         reviewed_override = true
       returning content_id
     ), inserted_scores as (
       insert into public.spot_scores (
         content_id, category_weight, media_weight, detail_weight, class_weight,
         quiet_weight, spot_score, grade, score_version
       )
       select "contentId", "categoryWeight", "mediaWeight", "detailWeight", "classWeight",
         "quietWeight", "spotScore", grade, "scoreVersion"
       from reviewed
       on conflict (content_id) do nothing
       returning content_id
     )
     select count(*)::integer as applied_count from upserted_spots`,
    [JSON.stringify(records)],
  );
  return Number(result.rows[0]?.applied_count ?? 0);
}
