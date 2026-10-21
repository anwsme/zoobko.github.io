#!/usr/bin/env python3
"""Turn one live Framer page into a static, framework-free page inside this repo.

    python3 tools/localize_page.py https://thetreasure.in.ua/ thetreasure/index.html

Downloads fonts to _ext/fonts, images (converted to WebP, downscaled to display size x2) and videos to
_ext/media, strips the Framer runtime (tools/static_html.py) and points every asset at the shared _ext/ and
assets/ folders with relative paths, so the page works at any depth. Needs `cwebp` and `sips` (macOS).
Pages linked from it (./places, ./gallery, cities) are NOT copied: their links are removed.
Display widths of the images come from tools/widths_<folder>.json when it exists.
"""
import html as htmllib, json, os, re, subprocess, sys, tempfile, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import static_html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEDIA, FONTS = os.path.join(ROOT, "_ext/media"), os.path.join(ROOT, "_ext/fonts")
UA = {"User-Agent": "Mozilla/5.0"}
url, out = sys.argv[1], sys.argv[2]
depth = out.count("/")
src = urllib.request.urlopen(urllib.request.Request(url, headers=UA)).read().decode()
os.makedirs(MEDIA, exist_ok=True); os.makedirs(FONTS, exist_ok=True)


def get(u, dest):
    if not os.path.exists(dest):
        with urllib.request.urlopen(urllib.request.Request(u, headers=UA)) as r, open(dest, "wb") as f:
            f.write(r.read())
    return dest


# ---- fonts: keep only the faces the page uses (Framer lists every Inter weight/style/subset)
def keep_face(face):
    fam = re.search(r"font-family:\s*[\"']?([^;\"']+)", face).group(1)
    if fam.startswith("Inter Display") or fam.startswith("Inter Variable"):
        return False
    if fam == "Inter":
        w = re.search(r"font-weight:\s*(\d+)", face); st = re.search(r"font-style:\s*(\w+)", face)
        return bool(w) and w.group(1) in ("400", "500") and (not st or st.group(1) == "normal")
    return True
for face in re.findall(r"@font-face\s*\{[^}]*\}", src):
    if not keep_face(face):
        src = src.replace(face, "")

# ---- display width per image id (sizes= x2); posters etc. fall back to their ?width=
need = {}
def want(i, w): need[i] = max(need.get(i, 0), w)
IMG = re.compile(r"https://framerusercontent\.com/images/([A-Za-z0-9]+)\.(png|jpg|jpeg|webp)(\?[^\"'\s)<>]*)?")
for tag in re.findall(r"<img\b[^>]*>", src):
    m = re.search(r'\bsizes="([^"]*)"', tag); s = re.search(r'src="([^"]*)"', tag)
    if s and m and IMG.search(s.group(1)):
        px = [float(x) for x in re.findall(r"([\d.]+)px", re.sub(r"calc\([^)]*\)", "1360px", m.group(1)))]
        want(IMG.search(s.group(1)).group(1), int(max(px) * 2) if px else 0)
for m in IMG.finditer(src):
    w = re.search(r"[?&]width=(\d+)", htmllib.unescape(m.group(3) or ""))
    if not need.get(m.group(1)):
        want(m.group(1), int(w.group(1)) if w else 2048)
# measured display widths (px at a 1440px viewport), when a widths_<folder>.json sits next to this script
_wf = os.path.join(os.path.dirname(os.path.abspath(__file__)), "widths_%s.json" % out.split("/")[0])
if os.path.exists(_wf):
    for _i, _w in json.load(open(_wf)).items():
        need[_i] = max(_w * 2, 160)


def local_image(i, ext):
    name = f"{i}.webp"; dest = os.path.join(MEDIA, name)
    if not os.path.exists(dest):
        with tempfile.TemporaryDirectory() as t:
            orig = get(f"https://framerusercontent.com/images/{i}.{ext}", os.path.join(t, f"o.{ext}"))
            ow = int(re.search(r"pixelWidth: (\d+)", subprocess.run(["sips", "-g", "pixelWidth", orig], capture_output=True, text=True).stdout).group(1))
            w = min(ow, need.get(i) or ow, 2880)
            cmd = ["cwebp", "-quiet", "-q", "85", orig, "-o", dest]
            if w < ow: cmd[4:4] = ["-resize", str(w), "0"]
            subprocess.run(cmd, check=True)
    return "/_ext/media/" + name

