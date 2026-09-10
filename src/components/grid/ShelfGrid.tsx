'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ContentMeta } from '@/types/content';
import Image from 'next/image';
import Link from 'next/link';
import { orderShelfItems, SHELF_COLUMN_GAP } from '@/utils/shelfOrder';

interface ShelfGridProps {
  items: ContentMeta[];
}

function ShelfGridItem({ item, index }: { item: ContentMeta; index: number }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  return (
    <Link href={`/shelf/${item.slug}`} className="block">
      <div>
        {item.heroImage && (
          <div className="relative w-full mb-2 image-container">
            <Image
              src={item.heroImage}
              alt={`${item.title}${item.description ? ` - ${item.description}` : ''}`}
              width={item.imageDimensions?.width ?? 1200}
              height={item.imageDimensions?.height ?? 800}
              className={`w-full h-auto ${imageLoaded ? 'loaded' : ''}`}
              sizes="(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 50vw"
              onLoad={handleImageLoad}
              priority={index < 4}
              loading={index < 4 ? "eager" : "lazy"}
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
            />
          </div>
        )}
      </div>
    </Link>
  );
}

export default function ShelfGrid({ items }: ShelfGridProps) {
  const [maxColumns, setMaxColumns] = useState(5);
  const [containerWidth, setContainerWidth] = useState(1216);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate max columns based on window width - same as MasonryGrid
  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth;
      // Subtract padding/margins (48px = 3rem for gap-x-6)
      const availableWidth = width - 48;
      // Each column needs minimum 200px
      const possibleColumns = Math.floor(availableWidth / 200);
      // Clamp between 1 and 5 columns
      setMaxColumns(Math.max(1, Math.min(5, possibleColumns)));
      if (containerRef.current) setContainerWidth(containerRef.current.clientWidth);
    }

    // Initial calculation
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, []);

  // Distribute items into columns for masonry layout
  const columns = useMemo(() => {
    const newColumns: ContentMeta[][] = Array.from({ length: maxColumns }, () => []);
    const columnWidth = (containerWidth - (maxColumns - 1) * SHELF_COLUMN_GAP) / maxColumns;

    orderShelfItems(items, maxColumns, columnWidth).forEach((item, index) => {
      const columnIndex = index % maxColumns;
      newColumns[columnIndex].push(item);
    });

    return newColumns;
  }, [items, maxColumns, containerWidth]);

  return (
    <div
      ref={containerRef}
      className="flex gap-6"
    >
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className="flex-1 flex flex-col gap-6">
          {column.map((item, itemIndex) => (
            <ShelfGridItem
              key={item.slug}
              item={item}
              index={itemIndex * maxColumns + columnIndex}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
