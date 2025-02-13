'use client';

import React, { useState } from 'react';
import { ContentMeta } from '@/types/content';
import Link from 'next/link';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';

interface MasonryGridProps {
  items: ContentMeta[];
}

function calculateRowSpan(stars: number, description: string | undefined) {
  const rowHeight = 40; // matches gridAutoRows
  
  // Calculate image height based on aspect ratio 3:2
  // If an item spans N columns, its width is N * (1/5 of container width)
  // Image height is then (width * 2/3) due to aspect ratio
  const colSpan = Math.min(stars, 5);
  const imageHeightRatio = (colSpan / 5) * (2/3);
  const imageRows = Math.ceil((imageHeightRatio * 1000) / rowHeight); // Scale factor to avoid tiny decimals
  
  // Text content height estimates in pixels
  const titleHeight = 28; // text-lg line height
  const descriptionLines = description ? Math.ceil(description.length / (colSpan * 20)) : 0; // More chars per line for wider items
  const descriptionHeight = descriptionLines * 20; // text-sm line height
  const metadataHeight = 20; // text-xs line height
  const verticalSpacing = 16; // mt-2 margins
  
  // Convert content height to rows
  const contentHeightPx = titleHeight + descriptionHeight + metadataHeight + verticalSpacing;
  const contentRows = Math.ceil(contentHeightPx / rowHeight);
  
  // Subtract 2 from final calculation to tighten layout
  return Math.max(imageRows + contentRows - 2, 1); // Ensure minimum of 1 row
}

function formatDateOrRange(dateString: string) {
  try {
    // Check if it's a date range (contains hyphen)
    if (dateString.includes('-')) {
      const [startDate, endDate] = dateString.split('-').map(d => d.trim());
      
      // Handle 'present' specially
      if (endDate.toLowerCase() === 'present') {
        // If start is just a year
        if (/^\d{4}$/.test(startDate)) {
          return `${startDate}–Present`;
        }
        // If start is a full date
        const parsedStart = parseISO(startDate);
        return `${format(parsedStart, 'yyyy')}–Present`;
      }
      
      // If both dates are just years (e.g., "2022-2024")
      if (/^\d{4}$/.test(startDate) && /^\d{4}$/.test(endDate)) {
        return `${startDate}–${endDate}`;
      }
      
      // If they're full dates, parse them properly
      const parsedStart = parseISO(startDate);
      const parsedEnd = parseISO(endDate);
      return `${format(parsedStart, 'yyyy')}–${format(parsedEnd, 'yyyy')}`;
    }
    
    // For single dates
    if (/^\d{4}$/.test(dateString)) {
      // If it's just a year
      return dateString;
    }
    
    // If it's a full date
    const parsedDate = parseISO(dateString);
    return format(parsedDate, 'MMMM d, yyyy');
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return dateString; // Fallback to original string if parsing fails
  }
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
            {item.hasContent && (
              <>
                {/* Gradient overlay */}
                <div 
                  className="absolute top-0 right-0 w-1/2 h-1/2 pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle at top right, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.15) 15%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.05) 45%, transparent 60%)'
                  }}
                />
                {/* Icon */}
                <div className="absolute top-1.5 right-1.5">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    className="text-white"
                  >
                    <path 
                      fill="currentColor" 
                      d="M7 17h3q.425 0 .713.288T11 18t-.288.713T10 19H6q-.425 0-.712-.288T5 18v-4q0-.425.288-.712T6 13t.713.288T7 14zM17 7h-3q-.425 0-.712-.288T13 6t.288-.712T14 5h4q.425 0 .713.288T19 6v4q0 .425-.288.713T18 11t-.712-.288T17 10z"
                    />
                  </svg>
                </div>
              </>
            )}
          </div>
          <div className="mt-2">
            <h3 className="text-lg">
              {item.title}
            </h3>
            <p className="text-sm">
              {item.description}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
              <span>{formatDateOrRange(item.date)}</span>
              {item.location && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>{item.location}</span>
                </>
              )}
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

  // Sort items by date (most recent first) and then by stars
  const sortedItems = [...filteredItems].sort((a, b) => {
    // Parse dates, handling both full dates and year-only formats
    const getDate = (dateStr: string) => {
      // If it's a range that ends with 'present', return future date to ensure it's most recent
      if (dateStr.toLowerCase().includes('-present')) {
        return new Date('9999-12-31'); // Far future date to ensure it's always most recent
      }

      // If it's a range (e.g., "2022-2024"), use the end date for sorting
      if (dateStr.includes('-')) {
        const [startDate, endDate] = dateStr.split('-').map(d => d.trim());
        const dateToUse = endDate.toLowerCase() !== 'present' ? endDate : startDate;
        // If it's just a year, append "-12-31" to make it end of year
        const fullDate = /^\d{4}$/.test(dateToUse) ? `${dateToUse}-12-31` : dateToUse;
        return new Date(fullDate);
      }
      
      // For single dates
      // If it's just a year, append "-01-01" to make it start of year
      const fullDate = /^\d{4}$/.test(dateStr) ? `${dateStr}-01-01` : dateStr;
      return new Date(fullDate);
    };

    const dateA = getDate(a.date);
    const dateB = getDate(b.date);

    // Sort by date first (most recent first)
    const dateCompare = dateB.getTime() - dateA.getTime();
    
    // If dates are equal, sort by stars
    if (dateCompare === 0) {
      return b.stars - a.stars;
    }
    
    return dateCompare;
  });

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
          gridAutoRows: '40px', // Even smaller row height for finer control
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