# the diorama list loads 12 cards at a time on the original; the rest are added by assets/<page>.js, so fetch their pictures
_cf = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cities_%s.json" % out.split("/")[0])
if os.path.exists(_cf):
    for _c in json.load(open(_cf)):
        need[_c["image"]] = 832
        local_image(_c["image"], _c["ext"])

src = re.sub(r'\s(?:srcset|sizes)="[^"]*"', "", src)
for u in sorted(set(re.findall(r"https://framerusercontent\.com/images/[A-Za-z0-9]+\.svg", src))):  # vector images stay as they are
    get(u, os.path.join(MEDIA, os.path.basename(u))); src = src.replace(u, "/_ext/media/" + os.path.basename(u))
src = IMG.sub(lambda m: local_image(m.group(1), m.group(2)), src)

for u in sorted(set(re.findall(r"https://framerusercontent\.com/assets/[A-Za-z0-9]+\.(?:webm|mp4|jpg|jpeg|png|woff2|otf|ttf)", src))):
    ext = u.rsplit(".", 1)[1]; name = os.path.basename(u)
    if ext in ("woff2", "otf", "ttf"):
        get(u, os.path.join(FONTS, name)); new = "/_ext/fonts/" + name
    elif ext in ("jpg", "jpeg", "png"):
        new = local_image(name.split(".")[0], ext)
    else:
        get(u, os.path.join(MEDIA, name)); new = "/_ext/media/" + name
    src = src.replace(u, new)
for u in set(re.findall(r"https://(?:fonts\.gstatic\.com/s|app\.framerstatic\.com)/[^)\"']+\.woff2", src)):
    name = os.path.basename(u); get(u, os.path.join(FONTS, name)); src = src.replace(u, "/_ext/fonts/" + name)

# ---- the page's own address
slug = "/" + out.rsplit("/", 1)[0] + "/" if "/" in out else "/"
src = re.sub(r"https?://(?:www\.)?" + re.escape(re.match(r"https?://([^/]+)", url).group(1)) + "/?", "https://zoobko.com" + slug, src)

# ---- links to pages that are not part of this copy: cards and photo tiles lose their link, nav / footer /
#      button entries go
INTERNAL = r'href="\./[^"/]+"'
def unlink_tile(m):  # an anchor that wraps pictures or a slideshow keeps its content but not its link
    return re.sub(r"\s" + INTERNAL, "", m.group(1), count=1) + m.group(2) + "</a>"
src = re.sub(r"(<a\b[^>]*" + INTERNAL + r"[^>]*>)((?:(?!</a>).)*?(?:<img\b|<ul\b)(?:(?!</a>).)*?)</a>", unlink_tile, src, flags=re.S)
src = re.sub(r'(<a\b[^>]*data-framer-name="City"[^>]*?)\s' + INTERNAL, r"\1", src)
src = re.sub(r'<div\b[^>]*data-framer-component-type="RichTextContainer"[^>]*>(?:(?!<div).)*?<a\b[^>]*' + INTERNAL + r"[^>]*>.*?</a>(?:(?!<div).)*?</div>", "", src, flags=re.S)
src = re.sub(r"<a\b[^>]*" + INTERNAL + r"[^>]*>.*?</a>", "", src, flags=re.S)
# the "Галерея" label that sat on the photo tile pointed to the gallery page
src = re.sub(r'<div class="framer-740nkz"[^>]*>(?:(?!<div).)*?</div>', "", src, flags=re.S)
# the Instagram icon is drawn client-side by Framer, so the export has an empty box
src = src.replace('class="framer-ahaswh-container"><div style="display:contents"></div>',
                  'class="framer-ahaswh-container"><div style="display:contents">' + static_html.INSTAGRAM + "</div>")

page = out.split("/")[0] if depth else "site"
assets = (("assets/%s.css" % page, '<link rel="stylesheet" href="assets/%s.css">' % page),
          ("assets/%s.js" % page, '<script defer src="assets/%s.js"></script>' % page))
html = static_html.strip(src, prefix="../" * depth, assets=assets)
open(os.path.join(ROOT, out), "w").write(html)
print("wrote", out, len(html), "bytes;", len(need), "images")
