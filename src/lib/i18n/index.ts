import { en } from './en';
import { es } from './es';
import { LOCALES, type Locale } from './types';

export { en } from './en';
export { es } from './es';
export { FULL_LOCALE, LOCALES } from './types';
export type { Locale, LocaleContent } from './types';

/** Registry of available locale modules, ES first (default locale). */
export const locales = [es, en] as const;

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (Object.values(LOCALES) as string[]).includes(value);

/**
 * Path of the given locale starting from the current path, preserving any
 * anchor hash. ES ↔ EN: `/…` ↔ `/en/…`.
 */
export const getAlternateLocalePath = (locale: Locale, path = '/'): string => {
  const esPath = path === '/en' || path.startsWith('/en/') ? path.slice(3) || '/' : path;
  if (locale === LOCALES.ES) {
    return esPath;
  }
  return esPath === '/' ? '/en/' : `/en${esPath}`;
};
