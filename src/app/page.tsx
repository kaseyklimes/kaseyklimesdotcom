import { getAllContent } from '@/utils/content';
import MasonryGrid from '@/components/grid/MasonryGrid';
import Layout from '@/components/layout/Layout';
import { Suspense } from 'react';

// Force page to be statically rendered
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

// Preload data for faster subsequent navigations
export const generateStaticParams = async () => {
  const content = await getAllContent();
  return content.map((item) => ({
    category: item.category,
    slug: item.slug,
  }));
};

// Loading component for content
function ContentLoading() {
  return (
    <div className="grid grid-cols-5 gap-4">
      {[...Array(10)].map((_, i) => (
        <div key={i} className={`h-64 col-span-${Math.min(5, Math.floor(Math.random() * 5) + 1)}`} />
      ))}
    </div>
  );
}

export default async function Home() {
  // Get all content
  const allContent = await getAllContent({
    sortBy: 'stars',
    order: 'desc'
  });

  // Get shelf items separately
  const shelfItems = await getAllContent({ category: 'shelf' });

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

  return (
    <Layout>
      <Suspense fallback={<ContentLoading />}>
        {/* Header Section - Viewport height minus padding */}
        <section className="flex items-center lg:w-1/3" style={{ height: 'calc(100vh - 20px - 2rem)' }}>
          <div>
            <h2 className="text-2xl mb-8">
              Our environments shape us.<br />
              We are the first species on earth
              with the power to shape our environment.<br />
              So, what do we want to become?
            </h2>
            <p className="text-xs">
              Hello! I'm a design researcher & technologist based in Brooklyn, and this unwieldy question is the most succinct way I can describe the common thread across the work I do. All of my work focuses, in some way, on the reciprocal relationship between us and the worlds we inhabit. It's the nature of our species to dream, design, and build, but we are also subjects of the systems that our interventions inform. At times we have used this power to make incredible leaps. At others we've become victims to our own creations.
              <br />
              <br />
              I use the term "environment" loosely to mean the systems beyond ourselves; our cities and natural ecosystems, but also our technology, culture, companies, political structures, policies, and economic systems. In all cases, we shape them and they shape us.
              <br />
              <br />
              This humble corner of the internet is an opportunity to share my work, thoughts, and inspirations, as well as invite collaboration. Please don't hesitate to reach out should you feel so inclined, I'd be eager to learn from you.
              <br />
              <br />
              /K
            </p>
          </div>
        </section>

        {/* Content Section */}
        <section>
          <MasonryGrid items={content} />
        </section>
      </Suspense>
    </Layout>
  );
}
