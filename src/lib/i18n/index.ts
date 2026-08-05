import { en } from './en';
import { es } from './es';
import { LOCALES, type Locale } from './types';

export { en } from './en';
export { es } from './es';
export { FULL_LOCALE, LOCALES } from './types';
export type { Locale, LocaleContent } from './types';

/** Registry of available locale modules, ES first (default locale). */
export const locales = [es, en] as const;

/** Journal archive routes (ES /bitacora, EN /en/log); detail paths derive
 *  from these bases in `src/utils/journal.ts` (`journalDetailPath`). */
export const JOURNAL_ROUTES = {
  [LOCALES.ES]: '/bitacora',
  [LOCALES.EN]: '/en/log',
} as const;

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (Object.values(LOCALES) as string[]).includes(value);

/**
 * Path of the given locale starting from the current path, preserving any
 * anchor hash. ES ↔ EN: `/…` ↔ `/en…`; journal archives map `/bitacora` ↔
 * `/en/log`. Trailing slash is never used (astro `trailingSlash: "never"`).
 */
export const getAlternateLocalePath = (locale: Locale, path = '/'): string => {
  if (path === JOURNAL_ROUTES[LOCALES.ES]) {
    return locale === LOCALES.EN ? JOURNAL_ROUTES[LOCALES.EN] : JOURNAL_ROUTES[LOCALES.ES];
  }
  if (path === JOURNAL_ROUTES[LOCALES.EN]) {
    return locale === LOCALES.ES ? JOURNAL_ROUTES[LOCALES.ES] : JOURNAL_ROUTES[LOCALES.EN];
  }
  const esPath = path === '/en' || path.startsWith('/en/') ? path.slice(3) || '/' : path;
  if (locale === LOCALES.ES) {
    return esPath;
  }
  return esPath === '/' ? '/en' : `/en${esPath}`;
};
