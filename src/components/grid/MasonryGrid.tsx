'use client';

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { ContentMeta } from '@/types/content';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import ShelfGrid from './ShelfGrid';

interface MasonryGridProps {
  items: ContentMeta[];
}

// Add type definitions for Twitter widget
declare global {
  interface Window {
    twttr: {
      widgets: {
        createTweet: (
          tweetId: string,
          element: HTMLElement | null,
          options?: {
            theme?: 'light' | 'dark';
            align?: 'left' | 'center' | 'right';
            width?: number | string;
            conversation?: 'none' | 'all';
            cards?: 'hidden' | 'visible';
          }
        ) => Promise<HTMLElement>;
      };
    };
  }
}

// Memoized calculation cache
const rowSpanCache = new Map<string, number>();

function calculateRowSpan(stars: number, description: string | undefined, category: string, imageWidth?: number, imageHeight?: number, manualSpan?: number) {
  // Create cache key from all parameters
  const cacheKey = `${stars}-${description?.length || 0}-${category}-${imageWidth || 0}-${imageHeight || 0}-${manualSpan || 0}`;

  // Return cached result if available
  if (rowSpanCache.has(cacheKey)) {
    return rowSpanCache.get(cacheKey)!;
  }
  // If manual span override is provided, use it
  if (typeof manualSpan === 'number') {
    rowSpanCache.set(cacheKey, manualSpan);
    return manualSpan;
  }

  // Special handling for tweets - always use 1 column and fixed height
  if (category === 'tweet') {
    const tweetRows = 8; // Smaller fixed height for tweets
    rowSpanCache.set(cacheKey, tweetRows);
    return tweetRows;
  }

  const rowHeight = 40;
  const colSpan = Math.min(stars, 5);
  const columnWidth = 200; // Width of one column in pixels
  const containerWidth = colSpan * columnWidth;

  // Calculate image height
  let imageHeightPx;
  if ((category === 'photography' || category === 'shelf') && imageWidth && imageHeight) {
    // Use actual image dimensions for photography and shelf items
    imageHeightPx = (containerWidth * imageHeight) / imageWidth;
  } else {
    // Use 3:2 aspect ratio for other content
    imageHeightPx = (containerWidth * 2) / 3;
  }

  // Calculate text content height more precisely
  const titleHeightPx = description || (category !== 'photography' && category !== 'shelf') ? 28 : 0; // Only count title height if there's a description or it's not photography/shelf

  // Calculate description height based on content
  const charsPerLine = Math.floor((colSpan * 75));
  const descriptionLines = description ? Math.ceil(description.length / charsPerLine) : 0;
  const descriptionHeightPx = descriptionLines * 20; // text-xs line height

  // Metadata height (single line of text-xs plus margins)
  const metadataHeightPx = 20;

  // Account for margins (mt-2 = 0.5rem = 8px)
  const marginHeightPx = description ? 16 : 8; // Less margin if no description

  // Calculate total content height and convert to rows
  const totalHeightPx = imageHeightPx + titleHeightPx + descriptionHeightPx + metadataHeightPx + marginHeightPx;
  let totalRows = Math.ceil(totalHeightPx / rowHeight);

  // Special handling for 2-column photography items
  if (category === 'photography' && colSpan === 2) {
    if (description && description.length < 100) {
      // For items with short descriptions, cap at 9 rows
      totalRows = Math.min(totalRows, 9);
    } else if (!description && imageWidth && imageHeight) {
      // For items with no description, check image aspect ratio
      const aspectRatio = imageWidth / imageHeight;
      if (aspectRatio > 1) {
        // Wider images can be capped at 9 rows
        totalRows = Math.min(totalRows, 9);
      } else {
        // Taller images need more space, minimum 14 rows
        totalRows = Math.max(totalRows, 14);
      }
    }
  }
  // For photography/shelf items with no description, reduce the total rows slightly
  else if ((category === 'photography' || category === 'shelf') && !description) {
    totalRows = Math.floor(totalRows * 0.9); // Reduce by 10% for more compact layout
  }

  // For non-photography/shelf items, ensure we don't overallocate rows
  if (category !== 'photography' && category !== 'shelf') {
    const maxRowsBySpan: Record<number, number> = {
      1: 7,   // 1 column items max 7 rows
      2: 8,   // 2 column items max 8 rows
      3: 11,  // 3 column items max 11 rows
      4: 12,  // 4 column items max 12 rows
      5: 13   // 5 column items max 13 rows
    };

    // For 2-column items with short descriptions, reduce rows further
    if (colSpan === 2 && (!description || description.length < 100)) {
      totalRows = Math.min(totalRows, 8);
    }

    totalRows = Math.min(totalRows, maxRowsBySpan[colSpan] || totalRows);
  }

  // Cache the result and return
  rowSpanCache.set(cacheKey, totalRows);
  return totalRows;
}

