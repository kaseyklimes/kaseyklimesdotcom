import { getAllContent } from '@/utils/content';
import MasonryGridPage from '@/components/MasonryGridPage';
import { Metadata, Viewport } from 'next';
import { imageDimensions } from '@/utils/imageDimensions';

export const metadata: Metadata = {
  title: 'Shelf | Kasey Klimes',
  description: 'A collection of books, albums, and other media that have influenced my thinking.'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function ShelfPage() {
  const shelfItems = getAllContent({ category: 'shelf' })
    .filter(item => !item.private)
    .map(item => ({ ...item, imageDimensions: imageDimensions(item.heroImage) ?? undefined }));

  const page = {
    title: 'Shelf',
    description: 'A collection of books, albums, and other media that have influenced my thinking.',
    items: shelfItems,
    category: 'shelf' as const,
    layout: 'masonry' as const
  };

  return <MasonryGridPage page={page} />;
}
