import createMDX from '@next/mdx';
import remarkGfm from 'remark-gfm';

/** @type {import('next').NextConfig} */
const nextConfig = {
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
        hostname: 'pbs.twimg.com',
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
      }
    ],
    formats: ['image/avif', 'image/webp'],
  },
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