# Norbert Moldován — portfolio

Static Astro site for [moldovannorbert.github.io](https://moldovannorbert.github.io).

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run check   # export corpus.json + astro build
```

Content lives in `src/content/` (Zod-validated). Public chat corpus: `public/corpus.json` (see `docs/chat-contract.md`).

## Deploy

Push to `main` on the `moldovannorbert.github.io` GitHub repo. Actions builds and deploys to GitHub Pages.
