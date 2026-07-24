import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { parse as parseYaml } from 'yaml';
import {
  bioSchema,
  experienceSchema,
  publicationsSchema,
  skillsSchema,
  workSchema,
  type Bio,
  type Experience,
  type Publications,
  type Skills,
  type Work,
} from './schema';

// process.cwd() stays the project root under `astro build` prerender bundling.
const contentDir = path.join(process.cwd(), 'src', 'content');

function readYaml<T>(rel: string, schema: { parse: (data: unknown) => T }): T {
  const raw = fs.readFileSync(path.join(contentDir, rel), 'utf8');
  return schema.parse(parseYaml(raw));
}

function loadWorks(): Work[] {
  const dir = path.join(contentDir, 'works');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  const works = files.map((file) => {
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    const { data } = matter(raw);
    return workSchema.parse(data);
  });
  return works.sort((a, b) => a.order - b.order);
}

let cache: {
  bio: Bio;
  skills: Skills;
  experience: Experience;
  works: Work[];
  publications: Publications;
} | null = null;

export function loadContent() {
  if (cache) return cache;
  cache = {
    bio: readYaml('bio.yaml', bioSchema),
    skills: readYaml('skills.yaml', skillsSchema),
    experience: readYaml('experience.yaml', experienceSchema),
    works: loadWorks(),
    publications: readYaml('publications/featured.yaml', publicationsSchema),
  };
  return cache;
}

/** Redacted public corpus for future chat/RAG — no phone, DOB, or CV PDF text. */
export function buildCorpus() {
  const { bio, skills, experience, works, publications } = loadContent();
  return {
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
}
