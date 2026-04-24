'use client';

import { StytchB2BProvider, createStytchB2BUIClient } from '@stytch/nextjs/b2b';

const stytchClient = createStytchB2BUIClient(
  process.env.NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN!
);

export function StytchProvider({ children }: { children: React.ReactNode }) {
  return <StytchB2BProvider stytch={stytchClient}>{children}</StytchB2BProvider>;
}
