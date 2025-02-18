import { getAllContent } from '@/utils/content';
import MasonryGridPage from '@/components/MasonryGridPage';
import { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Shelf | Kasey Klimes',
  description: 'A collection of books, albums, and other media that have influenced my thinking.'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default async function ShelfPage() {
  const shelfItems = await getAllContent({ category: 'shelf' });
  
  const page = {
    title: 'Shelf',
    description: 'A collection of books, albums, and other media that have influenced my thinking.',
    items: shelfItems,
    category: 'shelf' as const,
    layout: 'masonry' as const
  };

  return <MasonryGridPage page={page} />;
} 