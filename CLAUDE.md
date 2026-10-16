# zoobko.com

Static copy of the zoobko.com site (portfolio of Tetiana Zoobko, motion designer), served from this repo
(GitHub Pages). No build step. One page: `index.html`.

## Images and media
- Downscale images to the size they are actually displayed at (use 2x for retina) before adding them. Do not commit full-resolution originals.
- Always use WebP for new images. Convert with `cwebp -q 85 -resize <w> <h> in.jpg -o out.webp`.
- Put new media (images, videos, posters) under `_ext/media/`. Fonts are in `_ext/fonts/`.
- Videos are small looping WebM files that play only while in view (`assets/site.js`).

## No framework runtime
The page was exported from Framer, and its JavaScript engine, analytics (Google Analytics, Framer events),
editor bar and generator tags have been removed (do not re-add them). The design CSS is inline in
`index.html`'s `<style>`. Behaviour lives in two small files:
- `assets/site.js` - entrance animation of the hero text, hero parallax, reveal-on-scroll, video autoplay, particle overlay (canvas, black = transparent),
  click-to-load YouTube showreel, custom crosshair cursor (follows the mouse, pops in on tap, squeezes on press).
- `assets/site.css` - blinking "Available for new projects", card and Instagram hover states.

## Fonts
Self-hosted in `_ext/fonts/` (Inter Display 400/500/700 with Latin, Latin-ext, Cyrillic and Greek subsets,
and Bowlby One). Cyrillic is covered (the page has Ukrainian project names).

## Third parties
Only the YouTube showreel (loaded when the poster is clicked) and outbound links. Nothing loads on page view.

## Tools
`tools/localize.py` downloads the live Framer export (assets to `_ext/`, images converted to WebP) into
`index.raw.html`; `tools/static_html.py` strips the Framer scripts and tags from it to produce `index.html`.
They were used once for the migration; the live site is no longer the source, so edit `index.html` directly.

## Preview
    python3 serve.py 8000      # http://localhost:8000

## Deploy
GitHub Pages from `main`, root folder. `CNAME` holds the custom domain, `.nojekyll` disables Jekyll.
