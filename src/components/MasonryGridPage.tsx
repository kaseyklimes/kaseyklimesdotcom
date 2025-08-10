'use client';

import React from 'react';
import { MasonryGridPage as MasonryGridPageType } from '@/types/content';
import MasonryGrid from './grid/MasonryGrid';

interface MasonryGridPageProps {
  page: MasonryGridPageType;
}

export default function MasonryGridPage({ page }: MasonryGridPageProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {page.title && (
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{page.title}</h1>
          {page.description && (
            <p className="mt-2 text-lg leading-normal text-gray-600 dark:text-gray-400">
              {page.description}
            </p>
          )}
        </div>
      )}
      <MasonryGrid items={page.items} />
    </div>
  );
} 