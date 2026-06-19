'use client';

import React from 'react';
import Image from 'next/image';

export interface Photo {
    src: string;
    title?: string;
    location?: string;
    caption?: string;
}

interface PhotoCarouselProps {
    photos: Photo[];
    startIndex?: number;
    onClose: () => void;
}

// Full-screen lightbox that steps through a list of photos one at a time.
// Navigation: prev/next buttons, ← / → keys, Esc or backdrop click to close.
export default function PhotoCarousel({ photos, startIndex = 0, onClose }: PhotoCarouselProps) {
    const count = photos.length;
    const [index, setIndex] = React.useState(startIndex);

    const prev = React.useCallback(() => {
        setIndex((i) => (i === 0 ? count - 1 : i - 1));
    }, [count]);

    const next = React.useCallback(() => {
        setIndex((i) => (i === count - 1 ? 0 : i + 1));
    }, [count]);

    // Keyboard navigation
    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') prev();
            else if (e.key === 'ArrowRight') next();
            else if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [prev, next, onClose]);

    // Lock body scroll while open
    React.useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previous;
        };
    }, []);

    if (count === 0) return null;

    const current = photos[index];

    // Render the current image plus its neighbors so next/prev feel instant.
    const visible = new Set([(index - 1 + count) % count, index, (index + 1) % count]);

    const hasCaption = current.title || current.location || current.caption;

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col bg-black/95"
            role="dialog"
            aria-modal="true"
            aria-label="Photo viewer"
        >
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-3 text-xs text-white/70">
                <span aria-live="polite">{index + 1} / {count}</span>
                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="p-2 transition-colors hover:text-white"
                >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Image area — clicking the empty margin closes the viewer */}
            <div
                className="relative min-h-0 flex-1"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                {photos.map((p, i) =>
                    visible.has(i) ? (
                        <Image
                            key={p.src}
                            src={p.src}
                            alt={p.title || p.location || 'Photograph'}
                            fill
                            priority={i === index}
                            sizes="100vw"
                            className={`object-contain transition-opacity duration-300 ${i === index ? 'opacity-100' : 'pointer-events-none opacity-0'
                                }`}
                        />
                    ) : null
                )}

                {count > 1 && (
                    <>
                        <button
                            aria-label="Previous photo"
                            onClick={prev}
                            className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/70 sm:left-4"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <button
                            aria-label="Next photo"
                            onClick={next}
                            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/70 sm:right-4"
                        >
                            <svg className="h-5 w-5 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                    </>
                )}
            </div>

            {/* Caption */}
            {hasCaption && (
                <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-3 text-center text-xs text-white/70">
                    {current.title && <span className="text-white/90">{current.title}</span>}
                    {current.title && current.location && <span className="text-white/30">·</span>}
                    {current.location && <span>{current.location}</span>}
                    {(current.title || current.location) && current.caption && <span className="text-white/30">·</span>}
                    {current.caption && <span>{current.caption}</span>}
                </div>
            )}
        </div>
    );
}
