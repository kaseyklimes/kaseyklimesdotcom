'use client';

import { useState, useEffect } from 'react';

interface UseResponsiveColumnsOptions {
  minColumnWidth?: number;
  maxColumns?: number;
  padding?: number;
}

/**
 * Hook to calculate responsive column count based on window width.
 * Shared between MasonryGrid and ShelfGrid components.
 * Uses debounced ResizeObserver for better performance.
 */
export function useResponsiveColumns({
  minColumnWidth = 200,
  maxColumns = 5,
  padding = 48, // Default: 3rem gap-x-6
}: UseResponsiveColumnsOptions = {}): number {
  const [columns, setColumns] = useState(maxColumns);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const width = window.innerWidth - padding;
        setColumns(Math.max(1, Math.min(maxColumns, Math.floor(width / minColumnWidth))));
      }, 100);
    };

    // Use ResizeObserver on document.body for better performance
    const observer = new ResizeObserver(handleResize);
    observer.observe(document.body);

    // Initial calculation (immediate, no debounce)
    const width = window.innerWidth - padding;
    setColumns(Math.max(1, Math.min(maxColumns, Math.floor(width / minColumnWidth))));

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [minColumnWidth, maxColumns, padding]);

  return columns;
}
