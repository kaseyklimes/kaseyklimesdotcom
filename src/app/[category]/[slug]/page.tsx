import { getContentBySlug, getAllContent, getRelatedContent } from '@/utils/content';
import { ContentCategory } from '@/types/content';
import Layout from '@/components/layout/Layout';
import Image from 'next/image';
import Link from 'next/link';
import { PrefetchLink } from '@/components/ui/PrefetchLink';
import { notFound } from 'next/navigation';
import MarkdownContent from '@/components/content/MarkdownContent';
import { Metadata } from 'next';
import Carousel from '@/components/ui/Carousel';
import { getVideoInfo, getYouTubeThumbnail } from '@/utils/mediaDetection';
import { datePrecisionFor, formatDateOrRange } from '@/utils/dateFormatting';
import { seriesImages } from '@/utils/photoSeries';
import VideoEmbed from '@/components/ui/VideoEmbed';

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
  const content = getContentBySlug(category, slug);

  if (!content) return {};

  const hero = content.heroImage;
  return {
    title: content.title,
    alternates: { canonical: `/${category}/${slug}` },
    description: content.description,
    openGraph: {
      title: content.title,
      description: content.description,
      ...(hero ? {
        images: [{
          url: hero,
          width: 1200,
          height: 630,
          alt: content.title
        }]
      } : {})
    },
  };
}

// Pre-render all known paths at build time
export async function generateStaticParams() {
  const content = getAllContent();
  return content.map((item) => ({
    category: item.category,
    slug: item.slug,
  }));
}

export default async function ContentPage({ params }: PageProps) {
  const { category, slug } = await params;

  const content = getContentBySlug(category, slug);

  if (!content) {
    notFound();
  }

  // Use optimized getRelatedContent instead of fetching entire category
  const relatedContent = getRelatedContent(category, slug, 2);

  // Normalize hero images
  const heroImages = content.carousel && content.carousel.length > 0
    ? content.carousel
    : content.heroImage
      ? [content.heroImage]
      : [];

  // Get video info if there is a single hero image that is a video URL
  const videoInfo = heroImages.length === 1 ? getVideoInfo(heroImages[0]) : { isVideo: false };

  // Remaining photos of a mini-series, stacked beneath the cover
  const series = seriesImages(content);

  const heading = (
    <div className={category === 'work' ? 'work-heading' : undefined}>
              <h1 className="text-4xl mb-4">
                {content.title}
              </h1>
              {content.description && (
                <p className="text-xl">{content.description}</p>
              )}
    </div>
  );

  return (
    <Layout>
      <article className={`max-w-4xl mx-auto ${category === 'work' ? 'work-detail' : ''}`}>
        {/* Back Button */}
        <div className="mb-4 mt-4">
          <Link
            href="/"
            className="inline-flex items-center text-xs hover:underline"
          >
            <svg
              className="mr-2 w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back
          </Link>
        </div>

        {/* Content Header */}
        <header className="mb-8">
          {category !== 'shelf' && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
              <span className="text-xs">
                {content.category}
              </span>
              {content.location && (
                <>
                  <span className="text-xs text-gray-400">/</span>
                  <span className="text-xs">
                    {content.location}
                  </span>
                </>
              )}
              <span className="text-xs text-gray-400">/</span>
              <time
                dateTime={content.date}
                className="text-xs"
              >
                {formatDateOrRange(content.date, datePrecisionFor(category))}
              </time>
            </div>
          )}
          {category !== 'blog' && (
            <>
              {category === 'work' && heading}
              {heroImages.length > 0 && (
                <div className={`relative ${videoInfo.isVideo
                  ? 'aspect-[16/9]'
                  : ''
                  } mb-8`}>
                  {videoInfo.isVideo ? (
                    <div className="relative w-full h-full">
                      <VideoEmbed
                        videoInfo={videoInfo}
                        title={content.title}
                        sizes="(min-width: 1280px) 1200px, 100vw"
                        priority
                      />
                    </div>
                  ) : heroImages.length > 1 ? (
                    <Carousel
                      images={heroImages}
                      alt={`${content.title}${content.description ? ` - ${content.description}` : ''}`}
                      contain
                      priority
                    />
                  ) : heroImages[0].endsWith('.svg') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={heroImages[0]}
                      alt={`${content.title}${content.description ? ` - ${content.description}` : ''}`}
                      className="w-full h-auto"
                    />
                  ) : (
                    <Image
                      src={heroImages[0]}
                      alt={`${content.title}${content.description ? ` - ${content.description}` : ''}`}
                      width={1200}
                      height={800}
                      className="w-full h-auto"
                      priority
                      sizes="(min-width: 1280px) 1200px, 100vw"
                    />
                  )}
                </div>
              )}
              {content.carouselCaption && (
                <p className="text-xs text-gray-500 -mt-6 mb-8">
                  {content.carouselCaption}
                </p>
              )}
              {series.map((src, i) => (
                <div key={`${i}-${src}`} className="mb-8">
                  <Image
                    src={src}
                    alt={`${content.title || content.location || 'Photo'} — ${i + 2} of ${series.length + 1}`}
                    width={1200}
                    height={800}
                    className="w-full h-auto"
                    sizes="(min-width: 1280px) 1200px, 100vw"
                  />
                </div>
              ))}
              {category !== 'work' && heading}
            </>
          )}
        </header>

        {/* Content Body */}
        <div className={`prose prose-untitled markdown-content ${category === 'blog' ? 'blog-prose' : ''}`}>
          <MarkdownContent content={content.content} reportPages={content.reportPages} />
        </div>

        {category === 'work' && content.iframeUrl && (
          <section className="work-map" aria-label="Interactive map">
            <div className="work-map-heading">
              <h2>Explore the interactive map</h2>
              <a href={content.iframeUrl} target="_blank" rel="noopener noreferrer">Open full-screen map ↗</a>
            </div>
            <iframe src={content.iframeUrl} title={content.title} loading="lazy" allowFullScreen />
          </section>
        )}

        {/* Related Content */}
        {relatedContent.length > 0 && (
          <aside className="mt-16 pt-8 border-t">
            <h2 className="text-2xl mb-6">
              Loosely Related Things
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedContent.map((item) => {
                const hero = item.heroImage;
                const videoInfo = hero ? getVideoInfo(hero) : { isVideo: false };
                const imageUrl = videoInfo.isVideo && videoInfo.type === 'youtube' && videoInfo.id
                  ? getYouTubeThumbnail(videoInfo.id)
                  : hero;

                return (
                  <PrefetchLink
                    key={item.slug}
                    href={`/${item.category}/${item.slug}`}
                    className="block group"
                  >
                    {imageUrl && (
                      <div className="relative aspect-[16/9] mb-4 overflow-hidden rounded-lg">
                        {imageUrl.endsWith('.svg') ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageUrl}
                            alt={`${item.title}${item.description ? ` - ${item.description}` : ''}`}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <Image
                            src={imageUrl}
                            alt={`${item.title}${item.description ? ` - ${item.description}` : ''}`}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            sizes="(min-width: 768px) 50vw, 100vw"
                            loading="lazy"
                          />
                        )}
                      </div>
                    )}
                    <h3 className="text-lg leading-snug group-hover:underline">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                        {item.description}
                      </p>
                    )}
                  </PrefetchLink>
                );
              })}
            </div>
          </aside>
        )}
      </article>
    </Layout>
  );
} 