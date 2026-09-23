import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/agenda', '/members', '/projects', '/repertorio', '/relatorio', '/profile', '/gigs', '/onboarding', '/palco', '/auth', '/api'],
      },
    ],
    sitemap: 'https://www.gigueiros.com.br/sitemap.xml',
  };
}
