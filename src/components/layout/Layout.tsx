'use client';

import React from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4">
        {children}
      </main>

      <footer className="py-4">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-sm">
            <span suppressHydrationWarning>© {new Date().getFullYear()} Portfolio. All rights reserved.</span>
          </p>
        </div>
      </footer>
    </div>
  );
} 