/*
 * Site behaviour without any framework. The page is plain HTML + CSS (originally exported from Framer).
 * This file restores the motion: entrance animations, hero parallax, reveal on scroll, video autoplay.
 * Hover states and the blinking label are CSS (assets/site.css).
 */
(function () {
  "use strict";

  var doc = document;
  var all = function (sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------------- entrance animations (hero text)
  // data-framer-appear-id -> [x, y, rotate, delay in seconds] it starts from
  var APPEAR = {
    "6g2vjc": [-50, 0, 0, 0],
    "y841to": [0, 40, 0, 0.5],
    "1itt1tm": [-50, 0, 180, 1],
    "gd702e": [-50, 0, 0, 2],
    "mhip5u": [-50, 0, 0, 2],
    "ijxca2": [0, 50, 0, 2]
  };
  function show(el) { el.style.opacity = "1"; el.style.transform = "none"; }
  function initAppear() {
    all("[data-framer-appear-id]").forEach(function (el) {
      var a = APPEAR[el.getAttribute("data-framer-appear-id")];
      if (!a || reduce || !el.animate) { show(el); return; }
      var from = "translate(" + a[0] + "px," + a[1] + "px) rotate(" + a[2] + "deg)";
      var anim = el.animate(
        [{ opacity: 0.001, transform: from }, { opacity: 1, transform: "none" }],
        { duration: 700, delay: a[3] * 1000, easing: "cubic-bezier(.2,.9,.25,1)", fill: "both" }
      );
      anim.onfinish = function () { show(el); anim.cancel(); };
    });
  }

  // ---------------------------------------------------------------- hero parallax
  // the hero content drifts down at a tenth of the scroll speed (and stops at 637.75px)
  function initParallax() {
    var els = all(".framer-hnokwb");
    if (!els.length || reduce) return;
    var ticking = false;
    function update() {
      ticking = false;
      var y = Math.min(window.scrollY * 0.1, 637.75);
      els.forEach(function (el) { el.style.transform = "translateY(" + y + "px) scale(1.1)"; });
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  // ---------------------------------------------------------------- reveal on scroll (once)
  function initReveal() {
    var targets = all('[style*="will-change"]').filter(function (el) {
      return /(^|;)\s*opacity:\s*0\s*(;|$)/.test(el.getAttribute("style") || "");
    });
    if (!targets.length) return;
    if (reduce || !("IntersectionObserver" in window)) { targets.forEach(show); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        io.unobserve(el);
        el.style.transition = "opacity .8s cubic-bezier(.2,.9,.25,1), transform .8s cubic-bezier(.2,.9,.25,1)";
        show(el);
      });
    }, { threshold: 0.2 });
    targets.forEach(function (el) { io.observe(el); });
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

  // ---------------------------------------------------------------- showreel: the YouTube player loads on click
  function initShowreel() {
    all("article[role='presentation']").forEach(function (box) {
      var frame = box.querySelector("iframe[data-src]");
      if (!frame) return;
      function play() {
        frame.src = frame.getAttribute("data-src") + "&autoplay=1";
        frame.style.display = "block";
        var btn = box.querySelector("button");
        if (btn) btn.remove();
        box.style.cursor = "auto";
        box.removeEventListener("click", play);
      }
      box.addEventListener("click", play);
    });
  }

  // ---------------------------------------------------------------- custom cursor (red crosshair)
  function initCursor() {
    if (!window.matchMedia || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    var el = doc.createElement("div");
    el.className = "site-cursor";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = '<i class="site-cursor__tick" style="left:30px;top:0;width:4px;height:11px"></i>' +
      '<i class="site-cursor__tick" style="left:30px;bottom:0;width:4px;height:11px"></i>' +
      '<i class="site-cursor__tick" style="top:30px;left:0;width:11px;height:4px"></i>' +
      '<i class="site-cursor__tick" style="top:30px;right:0;width:11px;height:4px"></i>' +
      '<i class="site-cursor__dot"></i>';
    doc.body.appendChild(el);
    var x = 0, y = 0, queued = false;
    function paint() { queued = false; el.style.transform = "translate(" + (x - 32) + "px," + (y - 32) + "px)"; }
    doc.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      x = e.clientX; y = e.clientY;
      if (!el.classList.contains("is-on")) { el.classList.add("is-on"); doc.documentElement.classList.add("site-cursor-on"); }
      if (!queued) { queued = true; requestAnimationFrame(paint); }
    }, { passive: true });
    doc.documentElement.addEventListener("pointerleave", function () { el.classList.remove("is-on"); });
    doc.documentElement.addEventListener("pointerenter", function () { el.classList.add("is-on"); });
  }

  function init() {
    initCursor();
    initShowreel();
    initAppear();
    initParallax();
    initReveal();
    initVideos();
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init);
  else init();
})();
