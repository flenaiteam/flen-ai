/// <reference types="@types/google.maps" />
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import {
  LogOut,
  MapPin,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import {
  CreateLocationFormFields,
  buildCreateLocationPayload,
} from '@/components/locations/create-location-form-fields';
import { useAuth } from '@/hooks/use-auth';
import {
  useCreateLocationMutation,
  useGetLocationsQuery,
  type Location,
} from '@/lib/api/baseApi';
import type { AppDispatch } from '@/lib/redux/store';
import { setCurrentLocation, setLocationsList } from '@/lib/redux/slices/locationsSlice';
import { cn } from '@/lib/utils';
import { ConfirmAlertDialog } from '@/components/ui/confirm-alert-dialog';

export default function AllLocationsPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const {
    isAuthenticated,
    isInitialized,
    organization,
    logout,
  } = useAuth();
  const {
    data: apiLocations,
    isLoading: locationsLoading,
    error: locationsError,
    refetch,
  } = useGetLocationsQuery(undefined, {
    skip: !isInitialized || !isAuthenticated || !organization?.id,
  });

  const [createLocation, { isLoading: isCreating }] = useCreateLocationMutation();
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (apiLocations?.length) {
      dispatch(setLocationsList(apiLocations));
    }
  }, [apiLocations, dispatch]);

  const locations = apiLocations ?? [];
  const loading = locationsLoading;
  const fetchError = locationsError ? 'Failed to fetch locations.' : null;

  function handleSelectLocation(location: Location) {
    dispatch(setCurrentLocation(location));
    router.push('/dashboard');
    router.refresh();
  }

  if (!isInitialized || (loading && locations.length === 0)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="size-8" />
          <p className="text-sm text-[var(--text-muted)]">Loading locations…</p>
        </div>
      </div>
    );
  }

  if (isInitialized && isAuthenticated && !organization) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <Alert variant="error" className="max-w-md">
          <AlertDescription>
            No organization found. Please{' '}
            <a href="/authenticate" className="underline font-medium">
              sign in
            </a>{' '}
            to continue.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--bg-page)]">
      <div className="flex items-center justify-center pt-10 pb-6">
        <h1 className="font-display text-xl font-bold text-[var(--text-primary)]">
          flen<span className="text-brand-500">.</span>ai
        </h1>
      </div>

      <div className="container mx-auto max-w-xl space-y-6 px-6 pb-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base text-[var(--text-secondary)]">Select your location</h2>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              className="gap-2"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add location
            </Button>
            <ConfirmAlertDialog
              title="Sign out?"
              description="You'll need to sign in again to access your dashboard and locations."
              confirmLabel="Sign out"
              onConfirm={logout}
              trigger={
                <Button type="button" variant="error" size="sm" className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Log out
                </Button>
              }
            />
          </div>
        </div>

        {fetchError && (
          <Alert variant="error">
            <AlertDescription>{fetchError}</AlertDescription>
          </Alert>
        )}

        {locations.length === 0 ? (
          <Card className="border-[var(--border-default)] bg-[var(--bg-surface)]">
            <CardContent className="p-12 text-center">
              <MapPin className="mx-auto mb-4 h-12 w-12 text-[var(--text-muted)]" />
              <h3 className="mb-2 font-display text-lg font-semibold text-[var(--text-primary)]">
                No locations found
              </h3>
              <p className="mb-4 text-sm text-[var(--text-secondary)]">
                Get started by creating your first location.
              </p>
              <Button type="button" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add location
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {locations.map((location) => (
              <div
                key={location.public_id}
                className="group rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]"
              >
                <button
                  type="button"
                  onClick={() => handleSelectLocation(location)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-lg p-4 text-left transition-colors hover:bg-[var(--bg-subtle)]"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                      <MapPin className="h-5 w-5 text-[var(--text-muted)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 font-medium text-[var(--text-primary)]">
                        <span className="truncate">{location.name}</span>
                        {location.is_default && (
                          <Badge variant="brand" className="text-[10px] shrink-0">
                            Default
                          </Badge>
                        )}
                      </div>
                      {location.address && (
                        <div className="mt-0.5 line-clamp-1 text-sm text-[var(--text-secondary)]">
                          {location.address}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight
                    className={cn(
                      'h-5 w-5 shrink-0 text-[var(--text-muted)] transition-colors',
                      'group-hover:text-[var(--text-primary)]'
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateLocationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        loading={isCreating}
        onSubmit={async (payload) => {
          const loc = await createLocation(payload).unwrap();
          dispatch(setCurrentLocation(loc));
          setCreateOpen(false);
          void refetch();
          router.push('/dashboard');
          router.refresh();
        }}
      />
    </div>
  );
}

function CreateLocationDialog({
  open,
  onOpenChange,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: ReturnType<typeof buildCreateLocationPayload>) => Promise<void>;
  loading: boolean;
}) {
  const [name, setName] = useState('');
  const [selectedPlace, setSelectedPlace] =
    useState<google.maps.places.PlaceResult | null>(null);
  const [placesResetKey, setPlacesResetKey] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setName('');
    setSelectedPlace(null);
    setSubmitError(null);
    setPlacesResetKey((k) => k + 1);
  }, []);

  const prevOpenRef = useRef(open);

  useEffect(() => {
    if (prevOpenRef.current && !open) {
      resetForm();
    }
    prevOpenRef.current = open;
  }, [open, resetForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!name.trim()) return;
    try {
      await onSubmit(buildCreateLocationPayload(name, selectedPlace));
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string }; message?: string };
      setSubmitError(e?.data?.detail ?? e?.message ?? 'Could not create location.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" showCloseButton>
        <DialogHeader>
          <DialogTitle>Add location</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <CreateLocationFormFields
            name={name}
            onNameChange={setName}
            onPlaceSelected={setSelectedPlace}
            disabled={loading}
            autoFocusName={open}
            nameInputId="app-locations-create-name"
            placesInputId="app-locations-create-places"
            resetKey={placesResetKey}
          />
          {submitError && (
            <p className="text-sm text-error-600">{submitError}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="base-outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Creating…' : 'Add location'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
