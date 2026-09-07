import type { SupabaseClient } from '@supabase/supabase-js';

export type TokenErrorCode = 'TOKEN_INVALID' | 'TOKEN_EXPIRED';

export class TokenVerificationError extends Error {
  constructor(public readonly code: TokenErrorCode) {
    super(code === 'TOKEN_EXPIRED' ? 'Access token has expired.' : 'Access token is invalid.');
    this.name = 'TokenVerificationError';
  }
}

export interface TokenVerifier {
  verify(accessToken: string): Promise<{ userId: string }>;
}

export class SupabaseTokenVerifier implements TokenVerifier {
  constructor(private readonly client: SupabaseClient) {}

  async verify(accessToken: string): Promise<{ userId: string }> {
    const { data, error } = await this.client.auth.getUser(accessToken);
    if (error || !data.user) {
      const errorText = `${error?.code ?? ''} ${error?.message ?? ''}`.toLowerCase();
      throw new TokenVerificationError(errorText.includes('expired') ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID');
    }
    return { userId: data.user.id };
  }
}
