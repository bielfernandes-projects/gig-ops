import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/dashboard', '/agenda', '/members', '/projects', '/repertorio', '/relatorio', '/profile', '/gigs', '/onboarding', '/auth', '/api'],
      },
    ],
    sitemap: 'https://gigueiros.com.br/sitemap.xml',
  };
}
