/// <reference types="@types/google.maps" />
'use client';

import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GooglePlacesAutocomplete from '@/components/ui/google-places-autocomplete';

export function CreateLocationFormFields({
  name,
  onNameChange,
  onPlaceSelected,
  disabled,
  autoFocusName,
  nameInputId,
  placesInputId,
  resetKey,
}: {
  name: string;
  onNameChange: (value: string) => void;
  onPlaceSelected: (place: google.maps.places.PlaceResult | null) => void;
  disabled?: boolean;
  autoFocusName?: boolean;
  nameInputId: string;
  placesInputId: string;
  /** Increment when the enclosing form is reset so the places input clears its internal state. */
  resetKey?: number;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={nameInputId}>Location name</Label>
        <Input
          id={nameInputId}
          placeholder="e.g. Sunrise Beauty Salon"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          disabled={disabled}
          required
          autoFocus={autoFocusName}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={placesInputId}>
          Address{' '}
          <span className="font-normal text-[var(--text-muted)]">(optional)</span>
        </Label>
        <GooglePlacesAutocomplete
          key={resetKey}
          inputId={placesInputId}
          onPlaceSelected={onPlaceSelected}
          placeholder="e.g. 456 Park Ave, Delhi"
          leftIcon={<MapPin className="h-4 w-4 text-[var(--text-muted)]" />}
          disabled={disabled}
        />
      </div>
    </>
  );
}

/** Build the create-location body for the API from form state. */
export function buildCreateLocationPayload(
  name: string,
  selectedPlace: google.maps.places.PlaceResult | null,
  timezone = 'Asia/Kolkata'
): { name: string; address?: string; timezone: string; place_id?: string } {
  const trimmed = name.trim();
  const address = selectedPlace?.formatted_address?.trim() || undefined;
  const place_id = selectedPlace?.place_id || undefined;
  return {
    name: trimmed,
    address,
    timezone,
    ...(place_id ? { place_id } : {}),
  };
}
