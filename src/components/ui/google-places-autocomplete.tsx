/// <reference types="@types/google.maps" />
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

/** `setOptions` should run once per app load (see js-api-loader README). */
let mapsLoaderKeyApplied: string | null = null;

function ensureMapsLoaderOptions(apiKey: string) {
  if (mapsLoaderKeyApplied !== apiKey) {
    setOptions({ key: apiKey, v: 'weekly' });
    mapsLoaderKeyApplied = apiKey;
  }
}

export interface GooglePlacesAutocompleteProps {
  onPlaceSelected: (place: google.maps.places.PlaceResult | null) => void;
  placeholder?: string;
  defaultValue?: string;
  leftIcon?: React.ReactNode;
  inputClassName?: string;
  inputId?: string;
  predictionsContainerClassName?: string;
  searchTypes?: string[];
  componentRestrictions?: google.maps.places.ComponentRestrictions;
  additionalActions?: React.ReactNode;
  debounceTimeout?: number;
  disabled?: boolean;
}

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  onPlaceSelected,
  placeholder = 'Search for an address',
  defaultValue = '',
  leftIcon,
  inputClassName,
  inputId = 'google-places-input',
  predictionsContainerClassName,
  searchTypes,
  componentRestrictions,
  additionalActions,
  debounceTimeout = 300,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(defaultValue);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowPredictionFetch, setAllowPredictionFetch] = useState(true);

  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | undefined>(undefined);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError('Google Maps API key is missing.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        ensureMapsLoaderOptions(apiKey);
        await importLibrary('places');
        if (cancelled) return;
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        const hiddenAttributionDiv = document.createElement('div');
        placesServiceRef.current = new google.maps.places.PlacesService(hiddenAttributionDiv);
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      } catch (e: unknown) {
        if (cancelled) return;
        console.error('Failed to load Google Maps API', e);
        setError('Failed to load Google Maps.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchPredictions = useCallback(
    (input: string) => {
      if (disabled || !autocompleteServiceRef.current || !input) {
        setPredictions([]);
        setShowPredictions(false);
        return;
      }
      setIsLoading(true);
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input,
          sessionToken: sessionTokenRef.current,
          types: searchTypes,
          componentRestrictions,
        },
        (newPredictions, status) => {
          setIsLoading(false);
          if (status === google.maps.places.PlacesServiceStatus.OK && newPredictions) {
            setPredictions(newPredictions);
            setShowPredictions(true);
          } else {
            setPredictions([]);
            setShowPredictions(false);
            if (
              status !== google.maps.places.PlacesServiceStatus.ZERO_RESULTS &&
              status !== google.maps.places.PlacesServiceStatus.REQUEST_DENIED
            ) {
              console.warn('Place prediction fetch status:', status);
            }
          }
        }
      );
    },
    [searchTypes, componentRestrictions, disabled]
  );

  useEffect(() => {
    if (disabled || !allowPredictionFetch) {
      setShowPredictions(false);
      return;
    }

    const handler = setTimeout(() => {
      if (inputValue === defaultValue || inputValue.trim() === '') {
        setPredictions([]);
        setShowPredictions(false);
        if (inputValue.trim() === '') {
          onPlaceSelected(null);
        }
      } else {
        fetchPredictions(inputValue);
      }
    }, debounceTimeout);

    return () => {
      clearTimeout(handler);
    };
  }, [
    inputValue,
    debounceTimeout,
    fetchPredictions,
    defaultValue,
    onPlaceSelected,
    allowPredictionFetch,
    disabled,
  ]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const value = event.target.value;
    setInputValue(value);
    setAllowPredictionFetch(true);
    if (value.trim() === '') {
      setPredictions([]);
      setShowPredictions(false);
      onPlaceSelected(null);
    }
  };

  const handlePredictionSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    if (disabled || !placesServiceRef.current || !prediction.place_id) return;

    setIsLoading(true);
    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: [
          'address_components',
          'formatted_address',
          'geometry',
          'name',
          'place_id',
          'types',
          'url',
          'vicinity',
          'plus_code',
        ],
        sessionToken: sessionTokenRef.current,
      },
      (placeDetails, status) => {
        setIsLoading(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && placeDetails) {
          onPlaceSelected(placeDetails);
          setInputValue(placeDetails.formatted_address || placeDetails.name || '');
          setAllowPredictionFetch(false);
          setPredictions([]);
          setShowPredictions(false);
          sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        } else {
          console.error('Place details fetch status:', status);
          setError('Failed to fetch place details.');
        }
      }
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !document.querySelector('.predictions-list-container')?.contains(event.target as Node)
      ) {
        setShowPredictions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (error) {
    return <div className="p-2 text-sm text-error-600">{error}</div>;
  }

  return (
    <div className="relative flex w-full flex-col gap-1.5">
      <div className="relative">
        {leftIcon && (
          <div className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
            {leftIcon}
          </div>
        )}
        <Input
          id={inputId}
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleChange}
          onFocus={() => {
            if (!disabled && predictions.length > 0) setShowPredictions(true);
          }}
          autoComplete="off"
          disabled={disabled}
          className={cn(leftIcon && 'pl-9', inputClassName)}
        />
      </div>
      {showPredictions && predictions.length > 0 && !disabled && (
        <div
          className={cn(
            'predictions-list-container absolute top-full right-0 left-0 z-[200] mt-1 max-h-60 overflow-y-auto rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-lg',
            predictionsContainerClassName
          )}
        >
          {isLoading && (
            <div className="p-2 text-sm text-[var(--text-muted)]">Loading…</div>
          )}
          {!isLoading &&
            predictions.map((prediction) => (
              <div
                key={prediction.place_id}
                role="button"
                tabIndex={0}
                onClick={() => handlePredictionSelect(prediction)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handlePredictionSelect(prediction);
                  }
                }}
                className="cursor-pointer overflow-hidden px-3 py-2 text-sm font-medium whitespace-nowrap text-[var(--text-primary)] text-ellipsis hover:bg-[var(--bg-subtle)]"
              >
                {prediction.description}
              </div>
            ))}

          {additionalActions && <div className="w-full p-2">{additionalActions}</div>}
        </div>
      )}
    </div>
  );
};

export default GooglePlacesAutocomplete;
