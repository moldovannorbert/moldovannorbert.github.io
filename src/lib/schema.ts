import { z } from 'zod';

const linkMap = z.object({
  github: z.string().url(),
  scholar: z.string().url(),
  linkedin: z.string().url(),
  orcid: z.string().url(),
});

const cvLink = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});

export const bioSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  tagline: z.string().min(1),
  pitch: z.string().min(1),
  location: z.string().min(1),
  email: z.string().email(),
  links: linkMap,
  metrics: z.object({
    citations: z.number().int().nonnegative(),
    hIndex: z.number().int().nonnegative(),
  }),
  cv: z.object({
    primary: cvLink,
    secondary: cvLink.optional(),
  }),
  now: z.string().min(1),
});

export const skillDetailBlockSchema = z.object({
  heading: z.string().min(1).optional(),
  text: z.string().min(1),
});

export const skillsSchema = z.object({
  pillars: z
    .array(
      z.object({
        title: z.string().min(1),
        items: z
          .array(
            z.object({
              label: z.string().min(1),
              /** Plain string or list of { heading?, text } blocks for the expanded card. */
              detail: z.union([z.string().min(1), z.array(skillDetailBlockSchema).min(1)]),
              image: z.string().min(1),
            }),
          )
          .min(1)
          .max(6),
      }),
    )
    .length(3),
});

export const experienceSchema = z.object({
  roles: z.array(
    z.object({
      title: z.string().min(1),
      org: z.string().min(1),
      url: z.string().url(),
      dept: z.string().optional(),
      location: z.string().min(1),
      start: z.string().min(1),
      end: z.string().min(1),
      summary: z.string().min(1),
    }),
  ),
  education: z.array(
    z.object({
      degree: z.string().min(1),
      org: z.string().min(1),
      url: z.string().url(),
      location: z.string().min(1),
      start: z.string().min(1),
      end: z.string().min(1),
    }),
  ),
});

export const workLinksSchema = z
  .object({
    repo: z.string().url().optional(),
    pubmed: z.string().url().optional(),
    doi: z.string().url().optional(),
    docs: z.string().url().optional(),
  })
  .default({});

export const workSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  year: z.number().int(),
  venueLabel: z.string().min(1),
  problem: z.string().min(1),
  method: z.string().min(1),
  impact: z.string().min(1),
  tags: z.array(z.string().min(1)).min(1),
  links: workLinksSchema,
  order: z.number().int().positive(),
});

export const publicationsSchema = z.object({
  featured: z
    .array(
      z.object({
        pmid: z.string().min(1),
        title: z.string().min(1),
        venue: z.string().min(1),
        year: z.number().int(),
        problem: z.string().min(1),
        method: z.string().min(1),
        impact: z.string().min(1),
        tags: z.array(z.string().min(1)).min(1),
        doi: z.string().url(),
        pubmed: z.string().url(),
        code: z.string().url().optional(),
      }),
    )
    .min(1),
});

export const publicationIndexesSchema = z.object({
  scholar: z.string().url(),
  orcid: z.string().url(),
  scopus: z.string().url(),
});

export const techniqueSchema = z.enum([
  'longread_rna',
  'cfdna_fragmentomics',
  'cfdna_genomics_epigenomics',
  'longread_cfdna',
  'other',
]);

export const collabGraphSchema = z.object({
  generatedAt: z.string().min(1),
  source: z.object({
    provider: z.literal('openalex'),
    orcid: z.string().min(1),
    filter: z.string().min(1),
    minYear: z.number().int().optional(),
  }),
  counts: z.object({
    papers: z.number().int(),
    byTechnique: z.record(z.string(), z.number().int()),
  }),
  techniqueLabels: z.record(z.string(), z.string()),
  papers: z.array(
    z.object({
      id: z.string().min(1),
      type: z.literal('paper'),
      title: z.string().min(1),
      year: z.number().int().nullable(),
      venue: z.string(),
      url: z.string().url(),
      doi: z.string(),
      technique: techniqueSchema,
      firstAuthor: z.string().min(1),
      led: z.boolean(),
      openAlexType: z.string().min(1).optional(),
    }),
  ),
});

export type Bio = z.infer<typeof bioSchema>;
export type Skills = z.infer<typeof skillsSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Work = z.infer<typeof workSchema>;
export type Publications = z.infer<typeof publicationsSchema>;
export type PublicationIndexes = z.infer<typeof publicationIndexesSchema>;
export type CollabGraph = z.infer<typeof collabGraphSchema>;
export type Technique = z.infer<typeof techniqueSchema>;
