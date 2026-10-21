/*
 * Behaviour of /geishanft/ without WordPress, Semplice, jQuery or GSAP. The page is the static output of a
 * Semplice site (tools/localize_wp.py); this file restores what its scripts did:
 *   text sizes per breakpoint, full-height cover with parallax and mouse tilt, transparent navbar over the
 *   cover, overlay menu, back-to-top button, and the scroll reveals (data in geishanft-motion.js).
 */
(function () {
  "use strict";

  var doc = document, win = window, body = doc.body;
  var all = function (sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); };
  var one = function (sel, root) { return (root || doc).querySelector(sel); };
  var clamp = function (v, a, b) { return Math.min(Math.max(v, a), b); };
  var reduce = win.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------------- breakpoints and text sizes
  var BREAKPOINTS = {
    xl: "(min-width: 1170px)",
    lg: "(min-width: 992px) and (max-width: 1169.9px)",
    md: "(min-width: 768px) and (max-width: 991.9px)",
    sm: "(min-width: 544px) and (max-width: 767.9px)",
    xs: "(max-width: 543.9px)"
  };
  function applyTextSizes(bp) {
    var props = ["font-size", "line-height", "letter-spacing"];
    all('#content-holder [data-module="text"] .is-content *').forEach(function (el) {
      props.forEach(function (p) {
        var v = el.getAttribute("data-" + p + "-" + bp);
        if (v === null) v = el.getAttribute("data-" + p + "-xl");
        el.style.setProperty(p, v === null ? "" : v);
      });
    });
  }
  function initBreakpoints() {
    Object.keys(BREAKPOINTS).forEach(function (bp) {
      var mq = win.matchMedia(BREAKPOINTS[bp]);
      function on() { if (mq.matches) { body.setAttribute("data-breakpoint-js", bp); applyTextSizes(bp); } }
      on();
      if (mq.addEventListener) mq.addEventListener("change", on); else mq.addListener(on);
    });
  }

  // ---------------------------------------------------------------- cover
  var navbar = one(".semplice-navbar"), cover = one(".semplice-cover");
  function sizeCover() { if (cover) cover.style.height = win.innerHeight + "px"; }
  function initCover() {
    if (!cover) return;
    sizeCover();
    win.addEventListener("resize", sizeCover);
    var image = one(".cover-image", cover);
    var tiltX = 0, tiltY = 0;
    function paint() {
      if (!image) return;
      var y = reduce ? 0 : win.scrollY / 3;
      image.style.transform = "translate3d(0px," + y + "px,0px)" + (tiltX || tiltY ? " perspective(2000px) rotateX(" + tiltX + "deg) rotateY(" + tiltY + "deg)" : "");
    }
    if (image && !reduce && win.matchMedia("(hover: hover) and (pointer: fine)").matches && cover.getAttribute("data-cover-mousemove") === "tilt") {
      var settings = {};
      try { settings = JSON.parse(one(".semplice-cover-inner", cover).getAttribute("data-effect-settings") || "{}"); } catch (e) {}
      var max = Math.min(parseFloat(settings.tilt_max) || 10, 40) / 4; // the original tilts slowly; keep it gentle
      image.style.transition = "transform .4s ease-out";
      cover.addEventListener("mousemove", function (e) {
        var r = cover.getBoundingClientRect();
        tiltY = ((e.clientX - r.left) / r.width - 0.5) * 2 * max;
        tiltX = -((e.clientY - r.top) / r.height - 0.5) * 2 * max;
        paint();
      });
      cover.addEventListener("mouseleave", function () { tiltX = tiltY = 0; paint(); });
    }
    win.addEventListener("scroll", paint, { passive: true });
    paint();
    var down = one(".show-more", cover);
    if (down) {
      down.setAttribute("role", "button"); down.setAttribute("tabindex", "0"); down.style.cursor = "pointer";
      var go = function () {
        var nav = navbar && getComputedStyle(navbar).position !== "absolute" ? navbar.offsetHeight - 1 : 0;
        win.scrollTo({ top: cover.offsetHeight - nav, behavior: reduce ? "auto" : "smooth" });
      };
      down.addEventListener("click", go);
      down.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    }
  }

  // ---------------------------------------------------------------- navbar over the cover, back-to-top
  function initScrollUi() {
    var top = one(".back-to-top");
    var shown = false;
    if (top) {
      top.style.display = "none";
      top.style.transition = "opacity .5s";
      top.style.opacity = "0";
      var link = one("a", top);
      if (link) { link.setAttribute("role", "button"); link.setAttribute("tabindex", "0"); link.setAttribute("aria-label", "Back to top"); link.style.cursor = "pointer";
        var up = function () { win.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); };
        link.addEventListener("click", up);
        link.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); up(); } });
      }
    }
    function update() {
      var y = win.scrollY;
      if (navbar && navbar.getAttribute("data-cover-transparent") === "enabled" && cover) {
        if (y >= cover.offsetHeight - (navbar.offsetHeight + 20)) navbar.classList.remove("cover-transparent");
        else if (y < cover.offsetHeight) navbar.classList.add("cover-transparent");
      }
      if (top) {
        var want = y > 400;
        if (want !== shown) {
          shown = want;
          if (want) { top.style.display = "block"; void top.offsetWidth; top.style.opacity = "1"; }
          else { top.style.opacity = "0"; setTimeout(function () { if (!shown) top.style.display = "none"; }, 500); }
        }
      }
    }
    win.addEventListener("scroll", update, { passive: true });
    win.addEventListener("resize", update);
    update();
  }

  // ---------------------------------------------------------------- overlay menu
  function initMenu() {
    var overlay = one("#overlay-menu"), burger = one(".hamburger .menu-icon, .hamburger a");
    if (!overlay || !burger || !navbar) return;
    var items = all("nav ul li", overlay), open = false, timers = [];
    items.forEach(function (li) { li.style.opacity = "0"; });
    function fade(el, from, to, ms, delay, done) {
      if (!el.animate || reduce) { el.style.opacity = String(to); if (done) done(); return; }
      var a = el.animate([{ opacity: from }, { opacity: to }], { duration: ms, delay: delay || 0, easing: "ease-out", fill: "forwards" });
      setTimeout(function () { a.cancel(); el.style.opacity = String(to); if (done) done(); }, ms + (delay || 0) + 30); // also fires in background tabs
    }
    function show() {
      open = true;
      burger.classList.remove("open-menu"); burger.classList.add("close-menu");
      burger.setAttribute("aria-expanded", "true");
      overlay.style.display = "block"; overlay.style.zIndex = "119";
      body.classList.add("open-menu");
      fade(overlay, 0, 1, 350);
      items.forEach(function (li, i) {
        if (!li.animate || reduce) { li.style.opacity = "1"; return; }
        var a = li.animate([{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 350, delay: 50 + i * 80, easing: "ease-out", fill: "both" });
        setTimeout(function () { a.cancel(); li.style.opacity = open ? "1" : "0"; }, 400 + i * 80 + 50);
      });
    }
    function hide() {
      open = false;
      burger.classList.remove("close-menu"); burger.classList.add("open-menu");
      burger.setAttribute("aria-expanded", "false");
      body.classList.remove("open-menu");
      fade(overlay, 1, 0, 350, 0, function () {
        if (open) return;
        overlay.style.display = ""; overlay.style.zIndex = "";
        items.forEach(function (li) { li.style.opacity = "0"; });
      });
    }
    burger.setAttribute("role", "button"); burger.setAttribute("tabindex", "0"); burger.setAttribute("aria-label", "Menu"); burger.setAttribute("aria-expanded", "false");
    burger.style.cursor = "pointer";
    burger.addEventListener("click", function (e) { e.preventDefault(); open ? hide() : show(); });
    burger.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open ? hide() : show(); } });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && open) hide(); });
    all("a", overlay).forEach(function (a) { a.addEventListener("click", function () { if (open && a.getAttribute("href") === "./") hide(); }); });
  }

  // ---------------------------------------------------------------- scroll reveals
  var EASE = {
    "none": function (t) { return t; },
    "Power1.easeOut": function (t) { return 1 - (1 - t) * (1 - t); },
    "Circ.easeInOut": function (t) { return t < 0.5 ? (1 - Math.sqrt(1 - 4 * t * t)) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2; },
    "Expo.easeInOut": function (t) { return t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2; }
  };
  var num = function (v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; };
  function describe(spec) {
    var s = spec.set || {}, to = spec.to || {};
    var blur = function (f) { var m = /blur\(([\d.]+)px\)/.exec(f || ""); return m ? parseFloat(m[1]) : 0; };
    return {
      ease: EASE[to.ease] || EASE.none, duration: (to.duration || 0.8) * 1000, delay: (to.delay || 0) * 1000,
      op: "opacity" in to ? [0, num(to.opacity, 1)] : null,
      tx: [num(s.translateX, 0), num(to.x, 0)], ty: [num(s.translateY, 0), num(to.y, 0)],
      sx: [num(s.scaleX, 1), num(to.scaleX, num(s.scaleX, 1))], sy: [num(s.scaleY, 1), num(to.scaleY, num(s.scaleY, 1))],
      blur: "filter" in to || "filter" in s ? [blur(s.filter), blur(to.filter)] : null
    };
  }
  function paintMotion(els, d, p) {
    var e = d.ease(clamp(p, 0, 1)), mix = function (a) { return a[0] + (a[1] - a[0]) * e; };
    var tf = "translate(" + mix(d.tx) + "rem," + mix(d.ty) + "rem)" + (d.sx[0] !== d.sx[1] || d.sy[0] !== d.sy[1] ? " scale(" + mix(d.sx) + "," + mix(d.sy) + ")" : "");
    els.forEach(function (el) {
      if (d.op) el.style.opacity = String(mix(d.op));
      el.style.transform = p >= 1 ? "none" : tf;
      if (d.blur) el.style.filter = p >= 1 ? "none" : "blur(" + mix(d.blur) + "px)";
    });
  }
  function parseMark(text) { // "top+=99% bottom": point on the trigger, offset, point on the screen
    var m = /^(top|center|bottom)(?:\+=(-?[\d.]+)%)?\s+(top|center|bottom)$/.exec(text.trim()) || [0, "top", 0, "bottom"];
    return { el: m[1], off: parseFloat(m[2] || 0) / 100, vp: m[3] };
  }
  var FRAC = { top: 0, center: 0.5, bottom: 1 };
  function initMotion() {
    var specs = win.PAGE_MOTION || [];
    var scrubs = [], played = [], observed = new Map();
    specs.forEach(function (spec) {
      var els = all("#content-holder " + spec.t);
      if (!els.length) return;
      var d = describe(spec);
      if (reduce) { paintMotion(els, d, 1); return; }
      if (spec.scrub) {
        var trig = one("#content-holder " + spec.scrub.trigger);
        if (trig) scrubs.push({ els: els, d: d, trig: trig, start: parseMark(spec.scrub.start), end: parseMark(spec.scrub.end) });
        return;
      }
      var tr = one("#content-holder " + spec.trigger) || els[0];
      if (!observed.has(tr)) observed.set(tr, []);
      observed.get(tr).push({ els: els, d: d });
    });
    function play(job) {
      var t0 = null, d = job.d;
      if (doc.hidden) { paintMotion(job.els, d, 1); return; } // background tab: no animation frames, show the end state
      function step(now) {
        if (t0 === null) t0 = now;
        var p = (now - t0 - d.delay) / d.duration;
        if (p < 0) { requestAnimationFrame(step); return; }
        paintMotion(job.els, d, p);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    if ("IntersectionObserver" in win) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          io.unobserve(en.target);
          observed.get(en.target).forEach(play);
        });
      });
      observed.forEach(function (jobs, el) { io.observe(el); });
    } else {
      observed.forEach(function (jobs) { jobs.forEach(function (j) { paintMotion(j.els, j.d, 1); }); });
    }
    var ticking = false;
    function scrub() {
      ticking = false;
      scrubs.forEach(function (s) {
        var r = s.trig.getBoundingClientRect(), top = r.top + win.scrollY, h = r.height, vh = win.innerHeight;
        var a = top + FRAC[s.start.el] * h + s.start.off * h - FRAC[s.start.vp] * vh;
        var b = top + FRAC[s.end.el] * h + s.end.off * h - FRAC[s.end.vp] * vh;
        paintMotion(s.els, s.d, b > a ? (win.scrollY - a) / (b - a) : 1);
      });
    }
    if (scrubs.length) {
      win.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(scrub); } }, { passive: true });
      win.addEventListener("resize", scrub);
      scrub();
    }
  }

  function init() {
    initBreakpoints();
    initCover();
    initScrollUi();
    initMenu();
    initMotion();
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
})();
