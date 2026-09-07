import type { Pool } from 'pg';
import type { SpotReadModel } from '../domain/public-spot.js';
import type { RecommendationPolicy } from '../domain/recommendation.js';
import type { SpotGrade, SupportedContentTypeId } from '../domain/tourism.js';

export interface SpotListFilters {
  minLat?: number;
  minLng?: number;
  maxLat?: number;
  maxLng?: number;
  contentTypeIds?: SupportedContentTypeId[];
  grades?: SpotGrade[];
  decliningArea?: boolean;
  q?: string;
  areaCode?: number;
  sigunguCode?: number;
  afterId?: number;
  limit: number;
}

export interface RecommendationQuery {
  after?: { rank: number; id: number };
  limit: number;
  policy: RecommendationPolicy;
}

export interface RankedSpot extends SpotReadModel { recommendationRank: number }
export interface NearbySpot extends SpotReadModel { distanceM: number }

export interface SpotReadRepository {
  list(filters: SpotListFilters): Promise<SpotReadModel[]>;
  findVisibleById(spotId: number): Promise<SpotReadModel | null>;
  recommendations(query: RecommendationQuery): Promise<RankedSpot[]>;
  nearby(query: { lat: number; lng: number; radiusM: number; limit: number }): Promise<NearbySpot[]>;
}

interface SpotRow {
  id: number;
  title: string;
  address: string;
  content_type_id: number;
  lat: number;
  lng: number;
  grade: SpotGrade;
  is_declining_area: boolean;
  image_url: string | null;
  status: 'SCHEDULED' | 'ACTIVE';
  area_code: number | null;
  quiet_weight: number;
}

function mapSpot(row: SpotRow): SpotReadModel {
  return {
    id: Number(row.id),
    title: row.title,
    address: row.address,
    contentTypeId: Number(row.content_type_id),
    lat: Number(row.lat),
    lng: Number(row.lng),
    grade: row.grade,
    isDecliningArea: row.is_declining_area,
    imageUrl: row.image_url,
    status: row.status,
    areaCode: row.area_code === null ? null : Number(row.area_code),
    quietWeight: Number(row.quiet_weight),
  };
}

const SPOT_COLUMNS = `s.content_id::float8 as id, s.title, s.address, s.content_type_id,
    extensions.st_y(s.location::extensions.geometry)::float8 as lat,
    extensions.st_x(s.location::extensions.geometry)::float8 as lng,
    sc.grade, s.is_declining_area, s.image_url, s.status, s.area_code,
    sc.quiet_weight::float8 as quiet_weight`;
const SPOT_FROM = `from public.tour_spots s
  join public.spot_scores sc on sc.content_id = s.content_id`;

export class PostgresSpotReadRepository implements SpotReadRepository {
  constructor(private readonly pool: Pool) {}

  async list(filters: SpotListFilters): Promise<SpotReadModel[]> {
    const values: unknown[] = [];
    const where = [`s.status in ('ACTIVE', 'SCHEDULED')`];
    const bind = (value: unknown) => { values.push(value); return `$${values.length}`; };

    if (filters.minLat !== undefined && filters.minLng !== undefined
      && filters.maxLat !== undefined && filters.maxLng !== undefined) {
      const minLng = bind(filters.minLng);
      const minLat = bind(filters.minLat);
      const maxLng = bind(filters.maxLng);
      const maxLat = bind(filters.maxLat);
      where.push(`extensions.st_intersects(
        s.location,
        extensions.st_makeenvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)::extensions.geography
      )`);
    }
    if (filters.contentTypeIds?.length) where.push(`s.content_type_id = any(${bind(filters.contentTypeIds)}::smallint[])`);
    if (filters.grades?.length) where.push(`sc.grade = any(${bind(filters.grades)}::char(1)[])`);
    if (filters.decliningArea !== undefined) where.push(`s.is_declining_area = ${bind(filters.decliningArea)}`);
    if (filters.q) where.push(`(s.title ilike ${bind(`%${filters.q}%`)} or s.address ilike ${bind(`%${filters.q}%`)})`);
    if (filters.areaCode !== undefined) where.push(`s.area_code = ${bind(filters.areaCode)}`);
    if (filters.sigunguCode !== undefined) where.push(`s.sigungu_code = ${bind(filters.sigunguCode)}`);
    if (filters.afterId !== undefined) where.push(`s.content_id > ${bind(filters.afterId)}`);
    const limit = bind(filters.limit);

    const result = await this.pool.query<SpotRow>(
      `select ${SPOT_COLUMNS} ${SPOT_FROM} where ${where.join(' and ')} order by s.content_id asc limit ${limit}`,
      values,
    );
    return result.rows.map(mapSpot);
  }

