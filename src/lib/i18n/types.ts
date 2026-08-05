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

export interface FigureCopy {
  alt: string;
  caption: string;
}

export interface IllustratedSectionContent extends SectionContent {
  figure: FigureCopy;
}

/**
 * In-progress community offer, deliberately distinct from the cooperative
 * model described in `SectionContent.items`. Nothing here is an enrollment,
 * a form, a guaranteed beta, or a delivery offer.
 */
export interface CommunityContent {
  /** Explicit availability status, e.g. "En desarrollo". */
  status: string;
  title: string;
  lead: string;
  audiences: {
    mipes: FeatureItem;
    developmentTeams: FeatureItem;
  };
  offers: {
    guidesAndContent: FeatureItem;
    training: FeatureItem;
    agentBetaParticipation: FeatureItem;
    hardwareAgentPrototypeInvitation: FeatureItem;
  };
}

/** Accessible text around the optional MAGI motion layer (Unit D). */
export interface MotionContent {
  /** Accessible label of the animated canvas when it is present. */
  canvasLabel: string;
  /** Status text shown when the diagram renders static art. */
  staticStatus: string;
  /** Status text shown while the diagram animates. */
  activeStatus: string;
}

export interface MagiContent extends IllustratedSectionContent {
  terminalLines: string[];
  motion: MotionContent;
}

export interface HardwareContent extends IllustratedSectionContent {
  prototypeInvitation: {
    /** Explicit availability status, e.g. "En desarrollo". */
    status: string;
    body: string;
  };
}

export interface EcosystemContent extends IllustratedSectionContent {
  community: CommunityContent;
}

/**
 * Journal entry areas (single primary tag per entry). The literal list is the
 * single source of truth: the content-collection schema consumes it directly
 * (`z.enum(JOURNAL_AREAS)`) and locale chrome keys its label maps by it.
 */
export const JOURNAL_AREAS = ['hardware', 'software', 'integration', 'research'] as const;
export type JournalArea = (typeof JOURNAL_AREAS)[number];

/** Journal entry statuses — honest, in-development vocabulary. */
export const JOURNAL_STATUSES = ['in-progress', 'shipped', 'exploring'] as const;
export type JournalStatus = (typeof JOURNAL_STATUSES)[number];

/**
 * UI chrome for the Journal (section 05 / archives). Entries themselves live
 * in Markdown; locale modules only own labels, meta and honest empty states.
 */
export interface JournalContent {
  /** Section index label, e.g. "05". */
  index: string;
  kicker: string;
  title: string;
  lead: string;
  /** Label of the link from the landing section to the archive. */
  archiveLabel: string;
  /** Label of an optional external link inside a row. */
  linkLabel: string;
  /** Label of the row link to the entry's static detail page. */
  detailLabel: string;
  /** Label of the detail page return link back to its locale archive. */
  detailReturnLabel: string;
  /** Honest localized empty state (rendered when a locale has no published entries). */
  emptyState: string;
  /** Archive page metadata (title/description). */
  archive: LocaleMeta;
  /** Localized area labels, keyed by JournalArea. */
  areas: Record<JournalArea, string>;
  /** Localized status labels, keyed by JournalStatus. */
  statuses: Record<JournalStatus, string>;
}

export interface FooterContent {
  tagline: string;
  legal: string;
}

export interface LocaleContent {
  meta: LocaleMeta;
  nav: NavContent;
  hero: HeroContent;
  agents: IllustratedSectionContent;
  magi: MagiContent;
  hardware: HardwareContent;
  ecosystem: EcosystemContent;
  journal: JournalContent;
  footer: FooterContent;
}
