import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'src', 'content');

const bioSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  tagline: z.string().min(1),
  pitch: z.string().min(1),
  location: z.string().min(1),
  email: z.string().email(),
  links: z.object({
    github: z.string().url(),
    scholar: z.string().url(),
    linkedin: z.string().url(),
    orcid: z.string().url(),
  }),
  cv: z.object({
    primary: z.object({ label: z.string(), href: z.string() }),
    secondary: z.object({ label: z.string(), href: z.string() }).optional(),
  }),
});

const skillsSchema = z.object({
  pillars: z
    .array(
      z.object({
        title: z.string().min(1),
        items: z.array(z.string().min(1)).min(1).max(6),
      }),
    )
    .length(3),
});

const experienceSchema = z.object({
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

const workSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  problem: z.string().min(1),
  method: z.string().min(1),
  impact: z.string().min(1),
  tags: z.array(z.string().min(1)).min(1),
  links: z
    .object({
      repo: z.string().url().optional(),
      pubmed: z.string().url().optional(),
      doi: z.string().url().optional(),
      docs: z.string().url().optional(),
    })
    .default({}),
  order: z.number().int().positive(),
});

const publicationsSchema = z.object({
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

function readYaml(rel, schema) {
  return schema.parse(parseYaml(readFileSync(join(contentDir, rel), 'utf8')));
}

const bio = readYaml('bio.yaml', bioSchema);
const skills = readYaml('skills.yaml', skillsSchema);
const experience = readYaml('experience.yaml', experienceSchema);
const publications = readYaml('publications/featured.yaml', publicationsSchema);

const works = readdirSync(join(contentDir, 'works'))
  .filter((f) => f.endsWith('.md'))
  .map((file) => {
    const { data } = matter(readFileSync(join(contentDir, 'works', file), 'utf8'));
    return workSchema.parse(data);
  })
  .sort((a, b) => a.order - b.order);

const corpus = {
  version: 1,
  generatedFor: 'portfolio-chat-rag',
  person: {
    name: bio.name,
    title: bio.title,
    tagline: bio.tagline,
    pitch: bio.pitch.trim(),
    location: bio.location,
    email: bio.email,
    links: bio.links,
  },
  skills: skills.pillars,
  experience: experience.roles.map((r) => ({
    title: r.title,
    org: r.org,
    dept: r.dept,
    location: r.location,
    start: r.start,
    end: r.end,
    summary: r.summary.trim(),
  })),
  education: experience.education,
  works: works.map((w) => ({
    title: w.title,
    subtitle: w.subtitle,
    problem: w.problem.trim(),
    method: w.method.trim(),
    impact: w.impact.trim(),
    tags: w.tags,
    links: w.links,
  })),
  publications: {
    featured: publications.featured.map((p) => ({
      pmid: p.pmid,
      title: p.title.trim(),
      venue: p.venue,
      year: p.year,
      finding: p.finding.trim(),
      doi: p.doi,
      pubmed: p.pubmed,
      code: p.code,
    })),
    indexes: publications.indexes,
  },
};

const blob = JSON.stringify(corpus);
for (const needle of ['06/02/1988', '+31 6', 'Date of birth', 'nationality']) {
  if (blob.toLowerCase().includes(needle.toLowerCase())) {
    throw new Error(`corpus export blocked: PII pattern detected (${needle})`);
  }
}

const out = join(root, 'public', 'corpus.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(corpus, null, 2) + '\n');
console.log(`wrote ${out} (${blob.length} bytes)`);
