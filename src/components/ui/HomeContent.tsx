'use client';

import MasonryGrid from '@/components/grid/MasonryGrid';

interface HomeContentProps {
  allContent: any[];
  shelfItems: any[];
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

  const headerText = "Hi, I'm Kasey.";
  const bodyText = (
    <>
      I live in Brooklyn. I am the founder of{' '}
      <a
        href="https://getprimitive.ai"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:no-underline"
      >
        Primitive
      </a>
      .
    </>
  );

  return (
    <>
      {/* Header Section - Viewport height minus padding */}
      <section className="flex items-center lg:w-1/3" style={{ height: 'calc(100vh - 20px - 2rem)' }}>
        <div>
          <h2 className="text-2xl mb-8">
            {headerText}
          </h2>
          <p className="text-xs">
            {bodyText}
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section>
        <MasonryGrid items={content} />
      </section>
    </>
  );
}