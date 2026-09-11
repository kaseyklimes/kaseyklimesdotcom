// Shared with cache warming so delivery settings and warmed variants agree.
//
// Every width here multiplies with every format to become a separately billed
// Vercel image transformation, so the ladder is kept to the steps the layout
// actually selects: 828 covers a phone at 2x, 1200 and 1920 the 896px article
// column at 1x and 2x, and 2560 a full-bleed photograph on a 2x display. The
// near-duplicate 750/1080/2048 steps and the 3840 step above them only split
// the cache without changing what a reader sees.
export const imageDeviceSizes = [640, 828, 1200, 1920, 2560];
export const imageFormats = ['image/avif', 'image/webp'];
