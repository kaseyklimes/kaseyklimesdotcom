import React from 'react';
import Link from 'next/link';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Blog', href: '/blog' },
  { name: 'Work', href: '/work' },
  { name: 'Photography', href: '/photography' },
  { name: 'Projects', href: '/projects' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">

      <main className="flex-1 max-w-7xl w-full mx-auto px-4">
        {children}
      </main>

      <footer className="py-4">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-sm">
            © {new Date().getFullYear()} Portfolio. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
} 