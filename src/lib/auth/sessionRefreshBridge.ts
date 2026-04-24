/**
 * Lets RTK Query (baseApi) trigger a Stytch JWT refresh without importing the SDK.
 * Registered from useStytchRefresh inside AppProvider.
 */

type RefreshFn = (options?: { allowHardLogout?: boolean }) => Promise<boolean>;

let refreshFn: RefreshFn | null = null;

export function registerStytchSessionRefresh(fn: RefreshFn | null): void {
  refreshFn = fn;
}

/**
 * Run Stytch session.authenticate via the registered hook implementation.
 * Used after a backend 401 to obtain a fresh JWT before retrying the request.
 * Does not hard-redirect on failure (allowHardLogout: false).
 */
export async function tryStytchSessionRefresh(): Promise<boolean> {
  if (!refreshFn || typeof window === 'undefined') return false;
  try {
    return await refreshFn({ allowHardLogout: false });
  } catch {
    return false;
  }
}
