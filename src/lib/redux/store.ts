import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import organizationsReducer from './slices/organizationsSlice';
import locationsReducer from './slices/locationsSlice';
import baseApi from '@/lib/api/baseApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    organizations: organizationsReducer,
    locations: locationsReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
