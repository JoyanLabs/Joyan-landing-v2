import { getCollection, type CollectionEntry } from 'astro:content';
import { JOURNAL_ROUTES, LOCALES, type Locale } from '~/lib/i18n';

export type JournalEntry = CollectionEntry<'journal'>;

/**
 * NOTE — Astro 7 glob loader: a `slug` frontmatter field becomes the
 * collection entry `id` (see `generateIdDefault` in `astro/dist/content/
 * loaders/glob.js`). Slugs therefore must be unique across the WHOLE journal
 * collection (both locales) and the locale can no longer be read from the
 * id — it is derived from the entry `filePath` below. The deterministic
 * checker enforces the global uniqueness.
 */
const isLocaleEntry = (entry: JournalEntry, locale: Locale): boolean =>
  (entry.filePath ?? '').replace(/\\/g, '/').includes(`/journal/${locale}/`);

/**
 * Published journal entries for a locale, newest first. Drafts are excluded
 * and ES-authoritative omissions are preserved: an entry without a sibling
 * translation simply never appears for the other locale — no fallback is
 * invented. Deliberately separate from the dormant blog helpers.
 */
export const getPublishedJournal = async (locale: Locale): Promise<JournalEntry[]> => {
  const entries = await getCollection('journal');
  return entries
    .filter((entry) => isLocaleEntry(entry, locale))
    .filter((entry) => entry.data.draft !== true)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
};

/** Latest N published entries for a locale (landing section 05 shows three). */
export const getLatestJournal = async (locale: Locale, limit = 3): Promise<JournalEntry[]> =>
  (await getPublishedJournal(locale)).slice(0, limit);

/**
 * Static detail path of a published entry (e.g. `/bitacora/{slug}` or
 * `/en/log/{slug}`). Paths are derived from the shared `JOURNAL_ROUTES`
 * archive bases, never from dates or titles.
 */
export const journalDetailPath = (locale: Locale, slug: string): string => `${JOURNAL_ROUTES[locale]}/${slug}`;

/**
 * One published static detail route: the entry itself, its locale and path,
 * plus the REAL counterpart path when a published translation exists (same
 * `translationKey`). An unpaired (ES-only) record carries no `alternatePath`
 * — nothing may invent an EN detail.
 */
export interface JournalRouteRecord {
  entry: JournalEntry;
  locale: Locale;
  path: string;
  alternatePath?: string;
}

/**
 * Published route records for a locale. Pairing is keyed by `translationKey`
 * against the published entries of the other locale: ES is authoritative, so
 * an EN entry without a published ES peer can never occur here (schema and
 * checker reject it), and an ES entry without EN simply stays unpaired.
 */
export const getPublishedJournalRouteRecords = async (locale: Locale): Promise<JournalRouteRecord[]> => {
  const entries = await getPublishedJournal(locale);
  const otherLocale = locale === LOCALES.ES ? LOCALES.EN : LOCALES.ES;
  const otherEntries = await getPublishedJournal(otherLocale);
  const slugByKey = new Map(otherEntries.map((entry) => [entry.data.translationKey, entry.data.slug]));
  return entries.map((entry) => {
    const record: JournalRouteRecord = {
      entry,
      locale,
      path: journalDetailPath(locale, entry.data.slug),
    };
    const alternateSlug = slugByKey.get(entry.data.translationKey);
    if (alternateSlug) {
      record.alternatePath = journalDetailPath(otherLocale, alternateSlug);
    }
    return record;
  });
};

/** Route record for a published entry by slug, or undefined for draft/unknown slugs. */
export const getJournalRouteRecord = async (locale: Locale, slug: string): Promise<JournalRouteRecord | undefined> =>
  (await getPublishedJournalRouteRecords(locale)).find((record) => record.entry.data.slug === slug);

/**
 * Locale cluster of the current pathname, resolved from the published route
 * records. Landings (`/`, `/en`) and archives (`/bitacora`, `/en/log`) are
 * recognized structurally; a detail keeps its real `alternatePath` when the
 * entry is paired and leaves it undefined for ES-only entries. An unknown or
 * draft detail path resolves to the landing cluster (it has no static page).
 */
export type JournalLocaleCluster =
  | { kind: 'landing'; locale: Locale }
  | { kind: 'archive'; locale: Locale }
  | { kind: 'detail'; locale: Locale; slug: string; alternatePath?: string };

export const resolveJournalLocaleCluster = async (pathname: string): Promise<JournalLocaleCluster> => {
  const locale: Locale = pathname.startsWith('/en') ? LOCALES.EN : LOCALES.ES;
  const archivePath = JOURNAL_ROUTES[locale];
  if (pathname === archivePath) {
    return { kind: 'archive', locale };
  }
  if (pathname.startsWith(`${archivePath}/`)) {
    const slug = pathname.slice(archivePath.length + 1).replace(/\/+$/, '');
    if (slug) {
      const record = await getJournalRouteRecord(locale, slug);
      if (record) {
        return { kind: 'detail', locale, slug, alternatePath: record.alternatePath };
      }
    }
  }
  return { kind: 'landing', locale };
};
