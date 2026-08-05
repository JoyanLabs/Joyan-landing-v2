export const LOCALES = {
  ES: 'es',
  EN: 'en',
} as const;

export type Locale = (typeof LOCALES)[keyof typeof LOCALES];

/** Full OpenGraph locale codes, driven by the short locale (F3). */
export const FULL_LOCALE: Record<Locale, string> = {
  es: 'es_ES',
  en: 'en_US',
};

export interface LocaleMeta {
  /** Page title without the brand suffix (the title template appends it). */
  title: string;
  titleTemplate: string;
  description: string;
}

export interface NavLink {
  label: string;
  /** Locale-invariant section anchor id. */
  anchor: string;
}

export interface NavContent {
  links: NavLink[];
  /** Label of the language toggle pointing to the other locale. */
  toggle: string;
}

export interface HeroContent {
  kicker: string;
  title: string;
  lead: string;
  ctaPrimary: string;
  ctaSecondary: string;
}

export interface FeatureItem {
  title: string;
  body: string;
}

export interface SectionContent {
  index: string;
  kicker: string;
  title: string;
  lead: string;
  items: FeatureItem[];
}

export interface MagiContent extends SectionContent {
  terminalLines: string[];
}

export interface FigureCopy {
  alt: string;
  caption: string;
}

export interface HardwareContent extends SectionContent {
  figure: FigureCopy;
}

export interface FooterContent {
  tagline: string;
  legal: string;
}

export interface LocaleContent {
  meta: LocaleMeta;
  nav: NavContent;
  hero: HeroContent;
  agents: SectionContent;
  magi: MagiContent;
  hardware: HardwareContent;
  ecosystem: SectionContent;
  footer: FooterContent;
}
