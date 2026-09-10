import { notFound } from 'next/navigation';
import Home from '../page';
import { getAllContent } from '@/utils/content';
import { filterPath, filterTag } from '@/utils/filterRoutes';
import { categoryLabel } from '@/utils/categoryLabel';

export const dynamic = 'force-static';
export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams() {
  const tags = new Set(getAllContent().flatMap(item => item.tags ?? []));
  return [...tags]
    .filter(tag => tag !== 'all' && tag !== 'shelf')
    .map(tag => ({ category: filterPath(tag).slice(1) }));
}

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props) {
  const { category } = await params;
  return { title: `${categoryLabel(filterTag(`/${category}`) ?? 'all')} | Kasey Klimes` };
}

export default async function FilteredHome({ params }: Props) {
  const { category } = await params;
  if (!generateStaticParams().some(route => route.category === category)) notFound();
  return <Home />;
}
