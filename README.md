# Toko Gitar AYRI

Website for Toko Gitar AYRI, a guitar shop in Bogor: guitar buying/selling and trade-ins, repair and setup, custom nut/saddle work, and free online tools for guitarists.

Live site: https://ayrigitar.com

## Pages

| Page | Description |
| --- | --- |
| `index.html` | Home page |
| `tuner.html` | Free online guitar tuner (installable as a PWA) |
| `chords.html` | Chord reference |
| `metronom.html` | Metronome |
| `transkrip.html` | Transcription tool |
| `artikel-custom-nut.html` | Article on custom nuts |
| `404.html` | Not-found page |

## Structure

- `*.css` – styles (`style-index.css`, `style-artikel.css`, `tools.css`, `theme-dark.css`, `app.css`)
- `app.js`, `chord-engine.js`, `theme.js` – site and tool scripts
- `pwa.js`, `sw.js`, `manifest.webmanifest` – progressive web app support (offline cache, install prompt)
- `sitemap.xml`, `robots.txt` – SEO files
- `CNAME` – custom domain for GitHub Pages

## Running locally

This is a static site with no build step. Serve the folder with any static server, for example:

```
python -m http.server 8000
```

then open http://localhost:8000. Use a server rather than opening files directly, because the service worker needs `http://` or `https://`.

## Deployment

Pushing to `main` deploys the site with GitHub Pages.
