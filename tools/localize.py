#!/usr/bin/env python3
"""One-off: turn the live Framer export of zoobko.com into a static, framework-free index.html.

    python3 tools/localize.py [page.html]

Downloads fonts to _ext/fonts, images (converted to WebP, downscaled to display size x2) and videos to
_ext/media, rewrites the URLs, and strips the Framer runtime. Needs `cwebp`.
"""
import hashlib, html as htmllib, os, re, subprocess, sys, tempfile, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEDIA, FONTS = os.path.join(ROOT, "_ext/media"), os.path.join(ROOT, "_ext/fonts")
UA = {"User-Agent": "Mozilla/5.0"}
src = open(sys.argv[1]).read() if len(sys.argv) > 1 else urllib.request.urlopen(
    urllib.request.Request("https://www.zoobko.com/", headers=UA)).read().decode()


def get(url, dest):
    if not os.path.exists(dest):
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA)) as r, open(dest, "wb") as f:
            f.write(r.read())
    return dest


# ---- display width per image id (from sizes=, x2), and from ?width= for posters
need = {}
def want(i, w): need[i] = max(need.get(i, 0), w)
IMG = re.compile(r"https://framerusercontent\.com/images/([A-Za-z0-9]+)\.(png|jpg|jpeg|webp)(\?[^\"'\s)<>]*)?")
for tag in re.findall(r"<img\b[^>]*>", src):
    m = re.search(r'\bsizes="([^"]*)"', tag)
    s = re.search(r'src="([^"]*)"', tag)
    if not s: continue
    i = IMG.search(s.group(1)).group(1)
    if m:
        px = [float(x) for x in re.findall(r"([\d.]+)px", m.group(1).replace("calc(min(100vw - 32px, 1440px) - 80px)", "1360px"))]
        want(i, int(max(px) * 2) if px else 0)
for m in IMG.finditer(src):
    q = htmllib.unescape(m.group(3) or "")
    w = re.search(r"[?&]width=(\d+)", q)
    if m.group(1) not in need or not need[m.group(1)]:
        want(m.group(1), int(w.group(1)) if w else 2048)

repl = {}
def local_image(i, ext):
    name = f"{i}.webp"
    dest = os.path.join(MEDIA, name)
    if not os.path.exists(dest):
        with tempfile.TemporaryDirectory() as t:
            orig = get(f"https://framerusercontent.com/images/{i}.{ext}", os.path.join(t, f"o.{ext}"))
            dims = subprocess.run(["sips", "-g", "pixelWidth", orig], capture_output=True, text=True).stdout
            ow = int(re.search(r"pixelWidth: (\d+)", dims).group(1))
            w = min(ow, need.get(i) or ow, 2880)
            cmd = ["cwebp", "-quiet", "-q", "85", orig, "-o", dest]
            if w < ow: cmd[4:4] = ["-resize", str(w), "0"]
            subprocess.run(cmd, check=True)
    return "/_ext/media/" + name

# ---- images: collapse every variant of an id to one file; drop srcset/sizes
def img_sub(m):
    return local_image(m.group(1), m.group(2))
src = re.sub(r'\s(?:srcset|sizes)="[^"]*"', "", src)
src = IMG.sub(img_sub, src)

# ---- videos and other assets
for u in sorted(set(re.findall(r"https://framerusercontent\.com/assets/[A-Za-z0-9]+\.(?:webm|mp4|jpg|png|woff2)", src))):
    ext = u.rsplit(".", 1)[1]
    name = os.path.basename(u)
    if ext == "woff2":
        get(u, os.path.join(FONTS, name)); new = "/_ext/fonts/" + name
    elif ext in ("jpg", "png"):
        new = local_image(name.split(".")[0], ext)
    else:
        get(u, os.path.join(MEDIA, name)); new = "/_ext/media/" + name
    src = src.replace(u, new)
for u in set(re.findall(r"https://fonts\.gstatic\.com/s/[^)\"']+\.woff2", src)):
    name = os.path.basename(u)
    get(u, os.path.join(FONTS, name)); src = src.replace(u, "/_ext/fonts/" + name)

for u in set(re.findall(r"https://i\.ytimg\.com/[^)\"']+", src)):  # YouTube poster
    name = "youtube-" + u.split("/vi_webp/")[1].split("/")[0] + ".webp"
    get(u, os.path.join(MEDIA, name)); src = src.replace(u, "/_ext/media/" + name)

open(os.path.join(ROOT, "index.raw.html"), "w").write(src)
print("images", len(need), "ok")
