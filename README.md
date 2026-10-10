# DeepSea (React rewrite)

A privacy-first AI chat client: bring your own API key, everything stays in your browser.
This is a React + Vite + Tailwind CSS + shadcn-style (Radix primitives) rewrite of the
legacy single-file `web-chat-ai` app.

## Dev

```bash
npm ci
npm run dev      # local dev server
npm run build    # tsc -b && vite build -> dist/
npm run preview  # serve the production build locally
```

## Deploy

Push to `main` → the GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and
deploys to GitHub Pages automatically. `public/CNAME` pins the custom domain
`deepsea.labkita.my.id`.

## Migration note

The repo previously served a legacy single-file `index.html` via classic GitHub Pages
(branch-based). To go live with this rewrite, set the repo **Settings → Pages → Source**
to **GitHub Actions** once; the workflow then handles every deploy from `main`.
