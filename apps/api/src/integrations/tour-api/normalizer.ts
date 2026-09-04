import {
  SUPPORTED_CONTENT_TYPE_IDS,
  type NormalizedTourSpot,
  type SupportedContentTypeId,
} from '../../domain/tourism.js';

export type TourApiSource = Record<string, unknown>;

export interface TourApiSpotSource {
  list: TourApiSource;
  common?: TourApiSource;
  intro?: TourApiSource;
  info?: TourApiSource[];
  images?: TourApiSource[];
}

export type NormalizationResult =
  | { ok: true; value: NormalizedTourSpot }
  | { ok: false; reason: string };

function text(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function number(value: unknown): number | null {
  const raw = text(value);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function integer(value: unknown): number | null {
  const parsed = number(value);
  return parsed !== null && Number.isSafeInteger(parsed) ? parsed : null;
}

function date(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const compact = raw.replaceAll('-', '');
  if (!/^\d{8}$/.test(compact)) return null;
  const formatted = `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
  const parsed = new Date(`${formatted}T00:00:00Z`);
  return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== formatted
    ? null
    : formatted;
}

function supportedContentType(value: unknown): SupportedContentTypeId | null {
  const parsed = integer(value);
  return SUPPORTED_CONTENT_TYPE_IDS.find((item) => item === parsed) ?? null;
}

function countRelevantDetails(source: TourApiSpotSource): number {
  const ignored = new Set(['contentid', 'contenttypeid', 'createdtime', 'modifiedtime']);
  const values = [source.common, source.intro, ...(source.info ?? [])].filter(
    (item): item is TourApiSource => item !== undefined,
  );
  return values.reduce((count, item) => count + Object.entries(item).filter(
    ([key, value]) => !ignored.has(key.toLowerCase()) && text(value) !== null,
  ).length, 0);
}

export function normalizeTourApiSpot(source: TourApiSpotSource): NormalizationResult {
  const contentId = integer(source.list.contentid);
  const contentTypeId = supportedContentType(source.list.contenttypeid);
  const title = text(source.common?.title) ?? text(source.list.title);
  const latitude = number(source.list.mapy);
  const longitude = number(source.list.mapx);

  if (!contentId || contentId <= 0) return { ok: false, reason: 'INVALID_CONTENT_ID' };
  if (!contentTypeId) return { ok: false, reason: 'UNSUPPORTED_CONTENT_TYPE' };
  if (!title) return { ok: false, reason: 'MISSING_TITLE' };
  if (latitude === null || longitude === null || latitude === 0 || longitude === 0) {
    return { ok: false, reason: 'MISSING_OR_ZERO_COORDINATES' };
  }
  if (latitude < 33 || latitude > 39 || longitude < 124 || longitude > 132) {
    return { ok: false, reason: 'COORDINATES_OUTSIDE_KOREA_RANGE' };
  }

  const mainImage = text(source.common?.firstimage) ?? text(source.list.firstimage);
  const thumbnail = text(source.common?.firstimage2) ?? text(source.list.firstimage2);

  return {
    ok: true,
    value: {
      contentId,
      contentTypeId,
      title,
      address: [text(source.common?.addr1) ?? text(source.list.addr1), text(source.common?.addr2) ?? text(source.list.addr2)]
        .filter(Boolean)
        .join(' '),
      latitude,
      longitude,
      areaCode: integer(source.list.areacode),
      sigunguCode: integer(source.list.sigungucode),
      imageUrl: mainImage,
      thumbnailUrl: thumbnail,
      eventStartDate: date(source.intro?.eventstartdate),
      eventEndDate: date(source.intro?.eventenddate),
      additionalImageCount: source.images?.filter((image) => text(image.originimgurl) !== null).length ?? 0,
      detailFieldCount: countRelevantDetails(source),
      // Classification requires a planning-approved source mapping. Neutral is deliberate for v1.
      classificationWeight: 0,
      rawJson: {
        list: source.list,
        ...(source.common ? { common: source.common } : {}),
        ...(source.intro ? { intro: source.intro } : {}),
        ...(source.info ? { info: source.info } : {}),
        ...(source.images ? { images: source.images } : {}),
      },
    },
  };
}
