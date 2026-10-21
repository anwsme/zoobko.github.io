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
  // The element itself is moved out of place (and sometimes clipped by its container) until it is revealed, so
  // the watcher sits on the nearest ancestor that has a box of its own and is never moved.
  function initReveal() {
    var targets = all('[style*="will-change"]').filter(function (el) {
      return /(^|;)\s*opacity:\s*0\s*(;|$)/.test(el.getAttribute("style") || "");
    });
    if (!targets.length) return;
    if (reduce || !("IntersectionObserver" in window)) { targets.forEach(show); return; }
    var groups = new Map();
    targets.forEach(function (el) {
      var anchor = el.parentElement;
      while (anchor && anchor !== doc.body && !anchor.getClientRects().length) anchor = anchor.parentElement;
      if (!groups.has(anchor)) groups.set(anchor, []);
      groups.get(anchor).push(el);
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        groups.get(e.target).forEach(function (el) {
          el.style.transition = "opacity .8s cubic-bezier(.2,.9,.25,1), transform .8s cubic-bezier(.2,.9,.25,1)";
          show(el);
        });
      });
    }, { threshold: 0.1 });
    groups.forEach(function (els, anchor) { io.observe(anchor); });
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

  // ---------------------------------------------------------------- project popups (YouTube players)
  // The cards without a link open their video in a popup, as on the original site: dark backdrop, 16:9 player
  // with rounded corners, closed by a click on the backdrop or Escape.
  var VIDEOS = {
    "Fluix 3.0 B2B Commercial": "QF1y-u4yLnA",
    "Melon Commercial": "E4Q9bluxp2o",
    "The Voice of the Country": "K5Knev2PZ6g",
    "Cannabis Loyalty Program for Dispensary": "4KCFeN84elc",
    "Leopold Museum Vienna": "urTRmZ8BKi0",
    "YaYo Commercial": "slvxIDbZYU4",
    "Cook like a chief!": "FOnH_ibCE34",
    "WAVES": "xqtBQwIpwVc"
  };
  function initPopups() {
    var layer = null;
    function close() {
      if (!layer) return;
      layer.remove(); layer = null;
      doc.removeEventListener("keydown", onKey);
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    function open(id, title) {
      close();
      layer = doc.createElement("div");
      layer.className = "site-popup";
      layer.innerHTML = '<div class="site-popup__box"><iframe title="' + title.replace(/"/g, "") + '" allow="presentation; fullscreen; ' +
        'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen src="https://www.youtube.com/embed/' + id +
        '?iv_load_policy=3&rel=0&modestbranding=1&playsinline=1&autoplay=1&color=white"></iframe></div>';
      layer.addEventListener("click", close);
      doc.body.appendChild(layer);
      doc.addEventListener("keydown", onKey);
    }
    all("a.framer-MNDWa").forEach(function (card) {
      if (card.getAttribute("href")) return;
      var title = "";
      all("p", card).some(function (p) { var t = p.textContent.trim(); if (VIDEOS[t]) { title = t; return true; } return false; });
      if (!title) return;
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.style.cursor = "pointer";
      card.addEventListener("click", function (e) { e.preventDefault(); open(VIDEOS[title], title); });
      card.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(VIDEOS[title], title); } });
    });
  }

  // ---------------------------------------------------------------- collapsing menu bar
  // Scrolling down folds the top bar up into a thin black strip as tall as the page's side padding; scrolling up,
  // reaching the top, hovering the strip or tabbing into the menu unfolds it again.
  function initMenuBar() {
    var bar = doc.querySelector(".framer-nps7m0");
    if (!bar) return;
    var frame = all(".framer-12yubsj").filter(function (e) { return e.getClientRects().length; })[0];
    var last = window.scrollY, collapsed = false, ticking = false;
    function strip() { // the strip is as tall as the left padding of the page
      var left = frame ? frame.getBoundingClientRect().left : 16;
      bar.style.setProperty("--menu-strip", Math.max(Math.round(left), 8) + "px");
      if (!collapsed) {                       // normal height of the bar (it differs between screen sizes)
        bar.style.removeProperty("--menu-full");
        var inner = all("*", bar).filter(function (e) { return e.getClientRects().length && e.getBoundingClientRect().height > 20; })[0];
        var full = inner ? inner.getBoundingClientRect().height : 0;
        if (full) bar.style.setProperty("--menu-full", Math.round(full) + "px");
      }
    }
    function set(on) {
      if (on === collapsed) return;
      collapsed = on;
      bar.classList.toggle("is-collapsed", on);
    }
    function update() {
      ticking = false;
      var y = window.scrollY, dy = y - last;
      if (y < 80) set(false);
      else if (dy > 4) set(true);
      else if (dy < -4) set(false);
      if (Math.abs(dy) > 4) last = y;
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", strip);
    bar.addEventListener("focusin", function () { set(false); });
    strip();
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
  // Mouse: follows the pointer and replaces the system cursor. Touch: appears where you tap and fades out.
  // Both: the ring squeezes while the button / finger is down.
  function initCursor() {
    var el = doc.createElement("div");
    el.className = "site-cursor";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = '<div class="site-cursor__body">' +
      '<i class="site-cursor__tick" style="left:30px;top:0;width:4px;height:11px"></i>' +
      '<i class="site-cursor__tick" style="left:30px;bottom:0;width:4px;height:11px"></i>' +
      '<i class="site-cursor__tick" style="top:30px;left:0;width:11px;height:4px"></i>' +
      '<i class="site-cursor__tick" style="top:30px;right:0;width:11px;height:4px"></i>' +
      '<i class="site-cursor__dot"></i></div>' +
      '<img class="site-cursor__bullet" src="_ext/media/bullet.webp" alt="" width="100" height="100">';
    doc.body.appendChild(el);
    var root = doc.documentElement, x = 0, y = 0, queued = false, hideTimer = 0;
    function paint() { queued = false; el.style.transform = "translate(" + (x - 32) + "px," + (y - 32) + "px)"; }
    function move(e) {
      x = e.clientX; y = e.clientY;
      if (!queued) { queued = true; requestAnimationFrame(paint); }
    }
    doc.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      move(e);
      el.classList.add("is-on");
      root.classList.add("site-cursor-on"); // hides the system cursor only while the crosshair is shown
    }, { passive: true });
    // the bullet hole stays where you pressed for 3 s, then fades out over 2 s
    function leaveHole(e) {
      var hole = doc.createElement("img");
      hole.className = "site-hole";
      hole.src = "_ext/media/bullet.webp";
      hole.alt = "";
      hole.setAttribute("aria-hidden", "true");
      hole.style.left = (e.clientX + window.scrollX - 50) + "px";
      hole.style.top = (e.clientY + window.scrollY - 50) + "px";
      doc.body.appendChild(hole);
      setTimeout(function () {
        hole.classList.add("is-fading");
        setTimeout(function () { hole.remove(); }, 2000);
      }, 3000);
    }
    doc.addEventListener("pointerdown", function (e) {
      clearTimeout(hideTimer);
      move(e);
      if (!reduce) leaveHole(e);
      el.classList.add("is-down");
      if (e.pointerType === "touch") { el.classList.add("is-on", "is-touch"); paint(); }
    }, { passive: true });
    function up(e) {
      el.classList.remove("is-down");
      if (e.pointerType === "touch") {
        hideTimer = setTimeout(function () { el.classList.remove("is-on", "is-touch"); }, 350);
      }
    }
    doc.addEventListener("pointerup", up, { passive: true });
    doc.addEventListener("pointercancel", up, { passive: true });
    root.addEventListener("pointerleave", function () { el.classList.remove("is-on"); root.classList.remove("site-cursor-on"); });
  }

  // ---------------------------------------------------------------- particle overlay (About section)
  // The dark particle video was blended over the page with mix-blend-mode on a <video>. Some browsers
  // (Safari, some GPUs) ignore blend modes on video and paint it as an opaque black box that hides the
  // photos. So the frames are drawn onto a canvas with brightness turned into transparency: black is
  // see-through, the specks stay, in every browser.
  function initParticles() {
    all(".framer-p0hayn-container video").forEach(function (video) {
      if (!video.getClientRects().length || reduce) return;
      var box = video.parentElement;
      var canvas = doc.createElement("canvas");
      var W = 480, H = 270;
      canvas.width = W; canvas.height = H;
      canvas.className = "site-particles";
      canvas.setAttribute("aria-hidden", "true");
      var ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      box.appendChild(canvas);
      video.style.opacity = "0";
      var running = false;
      function frame() {
        if (!running) return;
        if (video.readyState >= 2) {
          ctx.drawImage(video, 0, 0, W, H);
          var img = ctx.getImageData(0, 0, W, H), d = img.data;
          for (var i = 0; i < d.length; i += 4) {
            var l = (d[i] + d[i + 1] + d[i + 2]) / 3;
            d[i] = d[i + 1] = d[i + 2] = 255;
            d[i + 3] = l;
          }
          ctx.putImageData(img, 0, 0);
        }
        requestAnimationFrame(frame);
      }
      if (!("IntersectionObserver" in window)) return;
      new IntersectionObserver(function (entries) {
        var on = entries[0].isIntersecting;
        if (on && !running) { running = true; requestAnimationFrame(frame); }
        else if (!on) running = false;
      }).observe(box);
    });
  }

  // footer year: always the current year (the HTML carries a static fallback)
  function initYear() {
    var y = String(new Date().getFullYear());
    all("[data-year]").forEach(function (el) { el.textContent = y; });
  }

  function init() {
    initYear();
    initParticles();
    initCursor();
    initShowreel();
    initMenuBar();
    initPopups();
    initAppear();
    initParallax();
    initReveal();
    initVideos();
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init);
  else init();
})();
