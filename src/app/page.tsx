import { getAllContent } from '@/utils/content';
import Layout from '@/components/layout/Layout';
import HomeContent from '@/components/ui/HomeContent';
import { imageDimensions } from '@/utils/imageDimensions';

// Force page to be statically rendered
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

export default async function Home() {
  // Get all content (single fetch)
  // Cards declare their image's real aspect ratio so the masonry layout can
  // reserve the right height before the image arrives.
  const allContent = getAllContent({
    sortBy: 'stars',
    order: 'desc'
  }).map(item => ({
    ...item,
    imageDimensions: imageDimensions(item.thumbnail || item.heroImage) ?? undefined,
  }));

  // Filter shelf items from already-fetched content (avoids double fetch)
  const shelfItems = allContent.filter(item => item.category === 'shelf');

  return (
    <Layout>
      <HomeContent allContent={allContent} shelfItems={shelfItems} />
    </Layout>
  );
}
