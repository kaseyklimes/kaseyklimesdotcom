import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./fonts.css";
import { siteDescription, siteName } from "@/utils/site";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://kaseyklimes.com'),
  title: {
    default: siteName,
    template: `%s · ${siteName}`,
  },
  description: siteDescription,
  authors: [{ name: siteName, url: 'https://kaseyklimes.com' }],
  openGraph: {
    type: 'website',
    siteName,
    title: siteName,
    description: siteDescription,
    url: '/',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: siteName }],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

// Force static rendering for better performance
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="alternate" type="application/rss+xml" title="Kasey Klimes — Notes" href="/feed.xml" />
        {/* Critical font preloading */}
        <link 
          rel="preload" 
          href="/fonts/versioned/BerkeleyMono-Regular.175ac985f6f946a3.woff2"
          as="font" 
          type="font/woff2" 
          crossOrigin="" 
        />
        <link 
          rel="preload" 
          href="/fonts/versioned/BerkeleyMono-Bold.dbf854644010c5bc.woff2"
          as="font" 
          type="font/woff2" 
          crossOrigin="" 
        />
        <link 
          rel="preload" 
          href="/fonts/versioned/BerkeleyMono-Oblique.a4f99954a4a967fb.woff2"
          as="font" 
          type="font/woff2" 
          crossOrigin="" 
        />
        
        {/* DNS Prefetching for external resources */}
        <link rel="dns-prefetch" href="//i.ytimg.com" />
        
        {/* Add manifest for PWA */}
        <link rel="manifest" href="/manifest.json" />

      </head>
      <body 
        className="min-h-screen flex flex-col antialiased font-sans"
        style={{ isolation: 'isolate' }}
      >
        {children}
      </body>
    </html>
  );
}
