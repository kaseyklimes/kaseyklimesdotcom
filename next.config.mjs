import { getLegacyBlogRedirects } from './config/legacy-blog-redirects.mjs';
import { getLegacyWorkRedirects } from './config/legacy-work-redirects.mjs';
import createMDX from '@next/mdx';
import remarkGfm from 'remark-gfm';
import { imageDeviceSizes, imageFormats } from './config/image-optimization.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  redirects: async () => [...getLegacyBlogRedirects(), ...getLegacyWorkRedirects()],
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.youtube.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'youtube.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.squarespace-cdn.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.perfectday.nyc',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'substack-post-media.s3.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'bucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com',
        pathname: '/**',
      }
    ],
    formats: imageFormats,
    // A short ladder on purpose: see config/image-optimization.mjs.
    deviceSizes: imageDeviceSizes,
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },
  headers: async () => [
    {
      source: "/fonts/versioned/:path+",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
    {
      // Source images are immutable: replace an image by giving it a new name.
      // The optimizer inherits this TTL, so optimized variants stay cached in
      // browsers and on the CDN instead of being revalidated on every visit.
      source: '/images/:path+',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
  ],
  experimental: {
    mdxRs: true,
  },
};

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [],
    providerImportSource: "@mdx-js/react",
  },
});

export default withMDX(nextConfig); 