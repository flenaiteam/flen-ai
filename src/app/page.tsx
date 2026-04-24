import { redirect } from 'next/navigation';

/**
 * Root `/` redirects to `/authenticate`.
 * Stytch magic-link and OAuth callbacks are configured to return to `/authenticate`,
 * so that page owns the full auth wizard flow.
 */
export default function RootPage() {
  redirect('/authenticate');
}
