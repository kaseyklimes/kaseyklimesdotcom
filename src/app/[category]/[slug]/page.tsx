import { getContentBySlug, getContentPaths, getAllContent } from '@/utils/content';
import { ContentCategory } from '@/types/content';
import Layout from '@/components/layout/Layout';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { Metadata } from 'next';

interface PageProps {
  params: Promise<{
    category: ContentCategory;
    slug: string;
  }>;
}

// Enable static generation with ISR
export const revalidate = 3600; // Revalidate every hour

// Generate static metadata for better SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category, slug } = await params;
  const content = await getContentBySlug(category, slug);

  if (!content) return {};

  return {
    title: content.title,
    description: content.description,
    openGraph: {
      title: content.title,
      description: content.description,
      images: [content.heroImage],
    },
  };
}

// Pre-render all known paths at build time
export async function generateStaticParams() {
  const content = await getAllContent();
  return content.map((item) => ({
    category: item.category,
    slug: item.slug,
  }));
}

export default async function ContentPage({ params }: PageProps) {
  const { category, slug } = await params;
  
  const content = await getContentBySlug(category, slug);

  if (!content) {
    notFound();
  }

  const relatedContent = await getAllContent({
    category,
    sortBy: 'date',
    order: 'desc',
  });

  return (
    <Layout>
      <article className="max-w-4xl mx-auto">
        {/* Hero Image */}
        <div className="relative aspect-[21/9] mb-8">
          <Image
            src={content.heroImage}
            alt={content.title}
            fill
            className="object-cover"
            priority
            sizes="(min-width: 1280px) 1200px, 100vw"
          />
        </div>

        {/* Content Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm">
              {content.category}
            </span>
            <time
              dateTime={content.date}
              className="text-sm"
            >
              {format(new Date(content.date), 'MMMM d, yyyy')}
            </time>
          </div>
          <h1 className="text-4xl mb-4">
            {content.title}
          </h1>
          <p className="text-xl">{content.description}</p>
        </header>

        {/* Content Body */}
        <div className="prose prose-untitled">
          <ReactMarkdown>{content.content}</ReactMarkdown>
        </div>

        {/* Related Content */}
        {relatedContent.length > 1 && (
          <aside className="mt-16 pt-8 border-t">
            <h2 className="text-2xl mb-6">
              Related Content
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedContent
                .filter((item) => item.slug !== slug)
                .slice(0, 2)
                .map((item) => (
                  <a
                    key={item.slug}
                    href={`/${item.category}/${item.slug}`}
                  >
                    <div className="relative aspect-[16/9] mb-4">
                      <Image
                        src={item.heroImage}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="(min-width: 768px) 50vw, 100vw"
                        loading="lazy"
                      />
                    </div>
                    <h3 className="text-lg">
                      {item.title}
                    </h3>
                    <p className="text-sm mt-1">
                      {item.description}
                    </p>
                  </a>
                ))}
            </div>
          </aside>
        )}
      </article>
    </Layout>
  );
} 