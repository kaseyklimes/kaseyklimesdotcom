import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./fonts.css";

export const metadata: Metadata = {
  title: "Portfolio Website",
  description: "A showcase of work, writing, photography, and other content.",
  metadataBase: new URL('http://localhost:3000'),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
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
        {/* Critical font preloading */}
        <link 
          rel="preload" 
          href="/fonts/Berkeley Mono/BerkeleyMono-Regular.woff2" 
          as="font" 
          type="font/woff2" 
          crossOrigin="" 
        />
        <link 
          rel="preload" 
          href="/fonts/Berkeley Mono/BerkeleyMono-Bold.woff2" 
          as="font" 
          type="font/woff2" 
          crossOrigin="" 
        />
        <link 
          rel="preload" 
          href="/fonts/Berkeley Mono/BerkeleyMono-Oblique.woff2" 
          as="font" 
          type="font/woff2" 
          crossOrigin="" 
        />
        
        {/* DNS Prefetching for external resources */}
        <link rel="dns-prefetch" href="//i.ytimg.com" />
        <link rel="dns-prefetch" href="//pbs.twimg.com" />
        <link rel="dns-prefetch" href="//platform.twitter.com" />
        
        {/* Preconnect for critical resources */}
        <link rel="preconnect" href="https://platform.twitter.com" />
        
        {/* Add manifest for PWA */}
        <link rel="manifest" href="/manifest.json" />

        {/* Add favicon */}
        <link rel="icon" href="/favicon.ico" />
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
