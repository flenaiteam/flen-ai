import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  stytch_org_id: string;
}

export interface Membership {
  public_id: string;
  role: string;
  is_active: boolean;
}

export interface OrganizationsState {
  current: Organization | null;
  membership: Membership | null;
}

const initialState: OrganizationsState = {
  current: null,
  membership: null,
};

const organizationsSlice = createSlice({
  name: 'organizations',
  initialState,
  reducers: {
    setCurrentOrganization(state, action: PayloadAction<Organization>) {
      state.current = action.payload;
    },
    setMembership(state, action: PayloadAction<Membership>) {
      state.membership = action.payload;
    },
    clearOrganizations(state) {
      state.current = null;
      state.membership = null;
    },
    restoreFromStorage(
      state,
      action: PayloadAction<{ organization: Organization; membership?: Membership }>
    ) {
      state.current = action.payload.organization;
      if (action.payload.membership) {
        state.membership = action.payload.membership;
      }
    },
  },
});

export const { setCurrentOrganization, setMembership, clearOrganizations, restoreFromStorage } =
  organizationsSlice.actions;
export default organizationsSlice.reducer;
