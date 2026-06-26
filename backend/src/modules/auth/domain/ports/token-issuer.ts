// Port over access-token issuance. Only the adapter knows the concrete
// mechanism (signed JWT) and its secret/expiry.
export interface TokenIssuer {
  issue(userId: string): Promise<string>;
}

export const TOKEN_ISSUER = Symbol('TOKEN_ISSUER');
