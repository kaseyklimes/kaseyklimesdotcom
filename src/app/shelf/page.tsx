import Home from '../page';
import { Metadata } from 'next';

export const dynamic = 'force-static';
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Shelf | Kasey Klimes',
  description: 'A collection of books, albums, and other media that have influenced my thinking.',
};

export default Home;
