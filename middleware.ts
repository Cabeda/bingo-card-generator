import createMiddleware from 'next-intl/middleware';
import { routing } from './app/routing';

export default createMiddleware(routing);

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(pt|en|es|fr)/:path*']
};
