'use client';

import { useEffect, useRef } from 'react';

interface LoopingVideoProps {
  src: string;
  className?: string;
  label?: string;
}

/**
 * A silent, looping video that stands in for an animated GIF.
 *
 * Only the metadata (dimensions) loads up front, so the card can be laid out.
 * Playback, and therefore the bulk of the download, starts once the element
 * is near the viewport, mirroring lazy-loaded images.
 */
export default function LoopingVideo({ src, className, label }: LoopingVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const updatePlayback = () => {
      video.controls = motion.matches;
      if (visible && !motion.matches) {
        video.play().catch(() => { /* autoplay blocked: the first frame stays visible */ });
      } else {
        video.pause();
      }
    };
    motion.addEventListener('change', updatePlayback);
    updatePlayback();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        visible = entry.isIntersecting;
        updatePlayback();
      }
    }, { rootMargin: '400px 0px' });
    observer.observe(video);
    return () => {
      observer.disconnect();
      motion.removeEventListener('change', updatePlayback);
    };
  }, [src]);

  return (
    <video
      ref={ref}
      src={src}
      className={className}
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={label}
    />
  );
}
