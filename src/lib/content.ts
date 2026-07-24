import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { parse as parseYaml } from 'yaml';
import {
  bioSchema,
  collabGraphSchema,
  experienceSchema,
  publicationIndexesSchema,
  publicationsSchema,
  skillsSchema,
  workSchema,
  type Bio,
  type CollabGraph,
  type Experience,
  type PublicationIndexes,
  type Publications,
  type Skills,
  type Work,
} from './schema';

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

function loadCollabGraph(): CollabGraph {
  const raw = fs.readFileSync(path.join(contentDir, 'collab-graph.json'), 'utf8');
  return collabGraphSchema.parse(JSON.parse(raw));
}

let cache: {
  bio: Bio;
  skills: Skills;
  experience: Experience;
  works: Work[];
  publications: Publications;
  publicationIndexes: PublicationIndexes;
  collabGraph: CollabGraph;
} | null = null;

export function loadContent() {
  if (cache) return cache;
  cache = {
    bio: readYaml('bio.yaml', bioSchema),
    skills: readYaml('skills.yaml', skillsSchema),
    experience: readYaml('experience.yaml', experienceSchema),
    works: loadWorks(),
    publications: readYaml('publications/featured.yaml', publicationsSchema),
    publicationIndexes: readYaml('publications/meta.yaml', publicationIndexesSchema),
    collabGraph: loadCollabGraph(),
  };
  return cache;
}

/** Redacted public corpus for future chat/RAG — no phone, DOB, or CV PDF text. */
export function buildCorpus() {
  const { bio, skills, experience, works, publications, publicationIndexes } = loadContent();
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
      year: w.year,
      venueLabel: w.venueLabel,
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
        problem: p.problem.trim(),
        method: p.method.trim(),
        impact: p.impact.trim(),
        tags: p.tags,
        doi: p.doi,
        pubmed: p.pubmed,
        code: p.code,
      })),
      indexes: publicationIndexes,
    },
  };
}
