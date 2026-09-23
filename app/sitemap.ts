import type { MetadataRoute } from 'next';

const BASE_URL = 'https://gigueiros.com.br';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/termos`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/privacidade`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
  ];
}
