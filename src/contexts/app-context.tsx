'use client';

/**
 * AppProvider — single unified provider replacing fe-flen's dual-context pattern.
 *
 * Responsibilities:
 *  1. On mount: hydrate Redux from localStorage (user, org, locations, selected location)
 *  2. Write auth_session cookie so Next.js middleware can gate routes server-side
 *  3. Start/stop Stytch token auto-refresh based on auth state
 *  4. Expose useAppAuth() hook
 */

import React, { createContext, useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/lib/redux/store';
import { restoreFromStorage as restoreAuth, setInitialized } from '@/lib/redux/slices/authSlice';
import { restoreFromStorage as restoreOrg } from '@/lib/redux/slices/organizationsSlice';
import {
  restoreFromStorage as restoreLocs,
  restoreLocationFromStorage,
} from '@/lib/redux/slices/locationsSlice';
import type { User } from '@/lib/redux/slices/authSlice';
import type { Organization, Membership } from '@/lib/redux/slices/organizationsSlice';
import { useStytchRefresh } from '@/hooks/use-stytch-refresh';

const SESSION_DURATION_MINUTES = 60;

interface AppAuthContextType {
  isInitialized: boolean;
  isAuthenticated: boolean;
  logout: () => void;
}

const AppAuthContext = createContext<AppAuthContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isInitialized } = useSelector((s: RootState) => s.auth);
  const { refresh, startAutoRefresh, stopAutoRefresh } = useStytchRefresh();

  // ── Step 1: Hydrate Redux from localStorage on first render ────────────────
  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('auth_data') : null;
    const jwt =
      typeof window !== 'undefined' ? localStorage.getItem('stytch_session_token') : null;

    if (raw && jwt) {
      try {
        const data = JSON.parse(raw) as {
          user?: User;
          organization?: Organization;
          membership?: Membership;
          locations?: unknown[];
          session_jwt?: string;
        };

        const sessionJwt = jwt || data.session_jwt;

        if (data.user && sessionJwt) {
          dispatch(restoreAuth({ user: data.user, sessionJwt }));
        }
        if (data.organization) {
          dispatch(
            restoreOrg({ organization: data.organization, membership: data.membership })
          );
        }
        if (data.locations) {
          dispatch(restoreLocs({ locations: data.locations as never }));
        }
        dispatch(restoreLocationFromStorage());
      } catch {
        // Corrupted data — clear and start fresh
        localStorage.removeItem('auth_data');
        localStorage.removeItem('stytch_session_token');
        localStorage.removeItem('selected_location');
        document.cookie = 'auth_session=; path=/; max-age=0';
      }
    }

    dispatch(setInitialized(true));
  }, [dispatch]);

  // ── Step 2: Keep auth_session cookie in sync so middleware can read it ─────
  useEffect(() => {
    if (!isInitialized) return;

    const raw = typeof window !== 'undefined' ? localStorage.getItem('auth_data') : null;
    if (isAuthenticated && raw) {
      document.cookie = `auth_session=${encodeURIComponent(raw)}; path=/; max-age=${SESSION_DURATION_MINUTES * 60}; SameSite=Lax`;
    } else if (!isAuthenticated) {
      document.cookie = 'auth_session=; path=/; max-age=0';
    }
  }, [isAuthenticated, isInitialized]);

  // ── Step 3: Token auto-refresh lifecycle ──────────────────────────────────
  // Proactive refresh uses allowHardLogout: false — session_jwt from our backend
  // exchange may be an API JWT Stytch does not recognize; a failed Stytch call
  // must not wipe a valid login. Hard logout only after baseApi 401 + failed refresh.
  useEffect(() => {
    if (isAuthenticated) {
      startAutoRefresh();
      void refresh(0, { allowHardLogout: false });
    } else {
      stopAutoRefresh();
    }
  }, [isAuthenticated, refresh, startAutoRefresh, stopAutoRefresh]);

  // Renew JWT when tab becomes visible again (timers are throttled in background)
  useEffect(() => {
    if (!isAuthenticated || !isInitialized) return;
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refresh(0, { allowHardLogout: false });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [isAuthenticated, isInitialized, refresh]);

  // ── Step 4: Multi-tab sync ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'auth_data' && !e.newValue) {
        // Logged out in another tab
        window.location.href = '/authenticate';
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const logout = () => {
    stopAutoRefresh();
    localStorage.removeItem('stytch_session_token');
    localStorage.removeItem('auth_data');
    localStorage.removeItem('selected_location');
    document.cookie = 'auth_session=; path=/; max-age=0';
    window.location.href = '/authenticate';
  };

  return (
    <AppAuthContext.Provider value={{ isInitialized, isAuthenticated, logout }}>
      {children}
    </AppAuthContext.Provider>
  );
}

export function useAppAuth() {
  const ctx = useContext(AppAuthContext);
  if (!ctx) throw new Error('useAppAuth must be used within AppProvider');
  return ctx;
}
