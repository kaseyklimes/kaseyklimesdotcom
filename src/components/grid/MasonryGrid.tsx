'use client';

import React, { useState } from 'react';
import { ContentMeta } from '@/types/content';
import Link from 'next/link';
import Image from 'next/image';

interface MasonryGridProps {
  items: ContentMeta[];
}

function calculateRowSpan(stars: number, description: string) {
  // Base row height is determined by image aspect ratio (3/2) plus text content
  const baseRows = 1;
  
  // Add rows based on description length and star count
  const descriptionRows = Math.ceil(description.length / 100); // Approximate characters per row
  const extraRows = Math.ceil(stars / 2); // Larger items need more rows
  
  return baseRows + descriptionRows + extraRows;
}

function GridItem({ item }: { item: ContentMeta }) {
  const colSpan = Math.min(item.stars, 5);
  const rowSpan = calculateRowSpan(item.stars, item.description);
  
  return (
    <div 
      style={{ 
        gridColumn: `span ${colSpan} / span ${colSpan}`,
        gridRow: `span ${rowSpan} / span ${rowSpan}`,
      }}
    >
      <Link href={`/${item.category}/${item.slug}`}>
        <div>
          <div className="relative aspect-[3/2]">
            <Image
              src={item.heroImage}
              alt={item.title}
              fill
              className="object-cover"
              sizes={`(min-width: 1024px) ${colSpan * 20}vw, 100vw`}
            />
          </div>
          <div className="mt-2">
            <h3 className="text-lg">
              {item.title}
            </h3>
            <p className="text-sm">
              {item.description}
            </p>
            <div className="mt-2">
              <span className="text-xs">
                {item.category}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function MasonryGrid({ items }: MasonryGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const categories = ['all', 'blog', 'work', 'photography', 'projects'];
  
  const filteredItems = selectedCategory && selectedCategory !== 'all'
    ? items.filter(item => item.category === selectedCategory)
    : items;

  // Sort items by stars (descending) to prioritize larger items
  const sortedItems = [...filteredItems].sort((a, b) => b.stars - a.stars);

  return (
    <div>
      {/* Category Filter */}
      <div className="mb-8 flex space-x-4">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category === 'all' ? null : category)}
            className={`text-sm ${
              (category === 'all' && !selectedCategory) || category === selectedCategory
                ? 'underline'
                : ''
            }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div 
        className="grid gap-4" 
        style={{ 
          gridTemplateColumns: 'repeat(5, 1fr)',
          gridAutoRows: '100px', // Base row height unit
          gridAutoFlow: 'dense'
        }}
      >
        {sortedItems.map((item) => (
          <GridItem key={`${item.category}-${item.slug}`} item={item} />
        ))}
      </div>
    </div>
  );
} 