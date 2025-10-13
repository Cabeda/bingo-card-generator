import createNextIntlPlugin from 'next-intl/plugin';
import {NextConfig} from 'next';

const withNextIntl = createNextIntlPlugin('./app/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
