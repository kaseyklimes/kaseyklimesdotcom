'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, ReactNode } from 'react';

interface PrefetchLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

/**
 * Link component that prefetches the route on hover for faster navigation.
 * Uses McMaster-Carr technique of loading content just before user clicks.
 */
export function PrefetchLink({ href, children, className }: PrefetchLinkProps) {
  const router = useRouter();

  const handleMouseEnter = useCallback(() => {
    router.prefetch(href);
  }, [router, href]);

  return (
    <Link
      href={href}
      className={className}
      onMouseEnter={handleMouseEnter}
    >
      {children}
    </Link>
  );
}
