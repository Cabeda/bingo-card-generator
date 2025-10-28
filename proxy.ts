import createMiddleware from 'next-intl/middleware';
import { routing } from './app/routing';

// Re-export the handler using the new Next.js proxy convention.
// This preserves the previous middleware behavior provided by next-intl.
export default createMiddleware(routing);

export const config = {
  // Match only internationalized pathnames (same matcher as before)
  matcher: ['/', '/(pt|en|es|fr)/:path*']
};
