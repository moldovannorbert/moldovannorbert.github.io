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
  cv: z.object({
    primary: cvLink,
    secondary: cvLink.optional(),
  }),
});

export const skillsSchema = z.object({
  pillars: z
    .array(
      z.object({
        title: z.string().min(1),
        items: z.array(z.string().min(1)).min(1).max(6),
      }),
    )
    .length(3),
});

export const experienceSchema = z.object({
  roles: z.array(
    z.object({
      title: z.string().min(1),
      org: z.string().min(1),
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
        finding: z.string().min(1),
        doi: z.string().url(),
        pubmed: z.string().url(),
        code: z.string().url().optional(),
      }),
    )
    .min(1),
  indexes: z.object({
    scholar: z.string().url(),
    orcid: z.string().url(),
    scopus: z.string().url(),
  }),
});

export type Bio = z.infer<typeof bioSchema>;
export type Skills = z.infer<typeof skillsSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Work = z.infer<typeof workSchema>;
export type Publications = z.infer<typeof publicationsSchema>;
