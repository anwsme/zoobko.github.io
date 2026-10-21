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
  // Four square cards lie one below the other. While the block scrolls past, the cards slide down onto the
  // last one. Everything is measured in card heights (H), so it behaves the same at any screen size:
  // per card [translateY from, to (in H), opacity from, to]; the effect starts when the block's top is H above
  // the bottom edge of the screen and lasts H of scrolling.
  var CARDS = [
    ["#bottom-3", 0.5, 1, 1, 1],
    ["#bottom-2", 0, 0.5, 0.25, 1],
    ["#bottom-2-5", 0, 0.2425, 1, 1],
    [".framer-1e2yp86", 0, 0, 0, 1]
  ];
  function initCards() {
    var cards = CARDS.map(function (c) {
      return { el: all(c[0]).filter(visible)[0], c: c };
    }).filter(function (x) { return x.el; });
    if (cards.length < CARDS.length) return;
    var block = cards[0].el.parentElement; // the "Animation" block the cards sit in
    var ticking = false;
    function update() {
      ticking = false;
      var H = cards[1].el.offsetHeight || 800;
      var top = block.getBoundingClientRect().top;
      var p = reduce ? 1 : Math.min(Math.max((Math.max(window.innerHeight - H, 0) - top) / H, 0), 1);
      cards.forEach(function (x) {
        var c = x.c, ty = (c[1] + (c[2] - c[1]) * p) * H, op = c[3] + (c[4] - c[3]) * p;
        x.el.style.transform = "perspective(1200px)" + (ty ? " translateY(" + ty + "px)" : "");
        x.el.style.opacity = String(op);
      });
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

  // ---------------------------------------------------------------- list of dioramas
  // Each breakpoint's markup holds the first 12 / 8 / 5 cards. "Показати більше" adds that many more until all
  // 50 are shown. [name, picture id in _ext/media, optional note shown on the card]
  var CITIES = [["Авдіївка","TnyMH0GLuUYRZyJK7fezGh6siys"],["Бахмут","lV1UNREmT6xbDtnwM7BQHM62irU"],["Бердянськ","jzgG7VjDhf8QuZQzU6QKvE5Yn0"],["Бородянка","C3oCEmbXjr769gRh2jj3XD2AdOo"],["Буча","OuITkYzC5dpYD5Rvtu4jwRcM8A"],["Вінниця","M2TftvkNrCVHSKaLFdLwGeaDR8"],["Волноваха","emtBlHi2bSCw51Nmi3xjY8VqpSs"],["Вугледар","ptEtEMXUGJgyofsuGOFg1cJXwPo"],["Дніпро","yOS9q1A5dVhFWzdL4YywFs8Lfg"],["Енергодар","olBlJtIcOei5lzdV3TaDdlRzxo"],["Запоріжжя","EiT39xkzHPuFeoIGjx5ck17yF1g"],["Острів Зміїний","Z4kMuQoD2vTIz0QPUsM0N1LlY"],["Іванків","ElZSFRWm54bOAtpp5zDjNC8","Виправляємо помилку"],["Ізюм","tJOSh44BuKbv0EVmTvT3DuUmYn0"],["Ірпінь","zKB7rdasmrgz2e8BviK83WWwNTU"],["Київ","6BBgDXuSqA8bt5nqsQ5ApqQ9uw"],["Краматорськ","YkodcIv6SPhKLFYBAAzBIHQoA"],["Кременчук","WAblCylEzo4nCc0jN3KJ1Yuks"],["Кремінна","32VP5AM3RcCb41ADNoEq7SWds4"],["Кривий Ріг","J4RZP5tM2pcKMhg00t9JJPtvFY"],["Куп'янськ","pmIH1Ye5k7wELVJb9n4DDhB8UE"],["Лиман","GgbJb6qa2JsYum9ODcvl8a9FJHQ"],["Лисичанськ","tbfV2N6K2BBZp4ggqXU99dobD6A"],["Макарів","GMktGhRTwuTM7iGUZ54s7PJ21o"],["Маріуполь","irvmLmfDYZRSycIekHkKrgVjWw"],["Мар'їнка","jkooU1tPDHZl9sgs44o75PlcM"],["Мелітополь","uTGUOkaPSRmjIKDWdQ2AQp366M"],["Миколаїв","9Tey9tyWq0JTyFRE4BYXi1EYk"],["Мрія","Mje0UrBLfMA5lzCak679fEXDw"],["Нікополь","e275GiV2p3KuramIYKY8DYZlRqo"],["Нова Каховка","mCv052XYpcL5Ug6ySDwXrrvSQFI"],["Охтирка","S5LxIY3NhwiuQVzD9rId5lIqvIU"],["Павлоград","RGxGvXlhEZQw9PoYc8fBYhoayI"],["Пологи","0Wnkkx7N6gRbfhMCnpqvaS4v28"],["Попасна","a4yWfnme1pkhpPYz2S6RadSC6E"],["Рубіжне","dXq3WPJklwxpoYkPYceg7taSrQI"],["Сватове","MeqT80BiwuFsWv9aaKB6fcxA"],["Северодонецьк","3ZUCtKkYEjjgRFVdhaFHlt3ZdM"],["Соледар","Q858KlOVgDNQJpdioC0LlTR0wY"],["Суми","JfjrkzV36R7pAo6Y7RBbqVTAac"],["Тростянець","BpAwtRjc49xQh9D7iYOnuna4qnI"],["Токмак","otuMmarVsfJljKiHpvfF7zIyo"],["Харків","zBRzbFxFqgvyvASR9mj46oRgiag"],["Херсон","TAuwNFdpd41zs3Rm33Wr263f1w"],["Чернігів","oQo1UIEAFVS85Hdl5s4oqDG3hXc"],["Чугуїв","lqKe4mcCzC7rNtbHBoYTYc2esj0"],["Щастя","dLbgOzkkSmdkOUmIywsRtmSScY"],["Донецьк","bDHD1ZDqipCtf4b4fRwfYAYcfgM"],["Луганськ","a4S7VgkATk4QRz0n1MbHk4hUWI"],["Крим","IQTeaRH3kHjBQMVRWGcRquYs"]];
  function initCities() {
    all("main").forEach(function (main) {
      all(":scope > .ssr-variant", main).forEach(function (variant) {
        var wraps = all(":scope > *", variant).filter(function (w) { return w.querySelector('[data-framer-name="City"]'); });
        if (!wraps.length) return;
        var button = all("h5", variant).filter(function (h) { return /Показати більше/.test(h.textContent); })[0];
        var more = button; // the row with the placeholder frames and the button
        while (more && more.parentElement !== variant) more = more.parentElement;
        var step = wraps.length, extra = [], shown = 0;
        var sample = wraps[0].querySelector("img");
        var dir = sample.getAttribute("src").replace(/[^\/]*$/, "");
        CITIES.slice(step).forEach(function (c) {
          var w = wraps[0].cloneNode(true);
          w.hidden = true;
          var imgs = all("img", w);
          imgs[0].src = dir + c[1] + ".webp";
          imgs[0].loading = "lazy";
          imgs[0].alt = c[0];
          all("p", w).forEach(function (p) { if (p.textContent.trim() === CITIES[0][0]) p.textContent = c[0]; });
          var note = w.querySelector(".framer-1o8ve22 p");
          if (note) note.textContent = c[2] || "";
          variant.insertBefore(w, more || null);
          extra.push(w);
        });
        if (!button || !more) return;
        var trigger = button.closest("[data-highlight]") || button;
        trigger.setAttribute("role", "button");
        trigger.setAttribute("tabindex", "0");
        trigger.style.cursor = "pointer";
        function reveal() {
          extra.slice(shown, shown + step).forEach(function (w, i) {
            w.hidden = false;
            if (!reduce && w.animate) w.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: i * 40, easing: "ease-out", fill: "backwards" });
          });
          shown += step;
          if (shown >= extra.length) more.remove();
        }
        trigger.addEventListener("click", reveal);
        trigger.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); reveal(); } });
      });
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
    initCities();
    initTrailer();
    initVideos();
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init);
  else init();
})();
