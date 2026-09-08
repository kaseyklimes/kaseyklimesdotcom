'use client';

import React from 'react';
import Image from 'next/image';
import { ARTICLE_SIZES } from '@/utils/imageSizes';

interface CarouselProps {
    images: string[];
    alt: string;
    contain?: boolean;
    priority?: boolean;
}

export default function Carousel({ images, alt, contain = true, priority = false }: CarouselProps) {
    const [index, setIndex] = React.useState(0);
    const selectId = React.useId();
    const activeIndex = Math.min(index, Math.max(0, images.length - 1));
    const slideIds = React.useMemo(() => images.map(src =>
        (src.split('/').pop() || src).split('?')[0].replace(/\.[^/.]+$/, '')
    ), [images]);

    React.useEffect(() => {
        const applyFromHash = () => {
            const match = window.location.hash.match(/(?:^#|&)slide=([^&]+)/i);
            if (!match) return;
            try {
                const target = decodeURIComponent(match[1]).toLowerCase();
                const targetIndex = slideIds.findIndex(id => id.toLowerCase() === target);
                if (targetIndex >= 0) setIndex(targetIndex);
            } catch { /* Ignore malformed external fragment links. */ }
        };
        applyFromHash();
        window.addEventListener('hashchange', applyFromHash);
        return () => window.removeEventListener('hashchange', applyFromHash);
    }, [slideIds]);

    if (!images.length) return null;
    const move = (step: number) => setIndex((activeIndex + step + images.length) % images.length);

    return (
        <div className="image-gallery" role="region" aria-roledescription="carousel" aria-label={alt}
            tabIndex={0} onKeyDown={event => {
                if ((event.target as HTMLElement).tagName === 'SELECT') return;
                if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                    event.preventDefault();
                    move(event.key === 'ArrowLeft' ? -1 : 1);
                }
            }}>
            <div className="relative w-full aspect-[16/9] overflow-hidden rounded-lg">
                <Image key={images[activeIndex]} src={images[activeIndex]} alt={`${alt} — image ${activeIndex + 1} of ${images.length}`}
                    fill className={contain ? 'object-contain' : 'object-cover'}
                    priority={priority && activeIndex === 0} sizes={ARTICLE_SIZES} />
            </div>
            <div className="gallery-navigation">
                <button type="button" aria-label="Previous image" onClick={() => move(-1)} disabled={images.length < 2}>←</button>
                <span className="gallery-status" aria-live="polite" aria-atomic="true">
                    <span>{activeIndex + 1} / {images.length}</span>
                    <a href={images[activeIndex]} target="_blank" rel="noopener noreferrer">View full size ↗</a>
                </span>
                <button type="button" aria-label="Next image" onClick={() => move(1)} disabled={images.length < 2}>→</button>
            </div>
            <div className="gallery-tools">
                <label className="sr-only" htmlFor={selectId}>Choose image</label>
                <select id={selectId} value={activeIndex} onChange={event => setIndex(Number(event.target.value))}>
                    {slideIds.map((id, i) => <option key={`${i}-${id}`} value={i}>{i + 1}. {id.replace(/[-_]+/g, ' ')}</option>)}
                </select>
            </div>
        </div>
    );
}
