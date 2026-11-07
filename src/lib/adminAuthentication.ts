import type { Auth } from 'firebase-admin/auth';
import type { RequestHandler } from 'express';
import { hasAdminClaim } from './adminOperations';

export async function isCurrentAdministrator(auth: Pick<Auth, 'getUser'> | null, claims: any): Promise<boolean> {
  if (!claims || typeof claims.uid !== 'string' || !claims.uid || !hasAdminClaim(claims)) return false;
  if (!auth) throw new Error('AUTH_SERVICE_UNAVAILABLE');
  try {
    const account = await auth.getUser(claims.uid);
    const revokedAfter = Date.parse(account.tokensValidAfterTime || '');
    return account.uid === claims.uid && !account.disabled && hasAdminClaim(account.customClaims)
      && !(Number.isFinite(revokedAfter) && (!Number.isFinite(claims.auth_time) || claims.auth_time < Math.floor(revokedAfter / 1000)));
  } catch (error) {
    if ((error as any)?.code === 'auth/user-not-found') return false;
    throw error;
  }
}

/** Check current Auth authority, not just privileges cached in an unexpired ID token. */
export function requireCurrentAdministrator(getAuth: () => Pick<Auth, 'getUser'> | null): RequestHandler {
  return async (req, res, next) => {
    res.setHeader('Cache-Control', 'private, no-store');
    const claims = (req as any).user;
    const deny = () => res.status(403).json({ code: 'FORBIDDEN_ADMIN', error: 'Authoritative admin privileges required.' });
    if (!claims || typeof claims.uid !== 'string' || !claims.uid || !hasAdminClaim(claims)) return void deny();
    try {
      if (!await isCurrentAdministrator(getAuth(), claims)) return void deny();
    } catch {
      // Never fall back to token privileges when the authority lookup fails.
      return void res.status(503).json({ code: 'AUTH_SERVICE_UNAVAILABLE' });
    }
    next();
  };
}