function formatDateOrRange(dateString: string) {
  'use client';

  try {
    // Handle undefined or invalid dates
    if (!dateString || typeof dateString !== 'string') {
      return '';
    }

    // Handle date ranges with "present"
    if (dateString.toLowerCase().includes('present')) {
      const startYear = dateString.split('-')[0];
      return `${startYear}–Present`;
    }

    // Handle year ranges with either hyphen or forward slash (e.g., "2017-2021" or "1993/2008")
    if (/^\d{4}[-\/]\d{4}$/.test(dateString)) {
      const [startYear, endYear] = dateString.split(/[-\/]/);
      // If end year is less than start year, something is wrong
      if (parseInt(endYear) < parseInt(startYear)) {
        console.error(`Invalid date range: ${dateString}`);
        return startYear;
      }
      return `${startYear}–${endYear}`;
    }

    // Handle month-year format (e.g., "07-2024")
    if (/^\d{2}-\d{4}$/.test(dateString)) {
      const [month, year] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return format(date, 'MMMM yyyy');
    }

    // Handle full date format (e.g., "10-27-2023")
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
      const [month, day, year] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return format(date, 'MMMM d, yyyy');
    }

    // Handle just year (e.g., "2023")
    if (/^\d{4}$/.test(dateString)) {
      return dateString;
    }

    return dateString;
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return dateString;
  }
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

