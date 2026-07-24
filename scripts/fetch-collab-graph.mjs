import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, 'scripts/collab-config.json'), 'utf8'));

const TECHNIQUES = [
  'longread_rna',
  'cfdna_fragmentomics',
  'cfdna_genomics_epigenomics',
  'longread_cfdna',
  'other',
];
const TECHNIQUE_SET = new Set(TECHNIQUES);
const MIN_YEAR = config.minYear ?? 2017;
const TYPE_RANK = { article: 0, 'data-paper': 1, preprint: 2 };

export function normalizeDoi(doi) {
  if (!doi) return null;
  let d = String(doi).trim().toLowerCase();
  for (const p of ['https://doi.org/', 'http://doi.org/']) {
    if (d.startsWith(p)) d = d.slice(p.length);
  }
  return d;
}

function isEgo(name) {
  const n = name || '';
  return config.egoNameMatchers.some((m) => n.toLowerCase().includes(m.toLowerCase()));
}

function titleKey(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function titlesOverlap(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const n = 48;
  if (a.length >= n && b.length >= n) {
    if (a.startsWith(b.slice(0, n)) || b.startsWith(a.slice(0, n))) return true;
  }
  // Catch preprint titles that prepend a phrase to the journal title.
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length > b.length ? a : b;
  return shorter.length >= 40 && longer.includes(shorter);
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': `moldovannorbert-portfolio (mailto:${config.mailto})`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`OpenAlex ${res.status} for ${url}`);
  return res.json();
}

async function fetchAllWorks() {
  const perPage = 200;
  const filter = encodeURIComponent(config.openAlexFilter);
  const select = encodeURIComponent(
    'id,title,publication_year,doi,type,primary_location,authorships,cited_by_count',
  );
  let page = 1;
  const works = [];
  for (;;) {
    const url = `https://api.openalex.org/works?filter=${filter}&per-page=${perPage}&page=${page}&select=${select}`;
    const data = await fetchJson(url);
    works.push(...(data.results || []));
    const { count, per_page } = data.meta;
    if (page * per_page >= count) break;
    page += 1;
  }
  return works;
}

function venueOf(work) {
  return work.primary_location?.source?.display_name || '';
}

function resolveTechnique(doi, workId, byDoi, byWorkId) {
  if (doi && byDoi[doi] && TECHNIQUE_SET.has(byDoi[doi])) return byDoi[doi];
  if (byWorkId[workId] && TECHNIQUE_SET.has(byWorkId[workId])) return byWorkId[workId];
  return 'other';
}

function buildGraph(works) {
  const excludeDois = new Set((config.excludeDois || []).map(normalizeDoi));
  const excludeWorks = new Set(config.excludeWorkIds || []);
  const byDoi = Object.fromEntries(
    Object.entries(config.techniqueByDoi || {}).map(([k, v]) => [normalizeDoi(k), v]),
  );
  const byWorkId = config.techniqueByWorkId || {};

  const candidates = [];
  for (const w of works) {
    const paperId = w.id.replace('https://openalex.org/', '');
    if (excludeWorks.has(paperId)) continue;

    const doi = normalizeDoi(w.doi);
    if (doi && excludeDois.has(doi)) continue;

    const year = w.publication_year || null;
    if (year != null && year < MIN_YEAR) continue;

    const title = (w.title || '').replace(/\s+/g, ' ').trim();
    if (!title) continue;

    const openAlexType = w.type || 'article';
    const authorships = w.authorships || [];
    const firstFull = authorships[0]?.author?.display_name || '';
    const technique = resolveTechnique(doi, paperId, byDoi, byWorkId);

    candidates.push({
      id: paperId,
      type: 'paper',
      title,
      year,
      venue: venueOf(w),
      url: doi ? `https://doi.org/${doi}` : `https://openalex.org/${paperId}`,
      doi: doi || '',
      technique,
      firstAuthor: firstFull || 'Unknown',
      led: isEgo(firstFull),
      openAlexType,
      _key: titleKey(title),
      _rank: TYPE_RANK[openAlexType] ?? 9,
    });
  }

  // Prefer journal article over preprint / older preprint versions of the same title.
  candidates.sort(
    (a, b) =>
      a._rank - b._rank ||
      (b.year || 0) - (a.year || 0) ||
      Number(Boolean(b.doi)) - Number(Boolean(a.doi)) ||
      a.title.localeCompare(b.title),
  );

  const papers = [];
  const keptKeys = [];
  const droppedAsDup = [];
  const byTechnique = Object.fromEntries(TECHNIQUES.map((t) => [t, 0]));
  const asOther = [];

  for (const c of candidates) {
    if (keptKeys.some((k) => titlesOverlap(k, c._key))) {
      droppedAsDup.push({ year: c.year, doi: c.doi || c.id, title: c.title, openAlexType: c.openAlexType });
      continue;
    }
    keptKeys.push(c._key);
    const { _key, _rank, ...paper } = c;
    papers.push(paper);
    byTechnique[paper.technique] += 1;
    if (paper.technique === 'other') {
      asOther.push({ year: paper.year, doi: paper.doi || paper.id, title: paper.title });
    }
  }

  const labels = {
    ...Object.fromEntries(TECHNIQUES.map((t) => [t, t])),
    ...config.techniqueLabels,
    other: config.techniqueLabels?.other || 'Other',
  };

  return {
    asOther,
    droppedAsDup,
    hist: byTechnique,
    graph: {
      generatedAt: new Date().toISOString(),
      source: {
        provider: 'openalex',
        orcid: config.orcid,
        filter: config.openAlexFilter,
        minYear: MIN_YEAR,
      },
      counts: {
        papers: papers.length,
        byTechnique,
      },
      techniqueLabels: labels,
      papers: papers.sort((a, b) => (b.year || 0) - (a.year || 0) || a.title.localeCompare(b.title)),
    },
  };
}

const works = await fetchAllWorks();
const { asOther, droppedAsDup, hist, graph } = buildGraph(works);

console.log('technique histogram:', hist);
console.log('counts:', graph.counts);
console.log('led:', graph.papers.filter((p) => p.led).length, '/', graph.papers.length);
console.log('deduped away:', droppedAsDup.length);
if (asOther.length) {
  console.warn('\nUnmapped technique (bucketed as other):');
  for (const u of asOther) {
    console.warn(`- ${u.year} | ${u.doi} | ${u.title}`);
  }
}

const out = join(root, 'src/content/collab-graph.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(graph, null, 2) + '\n');
console.log(`wrote ${out}`);
