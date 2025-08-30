'use client';

import React from 'react';
import Image from 'next/image';

interface CarouselProps {
    images: string[];
    alt: string;
    // If true, constrain by height and preserve full image (no crop)
    contain?: boolean;
    priority?: boolean;
}

export default function Carousel({ images, alt, contain = true, priority = false }: CarouselProps) {
    const [index, setIndex] = React.useState(0);

    const prev = React.useCallback(() => {
        setIndex((i) => (i === 0 ? images.length - 1 : i - 1));
    }, [images.length]);

    const next = React.useCallback(() => {
        setIndex((i) => (i === images.length - 1 ? 0 : i + 1));
    }, [images.length]);

    // Keyboard navigation
    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'ArrowRight') next();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [prev, next]);

    // Support linking from markdown via hash: #slide=<Slide-Id>
    const slideIds = React.useMemo(() => images.map(src => {
        try {
            const filename = src.split('/').pop() || src;
            return filename.replace(/\.[^/.]+$/, '');
        } catch {
            return src;
        }
    }), [images]);

    React.useEffect(() => {
        const applyFromHash = () => {
            const hash = window.location.hash || '';
            const match = hash.match(/slide=([^&]+)/i);
            if (match && match[1]) {
                const target = decodeURIComponent(match[1]);
                const targetIndex = slideIds.findIndex(id => id.toLowerCase() === target.toLowerCase());
                if (targetIndex >= 0) {
                    setIndex(targetIndex);
                }
            }
        };

        applyFromHash();
        window.addEventListener('hashchange', applyFromHash);
        return () => window.removeEventListener('hashchange', applyFromHash);
    }, [slideIds]);

    if (!images || images.length === 0) return null;

    return (
        <div className="relative w-full">
            <div className="overflow-hidden rounded-lg">
                {/* Keep a fixed responsive box; images use object-contain to avoid cropping */}
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    {images.map((src, i) => (
                        <Image
                            key={src}
                            src={src}
                            alt={alt}
                            fill
                            className={`transition-opacity duration-300 ${contain ? 'object-contain' : 'object-cover'} ${i === index ? 'opacity-100' : 'opacity-0'}`}
                            priority={priority && i === 0}
                            sizes="(min-width: 1280px) 1200px, 100vw"
                        />
                    ))}
                </div>
            </div>

            {images.length > 1 && (
                <>
                    {/* Controls */}
                    <button
                        aria-label="Previous image"
                        onClick={prev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-8 h-8 flex items-center justify-center"
                    >
                        <svg
                            className="w-4 h-4"
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
                    </button>
                    <button
                        aria-label="Next image"
                        onClick={next}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-8 h-8 flex items-center justify-center"
                    >
                        <svg
                            className="w-4 h-4 rotate-180"
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
                    </button>

                    {/* Dots below image */}
                    <div className="mt-2 flex justify-center gap-2">
                        {images.map((_, i) => (
                            <button
                                key={i}
                                aria-label={`Go to image ${i + 1}`}
                                onClick={() => setIndex(i)}
                                className={`w-1.5 h-1.5 rounded-full ${i === index ? 'bg-gray-400' : 'bg-gray-300'}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}