const GridItem = memo(function GridItem({ item, maxColumns, index }: { item: ContentMeta; maxColumns: number; index: number }) {
  // For tweets, always use 1 column regardless of stars
  const colSpan = item.category === 'tweet'
    ? 1
    : Math.min(item.stars, maxColumns); // Limit column span to available columns
  const [dimensions, setDimensions] = useState<{ width?: number; height?: number }>({});

  // Handle image load to get actual dimensions
  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.target as HTMLImageElement;
    setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
  };

  const rowSpan = React.useMemo(() => calculateRowSpan(
    item.stars,
    item.description,
    item.category,
    dimensions.width,
    dimensions.height,
    item.span
  ), [item.stars, item.description, item.category, dimensions.width, dimensions.height, item.span]);

  // Function to determine if URL is a video embed
  const isVideoEmbed = (url: string): { isVideo: boolean; type?: 'youtube' | 'vimeo'; id?: string } => {
    if (!url) return { isVideo: false };

    // YouTube URL patterns
    const youtubePatterns = [
      /youtube\.com\/watch\?v=([^&]+)/,
      /youtu\.be\/([^?]+)/,
      /youtube\.com\/embed\/([^?]+)/,
      /youtube\.com\/v\/([^?]+)/
    ];

    // Vimeo URL patterns
    const vimeoPatterns = [
      /vimeo\.com\/([0-9]+)/,
      /player\.vimeo\.com\/video\/([0-9]+)/
    ];

    // Check YouTube patterns
    for (const pattern of youtubePatterns) {
      const match = url.match(pattern);
      if (match) {
        return { isVideo: true, type: 'youtube', id: match[1] };
      }
    }

    // Check Vimeo patterns
    for (const pattern of vimeoPatterns) {
      const match = url.match(pattern);
      if (match) {
        return { isVideo: true, type: 'vimeo', id: match[1] };
      }
    }

    return { isVideo: false };
  };

  const videoInfo = React.useMemo(() => isVideoEmbed(item.heroImage || ''), [item.heroImage]);

  const style = {
    gridColumn: `span ${colSpan} / span ${colSpan}`,
    gridRow: `span ${rowSpan} / span ${rowSpan}`,
  };

  if (item.category === 'tweet') {
    return (
      <div style={style}>
        <CustomTweet item={item} />
      </div>
    );
  }

  // Special case for shelf grid
  if (item.category === 'shelf' && item.items) {
    return (
      <div style={style}>
        <ShelfGrid items={item.items} />
      </div>
    );
  }

  if (item.iframeUrl) {
    // Override rowSpan if iframeRows is specified
    const iframeStyle = {
      ...style,
      gridRow: item.iframeRows ? `span ${item.iframeRows} / span ${item.iframeRows}` : style.gridRow
    };

    // Calculate container width based on column span
    const gridColumnWidth = colSpan * 200; // Each column is 200px
    const containerWidth = item.iframeWidth || gridColumnWidth;
    const scale = gridColumnWidth / containerWidth;
    const aspectRatio = containerWidth / (item.iframeRows ? item.iframeRows * 40 : 400);

    return (
      <div style={iframeStyle}>
        <div className="w-full h-full min-h-[400px] relative overflow-hidden" style={{ aspectRatio }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${containerWidth}px`,
            height: '100%',
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
            <h3 className="text-lg leading-snug font-medium">{item.title}</h3>
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

  return (
    <div style={style}>
      {item.clickThroughUrl ? (
        <a href={item.clickThroughUrl} target="_blank" rel="noopener noreferrer">
          <div>
            <div className={`relative group ${videoInfo.isVideo
              ? 'aspect-[3/1]'
              : item.category !== 'photography' && item.category !== 'shelf'
                ? 'aspect-[3/2]'
                : ''
              }`}>
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
                item.heroImage && (
                  <Image
                    src={item.heroImage}
                    alt={item.title || 'Content image'}
                    {...(item.category === 'photography' || item.category === 'shelf'
                      ? {
                        width: 1200,
                        height: 800,
                        className: "w-full h-auto",
                        onLoad: handleImageLoad
                      }
                      : {
                        fill: true,
                        className: "object-cover"
                      }
                    )}
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
                  <audio
                    controls
                    className="w-full h-6 audio-player"
                  >
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
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      className="text-white"
                    >
                      <path
                        fill="currentColor"
                        d="M17 7h-3q-.425 0-.712-.288T13 6t.288-.712T14 5h4q.425 0 .713.288T19 6v4q0 .425-.288.713T18 11t-.712-.288T17 10z"
                      />
                    </svg>
                  </div>
                </>
              )}
            </div>
            <div className="mt-1">
              <h3 className="text-lg leading-snug">
                {item.title}
              </h3>
              <p className="text-xs line-clamp-4 mt-1">
                {item.description}
              </p>
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
        </a>
      ) : (
        <Link href={`/${item.category}/${item.slug}`}>
          <div>
            <div className={`relative group ${videoInfo.isVideo
              ? 'aspect-[3/1]'
              : item.category !== 'photography' && item.category !== 'shelf'
                ? 'aspect-[3/2]'
                : ''
              }`}>
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
                item.heroImage && (
                  <Image
                    src={item.heroImage}
                    alt={item.title || 'Content image'}
                    {...(item.category === 'photography' || item.category === 'shelf'
                      ? {
                        width: 1200,
                        height: 800,
                        className: "w-full h-auto",
                        onLoad: handleImageLoad
                      }
                      : {
                        fill: true,
                        className: "object-cover"
                      }
                    )}
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
                  <audio
                    controls
                    className="w-full h-6 audio-player"
                  >
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
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      className="text-white"
                    >
                      <path
                        fill="currentColor"
                        d="M17 7h-3q-.425 0-.712-.288T13 6t.288-.712T14 5h4q.425 0 .713.288T19 6v4q0 .425-.288.713T18 11t-.712-.288T17 10z"
                      />
                    </svg>
                  </div>
                </>
              )}
            </div>
            <div className="mt-1">
              <h3 className="text-lg leading-snug">
                {item.title}
              </h3>
              <p className="text-xs line-clamp-4 mt-1">
                {item.description}
              </p>
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
        </Link>
      )}
    </div>
  );
});

export default function MasonryGrid({ items }: MasonryGridProps) {
  const [maxColumns, setMaxColumns] = useState(5);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Calculate max columns based on window width
  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth;
      // Subtract padding/margins (48px = 3rem for gap-x-6)
      const availableWidth = width - 48;
      // Each column needs minimum 200px
      const possibleColumns = Math.floor(availableWidth / 200);
      // Clamp between 1 and 5 columns
      setMaxColumns(Math.max(1, Math.min(5, possibleColumns)));
    }

    // Initial calculation
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Memoized filtered and sorted items
  const sortedItems = useMemo(() => {
    const filtered = selectedTag && selectedTag !== 'all'
      ? items.filter(item => item.tags?.includes(selectedTag) && !item.private)
      : items.filter(item => !item.private);

    return [...filtered].sort((a, b) => {
      // Always put shelf at the end
      if (a.category === 'shelf') return 1;
      if (b.category === 'shelf') return -1;

      const dateA = getDateForSorting(a.date);
      const dateB = getDateForSorting(b.date);

      // Sort by date first (most recent first)
      const dateCompare = dateB.getTime() - dateA.getTime();

      // If dates are equal, sort by stars
      if (dateCompare === 0) {
        return b.stars - a.stars;
      }

      return dateCompare;
    });
  }, [items, selectedTag, getDateForSorting]);

  // Log items to see if tweets are included
  React.useEffect(() => {
    const tweetItems = items.filter(item => item.category === 'tweet');
    console.log('Tweet items:', tweetItems);
  }, [items]);

  // Load Twitter widget script once
  React.useEffect(() => {
    // Skip if already loaded
    if (window.twttr?.widgets || document.querySelector('script[src*="platform.twitter.com"]')) {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    script.charset = 'utf-8';
    script.onload = () => {
      console.log('Twitter script loaded');
    };
    document.head.appendChild(script);
  }, []); // Only run once on mount

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

      {/* Grid */}
      <div
        className="grid gap-y-4 gap-x-6"
        style={{
          gridTemplateColumns: `repeat(${maxColumns}, 1fr)`,
          gridAutoRows: '40px',
          gridAutoFlow: 'dense'
        }}
      >
        {sortedItems.map((item, index) => (
          <GridItem
            key={`${item.category}-${item.slug}`}
            item={item}
            maxColumns={maxColumns}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}