  async findVisibleById(spotId: number): Promise<SpotReadModel | null> {
    const result = await this.pool.query<SpotRow>(
      `select ${SPOT_COLUMNS} ${SPOT_FROM} where s.content_id = $1 and s.status in ('ACTIVE', 'SCHEDULED') limit 1`,
      [spotId],
    );
    return result.rows[0] ? mapSpot(result.rows[0]) : null;
  }

  async recommendations(query: RecommendationQuery): Promise<RankedSpot[]> {
    const values: unknown[] = [];
    const bind = (value: unknown) => { values.push(value); return `$${values.length}`; };
    const where = [`s.status in ('ACTIVE', 'SCHEDULED')`];
    if (query.after) {
      const rank = bind(query.after.rank);
      const id = bind(query.after.id);
      where.push(`(ranked.recommendation_rank < ${rank}
        or (ranked.recommendation_rank = ${rank} and s.content_id > ${id}))`);
    }
    const decliningBonus = bind(query.policy.decliningAreaBonus);
    const quietMultiplier = bind(query.policy.quietWeightMultiplier);
    const imageBonus = bind(query.policy.imageBonus);
    const limit = bind(query.limit);
    const result = await this.pool.query<SpotRow & { recommendation_rank: number }>(
      `select ranked.*, s.content_id::float8 as id, s.title, s.address, s.content_type_id,
        extensions.st_y(s.location::extensions.geometry)::float8 as lat,
        extensions.st_x(s.location::extensions.geometry)::float8 as lng,
        sc.grade, s.is_declining_area, s.image_url, s.status, s.area_code,
        sc.quiet_weight::float8 as quiet_weight
       from public.tour_spots s
       join public.spot_scores sc on sc.content_id = s.content_id
       cross join lateral (
         select (sc.spot_score + case when s.is_declining_area then ${decliningBonus} else 0 end
           + sc.quiet_weight * ${quietMultiplier} + case when s.image_url is not null then ${imageBonus} else 0 end
         )::float8 as recommendation_rank
       ) ranked
       where ${where.join(' and ')}
       order by ranked.recommendation_rank desc, s.content_id asc limit ${limit}`,
      values,
    );
    return result.rows.map((row) => ({ ...mapSpot(row), recommendationRank: Number(row.recommendation_rank) }));
  }

  async nearby(query: { lat: number; lng: number; radiusM: number; limit: number }): Promise<NearbySpot[]> {
    const result = await this.pool.query<SpotRow & { distance_m: number }>(
      `select ${SPOT_COLUMNS},
         extensions.st_distance(
           s.location,
           extensions.st_setsrid(extensions.st_makepoint($2, $1), 4326)::extensions.geography
         )::float8 as distance_m
       ${SPOT_FROM}
       where s.status = 'ACTIVE'
         and extensions.st_dwithin(
           s.location,
           extensions.st_setsrid(extensions.st_makepoint($2, $1), 4326)::extensions.geography,
           $3
         )
       order by distance_m asc, s.content_id asc limit $4`,
      [query.lat, query.lng, query.radiusM, query.limit],
    );
    return result.rows.map((row) => ({ ...mapSpot(row), distanceM: Number(row.distance_m) }));
  }
}
