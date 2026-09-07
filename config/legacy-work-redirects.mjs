import { readdirSync } from 'node:fs';

// Old Squarespace-era URLs that Google still indexes. Keys are the legacy
// paths; values are current site paths.
export const legacyWorkRedirects = {
  '/about': '/',
  '/google-maps-ar': '/work/google',
  '/quantitative-history': '/work/quantitative-history',
  '/washu-mobility': '/work/washu-mobility',
  '/people-data': '/work/peopledata',
  '/drcs': '/work/drcs',
  '/designing-for-complexity': '/talks/rethink',
  '/economic-possibility': '/work/lep',
  '/i-980': '/work/i-980',
  '/moscow-pspl': '/work/moscow',
  '/east-midtown-places-for-people': '/work/east-midtown',
  '/land-value-tax': '/blog/the-potential-of-land-value-tax-sustainable-equitable-growth',
  // Cards that moved into the play and talks categories.
  '/work/perfect-day': '/play/perfect-day',
  '/photography/mouthkiss': '/play/mouthkiss',
  '/work/rethink': '/talks/rethink',
  '/work/sva': '/talks/sva',
  '/work/technology-shapes-homes-cities-work': '/talks/technology-shapes-homes-cities-work',
};

export function getLegacyWorkRedirects() {
  const slugs = category =>
    readdirSync(new URL(`../content/${category}/`, import.meta.url))
      .filter(file => file.endsWith('.md'))
      .map(file => `/${category}/${file.slice(0, -3)}`);
  const targets = new Set(['/', ...slugs('work'), ...slugs('blog'), ...slugs('play'), ...slugs('talks')]);

  return Object.entries(legacyWorkRedirects).map(([source, destination]) => {
    if (!targets.has(destination)) throw new Error(`Missing work redirect target: ${destination}`);
    return { source, destination, permanent: true };
  });
}
