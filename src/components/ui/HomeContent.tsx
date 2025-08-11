'use client';

import { useState, useEffect } from 'react';
import MasonryGrid from '@/components/grid/MasonryGrid';
import TypingAnimation from '@/components/ui/TypingAnimation';

interface HomeContentProps {
  allContent: any[];
  shelfItems: any[];
}

export default function HomeContent({ allContent, shelfItems }: HomeContentProps) {
  const [showSecondText, setShowSecondText] = useState(false);
  const [headerComplete, setHeaderComplete] = useState(false);
  const [showBodyText, setShowBodyText] = useState(false);

  // Create the shelf grid item
  const shelfGrid = {
    title: 'Shelf',
    description: 'A collection of books, albums, and other media that have influenced my thinking.',
    category: 'shelf',
    date: '2024-01-01', // Static date instead of dynamic
    stars: 5, // Make it span full width
    slug: 'shelf',
    items: shelfItems,
    tags: ['shelf'], // Add required tags property
  };

  // Add the shelf grid to the content, excluding individual shelf items
  const content = [
    ...allContent.filter(item => item.category !== 'shelf'),
    shelfGrid
  ];

  const headerText = "Our environments shape us.\nWe are the first species on earth with the power to shape our environment.\nSo, what do we want to become?";
  const bodyText = "Hello! I'm a technologist based in Brooklyn, and this unwieldy question is the most succinct way I can describe the common thread across the work I do. All of my work focuses, in some way, on the reciprocal relationship between us and the worlds we inhabit. It's human nature to dream, design, and build, but we are also subjects of these systems. At times we have used this power to make incredible leaps. At others we've become victims to our own creations.\n\nI use the term \"environment\" loosely to mean the systems beyond ourselves; our cities and natural ecosystems, but also our technology, culture, companies, political structures, policies, and economic systems. In all cases, we shape them and they shape us.\n\nPlease don't hesitate to reach out should you feel so inclined, I'd be eager to hear about your work.\n\n/K";

  useEffect(() => {
    if (headerComplete) {
      const timer = setTimeout(() => {
        setShowBodyText(true);
      }, 800); // 800ms pause after header completes

      return () => clearTimeout(timer);
    }
  }, [headerComplete]);

  return (
    <>
      {/* Header Section - Viewport height minus padding */}
      <section className="flex items-center lg:w-1/3" style={{ height: 'calc(100vh - 20px - 2rem)' }}>
        <div>
          <h2 className="text-2xl mb-8 relative">
            <TypingAnimation
              text={headerText}
              speed={30}
              pauseDuration={500}
              onComplete={() => setHeaderComplete(true)}
            />
          </h2>
          <p className="text-xs relative">
            <span className="invisible" dangerouslySetInnerHTML={{ __html: bodyText.replace(/\n/g, '<br>') }}></span>
            <span 
              className={`absolute inset-0 transition-opacity duration-1000 ${showBodyText ? 'opacity-100' : 'opacity-0'}`}
              dangerouslySetInnerHTML={{ __html: bodyText.replace(/\n/g, '<br>') }}
            ></span>
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section>
        <MasonryGrid items={content} />
      </section>
    </>
  );
}