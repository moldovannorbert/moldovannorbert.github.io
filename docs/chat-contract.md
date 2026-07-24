# Portfolio chat contract (future)

The static site on GitHub Pages does **not** host an LLM. A future “ask the portfolio” feature must call an external API. This document is the contract; no chat UI ships in v1.

## Corpus

- URL: `https://moldovannorbert.github.io/corpus.json` (also written to `public/corpus.json` at build time)
- Source of truth: YAML/Markdown under `src/content/`, validated with Zod (`src/lib/schema.ts`)
- Contents: public bio, skills, experience, featured works, featured publications
- **Excluded by design:** phone, date of birth, nationality, visa notes, raw CV PDF text, unpublished personal data

Do **not** feed `cv-*.pdf` into RAG. Use `corpus.json` only.

## Suggested API

`POST /chat`

```json
{
  "message": "What pipelines have you built for cfDNA?",
  "sessionId": "optional-opaque-id"
}
```

Response:

```json
{
  "reply": "…",
  "citations": [{ "type": "work", "title": "FrEIA" }]
}
```

## Requirements for the backend

1. Answer **only** from `corpus.json` (or a snapshot of it). Refuse otherwise.
2. Rate-limit per IP / session; no unbounded free proxy to a frontier model.
3. CORS: allow `https://moldovannorbert.github.io` (and localhost for development).
4. Never log full prompts with PII; corpus already omits phone/DOB.
5. Client (later): small Astro island or vanilla widget posting to `PUBLIC_CHAT_API_URL`. Omit the widget when the env var is unset.

## Non-goals

- Running inference on GitHub Pages
- Embedding API keys in the static frontend
- Indexing LinkedIn or email contents beyond the public email address in the corpus
