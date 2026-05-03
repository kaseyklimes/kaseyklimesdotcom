'use client';

import MasonryGrid from '@/components/grid/MasonryGrid';
import { ContentMeta } from '@/types/content';

interface HomeContentProps {
  allContent: ContentMeta[];
  shelfItems: ContentMeta[];
}

export default function HomeContent({ allContent, shelfItems }: HomeContentProps) {

  // Create the shelf grid item
  const shelfGrid = {
    title: 'Shelf',
    description: 'A collection of books, albums, and other media that have influenced my thinking.',
    category: 'shelf',
    date: '2024-01-01', // Static date instead of dynamic
    stars: 5, // Make it span full width
    slug: 'shelf',
    items: shelfItems,
    tags: ['shelf'], // Add required tags property
  };

  // Add the shelf grid to the content, excluding individual shelf items
  const content = [
    ...allContent.filter(item => item.category !== 'shelf'),
    shelfGrid
  ];

  const headerContent = (
    <>
      <p className="mb-4">Our environments shape us.</p>
      <p className="mb-4">We are the first species on earth with the power to shape our environment.</p>
      <p>So, what do we want to become?</p>
    </>
  );
  const bodyText = (
    <>
      <p className="mb-4">
        Kasey Klimes · design researcher & technologist · Brooklyn
      </p>
      <p>Currently building AI infrastructure for human collaboration.</p>
    </>
  );

  return (
    <>
      {/* Header Section - Viewport height minus padding */}
      <section className="flex items-center lg:w-1/3" style={{ height: 'calc(100vh - 20px - 2rem)' }}>
        <div>
          <h2 className="text-2xl mb-8">
            {headerContent}
          </h2>
          <div className="text-xs">
            {bodyText}
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section>
        <MasonryGrid items={content} />
      </section>
    </>
  );
}