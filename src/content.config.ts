import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { JOURNAL_AREAS, JOURNAL_STATUSES } from '~/lib/i18n/types';

const metadataDefinition = () =>
  z
    .object({
      title: z.string().optional(),
      ignoreTitleTemplate: z.boolean().optional(),

      canonical: z.url().optional(),

      robots: z
        .object({
          index: z.boolean().optional(),
          follow: z.boolean().optional(),
        })
        .optional(),

      description: z.string().optional(),

      openGraph: z
        .object({
          url: z.string().optional(),
          siteName: z.string().optional(),
          images: z
            .array(
              z.object({
                url: z.string(),
                width: z.number().optional(),
                height: z.number().optional(),
              })
            )
            .optional(),
          locale: z.string().optional(),
          type: z.string().optional(),
        })
        .optional(),

      twitter: z
        .object({
          handle: z.string().optional(),
          site: z.string().optional(),
          cardType: z.string().optional(),
        })
        .optional(),
    })
    .optional();

const postCollection = defineCollection({
  loader: glob({ pattern: ['*.md', '*.mdx'], base: 'src/data/post' }),
  schema: z.object({
    publishDate: z.date().optional(),
    updateDate: z.date().optional(),
    draft: z.boolean().optional(),

    title: z.string(),
    excerpt: z.string().optional(),
    image: z.string().optional(),

    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    author: z.string().optional(),

    metadata: metadataDefinition(),
  }),
});

/**
 * Joyan Journal — additive collection, deliberately isolated from the dormant
 * `post`/blog infrastructure (no permalinks, RSS or detail pages). Locale
 * comes from the folder (`es/` | `en/`); ES entries are authoritative and an
 * EN translation may be omitted (honest omission, never a fabricated
 * fallback). Draft entries are excluded by `src/utils/journal.ts`.
 */
const journalCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: 'src/data/journal' }),
  schema: z.object({
    date: z.date(),
    title: z.string(),
    summary: z.string(),
    area: z.enum(JOURNAL_AREAS),
    status: z.enum(JOURNAL_STATUSES),
    link: z.url().optional(),
    dither: z.string().optional(),
    draft: z.boolean().optional(),
  }),
});

export const collections = {
  post: postCollection,
  journal: journalCollection,
};
