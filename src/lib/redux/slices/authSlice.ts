import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
}

export interface AuthState {
  user: User | null;
  sessionJwt: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
}

const initialState: AuthState = {
  user: null,
  sessionJwt: null,
  isAuthenticated: false,
  isInitialized: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth(state, action: PayloadAction<{ user: User; sessionJwt: string }>) {
      state.user = action.payload.user;
      state.sessionJwt = action.payload.sessionJwt;
      state.isAuthenticated = true;
      state.isInitialized = true;
    },
    setSessionJwt(state, action: PayloadAction<string>) {
      state.sessionJwt = action.payload;
    },
    setInitialized(state, action: PayloadAction<boolean>) {
      state.isInitialized = action.payload;
    },
    logout(state) {
      state.user = null;
      state.sessionJwt = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
    },
    restoreFromStorage(state, action: PayloadAction<{ user: User; sessionJwt: string }>) {
      state.user = action.payload.user;
      state.sessionJwt = action.payload.sessionJwt;
      state.isAuthenticated = true;
      state.isInitialized = true;
    },
  },
});

export const { setAuth, setSessionJwt, setInitialized, logout, restoreFromStorage } = authSlice.actions;
export default authSlice.reducer;
