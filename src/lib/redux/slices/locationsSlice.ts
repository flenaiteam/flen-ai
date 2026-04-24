import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Location {
  public_id: string;
  code?: string;
  name: string;
  address?: string;
  phone?: string;
  timezone: string;
  is_default: boolean;
  is_active: boolean;
}

export interface LocationsState {
  current: Location | null;
  list: Location[];
  hasSelectedLocation: boolean;
}

const initialState: LocationsState = {
  current: null,
  list: [],
  hasSelectedLocation: false,
};

const locationsSlice = createSlice({
  name: 'locations',
  initialState,
  reducers: {
    setCurrentLocation(state, action: PayloadAction<Location>) {
      state.current = action.payload;
      state.hasSelectedLocation = true;
      if (typeof window !== 'undefined') {
        localStorage.setItem('selected_location', JSON.stringify(action.payload));
      }
    },
    clearCurrentLocation(state) {
      state.current = null;
      state.hasSelectedLocation = false;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selected_location');
      }
    },
    setLocationsList(state, action: PayloadAction<Location[]>) {
      state.list = action.payload;
    },
    clearLocations(state) {
      state.current = null;
      state.list = [];
      state.hasSelectedLocation = false;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selected_location');
      }
    },
    restoreFromStorage(
      state,
      action: PayloadAction<{ locations?: Location[]; currentLocation?: Location }>
    ) {
      if (action.payload.locations) {
        state.list = action.payload.locations;
      }
      if (action.payload.currentLocation) {
        state.current = action.payload.currentLocation;
        state.hasSelectedLocation = true;
      }
    },
    restoreLocationFromStorage(state) {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('selected_location');
        if (raw) {
          try {
            state.current = JSON.parse(raw);
            state.hasSelectedLocation = true;
          } catch {
            localStorage.removeItem('selected_location');
          }
        }
      }
    },
  },
});

export const {
  setCurrentLocation,
  clearCurrentLocation,
  setLocationsList,
  clearLocations,
  restoreFromStorage,
  restoreLocationFromStorage,
} = locationsSlice.actions;
export default locationsSlice.reducer;
