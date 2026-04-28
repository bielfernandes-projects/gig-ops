import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack is already enabled by default in Next.js 16
  // Optimize bundle size
  compress: true,
  
  // Optimize images if any
  images: {
    unoptimized: true, // Since it's a PWA with few images, skip optimization overhead
  },

  // Disable x-powered-by header for security and minor perf
  poweredByHeader: false,

  // Turbopack config (Next.js 16+ default)
  turbopack: {
    // Any turbopack-specific config can go here
  },
};

export default nextConfig;
