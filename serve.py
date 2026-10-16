#!/usr/bin/env python3
"""Local preview server: python3 serve.py [port]   (http://localhost:8000)

Serves clean URLs (/about -> about.html), like GitHub Pages does.
Only listens on this computer and never serves dotfiles or this script.
"""
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
REWRITES = {}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def translate_path(self, path):
        rel = path.split("?", 1)[0].strip("/")
        if rel in REWRITES:
            return os.path.join(ROOT, REWRITES[rel])
        p = super().translate_path(path)
        if (not os.path.exists(p) or os.path.isdir(p)) and os.path.isfile(p.rstrip("/") + ".html"):
            return p.rstrip("/") + ".html"
        return p

    def send_head(self):
        parts = [x for x in self.path.split("?", 1)[0].split("/") if x]
        if any(x.startswith(".") for x in parts) or "serve.py" in parts:
            self.send_error(404)
            return None
        return super().send_head()

    def list_directory(self, path):
        self.send_error(404)
        return None


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 128


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
print(f"Serving on http://localhost:{port}/")
Server(("127.0.0.1", port), Handler).serve_forever()
