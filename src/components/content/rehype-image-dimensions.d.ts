export interface Dimensions { width: number; height: number }
export function isOptimizableLocalImage(src: unknown): boolean;
export function localImageDimensions(src: string | undefined, manifest: Record<string, number[]> | undefined): Dimensions | null;
export default function rehypeImageDimensions(options?: { manifest?: Record<string, number[]> }): (tree: unknown) => void;
