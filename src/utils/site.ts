import { parseDateToTimestamp } from '@/utils/dateFormatting';

export const siteName = 'Kasey Klimes';
// The one description search engines should show for the home and filter pages.
// Card captions in the grid are marked data-nosnippet so they aren't used instead.
export const siteDescription =
  'Systems designer in Brooklyn. Founder of Primitive, decision infrastructure for software teams and their AI agents. Previously Google Maps, Rhizome R&D, Gehl.';

export const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://kaseyklimes.com');
export const absoluteUrl = (path: string) => new URL(path, siteUrl).href;

// Ongoing projects have no known last-modified date.
export function contentDate(date: string | undefined): Date | undefined {
  if (!date || /present/i.test(date)) return undefined;
  const timestamp = parseDateToTimestamp(date);
  return timestamp > 0 && timestamp <= Date.now() ? new Date(timestamp) : undefined;
}

export function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, char => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  })[char]!);
}
