'use client';

import React, { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react';
import { ContentMeta } from '@/types/content';
import Image from 'next/image';
import ShelfGrid from './ShelfGrid';
import { formatDateOrRange } from '@/utils/dateFormatting';
import { getVideoInfo } from '@/utils/mediaDetection';
import { useResponsiveColumns } from '@/hooks/useResponsiveColumns';
import { PrefetchLink } from '@/components/ui/PrefetchLink';

// Gap between items in pixels
const GAP_X = 24; // gap-x-6 = 1.5rem = 24px
const GAP_Y = 24; // vertical gap between items

interface MasonryGridProps {
  items: ContentMeta[];
}


function CustomTweet({ item }: { item: ContentMeta }) {
  const profile = item.profile || {
    name: 'Kasey Klimes',
    username: 'kaseyklimes',
    profile_image_url: ''
  };

  return (
    <a
      href={item.tweetUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 bg-white/50 dark:bg-gray-900/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors duration-200 border border-gray-200 dark:border-gray-700 rounded-lg"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-shrink-0">
          {profile.profile_image_url ? (
            <Image
              src={profile.profile_image_url}
              alt={`Profile picture of ${profile.name}`}
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
          )}
        </div>
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100 text-xs">{profile.name}</div>
          <div className="text-gray-500 dark:text-gray-400 text-xs">@{profile.username}</div>
        </div>
      </div>

      {/* Tweet text */}
      <div className="text-xs mb-3 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
        {item.description}
      </div>

      {/* Quoted tweet */}
      {item.quoted_tweet && (
        <div className="mb-3 p-3 border border-gray-200 dark:border-gray-700 rounded bg-gray-50/50 dark:bg-gray-800/50">
          {item.quoted_tweet.author && (
            <div className="flex items-center gap-2 mb-2">
              {item.quoted_tweet.author.profile_image_url ? (
                <Image
                  src={item.quoted_tweet.author.profile_image_url}
                  alt={item.quoted_tweet.author.name}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
              )}
              <span className="font-medium text-xs text-gray-900 dark:text-gray-100">
                {item.quoted_tweet.author.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                @{item.quoted_tweet.author.username}
              </span>
            </div>
          )}
          <div className="text-xs text-gray-900 dark:text-gray-100">
            {item.quoted_tweet.text}
          </div>
        </div>
      )}

      {/* Media */}
      {item.media && item.media.length > 0 && (
        <div className="mb-3 rounded-lg overflow-hidden">
          {item.media.map((media, index) => (
            media.type === 'photo' ? (
              <Image
                key={index}
                src={media.url}
                alt={`Media attachment ${index + 1} for tweet by ${item.profile?.name || 'author'}`}
                width={500}
                height={300}
                className="w-full h-auto"
              />
            ) : null
          ))}
        </div>
      )}

      {/* Date and metrics */}
      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
        <span suppressHydrationWarning>{formatDateOrRange(item.date)}</span>
        <span>•</span>
        <div className="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <span>{item.likes || 0}</span>
        </div>
      </div>
    </a>
  );
}

// Shared content component to eliminate duplication
interface GridItemContentProps {
  item: ContentMeta;
  colSpan: number;
  index: number;
  videoInfo: { isVideo: boolean; type?: string; id?: string };
  heroImages: string[];
}

const GridItemContent = memo(function GridItemContent({ item, colSpan, index, videoInfo, heroImages }: GridItemContentProps) {
  return (
    <div>
      <div className={`relative group overflow-hidden ${videoInfo.isVideo ? 'aspect-[16/9]' : ''}`}>
        {videoInfo.isVideo ? (
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            {videoInfo.type === 'youtube' ? (
              <>
                <Image
                  src={`https://i.ytimg.com/vi/${videoInfo.id}/maxresdefault.jpg`}
                  alt={`Thumbnail for ${item.title}`}
                  fill
                  className="object-cover"
                  sizes={`(min-width: 1024px) ${colSpan * 20}vw, 100vw`}
                />
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${videoInfo.id}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={item.title}
                />
              </>
            ) : (
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src={`https://player.vimeo.com/video/${videoInfo.id}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={item.title}
              />
            )}
          </div>
        ) : (
          heroImages[0] && (
            <Image
              src={heroImages[0]}
              alt={item.title || 'Content image'}
              width={1200}
              height={800}
              className="w-full h-auto"
              sizes={`(min-width: 1024px) ${colSpan * 20}vw, 100vw`}
              priority={index < 4}
              loading={index < 4 ? "eager" : "lazy"}
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
            />
          )
        )}
        {item.audioUrl && (
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/20 backdrop-blur-sm">
            <audio controls className="w-full h-6 audio-player">
              <source src={item.audioUrl} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}
        {item.hasContent && (
          <>
            {/* Gradient overlay with hover effect */}
            <div
              className="absolute top-0 right-0 pointer-events-none transition-opacity duration-200 group-hover:opacity-0"
              style={{
                width: '90px',
                height: '90px',
                background: 'radial-gradient(circle at top right, rgba(51,51,51,0.2) 0%, rgba(51,51,51,0.1) 15%, rgba(51,51,51,0.05) 25%, transparent 25%)'
              }}
            />
            <div
              className="absolute top-0 right-0 pointer-events-none opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              style={{
                width: '90px',
                height: '90px',
                background: 'radial-gradient(circle at top right, rgba(51,51,51,0.4) 0%, rgba(51,51,51,0.3) 15%, rgba(51,51,51,0.15) 25%, transparent 25%)'
              }}
            />
            {/* Icon */}
            <div className="absolute top-1.5 right-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="text-white">
                <path fill="currentColor" d="M17 7h-3q-.425 0-.712-.288T13 6t.288-.712T14 5h4q.425 0 .713.288T19 6v4q0 .425-.288.713T18 11t-.712-.288T17 10z" />
              </svg>
            </div>
          </>
        )}
      </div>
      <div className="mt-1">
        <h3 className="text-lg leading-snug">{item.title}</h3>
        <p className="text-xs line-clamp-4 mt-1">{item.description}</p>
        {item.category !== 'shelf' && (
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
            <span suppressHydrationWarning>{formatDateOrRange(item.date)}</span>
            {item.location && (
              <>
                <span className="text-gray-300">•</span>
                <span>{item.location}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

interface GridItemProps {
  item: ContentMeta;
  maxColumns: number;
  index: number;
  style?: React.CSSProperties;
  onHeightMeasured?: (height: number) => void;
}

const GridItem = memo(function GridItem({ item, maxColumns, index, style, onHeightMeasured }: GridItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  // For tweets, always use 1 column regardless of stars
  const colSpan = item.category === 'tweet'
    ? 1
    : Math.min(item.stars, maxColumns); // Limit column span to available columns

  // Use thumbnail for grid display, fall back to heroImage
  const gridImage = item.thumbnail || item.heroImage;
  const heroImages = React.useMemo(() => (gridImage ? [gridImage] : []), [gridImage]);

  const videoInfo = React.useMemo(() => (
    heroImages.length === 1 ? getVideoInfo(heroImages[0]) : { isVideo: false }
  ), [heroImages]);

  // Measure height after render and images load
  useEffect(() => {
    if (!onHeightMeasured || !itemRef.current) return;

    const measureHeight = () => {
      if (itemRef.current) {
        const height = itemRef.current.getBoundingClientRect().height;
        onHeightMeasured(height);
      }
    };

    // Initial measurement
    measureHeight();

    // Also measure when images load
    const images = itemRef.current.querySelectorAll('img');
    images.forEach(img => {
      if (!img.complete) {
        img.addEventListener('load', measureHeight);
      }
    });

    // Observe resize changes
    const resizeObserver = new ResizeObserver(measureHeight);
    resizeObserver.observe(itemRef.current);

    return () => {
      resizeObserver.disconnect();
      images.forEach(img => {
        img.removeEventListener('load', measureHeight);
      });
    };
  }, [onHeightMeasured]);

  const itemStyle = style || {};

  if (item.category === 'tweet') {
    return (
      <div ref={itemRef} style={itemStyle}>
        <CustomTweet item={item} />
      </div>
    );
  }

  // Special case for shelf grid
  if (item.category === 'shelf' && item.items) {
    return (
      <div ref={itemRef} style={itemStyle}>
        <ShelfGrid items={item.items} />
      </div>
    );
  }

  if (item.iframeUrl) {
    // Use actual grid width from style, or fall back to estimate
    const actualGridWidth = typeof style?.width === 'number' ? style.width : colSpan * 200;
    const iframeNaturalWidth = item.iframeWidth || actualGridWidth;
    const iframeNaturalHeight = item.iframeRows ? item.iframeRows * 40 : 400;
    const scale = actualGridWidth / iframeNaturalWidth;
    const aspectRatio = iframeNaturalWidth / iframeNaturalHeight;

    return (
      <div ref={itemRef} style={itemStyle}>
        <div className="w-full relative overflow-hidden" style={{ aspectRatio }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${iframeNaturalWidth}px`,
            height: `${iframeNaturalHeight}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left'
          }}>
            <iframe
              src={item.iframeUrl}
              className="w-full h-full border border-[#444] rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
        {item.title && (
          <div className="mt-1">
            <h3 className="text-lg leading-snug">{item.title}</h3>
            {item.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-4 mt-1">
                {item.description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  const contentProps = { item, colSpan, index, videoInfo, heroImages };

  return (
    <div ref={itemRef} style={itemStyle}>
      {item.clickThroughUrl ? (
        <a href={item.clickThroughUrl} target="_blank" rel="noopener noreferrer">
          <GridItemContent {...contentProps} />
        </a>
      ) : (
        <PrefetchLink href={`/${item.category}/${item.slug}`}>
          <GridItemContent {...contentProps} />
        </PrefetchLink>
      )}
    </div>
  );
});

// Helper to get column span for an item
function getColSpan(item: ContentMeta, maxColumns: number): number {
  if (item.category === 'tweet') return 1;
  return Math.min(item.stars, maxColumns);
}

// Helper to find best columns for a multi-column item
function findBestColumnsForItem(
  columnHeights: number[],
  colSpan: number
): { startCol: number; top: number } {
  const numColumns = columnHeights.length;
  let bestStartCol = 0;
  let bestTop = Infinity;

  // For multi-column items, find the position that minimizes the top position
  for (let startCol = 0; startCol <= numColumns - colSpan; startCol++) {
    // The top position is the max height among the columns this item would span
    const columnsToSpan = columnHeights.slice(startCol, startCol + colSpan);
    const maxHeightInSpan = Math.max(...columnsToSpan);

    if (maxHeightInSpan < bestTop) {
      bestTop = maxHeightInSpan;
      bestStartCol = startCol;
    }
  }

  return { startCol: bestStartCol, top: bestTop };
}

interface ItemPosition {
  left: number;
  top: number;
  width: number;
}

export default function MasonryGrid({ items }: MasonryGridProps) {
  const maxColumns = useResponsiveColumns();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [itemHeights, setItemHeights] = useState<Map<string, number>>(new Map());
  const [isLayoutReady, setIsLayoutReady] = useState(false);

  // Get unique tags from all items
  const tags = React.useMemo(() => {
    const allTags = items.flatMap(item => item.tags || []);
    return ['all', ...new Set(allTags)].sort();
  }, [items]);

  // Memoized date parsing function
  const getDateForSorting = useCallback((dateStr: string | undefined) => {
    if (!dateStr || typeof dateStr !== 'string') {
      return new Date(0);
    }

    try {
      // Handle "present" as future date
      if (dateStr.toLowerCase().includes('present')) {
        return new Date('9999-12-31');
      }

      // Handle year ranges with either hyphen or forward slash (e.g., "2017-2021" or "1993/2008")
      if (/^\d{4}[-\/]\d{4}$/.test(dateStr)) {
        const [startYear, endYear] = dateStr.split(/[-\/]/);
        // If end year is less than start year, something is wrong
        if (parseInt(endYear) < parseInt(startYear)) {
          console.error(`Invalid date range: ${dateStr}`);
          return new Date(parseInt(startYear), 11, 31);
        }
        // For date ranges, use the end year but add a month to ensure it sorts after single years
        return new Date(parseInt(endYear), 11, 31);
      }

      // Handle just year (e.g., "2014")
      if (/^\d{4}$/.test(dateStr)) {
        // For single years, use January 1st to ensure it sorts before ranges ending in the same year
        return new Date(parseInt(dateStr), 0, 1);
      }

      // Handle month-year format (e.g., "07-2024")
      if (/^\d{2}-\d{4}$/.test(dateStr)) {
        const [month, year] = dateStr.split('-');
        return new Date(parseInt(year), parseInt(month) - 1, 0);
      }

      // Handle full date format (e.g., "10-27-2023")
      if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        const [month, day, year] = dateStr.split('-');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }

      return new Date(dateStr);
    } catch (error) {
      console.error('Error parsing date:', dateStr, error);
      return new Date(0);
    }
  }, []);

  // Memoized filtered and sorted items with pre-computed date cache
  const sortedItems = useMemo(() => {
    const filtered = selectedTag && selectedTag !== 'all'
      ? items.filter(item => item.tags?.includes(selectedTag) && !item.private)
      : items.filter(item => !item.private);

    // Pre-compute dates ONCE before sorting
    const dateCache = new Map<string, number>(
      filtered.map(item => [
        `${item.category}-${item.slug}`,
        getDateForSorting(item.date).getTime()
      ])
    );

    return [...filtered].sort((a, b) => {
      // Always put shelf at the end
      if (a.category === 'shelf') return 1;
      if (b.category === 'shelf') return -1;

      const keyA = `${a.category}-${a.slug}`;
      const keyB = `${b.category}-${b.slug}`;
      const dateA = dateCache.get(keyA) || 0;
      const dateB = dateCache.get(keyB) || 0;

      // Sort by date first (most recent first)
      const dateCompare = dateB - dateA;

      // If dates are equal, sort by stars
      if (dateCompare === 0) {
        return b.stars - a.stars;
      }

      return dateCompare;
    });
  }, [items, selectedTag, getDateForSorting]);

  // Measure container width
  useEffect(() => {
    if (!containerRef.current) return;

    const measureWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    measureWidth();
    const resizeObserver = new ResizeObserver(measureWidth);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Calculate column width
  const columnWidth = useMemo(() => {
    if (containerWidth === 0 || maxColumns === 0) return 0;
    // Total gap space = (maxColumns - 1) * GAP_X
    const totalGapSpace = (maxColumns - 1) * GAP_X;
    return (containerWidth - totalGapSpace) / maxColumns;
  }, [containerWidth, maxColumns]);

  // Calculate positions using true masonry algorithm with gap-filling lookahead
  const { positions, containerHeight } = useMemo(() => {
    if (columnWidth === 0) {
      return { positions: new Map<string, ItemPosition>(), containerHeight: 0 };
    }

    const columnHeights = new Array(maxColumns).fill(0);
    const positions = new Map<string, ItemPosition>();
    const placed = new Set<string>();

    // Helper to place an item and update column heights
    const placeItem = (item: ContentMeta) => {
      const key = `${item.category}-${item.slug}`;
      if (placed.has(key)) return;

      const colSpan = getColSpan(item, maxColumns);
      const itemWidth = colSpan * columnWidth + (colSpan - 1) * GAP_X;

      const { startCol, top } = findBestColumnsForItem(columnHeights, colSpan);
      const left = startCol * (columnWidth + GAP_X);

      positions.set(key, { left, top, width: itemWidth });
      placed.add(key);

      const measuredHeight = itemHeights.get(key);
      const estimatedHeight = estimateItemHeight(item, itemWidth);
      const height = measuredHeight || estimatedHeight;

      const newHeight = top + height + GAP_Y;
      for (let c = startCol; c < startCol + colSpan; c++) {
        columnHeights[c] = newHeight;
      }
    };

    // Helper to get the height variance (gap potential)
    const getColumnVariance = () => {
      const min = Math.min(...columnHeights);
      const max = Math.max(...columnHeights);
      return max - min;
    };

    // Process items with lookahead for gap filling
    const LOOKAHEAD_LIMIT = 8; // How far ahead to look for gap fillers
    const GAP_THRESHOLD = 100; // Minimum gap (px) to trigger lookahead

    for (let i = 0; i < sortedItems.length; i++) {
      const item = sortedItems[i];
      const key = `${item.category}-${item.slug}`;

      if (placed.has(key)) continue;

      const colSpan = getColSpan(item, maxColumns);
      const { top } = findBestColumnsForItem(columnHeights, colSpan);
      const minColumnHeight = Math.min(...columnHeights);
      const gap = top - minColumnHeight;

      // If this item would create a significant gap, look for smaller items to fill it
      if (gap > GAP_THRESHOLD && colSpan > 1) {
        // Look ahead for single-column items that could fill the shorter columns
        for (let j = i + 1; j < Math.min(i + 1 + LOOKAHEAD_LIMIT, sortedItems.length); j++) {
          const futureItem = sortedItems[j];
          const futureKey = `${futureItem.category}-${futureItem.slug}`;

          if (placed.has(futureKey)) continue;

          const futureColSpan = getColSpan(futureItem, maxColumns);

          // Only pull forward items that are smaller and would fit in a short column
          if (futureColSpan < colSpan) {
            const { top: futureTop } = findBestColumnsForItem(columnHeights, futureColSpan);

            // Place it if it would go in a shorter position than our current item
            if (futureTop < top) {
              placeItem(futureItem);

              // Check if we've reduced the variance enough
              if (getColumnVariance() < GAP_THRESHOLD) break;
            }
          }
        }
      }

      // Now place the current item
      placeItem(item);
    }

    return {
      positions,
      containerHeight: Math.max(...columnHeights)
    };
  }, [sortedItems, columnWidth, maxColumns, itemHeights]);

  // Mark layout as ready after first calculation
  useEffect(() => {
    if (positions.size > 0 && !isLayoutReady) {
      // Small delay to allow DOM to paint
      requestAnimationFrame(() => {
        setIsLayoutReady(true);
      });
    }
  }, [positions, isLayoutReady]);

  // Handle height measurement callback
  const handleHeightMeasured = useCallback((key: string, height: number) => {
    setItemHeights(prev => {
      const existing = prev.get(key);
      // Only update if height changed significantly (avoid infinite loops)
      if (existing && Math.abs(existing - height) < 2) {
        return prev;
      }
      const next = new Map(prev);
      next.set(key, height);
      return next;
    });
  }, []);

  return (
    <div>
      {/* Tag Filter */}
      <div className="mb-8 flex space-x-4 flex-wrap">
        {tags.map(tag => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag === 'all' ? null : tag)}
            className={`text-sm mb-2 ${(tag === 'all' && !selectedTag) || tag === selectedTag
              ? 'underline'
              : ''
              }`}
          >
            {tag.charAt(0).toUpperCase() + tag.slice(1)}
          </button>
        ))}
      </div>

      {/* Masonry Grid */}
      <div
        ref={containerRef}
        className="relative"
        style={{
          height: containerHeight || 'auto',
          opacity: isLayoutReady ? 1 : 0,
          transition: 'opacity 0.2s ease-in-out'
        }}
      >
        {sortedItems.map((item, index) => {
          const key = `${item.category}-${item.slug}`;
          const position = positions.get(key);

          if (!position) return null;

          const style: React.CSSProperties = {
            position: 'absolute',
            left: position.left,
            top: position.top,
            width: position.width,
            transition: 'left 0.3s ease-out, top 0.3s ease-out, width 0.3s ease-out'
          };

          return (
            <GridItem
              key={key}
              item={item}
              maxColumns={maxColumns}
              index={index}
              style={style}
              onHeightMeasured={(height) => handleHeightMeasured(key, height)}
            />
          );
        })}
      </div>
    </div>
  );
}

// Estimate item height for initial layout before measurement
function estimateItemHeight(item: ContentMeta, width: number): number {
  // Base heights
  const titleHeight = item.title ? 28 : 0;
  const descriptionLines = item.description
    ? Math.ceil(item.description.length / (width / 7)) // Approximate chars per line
    : 0;
  const descriptionHeight = Math.min(descriptionLines * 20, 80); // Cap at 4 lines
  const metadataHeight = item.category !== 'shelf' ? 24 : 0;
  const margins = 12;

  // Image height estimation
  let imageHeight = 0;
  if (item.thumbnail || item.heroImage) {
    // Estimate based on typical aspect ratios
    if (item.category === 'photography') {
      imageHeight = width * 0.75; // Assume 4:3 portrait
    } else {
      imageHeight = width * 0.67; // Assume 3:2 landscape
    }
  }

  // Special cases
  if (item.category === 'tweet') {
    return 200 + descriptionHeight;
  }

  if (item.iframeUrl) {
    return 400 + titleHeight + descriptionHeight + margins;
  }

  return imageHeight + titleHeight + descriptionHeight + metadataHeight + margins;
}
