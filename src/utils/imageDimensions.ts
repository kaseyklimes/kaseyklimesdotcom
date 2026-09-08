import manifest from '../../config/image-dimensions.json';
import { localImageDimensions } from '@/components/content/rehype-image-dimensions.mjs';

export interface ImageDimensions { width: number; height: number }

/**
 * Pixel dimensions of a local raster image, from the manifest that
 * scripts/image-dimensions.mjs generates before dev, build, and test.
 * Declaring the true aspect ratio lets the browser reserve the right space
 * before the image arrives, so portrait photos no longer shift the layout.
 */
export function imageDimensions(src: string | undefined): ImageDimensions | null {
  return localImageDimensions(src, manifest as Record<string, number[]>) as ImageDimensions | null;
}

/** Dimensions for a `next/image` slot: the real ones when known, else a 3:2 default. */
export function imageDimensionsOr(src: string | undefined, fallback: ImageDimensions = { width: 1200, height: 800 }): ImageDimensions {
  return imageDimensions(src) ?? fallback;
}
