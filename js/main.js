/* ============================================================
   SÉASONS — vanilla JS
   Модули: preloader, header, menu, split-text, reveal,
           counters, parallax, marquee, filter, accordion,
           carousel, lightbox
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var clamp = function (v, min, max) { return Math.min(Math.max(v, min), max); };

  /* ---------- rAF scroll bus ---------- */
  var scrollSubs = [];
  var frameSubs = [];
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.pageYOffset;
      for (var i = 0; i < scrollSubs.length; i++) scrollSubs[i](y);
      ticking = false;
    });
  }

  function loop() {
    for (var i = 0; i < frameSubs.length; i++) frameSubs[i]();
    requestAnimationFrame(loop);
  }

  /* ============================================================
     1. PRELOADER
     ============================================================ */
  function initPreloader(done) {
    var el = document.getElementById('preloader');
    if (!el) { done(); return; }

    var hide = function () {
      el.classList.add('preloader--hidden');
      done();
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 900);
    };

    var delay = reduced ? 100 : 1500;

    if (document.readyState === 'complete') {
      setTimeout(hide, delay);
    } else {
      window.addEventListener('load', function () { setTimeout(hide, delay); });
      setTimeout(hide, delay + 2200); // safety net
    }
  }

  /* ============================================================
     2. HEADER — sticky / hide on scroll down / hero state
     ============================================================ */
  function initHeader() {
    var header = document.getElementById('header');
    var hero = document.getElementById('hero');
    if (!header) return;

    var last = window.pageYOffset;

    function update(y) {
      header.classList.toggle('header--solid', y > 40);

      // auto-hide only below hero
      if (y > 400) {
        header.classList.toggle('header--hidden', y > last && y - last > 4);
      } else {
        header.classList.remove('header--hidden');
      }
      last = y;

      if (hero) {
        var limit = hero.offsetHeight - 120;
        header.classList.toggle('header--on-hero', y < limit && !header.classList.contains('header--solid'));
      }
    }

    scrollSubs.push(update);
    update(window.pageYOffset);

    /* dropdown (click for touch devices) */
    var subItems = document.querySelectorAll('.nav__item--has-sub');
    Array.prototype.forEach.call(subItems, function (item) {
      var btn = item.querySelector('.nav__link--sub');
      if (!btn) return;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = item.classList.toggle('nav__item--open');
        btn.setAttribute('aria-expanded', String(open));
      });
    });

    document.addEventListener('click', function () {
      Array.prototype.forEach.call(subItems, function (item) {
        item.classList.remove('nav__item--open');
        var b = item.querySelector('.nav__link--sub');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ============================================================
     3. MOBILE MENU
     ============================================================ */
  function initMenu() {
    var burger = document.getElementById('burger');
    var menu = document.getElementById('menu');
    if (!burger || !menu) return;

    function setState(open) {
      burger.classList.toggle('burger--active', open);
      burger.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('menu--open', open);
      document.body.classList.toggle('page--locked', open);
    }

    burger.addEventListener('click', function () {
      setState(!menu.classList.contains('menu--open'));
    });

    Array.prototype.forEach.call(menu.querySelectorAll('.menu__link'), function (link) {
      link.addEventListener('click', function () { setState(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setState(false);
    });
  }

  /* ============================================================
     4. SPLIT TEXT — hero title per-character
     ============================================================ */
  function initSplit() {
    var nodes = document.querySelectorAll('[data-split]');
    Array.prototype.forEach.call(nodes, function (node) {
      var text = node.textContent.trim();
      node.textContent = '';
      var step = 52;

      text.split('').forEach(function (ch, i) {
        var span = document.createElement('span');
        span.className = 'char';
        span.textContent = ch === ' ' ? '\u00A0' : ch;
        span.style.transitionDelay = (i * step) + 'ms';
        node.appendChild(span);
      });
    });
  }

  function playHero() {
    var title = document.querySelector('.hero__title');
    if (title) title.classList.add('hero__title--in');

    // hero reveals fire immediately after preloader
    var items = document.querySelectorAll('.hero [data-reveal]');
    Array.prototype.forEach.call(items, function (el) {
      var d = parseInt(el.getAttribute('data-reveal-delay') || '0', 10);
      setTimeout(function () { el.classList.add('is-visible'); }, d + 150);
    });
  }

  /* ============================================================
     5. REVEAL ON SCROLL
     ============================================================ */
  function initReveal() {
    var hero = document.getElementById('hero');
    var all = Array.prototype.slice.call(document.querySelectorAll('[data-reveal], .feature, .step'));

    // hero-элементы анимируются отдельно, сразу после прелоадера
    var targets = all.filter(function (el) {
      return !(hero && hero.contains(el));
    });

    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var d = parseInt(el.getAttribute('data-reveal-delay') || '0', 10);
        setTimeout(function () { el.classList.add('is-visible'); }, d);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    targets.forEach(function (el) { io.observe(el); });
  }

  /* ============================================================
     6. COUNTERS
     ============================================================ */
  function initCounters() {
    var nodes = document.querySelectorAll('[data-count]');
    if (!nodes.length) return;

    function run(el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var suffix = el.getAttribute('data-suffix') || '';
      var dur = 1600;
      var start = null;

      function frame(ts) {
        if (start === null) start = ts;
        var p = clamp((ts - start) / dur, 0, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        var value = Math.round(target * eased);
        el.textContent = value.toLocaleString('ru-RU') + suffix;
        if (p < 1) requestAnimationFrame(frame);
      }

      if (reduced) {
        el.textContent = target.toLocaleString('ru-RU') + suffix;
      } else {
        requestAnimationFrame(frame);
      }
    }

    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(nodes, run);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        run(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    Array.prototype.forEach.call(nodes, function (el) { io.observe(el); });
  }

  /* ============================================================
     7. PARALLAX (smoothed)
     ============================================================ */
  function initParallax() {
    if (reduced) return;
    var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
    if (!nodes.length) return;

    var items = nodes.map(function (el) {
      return { el: el, speed: parseFloat(el.getAttribute('data-parallax')) || 0.1, current: 0, target: 0 };
    });

    function measure() {
      var vh = window.innerHeight;
      items.forEach(function (item) {
        var rect = item.el.getBoundingClientRect();
        var center = rect.top + rect.height / 2 - vh / 2;
        item.target = -center * item.speed;
      });
    }

    scrollSubs.push(measure);
    window.addEventListener('resize', measure);
    measure();

    frameSubs.push(function () {
      items.forEach(function (item) {
        item.current = lerp(item.current, item.target, 0.08);
        if (Math.abs(item.target - item.current) < 0.05) item.current = item.target;
        item.el.style.transform = 'translate3d(0,' + item.current.toFixed(2) + 'px,0)';
      });
    });
  }

  /* ============================================================
     8. MARQUEE — seamless loop, reacts to scroll direction
     ============================================================ */
  function initMarquee() {
    var track = document.getElementById('marquee');
    if (!track || reduced) return;

    var original = track.innerHTML;
    track.innerHTML = original + original + original;

    var width = track.scrollWidth / 3;
    var offset = 0;
    var base = 0.45;
    var boost = 0;
    var lastY = window.pageYOffset;

    scrollSubs.push(function (y) {
      boost = clamp((y - lastY) * 0.14, -6, 6);
      lastY = y;
    });

    frameSubs.push(function () {
      boost = lerp(boost, 0, 0.06);
      offset -= base + boost;
      if (offset <= -width) offset += width;
      if (offset > 0) offset -= width;
      track.style.transform = 'translate3d(' + offset.toFixed(2) + 'px,0,0)';
    });

    window.addEventListener('resize', function () {
      width = track.scrollWidth / 3;
    });
  }

  /* ============================================================
     9. CATALOG FILTER + MOBILE LOAD MORE
     ============================================================ */
  function initFilter() {
    var chips   = document.querySelectorAll('.catalog__filter .chip');
    var grid    = document.getElementById('catalogGrid');
    var loadBtn = document.getElementById('catalogLoadMore');
    if (!chips.length || !grid) return;

    var cards   = Array.prototype.slice.call(grid.querySelectorAll('.card'));
    var PER_PAGE = 3;    // показываем по 3 на мобильном
    var shown    = PER_PAGE;
    var isMobile = false;
    var activeFilter = 'all';

    /* определяем мобильный режим по брейкпоинту */
    function checkMobile() {
      isMobile = window.innerWidth <= 640;
    }
    checkMobile();
    window.addEventListener('resize', function () { checkMobile(); applyView(); });

    /* применяем видимость с учётом фильтра и пагинации */
    function applyView() {
      var filtered = cards.filter(function (card) {
        return activeFilter === 'all' || card.getAttribute('data-category') === activeFilter;
      });

      filtered.forEach(function (card, i) {
        card.classList.remove('card--hidden');
        // на мобильном скрываем всё после shown
        if (isMobile && i >= shown) {
          card.classList.add('card--mob-hidden');
        } else {
          card.classList.remove('card--mob-hidden');
        }
      });

      // карточки другой категории скрываем полностью
      cards.forEach(function (card) {
        var match = activeFilter === 'all' || card.getAttribute('data-category') === activeFilter;
        if (!match) {
          card.classList.add('card--hidden');
          card.classList.remove('card--mob-hidden');
        }
      });

      // обновляем кнопку
      if (loadBtn) {
        var hasMore = isMobile && filtered.length > shown;
        loadBtn.classList.toggle('catalog__load-more--hidden', !hasMore);
      }
    }

    /* фильтр */
    Array.prototype.forEach.call(chips, function (chip) {
      chip.addEventListener('click', function () {
        activeFilter = chip.getAttribute('data-filter');
        shown = PER_PAGE; // сбрасываем пагинацию при смене фильтра

        Array.prototype.forEach.call(chips, function (c) { c.classList.remove('chip--active'); });
        chip.classList.add('chip--active');

        // анимация
        cards.forEach(function (card, i) {
          card.style.opacity = '0';
          card.style.transform = 'translateY(14px)';
          card.style.transition = 'opacity .4s, transform .4s';
        });

        setTimeout(function () {
          applyView();
          var visible = cards.filter(function (c) {
            return !c.classList.contains('card--hidden') && !c.classList.contains('card--mob-hidden');
          });
          visible.forEach(function (card, i) {
            setTimeout(function () {
              card.style.opacity = '1';
              card.style.transform = 'none';
            }, i * 50);
          });
        }, 200);
      });
    });

    /* кнопка Ещё */
    if (loadBtn) {
      loadBtn.addEventListener('click', function () {
        shown += PER_PAGE;
        applyView();

        // показываем вновь появившиеся с анимацией
        var newlyVisible = cards.filter(function (card) {
          var match = activeFilter === 'all' || card.getAttribute('data-category') === activeFilter;
          return match && !card.classList.contains('card--mob-hidden');
        });

        newlyVisible.slice(shown - PER_PAGE).forEach(function (card, i) {
          card.style.opacity = '0';
          card.style.transform = 'translateY(20px)';
          setTimeout(function () {
            card.style.opacity = '1';
            card.style.transform = 'none';
          }, i * 70);
        });
      });
    }

    applyView();
  }

  /* ============================================================
     10. ACCORDION
     ============================================================ */
  function initAccordion() {
    var root = document.getElementById('accordion');
    if (!root) return;

    var items = Array.prototype.slice.call(root.querySelectorAll('.accordion__item'));

    function setHeight(item, open) {
      var panel = item.querySelector('.accordion__panel');
      var content = item.querySelector('.accordion__content');
      if (!panel || !content) return;
      panel.style.height = open ? content.offsetHeight + 'px' : '0px';
    }

    items.forEach(function (item) {
      var head = item.querySelector('.accordion__head');
      if (!head) return;

      setHeight(item, item.classList.contains('accordion__item--open'));

      head.addEventListener('click', function () {
        var willOpen = !item.classList.contains('accordion__item--open');

        items.forEach(function (other) {
          other.classList.remove('accordion__item--open');
          var h = other.querySelector('.accordion__head');
          if (h) h.setAttribute('aria-expanded', 'false');
          setHeight(other, false);
        });

        if (willOpen) {
          item.classList.add('accordion__item--open');
          head.setAttribute('aria-expanded', 'true');
          setHeight(item, true);
        }
      });
    });

    window.addEventListener('resize', function () {
      items.forEach(function (item) {
        setHeight(item, item.classList.contains('accordion__item--open'));
      });
    });
  }

  /* ============================================================
     11. CAROUSEL — arrows, drag, progress bar
     ============================================================ */
  function initCarousel() {
    var viewport = document.getElementById('dirViewport');
    var track = document.getElementById('dirTrack');
    var prev = document.getElementById('dirPrev');
    var next = document.getElementById('dirNext');
    var progress = document.getElementById('dirProgress');
    if (!viewport || !track) return;

    function step() {
      var tile = track.querySelector('.tile');
      if (!tile) return 300;
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || '20');
      return tile.offsetWidth + (isNaN(gap) ? 20 : gap);
    }

    function updateUI() {
      var max = viewport.scrollWidth - viewport.clientWidth;
      var ratio = max > 0 ? clamp(viewport.scrollLeft / max, 0, 1) : 0;

      if (progress) {
        // ширина бегунка = доля видимой области, сдвиг = по остатку трека
        var fill = Math.max(12, (viewport.clientWidth / viewport.scrollWidth) * 100);
        progress.style.width = fill + '%';
        progress.style.transform = 'translateX(' + (ratio * (100 - fill) / fill * 100) + '%)';
      }

      if (prev) prev.disabled = viewport.scrollLeft <= 4;
      if (next) next.disabled = viewport.scrollLeft >= max - 4;
    }

    if (prev) prev.addEventListener('click', function () {
      viewport.scrollBy({ left: -step(), behavior: 'smooth' });
    });

    if (next) next.addEventListener('click', function () {
      viewport.scrollBy({ left: step(), behavior: 'smooth' });
    });

    viewport.addEventListener('scroll', function () {
      requestAnimationFrame(updateUI);
    });

    window.addEventListener('resize', updateUI);
    updateUI();

    /* drag to scroll */
    var down = false, startX = 0, startScroll = 0, moved = 0;

    viewport.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;
      down = true;
      moved = 0;
      startX = e.clientX;
      startScroll = viewport.scrollLeft;
      viewport.classList.add('directions__viewport--dragging');
    });

    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      moved = Math.abs(dx);
      viewport.scrollLeft = startScroll - dx;
    });

    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      viewport.classList.remove('directions__viewport--dragging');
    });

    track.addEventListener('click', function (e) {
      if (moved > 6) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  }

  /* ============================================================
     12. LIGHTBOX
     ============================================================ */
  function initLightbox() {
    var box = document.getElementById('lightbox');
    var img = document.getElementById('lightboxImg');
    var caption = document.getElementById('lightboxCaption');
    var close = document.getElementById('lightboxClose');
    if (!box || !img) return;

    function open(src, title) {
      img.src = src;
      img.alt = title || '';
      if (caption) caption.textContent = title || '';
      box.classList.add('lightbox--open');
      box.setAttribute('aria-hidden', 'false');
      document.body.classList.add('page--locked');
    }

    function hide() {
      box.classList.remove('lightbox--open');
      box.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('page--locked');
    }

    document.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-zoom]') : null;
      if (!btn) return;
      e.preventDefault();
      open(btn.getAttribute('data-zoom'), btn.getAttribute('data-zoom-title'));
    });

    if (close) close.addEventListener('click', hide);

    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.classList.contains('lightbox__figure')) hide();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hide();
    });
  }

  /* ============================================================
     13. NAV ACTIVE STATE + smooth anchors + year
     ============================================================ */
  function initNavState() {
    var sections = Array.prototype.slice.call(document.querySelectorAll('main section[id]'));
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav__link[href^="#"]'));
    if (!sections.length || !links.length) return;

    scrollSubs.push(function (y) {
      var pos = y + window.innerHeight * 0.32;
      var currentId = null;

      for (var i = 0; i < sections.length; i++) {
        var s = sections[i];
        if (s.offsetTop <= pos) currentId = s.id;
      }

      links.forEach(function (link) {
        var match = link.getAttribute('href') === '#' + currentId;
        link.classList.toggle('nav__link--active', match);
      });
    });
  }

  function initYear() {
    var el = document.getElementById('year');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ============================================================
     14. TO TOP
     ============================================================ */
  function initToTop() {
    var btn = document.getElementById('toTop');
    if (!btn) return;

    scrollSubs.push(function (y) {
      btn.classList.toggle('to-top--visible', y > window.innerHeight * 0.8);
    });

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
  }

  /* ============================================================
     BOOT
     ============================================================ */
  function boot() {
    initSplit();
    initHeader();
    initMenu();
    initReveal();
    initCounters();
    initParallax();
    initMarquee();
    initFilter();
    initAccordion();
    initCarousel();
    initLightbox();
    initNavState();
    initYear();
    initToTop();

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    requestAnimationFrame(loop);

    initPreloader(playHero);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
