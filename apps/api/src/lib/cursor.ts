export class CursorError extends Error {
  constructor() {
    super('Malformed pagination cursor.');
    this.name = 'CursorError';
  }
}

export function encodeCursor(value: object): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

export function decodeCursor<T extends object>(
  cursor: string,
  validate: (value: unknown) => value is T,
): T {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (!validate(parsed)) throw new CursorError();
    return parsed;
  } catch (error) {
    if (error instanceof CursorError) throw error;
    throw new CursorError();
  }
}
