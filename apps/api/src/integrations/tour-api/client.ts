import type { TourApiSource } from './normalizer.js';

interface TourApiHeader {
  resultCode?: unknown;
  resultMsg?: unknown;
}

interface TourApiEnvelope {
  response?: {
    header?: TourApiHeader;
    body?: {
      items?: { item?: unknown } | '';
      numOfRows?: unknown;
      pageNo?: unknown;
      totalCount?: unknown;
    };
  };
}

export class TourApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = 'TourApiError';
  }
}

export interface TourApiClientOptions {
  baseUrl: string;
  serviceKey: string;
  fetch?: typeof globalThis.fetch;
  mobileApp?: string;
  sleep?: (milliseconds: number) => Promise<void>;
}

export interface TourApiPage {
  items: TourApiSource[];
  pageNo: number;
  numOfRows: number;
  totalCount: number;
  hasNext: boolean;
}

function finiteInteger(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? ''));
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function records(value: unknown): TourApiSource[] {
  const list = Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : [];
  return list.filter((item): item is TourApiSource => item !== null && typeof item === 'object' && !Array.isArray(item));
}

export class TourApiClient {
  private readonly fetchImplementation: typeof globalThis.fetch;

  constructor(private readonly options: TourApiClientOptions) {
    this.fetchImplementation = options.fetch ?? globalThis.fetch;
  }

  async areaBasedList(pageNo = 1, numOfRows = 100): Promise<TourApiPage> {
    const body = await this.request('areaBasedList2', { pageNo, numOfRows });
    const actualPage = finiteInteger(body.pageNo, pageNo);
    const actualRows = finiteInteger(body.numOfRows, numOfRows);
    const totalCount = finiteInteger(body.totalCount, 0);
    const items = this.extractItems(body);
    return {
      items,
      pageNo: actualPage,
      numOfRows: actualRows,
      totalCount,
      hasNext: actualPage * actualRows < totalCount,
    };
  }

  async searchFestival(eventStartDate: string, pageNo = 1, numOfRows = 100): Promise<TourApiPage> {
    const body = await this.request('searchFestival2', { eventStartDate, pageNo, numOfRows });
    const actualPage = finiteInteger(body.pageNo, pageNo);
    const actualRows = finiteInteger(body.numOfRows, numOfRows);
    const totalCount = finiteInteger(body.totalCount, 0);
    return { items: this.extractItems(body), pageNo: actualPage, numOfRows: actualRows, totalCount,
      hasNext: actualPage * actualRows < totalCount };
  }

  async detailCommon(contentId: number): Promise<TourApiSource | undefined> {
    return (await this.detail('detailCommon2', contentId))[0];
  }

  async detailIntro(contentId: number, contentTypeId: number): Promise<TourApiSource | undefined> {
    return (await this.detail('detailIntro2', contentId, { contentTypeId }))[0];
  }

  async detailInfo(contentId: number, contentTypeId: number): Promise<TourApiSource[]> {
    return this.detail('detailInfo2', contentId, { contentTypeId });
  }

  async detailImage(contentId: number): Promise<TourApiSource[]> {
    return this.detail('detailImage2', contentId, { imageYN: 'Y', subImageYN: 'Y' });
  }

  private async detail(
    operation: string,
    contentId: number,
    parameters: Record<string, string | number> = {},
  ): Promise<TourApiSource[]> {
    const body = await this.request(operation, { contentId, ...parameters });
    return this.extractItems(body);
  }

  private extractItems(body: NonNullable<NonNullable<TourApiEnvelope['response']>['body']>): TourApiSource[] {
    if (!body.items) return [];
    if (typeof body.items !== 'object' || !('item' in body.items)) {
      throw new TourApiError('MALFORMED_RESPONSE', 'TourAPI items payload is malformed.');
    }
    return records(body.items.item);
  }

  private async request(
    operation: string,
    parameters: Record<string, string | number>,
  ): Promise<NonNullable<NonNullable<TourApiEnvelope['response']>['body']>> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= 3; attempt += 1) {
      try { return await this.requestOnce(operation, parameters); }
      catch (error) {
        lastError = error;
        if (!(error instanceof TourApiError) || !error.retryable || attempt === 3) throw error;
        await (this.options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))))(100 * 2 ** attempt);
      }
    }
    throw lastError;
  }

  private async requestOnce(
    operation: string,
    parameters: Record<string, string | number>,
  ): Promise<NonNullable<NonNullable<TourApiEnvelope['response']>['body']>> {
    const url = new URL(`${this.options.baseUrl.replace(/\/$/, '')}/${operation}`);
    url.searchParams.set('serviceKey', this.options.serviceKey);
    url.searchParams.set('MobileOS', 'ETC');
    url.searchParams.set('MobileApp', this.options.mobileApp ?? 'LocalFlag');
    url.searchParams.set('_type', 'json');
    for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, String(value));

    let response: Response;
    try {
      response = await this.fetchImplementation(url, { headers: { accept: 'application/json' } });
    } catch (error) {
      throw new TourApiError('NETWORK_ERROR', `TourAPI request failed: ${String(error)}`, true);
    }

    if (!response.ok) {
      throw new TourApiError(
        'HTTP_ERROR',
        `TourAPI returned HTTP ${response.status}.`,
        response.status === 429 || response.status >= 500,
      );
    }

    let envelope: TourApiEnvelope;
    try {
      envelope = await response.json() as TourApiEnvelope;
    } catch {
      throw new TourApiError('MALFORMED_JSON', 'TourAPI returned malformed JSON.');
    }

    const header = envelope.response?.header;
    const resultCode = String(header?.resultCode ?? '');
    if (!['0000', '0'].includes(resultCode)) {
      throw new TourApiError(
        resultCode || 'MALFORMED_RESPONSE',
        `TourAPI failure: ${String(header?.resultMsg ?? 'missing result message')}`,
        ['03', '04', '22'].includes(resultCode),
      );
    }
    const body = envelope.response?.body;
    if (!body) throw new TourApiError('MISSING_BODY', 'TourAPI response body is missing.');
    return body;
  }
}
