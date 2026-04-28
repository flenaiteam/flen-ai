/// <reference types="@types/google.maps" />
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StytchB2B, B2BProducts } from '@stytch/nextjs/b2b';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/lib/redux/store';
import { setAuth } from '@/lib/redux/slices/authSlice';
import { setCurrentOrganization, setMembership } from '@/lib/redux/slices/organizationsSlice';
import { setCurrentLocation, setLocationsList } from '@/lib/redux/slices/locationsSlice';
import {
  useExchangeTokenMutation,
  useCreateOrganizationMutation,
  useCreateLocationMutation,
} from '@/lib/api/baseApi';
import type { AuthResponse, Location } from '@/lib/api/baseApi';
import { useAuth } from '@/hooks/use-auth';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, MapPin, ChevronRight, AlertCircle } from 'lucide-react';
import {
  CreateLocationFormFields,
  buildCreateLocationPayload,
} from '@/components/locations/create-location-form-fields';
import GooglePlacesAutocomplete from '@/components/ui/google-places-autocomplete';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase =
  | 'LOGIN'
  | 'PROCESS'
  | 'PICK_ORG'
  | 'CREATE_ORG'
  | 'PICK_LOCATION'
  | 'CREATE_LOCATION';

interface DiscoveredOrg {
  organization?: {
    organization_id: string;
    organization_name: string;
  };
}

