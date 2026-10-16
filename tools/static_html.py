"""Turns the exported Framer page into plain HTML: removes every script and the Framer-only tags and links assets/site.js."""
import re

ASSETS = (
    ('/assets/site.css', '<link rel="stylesheet" href="/assets/site.css">'),
    ('/assets/site.js', '<script defer src="/assets/site.js"></script>'),
)
INSTAGRAM = (
    '<svg xmlns="http://www.w3.org/2000/svg" focusable="false" viewBox="0 0 24 24" aria-label="Instagram" '
    'style="user-select:none;width:100%;height:100%;display:inline-block;fill:rgb(255,255,255);flex-shrink:0">'
    '<path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg>'
)
_script = re.compile(r"<script\b[^>]*>.*?</script>", re.S | re.I)
_link = re.compile(r'<link\b[^>]*rel="modulepreload"[^>]*>|<link\b[^>]*rel="preconnect"[^>]*>', re.I)
_meta = re.compile(r'<meta name="(?:generator|framer-search-index[^"]*)"[^>]*>', re.I)


def strip(html):
    html = _script.sub(lambda m: m.group(0) if re.search(r'src="/assets/', m.group(0)) else "", html)
    html = _link.sub("", html)
    html = _meta.sub("", html)
    html = re.sub(r"<!--.*?-->", "", html, flags=re.S)
    html = re.sub(r'\sdata-framer-hydrate-v2="[^"]*"|\sdata-framer-ssr-released-at="[^"]*"|\sdata-framer-page-optimized-at="[^"]*"', "", html)
    html = html.replace("https://www.zoobko.com/", "https://zoobko.com/")  # main domain: apex
    html = re.sub(r'(<meta (?:property="og:image"|name="twitter:image") content=")(/)', r'\1https://zoobko.com\2', html)
    # the YouTube player is only loaded when the poster is clicked (assets/site.js)
    html = re.sub(r'(<iframe\b[^>]*?)\ssrc="', r'\1 data-src="', html)
    # the Instagram icon is drawn client-side by Framer, so the export has an empty box
    html = html.replace('name="Instagram" style="transform:translateX(-50%)"><div style="display:contents"></div>',
                        'name="Instagram" style="transform:translateX(-50%)"><div style="display:contents">' + INSTAGRAM + "</div>")
    missing = "".join(tag for path, tag in ASSETS if path not in html)
    return html.replace("</head>", missing + "</head>", 1) if missing else html
