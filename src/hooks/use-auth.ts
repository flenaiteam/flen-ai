'use client';

import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/lib/redux/store';
import { logout as logoutAction } from '@/lib/redux/slices/authSlice';
import { clearOrganizations } from '@/lib/redux/slices/organizationsSlice';
import { clearLocations } from '@/lib/redux/slices/locationsSlice';

/** Typed hook for reading auth state from Redux */
export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const auth = useSelector((s: RootState) => s.auth);
  const org = useSelector((s: RootState) => s.organizations.current);
  const membership = useSelector((s: RootState) => s.organizations.membership);
  const location = useSelector((s: RootState) => s.locations.current);
  const hasSelectedLocation = useSelector((s: RootState) => s.locations.hasSelectedLocation);

  const logout = () => {
    dispatch(logoutAction());
    dispatch(clearOrganizations());
    dispatch(clearLocations());
    if (typeof window !== 'undefined') {
      localStorage.removeItem('stytch_session_token');
      localStorage.removeItem('auth_data');
      localStorage.removeItem('selected_location');
      document.cookie = 'auth_session=; path=/; max-age=0';
      window.location.href = '/authenticate';
    }
  };

  return {
    user: auth.user,
    sessionJwt: auth.sessionJwt,
    isAuthenticated: auth.isAuthenticated,
    isInitialized: auth.isInitialized,
    organization: org,
    membership,
    location,
    hasSelectedLocation,
    logout,
  };
}
