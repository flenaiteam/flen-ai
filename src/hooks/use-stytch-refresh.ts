'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useStytchB2BClient } from '@stytch/nextjs/b2b';
import { useDispatch } from 'react-redux';
import { setSessionJwt } from '@/lib/redux/slices/authSlice';
import { registerStytchSessionRefresh } from '@/lib/auth/sessionRefreshBridge';

const REFRESH_INTERVAL_MS = 4 * 60 * 1000; // 4 min (JWT expires at 5 min)
const SESSION_DURATION_MINUTES = 60;

/**
 * Handles Stytch session token refresh.
 *
 * Bug fix: fe-flen called stytch.session.authenticate() with no args, which
 * relies on the stytch_session opaque cookie — never set when exchange is done
 * server-side. We pass session_jwt explicitly so Stytch can validate via JWT,
 * re-issue the token, and set the cookie for all future native refreshes.
 */
export function useStytchRefresh() {
  const stytch = useStytchB2BClient();
  const dispatch = useDispatch();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRefreshingRef = useRef(false);

  const refresh = useCallback(
    async (
      attempt = 0,
      options: { allowHardLogout?: boolean } = {}
    ): Promise<boolean> => {
      // Default false: session_jwt from backend exchange is often not a Stytch JWT;
      // only opt in to hard logout where explicitly needed (currently unused).
      const allowHardLogout = options.allowHardLogout === true;

      if (!stytch || isRefreshingRef.current) return false;

      try {
        isRefreshingRef.current = true;

        const storedJwt =
          typeof window !== 'undefined'
            ? localStorage.getItem('stytch_session_token')
            : null;

        const response = await stytch.session.authenticate({
          session_duration_minutes: SESSION_DURATION_MINUTES,
          ...(storedJwt ? { session_jwt: storedJwt } : {}),
        });

        if (response.session_jwt) {
          localStorage.setItem('stytch_session_token', response.session_jwt);
          dispatch(setSessionJwt(response.session_jwt));

          // Update auth_data cookie so middleware stays valid
          const authRaw = localStorage.getItem('auth_data');
          if (authRaw) {
            try {
              const authData = JSON.parse(authRaw);
              authData.session_jwt = response.session_jwt;
              const updated = JSON.stringify(authData);
              localStorage.setItem('auth_data', updated);
              document.cookie = `auth_session=${encodeURIComponent(updated)}; path=/; max-age=${SESSION_DURATION_MINUTES * 60}; SameSite=Lax`;
            } catch {
              // non-fatal — cookie will be refreshed on next hard reload
            }
          }
          return true;
        }
        return false;
      } catch (err: unknown) {
        const error = err as { error_type?: string; status_code?: number; message?: string };
        // Do not treat generic 403 as session end — Stytch may use it for other cases.
        const isExpired =
          error?.error_type === 'session_not_found' ||
          error?.error_type === 'session_expired' ||
          error?.error_type === 'unauthorized_credentials' ||
          error?.status_code === 401;

        if (isExpired && allowHardLogout) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('stytch_session_token');
            localStorage.removeItem('auth_data');
            localStorage.removeItem('selected_location');
            document.cookie = 'auth_session=; path=/; max-age=0';
            window.location.href = '/';
          }
          return false;
        }

        if (isExpired && !allowHardLogout) {
          return false;
        }

        // Network / transient error — retry up to 2 more times
        if (attempt < 2) {
          isRefreshingRef.current = false;
          await new Promise((r) => setTimeout(r, 2000));
          return refresh(attempt + 1, options);
        }
        return false;
      } finally {
        isRefreshingRef.current = false;
      }
    },
    [stytch, dispatch]
  );

  useLayoutEffect(() => {
    registerStytchSessionRefresh((opts) => refresh(0, opts ?? {}));
    return () => registerStytchSessionRefresh(null);
  }, [refresh]);

  const startAutoRefresh = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      void refresh(0, { allowHardLogout: false });
    }, REFRESH_INTERVAL_MS);
  }, [refresh]);

  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopAutoRefresh(), [stopAutoRefresh]);

  return { refresh, startAutoRefresh, stopAutoRefresh };
}
