'use client';

import React from 'react';
import { ContentMeta } from '@/types/content';
import Image from 'next/image';
import Link from 'next/link';

interface ShelfGridProps {
  items: ContentMeta[];
}

function ShelfGridItem({ item }: { item: ContentMeta }) {
  return (
    <Link href={`/shelf/${item.slug}`} className="block">
      <div className="h-full flex flex-col">
        {item.heroImage && (
          <div className="w-full mb-2 bg-gray-50 dark:bg-gray-900/50">
            <Image
              src={item.heroImage}
              alt={`${item.title}${item.description ? ` - ${item.description}` : ''}`}
              width={400}
              height={400}
              className="w-full h-auto"
              sizes="(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 50vw"
            />
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-sm leading-tight">
            {item.title}
          </h3>
          {item.description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-snug">
              {item.description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function ShelfGrid({ items }: ShelfGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {items.map((item) => (
        <ShelfGridItem key={item.slug} item={item} />
      ))}
    </div>
  );
} 