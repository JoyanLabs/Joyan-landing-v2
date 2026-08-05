import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '~/lib/i18n';

export type JournalEntry = CollectionEntry<'journal'>;

/** Locale folder prefix of journal entry ids (e.g. "es/" for es/*.md). */
const localePrefix = (locale: Locale): string => `${locale}/`;

/**
 * Published journal entries for a locale, newest first. Drafts are excluded
 * and ES-authoritative omissions are preserved: an entry without a sibling
 * translation simply never appears for the other locale — no fallback is
 * invented. Deliberately separate from the dormant blog helpers.
 */
export const getPublishedJournal = async (locale: Locale): Promise<JournalEntry[]> => {
  const entries = await getCollection('journal', ({ id }) => id.startsWith(localePrefix(locale)));
  return entries
    .filter((entry) => entry.data.draft !== true)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
};

/** Latest N published entries for a locale (landing section 05 shows three). */
export const getLatestJournal = async (locale: Locale, limit = 3): Promise<JournalEntry[]> =>
  (await getPublishedJournal(locale)).slice(0, limit);
