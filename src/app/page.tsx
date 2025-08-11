import { getAllContent } from '@/utils/content';
import Layout from '@/components/layout/Layout';
import HomeContent from '@/components/ui/HomeContent';
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

  return (
    <Layout>
      <Suspense fallback={<ContentLoading />}>
        <HomeContent allContent={allContent} shelfItems={shelfItems} />
      </Suspense>
    </Layout>
  );
}
