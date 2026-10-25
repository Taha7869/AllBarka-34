interface PatronCredentialVerifier<TClaims> {
  verifyIdToken: (token: string) => Promise<TClaims>;
  verifySessionCookie: (cookie: string, checkRevoked: boolean) => Promise<TClaims>;
}

/** Explicit credentials define the caller; a stale browser session must not change that identity. */
export async function authenticatePatronCredentials<TClaims>(
  authorization: string | undefined,
  sessionCookie: string,
  verifier: PatronCredentialVerifier<TClaims>,
): Promise<TClaims | null> {
  if (authorization !== undefined) {
    if (!authorization.startsWith('Bearer ')) throw new Error('Invalid authorization header');
    const token = authorization.slice(7).trim();
    if (!token) throw new Error('Missing bearer token');
    // Failed explicit credentials never fall back to another account's cookie.
    return verifier.verifyIdToken(token);
  }
  return sessionCookie ? verifier.verifySessionCookie(sessionCookie, true) : null;
}