interface DiscoveryData {
  intermediate_session_token: string;
  discovered_organizations: DiscoveredOrg[];
  email_address?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function persistAuth(data: AuthResponse) {
  const payload = {
    user: data.user,
    organization: data.organization,
    membership: data.membership,
    locations: data.locations ?? [],
    session_jwt: data.session_jwt,
  };
  localStorage.setItem('stytch_session_token', data.session_jwt);
  localStorage.setItem('auth_data', JSON.stringify(payload));
  const maxAge = 7 * 24 * 60 * 60; // 7 days
  document.cookie = `auth_session=${encodeURIComponent(JSON.stringify(payload))}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuthPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isInitialized } = useAuth();
  const [authRedirectURL, setAuthRedirectURL] = useState<string | null>(null);

  const [exchangeToken, { isLoading: isExchanging }] = useExchangeTokenMutation();
  const [createOrganization, { isLoading: isCreatingOrg }] = useCreateOrganizationMutation();
  const [createLocation, { isLoading: isCreatingLocation }] = useCreateLocationMutation();

  const [phase, setPhase] = useState<Phase>('LOGIN');
  const [ist, setIst] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<DiscoveredOrg[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Org creation form (match fe-flen: Google place + place_id required)
  const [orgName, setOrgName] = useState('');
  const [orgSelectedPlace, setOrgSelectedPlace] =
    useState<google.maps.places.PlaceResult | null>(null);

  // Location creation form
  const [locName, setLocName] = useState('');
  const [locSelectedPlace, setLocSelectedPlace] =
    useState<google.maps.places.PlaceResult | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isInitialized, isAuthenticated, router]);

  // Resolve auth redirect URL only on client to avoid SSR empty-string fallbacks.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const configured = process.env.NEXT_PUBLIC_STYTCH_REDIRECT_URL?.trim();
    setAuthRedirectURL(configured?.length ? configured : `${window.location.origin}/authenticate`);
  }, []);

  // ── Commit auth response to Redux + localStorage ─────────────────────────

  const commitAuthResponse = useCallback(
    (data: AuthResponse) => {
      persistAuth(data);

      dispatch(setAuth({ user: data.user, sessionJwt: data.session_jwt }));
      dispatch(
        setCurrentOrganization({
          id: data.organization.id,
          name: data.organization.name,
          slug: data.organization.slug,
          stytch_org_id: data.organization.stytch_org_id ?? data.organization.id,
        })
      );
      if (data.membership) {
        dispatch(setMembership(data.membership));
      }
      if (data.locations?.length) {
        dispatch(setLocationsList(data.locations));
      }
    },
    [dispatch]
  );

  // ── After org is set: handle location step ───────────────────────────────

  const handleLocations = useCallback(
    (locs: Location[]) => {
      if (locs.length === 1) {
        dispatch(setCurrentLocation(locs[0]));
        router.replace('/dashboard');
      } else if (locs.length > 1) {
        setLocations(locs);
        setPhase('PICK_LOCATION');
      } else {
        setPhase('CREATE_LOCATION');
      }
    },
    [dispatch, router]
  );

  // ── Exchange org ──────────────────────────────────────────────────────────

  // `sessionToken` param lets callers pass the IST directly instead of relying on
  // stale `ist` state (React state updates are async — reading `ist` right after
  // `setIst()` would return the old null value and cause the page to freeze on PROCESS).
  const exchangeIntoOrg = useCallback(
    async (organization_id: string, sessionToken?: string) => {
      const token = sessionToken ?? ist;
      if (!token) return;
      setError(null);
      setPhase('PROCESS');

      try {
        const data = await exchangeToken({
          intermediate_session_token: token,
          organization_id,
        }).unwrap();

        commitAuthResponse(data);
        handleLocations(data.locations ?? []);
      } catch (err: unknown) {
        const e = err as { data?: { error?: string }; message?: string };
        setError(e?.data?.error ?? e?.message ?? 'Could not sign in to that organization.');
        setPhase('PICK_ORG');
      }
    },
    [ist, exchangeToken, commitAuthResponse, handleLocations]
  );

  // ── Discovery callback ────────────────────────────────────────────────────

  const onDiscoveryAuth = useCallback(
    (data: DiscoveryData) => {
      const token = data?.intermediate_session_token;
      const discovered = data?.discovered_organizations ?? [];
      const emailAddr = data?.email_address ?? null;

      if (!token) {
        setError('Missing session token. Please try again.');
        setPhase('LOGIN');
        return;
      }

      setIst(token);
      setEmail(emailAddr);
      setOrgs(discovered);

      if (discovered.length === 0) {
        setPhase('CREATE_ORG');
      } else if (discovered.length === 1) {
        // Pass `token` directly — `ist` state is still null here due to async batching
        exchangeIntoOrg(discovered[0].organization!.organization_id, token);
      } else {
        setPhase('PICK_ORG');
      }
    },
    [exchangeIntoOrg]
  );

  // ── Create org submit ─────────────────────────────────────────────────────

  const handleCreateOrg = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!ist || !orgName.trim() || !orgSelectedPlace?.place_id) {
        setError('Please fill in all required fields.');
        return;
      }
      setError(null);

      try {
        const data = await createOrganization({
          name: orgName.trim(),
          intermediate_session_token: ist,
          place_id: orgSelectedPlace.place_id,
        }).unwrap();

        commitAuthResponse(data);
        handleLocations(data.locations ?? []);
      } catch (err: unknown) {
        const ev = err as { data?: { error?: string }; message?: string };
        setError(ev?.data?.error ?? ev?.message ?? 'Could not create organization.');
      }
    },
    [ist, orgName, orgSelectedPlace, createOrganization, commitAuthResponse, handleLocations]
  );

  // ── Select location ───────────────────────────────────────────────────────

  const handleSelectLocation = useCallback(
    (loc: Location) => {
      dispatch(setCurrentLocation(loc));
      router.replace('/dashboard');
    },
    [dispatch, router]
  );

  // ── Create location submit ────────────────────────────────────────────────

  const handleCreateLocation = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!locName.trim() || !locSelectedPlace?.place_id) {
        setError('Please fill in all required fields.');
        return;
      }
      setError(null);

      try {
        const loc = await createLocation(
          buildCreateLocationPayload(locName, locSelectedPlace)
        ).unwrap();

        dispatch(setCurrentLocation(loc));
        router.replace('/dashboard');
      } catch (err: unknown) {
        const ev = err as { data?: { error?: string }; message?: string };
        setError(ev?.data?.error ?? ev?.message ?? 'Could not create location.');
      }
    },
    [locName, locSelectedPlace, createLocation, dispatch, router]
  );

  const isSubmitting = isExchanging || isCreatingOrg || isCreatingLocation;

  // ── Loading / already authenticated ──────────────────────────────────────

  if (!isInitialized || (isInitialized && isAuthenticated)) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center">
        <Spinner className="size-7" />
      </div>
    );
  }

  // ─── Layout shell ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex flex-col items-center justify-center p-4 transition-colors duration-200">
      {/* Logo */}
      <div className="mb-8 text-center">
        <span className="font-display text-3xl font-bold text-[var(--text-primary)]">
          flen<span className="text-brand-500">.</span>ai
        </span>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Google Business Profile optimizer for local businesses
        </p>
      </div>

      <div className="w-full max-w-sm space-y-4">

        {/* ── Error banner ─────────────────────────────────────────────────── */}
        {error && (
          <Alert variant="error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ══ LOGIN ══════════════════════════════════════════════════════════ */}
        {phase === 'LOGIN' && (
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
            <div className="px-6 pt-6 pb-2 text-center">
              <h1 className="font-display text-xl font-semibold text-[var(--text-primary)]">
                Sign in
              </h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Continue with email or Google
              </p>
            </div>
            {authRedirectURL ? (
              <StytchB2B
                config={{
                  authFlowType: 'Discovery',
                  products: [B2BProducts.emailMagicLinks, B2BProducts.oauth, B2BProducts.passwords],
                  emailMagicLinksOptions: {
                    discoveryRedirectURL: authRedirectURL,
                    loginRedirectURL: authRedirectURL,
                    signupRedirectURL: authRedirectURL,
                  },
                  passwordOptions: {
                    loginRedirectURL: authRedirectURL,
                    resetPasswordRedirectURL: authRedirectURL,
                    resetPasswordExpirationMinutes: 30,
                  },
                  oauthOptions: {
                    providers: [{ type: 'google' }],
                    discoveryRedirectURL: authRedirectURL,
                  },
                  disableCreateOrganization: true,
                  directCreateOrganizationForNoMembership: false,
                  sessionOptions: { sessionDurationMinutes: 60 },
                }}
                callbacks={{
                  onEvent: (event: { type: string; data: unknown }) => {
                    const discoveryEvents = [
                      'B2B_OAUTH_DISCOVERY_AUTHENTICATE',
                      'B2B_MAGIC_LINK_DISCOVERY_AUTHENTICATE',
                      'B2B_PASSWORD_DISCOVERY_AUTHENTICATE',
                      'B2B_SSO_DISCOVERY_AUTHENTICATE',
                    ];
                    if (discoveryEvents.includes(event.type)) {
                      onDiscoveryAuth(event.data as DiscoveryData);
                    }
                  },
                }}
                styles={{
                  fontFamily: 'DM Sans, sans-serif',
                  container: {
                    width: '100%',
                    backgroundColor: 'transparent',
                    borderColor: 'transparent',
                  },
                  colors: {
                    primary: 'var(--text-primary)',
                    secondary: 'var(--text-secondary)',
                    success: '#22c55e',
                    error: '#ef4444',
                  },
                  buttons: {
                    primary: {
                      textColor: '#ffffff',
                      backgroundColor: '#d946ef',
                      borderRadius: '8px',
                      borderColor: '#d946ef',
                    },
                    secondary: {
                      textColor: 'var(--text-primary)',
                      backgroundColor: 'transparent',
                      borderRadius: '8px',
                      borderColor: 'var(--border-default)',
                    },
                  },
                  inputs: {
                    backgroundColor: 'var(--bg-page)',
                    borderColor: 'var(--border-default)',
                    borderRadius: '8px',
                    textColor: 'var(--text-primary)',
                    placeholderColor: 'var(--text-muted)',
                  },
                }}
              />
            ) : (
              <div className="flex items-center justify-center py-10">
                <Spinner className="size-5" />
              </div>
            )}
          </div>
        )}

        {/* ══ PROCESS ════════════════════════════════════════════════════════ */}
        {phase === 'PROCESS' && (
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-10 flex flex-col items-center gap-4">
            <Spinner className="size-8" />
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              Setting up your account…
            </p>
          </div>
        )}

        {/* ══ PICK_ORG ═══════════════════════════════════════════════════════ */}
        {phase === 'PICK_ORG' && (
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-[var(--border-default)]">
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                Choose your organization
              </h2>
              {email && (
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Signed in as <span className="font-medium text-[var(--text-primary)]">{email}</span>
                </p>
              )}
            </div>
            <div className="p-3 space-y-1">
              {orgs.map((o, i) => (
                <button
                  key={o.organization?.organization_id ?? i}
                  onClick={() => exchangeIntoOrg(o.organization!.organization_id)}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors text-left disabled:opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-soft-brand-bg">
                      <Building2 className="h-4 w-4 text-soft-brand-text" />
                    </div>
                    <span className="font-medium text-[var(--text-primary)] text-sm">
                      {o.organization?.organization_name}
                    </span>
                  </div>
                  {isSubmitting ? (
                    <Spinner className="size-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══ CREATE_ORG ═════════════════════════════════════════════════════ */}
        {phase === 'CREATE_ORG' && (
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-visible">
            <div className="px-6 pt-6 pb-4 border-b border-[var(--border-default)]">
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                Create your organization
              </h2>
              {email && (
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Signed in as <span className="font-medium text-[var(--text-primary)]">{email}</span>
                </p>
              )}
            </div>
            <form onSubmit={handleCreateOrg} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="org-name">Organization name *</Label>
                <Input
                  id="org-name"
                  placeholder="e.g. SilverClip Salons"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={isSubmitting}
                  required
                  autoFocus
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="org-google-places-input"
                  className="flex items-center gap-2 text-[var(--text-primary)]"
                >
                  <MapPin className="h-4 w-4 text-[var(--text-muted)]" />
                  Business location *
                </Label>
                <GooglePlacesAutocomplete
                  inputId="org-google-places-input"
                  onPlaceSelected={setOrgSelectedPlace}
                  placeholder="e.g., 123 Main Street, City, State"
                  leftIcon={<MapPin className="h-4 w-4 text-[var(--text-muted)]" />}
                  searchTypes={['establishment', 'geocode']}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-[var(--text-muted)]">
                  Required: Search and select your business location
                </p>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={
                  isSubmitting || !ist || !orgName.trim() || !orgSelectedPlace?.place_id
                }
              >
                {isSubmitting ? <Spinner className="mr-2 size-4" /> : null}
                {isSubmitting ? 'Creating…' : 'Create organization'}
              </Button>
            </form>
          </div>
        )}

        {/* ══ PICK_LOCATION ══════════════════════════════════════════════════ */}
        {phase === 'PICK_LOCATION' && (
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-[var(--border-default)]">
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                Select a location
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Choose the location you want to manage
              </p>
            </div>
            <div className="p-3 space-y-1">
              {locations.map((loc) => (
                <button
                  key={loc.public_id}
                  onClick={() => handleSelectLocation(loc)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-soft-brand-bg">
                      <MapPin className="h-4 w-4 text-soft-brand-text" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--text-primary)] text-sm">{loc.name}</p>
                      {loc.address && (
                        <p className="text-xs text-[var(--text-muted)] line-clamp-1">{loc.address}</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══ CREATE_LOCATION ════════════════════════════════════════════════ */}
        {phase === 'CREATE_LOCATION' && (
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-visible">
            <div className="px-6 pt-6 pb-4 border-b border-[var(--border-default)]">
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                Add your first location
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                You can add more locations later from settings
              </p>
            </div>
            <form onSubmit={handleCreateLocation} className="p-6 space-y-4">
              <CreateLocationFormFields
                name={locName}
                onNameChange={setLocName}
                onPlaceSelected={setLocSelectedPlace}
                disabled={isSubmitting}
                autoFocusName
                nameInputId="loc-name"
                placesInputId="loc-address-google"
                requireSelectedPlace
                placesSearchTypes={['establishment', 'geocode']}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={
                  isSubmitting ||
                  !locName.trim() ||
                  !locSelectedPlace?.place_id
                }
              >
                {isSubmitting ? <Spinner className="mr-2 size-4" /> : null}
                {isSubmitting ? 'Creating…' : 'Add location'}
              </Button>
            </form>
          </div>
        )}

        {/* Showcase link */}
        <p className="text-center text-xs text-[var(--text-muted)]">
          <a href="/showcase" className="hover:text-[var(--text-secondary)] transition-colors">
            View design system →
          </a>
        </p>
      </div>
    </div>
  );
}
