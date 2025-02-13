import type { Metadata } from "next";
import "./globals.css";
import "./fonts.css";

export const metadata: Metadata = {
  title: "Portfolio Website",
  description: "A showcase of work, writing, photography, and other content.",
  metadataBase: new URL('http://localhost:3000'),
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
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
        {/* DNS Prefetching */}
        <link rel="dns-prefetch" href="https://localhost:3000" />
        
        {/* Preconnect */}
        <link rel="preconnect" href="https://localhost:3000" crossOrigin="anonymous" />
        
        {/* Add manifest for PWA */}
        <link rel="manifest" href="/manifest.json" />

        {/* Add favicon */}
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen flex flex-col antialiased font-['Untitled_Sans']">
        {children}
      </body>
    </html>
  );
}
