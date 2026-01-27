import { getContentBySlug, getAllContent, getRelatedContent } from '@/utils/content';
import { ContentCategory } from '@/types/content';
import Layout from '@/components/layout/Layout';
import Image from 'next/image';
import Link from 'next/link';
import { PrefetchLink } from '@/components/ui/PrefetchLink';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Metadata } from 'next';
import Carousel from '@/components/ui/Carousel';
import React from 'react';
import { getVideoInfo } from '@/utils/mediaDetection';
import { formatDateOrRange } from '@/utils/dateFormatting';

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

  const hero = content.heroImage;
  return {
    title: content.title,
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
  const content = await getAllContent();
  return content.map((item) => ({
    category: item.category,
    slug: item.slug,
  }));
}

// Component to handle column layout in markdown
function ColumnLayout({ content }: { content: string }) {
  // First, remove ^^ markers from the content
  const processedContent = content.replace(/^\^\^/gm, '');
  
  // Check if content has ::: markers for columns
  const hasColumns = processedContent.includes(':::');
  
  if (!hasColumns) {
    // No columns, render normally
    return <ReactMarkdown rehypePlugins={[rehypeRaw]}>{processedContent}</ReactMarkdown>;
  }
  
  // Split content by ::: markers
  const parts = processedContent.split(/^:::\s*$/m);
  
  return (
    <>
      {parts.map((part, index) => {
        // Check if this part should be columns (odd indices after split)
        if (index % 2 === 1) {
          // This is column content - split by ### headers
          const columns = part.trim().split(/(?=^### )/m).filter(col => col.trim());
          
          if (columns.length > 1) {
            const gridClass = columns.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                            columns.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
                            'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
            
            return (
              <div key={index} className={`grid ${gridClass} gap-6 not-prose my-8`}>
                {columns.map((col, colIndex) => (
                  <div key={colIndex} className="space-y-3">
                    <ReactMarkdown 
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        h3: ({ children }) => (
                          <h3 className="text-sm font-bold mb-3 mt-0">{children}</h3>
                        ),
                        h4: ({ children }) => (
                          <h4 className="text-xs font-semibold mb-2 mt-3">{children}</h4>
                        ),
                        p: ({ children }) => (
                          <p className="text-xs mb-2 leading-relaxed">{children}</p>
                        )
                      }}
                    >
                      {col}
                    </ReactMarkdown>
                  </div>
                ))}
              </div>
            );
          }
        }
        
        // Regular content
        return (
          <ReactMarkdown 
            key={index} 
            rehypePlugins={[rehypeRaw]}
            components={{
              p: ({ children, ...props }) => {
                // Check if this paragraph contains multiple images
                const childArray = React.Children.toArray(children);
                
                // Count images
                let imageCount = 0;
                childArray.forEach(child => {
                  if (React.isValidElement(child) && (child.type === 'img' || child.props?.src)) {
                    imageCount++;
                  }
                });
                
                // If multiple images, render side by side
                if (imageCount > 1) {
                  const gridCols = imageCount === 2 ? 'grid-cols-2' : 
                                  imageCount === 3 ? 'grid-cols-3' : 'grid-cols-4';
                  return (
                    <div className={`grid ${gridCols} gap-4 my-8 not-prose`}>
                      {childArray.filter(child => 
                        React.isValidElement(child) && (child.type === 'img' || child.props?.src)
                      )}
                    </div>
                  );
                }
                
                // Check for pipe-separated text
                const textContent = childArray
                  .map(child => {
                    if (typeof child === 'string') return child;
                    if (React.isValidElement(child) && child.type === 'strong') {
                      return child.props?.children;
                    }
                    return '';
                  })
                  .join('');
                
                if (textContent.includes(' | ')) {
                  const columns = textContent.split(' | ').map(col => col.trim());
                  const gridCols = columns.length === 2 ? 'grid-cols-2' : 
                                  columns.length === 3 ? 'grid-cols-3' : 'grid-cols-4';
                  
                  return (
                    <div className={`grid ${gridCols} gap-4 not-prose`}>
                      {columns.map((col, idx) => {
                        const isBold = col.startsWith('**') && col.endsWith('**');
                        const text = isBold ? col.slice(2, -2) : col;
                        return (
                          <div key={idx} className="text-left">
                            {isBold ? <strong className="font-bold">{text}</strong> : text}
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                
                // Default paragraph rendering
                return <p {...props}>{children}</p>;
              },
              img: ({ src, alt, ...props }) => (
                <img 
                  src={src} 
                  alt={alt} 
                  className="w-full h-auto rounded-lg object-cover"
                  style={{ maxHeight: '300px' }}
                  {...props} 
                />
              )
            }}
          >
            {part}
          </ReactMarkdown>
        );
      })}
    </>
  );
}

export default async function ContentPage({ params }: PageProps) {
  const { category, slug } = await params;

  const content = await getContentBySlug(category, slug);

  if (!content) {
    notFound();
  }

  // Use optimized getRelatedContent instead of fetching entire category
  const relatedContent = await getRelatedContent(category, slug, 2);

  // Normalize hero images
  const heroImages = content.carousel && content.carousel.length > 0
    ? content.carousel
    : content.heroImage
      ? [content.heroImage]
      : [];

  // Get video info if there is a single hero image that is a video URL
  const videoInfo = heroImages.length === 1 ? getVideoInfo(heroImages[0]) : { isVideo: false };

  return (
    <Layout>
      <article className="max-w-4xl mx-auto">
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
            <div className="flex items-center gap-4 mb-4">
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
                {formatDateOrRange(content.date)}
              </time>
            </div>
          )}
          {category !== 'blog' && (
            <>
              {heroImages.length > 0 && (
                <div className={`relative ${videoInfo.isVideo
                  ? 'aspect-[16/9]'
                  : ''
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
                  ) : heroImages.length > 1 ? (
                    <Carousel
                      images={heroImages}
                      alt={`${content.title}${content.description ? ` - ${content.description}` : ''}`}
                      contain
                      priority
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
          <ColumnLayout content={content.content} />
        </div>

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
                  ? `https://i.ytimg.com/vi/${videoInfo.id}/maxresdefault.jpg`
                  : hero;

                return (
                  <PrefetchLink
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