import { getContentBySlug, getAllContent } from '@/utils/content';
import { ContentCategory } from '@/types/content';
import Layout from '@/components/layout/Layout';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { format, parse } from 'date-fns';
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
      ...(content.heroImage ? {
        images: [{
          url: content.heroImage,
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
  const content = await getAllContent();
  return content.map((item) => ({
    category: item.category,
    slug: item.slug,
  }));
}

function formatContentDate(dateString: string): string {
  try {
    // Handle "MM-YYYY" format
    if (/^\d{2}-\d{4}$/.test(dateString)) {
      const date = parse(dateString, 'MM-yyyy', new Date());
      return format(date, 'MMMM yyyy');
    }
    
    // Handle date ranges with hyphen
    if (dateString.includes('-')) {
      const [startDate, endDate] = dateString.split('-').map(d => d.trim());
      if (endDate.toLowerCase() === 'present') {
        return `${startDate}–Present`;
      }
      return `${startDate}–${endDate}`;
    }
    
    // Handle just year
    if (/^\d{4}$/.test(dateString)) {
      return dateString;
    }
    
    // Handle full dates
    const date = new Date(dateString);
    return format(date, 'MMMM d, yyyy');
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return dateString; // Return original string if parsing fails
  }
}

// Function to determine if URL is a video embed and get info
const getVideoInfo = (url: string): { isVideo: boolean; type?: 'youtube' | 'vimeo'; id?: string } => {
  if (!url) return { isVideo: false };

  // YouTube URL patterns
  const youtubePatterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
    /youtube\.com\/v\/([^?]+)/
  ];
  
  // Vimeo URL patterns
  const vimeoPatterns = [
    /vimeo\.com\/([0-9]+)/,
    /player\.vimeo\.com\/video\/([0-9]+)/
  ];

  // Check YouTube patterns
  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match) {
      return { isVideo: true, type: 'youtube', id: match[1] };
    }
  }

  // Check Vimeo patterns
  for (const pattern of vimeoPatterns) {
    const match = url.match(pattern);
    if (match) {
      return { isVideo: true, type: 'vimeo', id: match[1] };
    }
  }

  return { isVideo: false };
};

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

  // Get video info if heroImage is a video URL
  const videoInfo = content.heroImage ? getVideoInfo(content.heroImage) : { isVideo: false };

  return (
    <Layout>
      <article className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-4 mt-4">
          <Link 
            href="/" 
            className="inline-flex items-center text-sm hover:underline"
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
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm">
                {content.category}
              </span>
              {content.location && (
                <>
                  <span className="text-sm text-gray-400">/</span>
                  <span className="text-sm">
                    {content.location}
                  </span>
                </>
              )}
              <span className="text-sm text-gray-400">/</span>
              <time
                dateTime={content.date}
                className="text-sm"
              >
                {formatContentDate(content.date)}
              </time>
            </div>
          )}
          {category !== 'blog' && (
            <>
              {content.heroImage && (
                <div className={`relative ${
                  videoInfo.isVideo 
                    ? 'aspect-[16/9]' 
                    : category !== 'photography' 
                      ? 'aspect-[21/9]' 
                      : 'max-h-[90vh] flex items-center justify-center'
                } mb-8`}>
                  {videoInfo.isVideo ? (
                    <div className="relative w-full h-full">
                      {videoInfo.type === 'youtube' ? (
                        <>
                          <Image
                            src={`https://i.ytimg.com/vi/${videoInfo.id}/maxresdefault.jpg`}
                            alt={`Thumbnail for ${content.title}`}
                            fill
                            className="object-cover"
                            sizes="(min-width: 1280px) 1200px, 100vw"
                            priority
                          />
                          <iframe
                            className="absolute top-0 left-0 w-full h-full"
                            src={`https://www.youtube.com/embed/${videoInfo.id}`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={content.title}
                          />
                        </>
                      ) : (
                        <iframe
                          className="absolute top-0 left-0 w-full h-full"
                          src={`https://player.vimeo.com/video/${videoInfo.id}`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={content.title}
                        />
                      )}
                    </div>
                  ) : (
                    <Image
                      src={content.heroImage}
                      alt={`${content.title}${content.description ? ` - ${content.description}` : ''}`}
                      {...(category === 'photography' ? {
                        width: 1200,
                        height: 800,
                        className: "w-full h-auto max-h-[90vh] object-contain"
                      } : {
                        fill: true,
                        className: "object-cover"
                      })}
                      priority
                      sizes="(min-width: 1280px) 1200px, 100vw"
                    />
                  )}
                </div>
              )}
              <h1 className="text-4xl mb-4">
                {content.title}
              </h1>
              {content.description && (
                <p className="text-xl">{content.description}</p>
              )}
            </>
          )}
        </header>

        {/* Content Body */}
        <div className="prose prose-untitled">
          <ReactMarkdown>{content.content}</ReactMarkdown>
        </div>

        {/* Related Content */}
        {relatedContent.length > 1 && (
          <aside className="mt-16 pt-8 border-t">
            <h2 className="text-2xl mb-6">
              Loosely Related Things
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedContent
                .filter((item) => item.slug !== slug)
                .slice(0, 2)
                .map((item) => {
                  const videoInfo = item.heroImage ? getVideoInfo(item.heroImage) : { isVideo: false };
                  const imageUrl = videoInfo.isVideo && videoInfo.type === 'youtube' && videoInfo.id
                    ? `https://i.ytimg.com/vi/${videoInfo.id}/maxresdefault.jpg`
                    : item.heroImage;
                  
                  return (
                    <Link
                      key={item.slug}
                      href={`/${item.category}/${item.slug}`}
                      className="block group"
                    >
                      {imageUrl && (
                        <div className="relative aspect-[16/9] mb-4 overflow-hidden rounded-lg">
                          <Image
                            src={imageUrl}
                            alt={`${item.title}${item.description ? ` - ${item.description}` : ''}`}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            sizes="(min-width: 768px) 50vw, 100vw"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <h3 className="text-lg group-hover:underline">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-sm mt-1 text-gray-600 dark:text-gray-400">
                          {item.description}
                        </p>
                      )}
                    </Link>
                  );
                })}
            </div>
          </aside>
        )}
      </article>
    </Layout>
  );
} 