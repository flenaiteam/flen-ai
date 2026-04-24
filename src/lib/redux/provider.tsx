'use client';

import { useRef } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef(store);
  return <Provider store={storeRef.current}>{children}</Provider>;
}
