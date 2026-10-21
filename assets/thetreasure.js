/*
 * Behaviour of /thetreasure/ without any framework (the page was exported from Framer). Restores:
 *   the stack of photo cards that collapses while scrolling, the photo slideshow, the trailer lightbox
 *   and video autoplay. The pulsing frames are CSS (assets/thetreasure.css).
 */
(function () {
  "use strict";

  var doc = document;
  var all = function (sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); };
  var visible = function (el) { return el.getClientRects().length > 0; };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------------- stack of photo cards ("Idea" section)
  // Four 800px cards lie one below the other. While the block scrolls past, the cards slide down onto the
  // last one: [translateY from, to, opacity from, to] per card, over 800px of scrolling.
  var CARDS = [
    ["#bottom-3", 400, 800, 1, 1],
    ["#bottom-2", 0, 400, 0.25, 1],
    ["#bottom-2-5", 0, 194, 1, 1],
    [".framer-1e2yp86", 0, 0, 0, 1]
  ];
  function initCards() {
    var cards = CARDS.map(function (c) {
      return { el: all(c[0]).filter(visible)[0], c: c };
    }).filter(function (x) { return x.el; });
    if (cards.length < CARDS.length) return;
    var block = cards[0].el.parentElement; // the "Animation" block the cards sit in
    var ticking = false;
    function apply(p) {
      cards.forEach(function (x) {
        var c = x.c, ty = c[1] + (c[2] - c[1]) * p, op = c[3] + (c[4] - c[3]) * p;
        x.el.style.transform = "perspective(1200px)" + (ty ? " translateY(" + ty + "px)" : "");
        x.el.style.opacity = String(op);
      });
    }
    function update() {
      ticking = false;
      // starts when the block is 800px above the bottom of the viewport, ends 800px of scrolling later
      var top = block.getBoundingClientRect().top;
      var start = Math.max(window.innerHeight - 800, 0);
      apply(reduce ? 1 : Math.min(Math.max((start - top) / 800, 0), 1));
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  // ---------------------------------------------------------------- photo slideshow
  // Five photos (repeated four times in the markup) slide left one at a time, every 1.5s.
  function initSlideshow() {
    all("ul").filter(function (ul) {
      return visible(ul) && /user-select/.test(ul.getAttribute("style") || "") && ul.children.length >= 10;
    }).forEach(function (ul) {
      var items = all(":scope > li", ul);
      var distinct = items.length / 4;           // photos in one set
      var index = 0;
      ul.style.willChange = "transform";
      // the markup keeps the slideshow at opacity .001 until the page script has measured it
      for (var n = ul.parentElement; n && n !== doc.body; n = n.parentElement) {
        if (/opacity:\s*0\.001/.test(n.getAttribute("style") || "")) n.style.opacity = "1";
      }
      // the markup keeps the slideshow at opacity .001 until the page script has measured it
      for (var n = ul.parentElement; n && n !== doc.body; n = n.parentElement) {
        if (/opacity:\s*0\.001/.test(n.getAttribute("style") || "")) n.style.opacity = "1";
      }
      function width() {
        var first = items[0].firstElementChild;
        return first.getBoundingClientRect().width + (parseFloat(getComputedStyle(ul).columnGap) || 0);
      }
      function place(animate) {
        ul.style.transition = animate ? "transform .7s cubic-bezier(.3,.9,.3,1)" : "none";
        ul.style.transform = "translateX(" + -(index + distinct) * width() + "px)";
      }
      place(false);
      if (reduce) return;
      var timer = setInterval(function () {
        if (!visible(ul) || doc.hidden) return;
        index += 1;
        place(true);
        if (index >= distinct) {                // jump back by one set, unseen, once the slide has settled
          setTimeout(function () { index = 0; place(false); }, 750);
        }
      }, 1500);
      window.addEventListener("resize", function () { place(false); });
    });
  }

  // ---------------------------------------------------------------- trailer lightbox
  var TRAILER = "https://www.youtube.com/embed/ByPSi07Lgno?iv_load_policy=3&rel=0&modestbranding=1&playsinline=1&autoplay=1&color=white";
  function initTrailer() {
    var layer;
    function close() {
      if (!layer) return;
      layer.remove(); layer = null;
      doc.removeEventListener("keydown", onKey);
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    function open(e) {
      if (e) e.preventDefault();
      close();
      layer = doc.createElement("div");
      layer.className = "tt-lightbox";
      layer.innerHTML = '<div class="tt-lightbox__box"><iframe title="Трейлер" allow="presentation; fullscreen; ' +
        'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen src="' + TRAILER + '"></iframe></div>';
      layer.addEventListener("click", close);
      doc.body.appendChild(layer);
      doc.addEventListener("keydown", onKey);
    }
    // the "Трейлер" button and the "Дивитись відео" line in the banner
    function bind(el) {
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.style.cursor = "pointer";
      el.addEventListener("click", open);
      el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") open(e); });
    }
    all("a").forEach(function (a) {
      if (!a.getAttribute("href") && (a.textContent || "").trim() === "Трейлер") bind(a);
    });
    all("h1, h2, h3, h4, h5, h6, p, span").forEach(function (t) {
      if (t.children.length === 0 && (t.textContent || "").trim() === "Дивитись відео") bind(t);
    });
  }

  // ---------------------------------------------------------------- videos play while in view
  function initVideos() {
    var vids = all("video");
    if (!vids.length || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          v.muted = true;
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.25 });
    vids.forEach(function (v) { v.muted = true; io.observe(v); });
  }

  // ---------------------------------------------------------------- header glow
  // The lamp logo and the three yellow glows along the top edge fade in once the hero has scrolled away.
  function initHeader() {
    var els = all(".framer-ju0qur").concat(all('[data-framer-name="Shadow"]').filter(function (e) {
      return /radial-gradient/.test(e.getAttribute("style") || "");
    }));
    if (!els.length) return;
    var GLOW = { "framer-cq8puv": 0.1, "framer-q3la88": 0.5, "framer-1rp1flr": 0.1 }; // resting opacities of the glows
    var shown = null;
    function update() {
      var on = window.scrollY > 1040;
      if (on === shown) return;
      shown = on;
      els.forEach(function (e) {
        var rest = 1;
        Object.keys(GLOW).forEach(function (c) { if (e.classList.contains(c)) rest = GLOW[c]; });
        e.style.transition = "opacity .3s";
        e.style.opacity = on ? String(rest) : "0";
      });
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  function init() {
    initHeader();
    initCards();
    initSlideshow();
    initTrailer();
    initVideos();
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init);
  else init();
})();
