/**
 * Lets RTK Query (baseApi) trigger a Stytch JWT refresh without importing the SDK.
 * Registered from useStytchRefresh inside AppProvider.
 */

type RefreshFn = (options?: { allowHardLogout?: boolean }) => Promise<boolean>;

let refreshFn: RefreshFn | null = null;
let ongoingRefresh: Promise<boolean> | null = null;

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

  // Reuse one in-flight refresh so parallel 401s do not force logout.
  if (ongoingRefresh) return ongoingRefresh;

  ongoingRefresh = (async () => {
    try {
      return await refreshFn?.({ allowHardLogout: false }) ?? false;
    } catch {
      return false;
    } finally {
      ongoingRefresh = null;
    }
  })();

  return ongoingRefresh;
}
