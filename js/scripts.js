/* ==========================================================================
   Floorspectrum — interactions
   Vanilla JS, no dependencies. Loaded with `defer`.
   ========================================================================== */
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const $ = (sel, ctx = doc) => ctx.querySelector(sel);
  const $$ = (sel, ctx = doc) => Array.from(ctx.querySelectorAll(sel));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const onIdle = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 1200));

  const debounce = (fn, ms = 150) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  /* ------------------------------------------------------------------------
     Intro / loading screen
     ------------------------------------------------------------------------ */
  function runIntro() {
    const intro = $('#intro');
    if (!root.classList.contains('is-intro') || !intro) {
      intro?.remove();
      root.classList.add('is-ready');
      return Promise.resolve();
    }

    clearTimeout(window.__fsIntroFailsafe);
    const bar = $('#introProgress');
    const started = performance.now();
    const MIN = reducedMotion.matches ? 350 : 1650;
    const MAX = 3000;
    let progress = 0;
    let loaded = doc.readyState === 'complete';
    let rafId;

    const tick = () => {
      const target = loaded ? 1 : 0.88;
      progress += (target - progress) * (loaded ? 0.18 : 0.035);
      if (bar) bar.style.transform = `scaleX(${progress.toFixed(4)})`;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    const pageLoaded = loaded
      ? Promise.resolve()
      : new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));
    const fontsReady = doc.fonts ? doc.fonts.ready.catch(() => {}) : Promise.resolve();

    const ready = Promise.all([pageLoaded, fontsReady]).then(() => {
      loaded = true;
      const elapsed = performance.now() - started;
      return wait(Math.max(0, MIN - elapsed));
    });

    return Promise.race([ready, wait(MAX)]).then(async () => {
      loaded = true;
      await wait(160);
      cancelAnimationFrame(rafId);
      if (bar) bar.style.transform = 'scaleX(1)';
      try { sessionStorage.setItem('fs-intro', '1'); } catch (e) { /* storage unavailable */ }

      root.classList.add('is-intro-out', 'is-ready');
      await wait(reducedMotion.matches ? 50 : 1100);
      root.classList.remove('is-intro', 'is-intro-out');
      intro.remove();
    });
  }

  /* ------------------------------------------------------------------------
     Header: always visible (sticky); background + shadow once the page scrolls
     ------------------------------------------------------------------------ */
  function initHeader() {
    const header = $('#siteHeader');
    if (!header) return;
    let ticking = false;
    const update = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  }

  /* ------------------------------------------------------------------------
     Mobile menu
     ------------------------------------------------------------------------ */
  function initMobileMenu() {
    const toggle = $('#menuToggle');
    const menu = $('#mobileMenu');
    if (!toggle || !menu) return;
    const label = $('.menu-toggle__label', toggle);
    let closeTimer;

    const focusables = () => [toggle, ...$$('a[href], button', menu)];

    const open = () => {
      clearTimeout(closeTimer);
      menu.hidden = false;
      root.classList.add('menu-open');
      toggle.setAttribute('aria-expanded', 'true');
      if (label) label.textContent = 'Zatvori';
      requestAnimationFrame(() => {
        menu.classList.add('is-open');
        $('a', menu)?.focus({ preventScroll: true });
      });
    };

    const close = (restoreFocus = true) => {
      menu.classList.remove('is-open');
      root.classList.remove('menu-open');
      toggle.setAttribute('aria-expanded', 'false');
      if (label) label.textContent = 'Meni';
      closeTimer = setTimeout(() => { menu.hidden = true; }, 460);
      if (restoreFocus) toggle.focus({ preventScroll: true });
    };

    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

    toggle.addEventListener('click', () => (isOpen() ? close() : open()));
    menu.addEventListener('click', (e) => {
      if (e.target.closest('a')) close(false);
    });

    doc.addEventListener('keydown', (e) => {
      if (!isOpen()) return;
      if (e.key === 'Escape') {
        close();
      } else if (e.key === 'Tab') {
        const items = focusables();
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && doc.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && doc.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    window.matchMedia('(min-width: 1241px)').addEventListener('change', (e) => {
      if (e.matches && isOpen()) close(false);
    });
  }

  /* ------------------------------------------------------------------------
     Section navigation
     - in-page links scroll to the exact start of their section, below the
       sticky header ("Početna" goes to the very top)
     - scrollspy keeps exactly one nav item active, driven by scroll position
     - sliding orange indicator under the active desktop nav item
     ------------------------------------------------------------------------ */
  function initNavigation() {
    const nav = $('.nav');
    const navLinks = $$('.nav__link');
    const links = $$('.nav__link, .mobile-menu__list a');
    const indicator = $('.nav__indicator');
    const ids = [...new Set(links.map((a) => a.getAttribute('href').slice(1)))];
    const sections = ids.map((id) => doc.getElementById(id)).filter(Boolean);
    if (!sections.length) return;

    const headerOffset = () => parseFloat(getComputedStyle(root).getPropertyValue('--header-h-scrolled')) || 64;
    const maxScroll = () => doc.documentElement.scrollHeight - window.innerHeight;
    const targetTop = (el) => {
      if (el === sections[0]) return 0;
      // Full-screen sections land on their exact top (their padding clears the header).
      const offset = el.classList.contains('section--screen') ? 0 : headerOffset();
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      return Math.max(0, Math.min(Math.round(top), maxScroll()));
    };

    let activeId = null;
    let lockedId = null;
    let unlockTimer;

    const moveIndicator = () => {
      if (!nav || !indicator) return;
      const link = navLinks.find((a) => a.getAttribute('href') === `#${activeId}`);
      if (!link || !link.offsetWidth) return;
      nav.style.setProperty('--ind-x', `${link.offsetLeft}px`);
      nav.style.setProperty('--ind-s', String(link.offsetWidth / 100));
      if (!nav.classList.contains('has-indicator')) {
        nav.classList.add('has-indicator');
        requestAnimationFrame(() => requestAnimationFrame(() => nav.classList.add('is-animated')));
      }
    };

    const setActive = (id) => {
      if (id === activeId) return;
      activeId = id;
      links.forEach((a) => {
        if (a.getAttribute('href') === `#${id}`) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
      moveIndicator();
    };

    const spy = () => {
      if (lockedId) return;
      if (window.scrollY >= maxScroll() - 2) {
        setActive(sections[sections.length - 1].id);
        return;
      }
      const probe = headerOffset() + window.innerHeight * 0.3;
      let current = sections[0].id;
      sections.forEach((sec) => {
        if (sec.getBoundingClientRect().top <= probe) current = sec.id;
      });
      setActive(current);
    };

    const unlockSoon = (ms) => {
      clearTimeout(unlockTimer);
      unlockTimer = setTimeout(() => { lockedId = null; spy(); }, ms);
    };

    let ticking = false;
    window.addEventListener('scroll', () => {
      // While a nav-initiated scroll runs, keep its target highlighted; release when it settles.
      if (lockedId) unlockSoon(140);
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => { ticking = false; spy(); });
      }
    }, { passive: true });

    const release = () => { if (lockedId) { lockedId = null; spy(); } };
    window.addEventListener('wheel', release, { passive: true });
    window.addEventListener('touchstart', release, { passive: true });

    doc.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const id = a.getAttribute('href').slice(1);
      if (!id || a.classList.contains('skip-link')) return;
      const target = doc.getElementById(id);
      if (!target) return;
      e.preventDefault();

      const top = targetTop(target);
      if (ids.includes(id)) {
        lockedId = id;
        setActive(id);
        unlockSoon(Math.abs(window.scrollY - top) < 2 ? 60 : 1600);
      }
      window.scrollTo({ top, behavior: reducedMotion.matches ? 'auto' : 'smooth' });

      // Keep the URL shareable and move keyboard focus to the section.
      const url = id === sections[0].id ? location.pathname + location.search : `#${id}`;
      try { history.replaceState(null, '', url); } catch (err) { /* ignore */ }
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });

    window.addEventListener('resize', debounce(() => { moveIndicator(); spy(); }, 100), { passive: true });
    (doc.fonts ? doc.fonts.ready : Promise.resolve()).then(moveIndicator);
    window.addEventListener('load', moveIndicator, { once: true });
    spy();
    moveIndicator();
  }

  /* ------------------------------------------------------------------------
     Fit full-screen sections to the viewport (desktop, tablet and phone).
     The layouts are designed to fit one screen. When a section is slightly
     taller, its content is scaled down a little so the whole section,
     including its orange end line, stays on one screen:
       - laptop/desktop: down to 78%;
       - tablet/phone: down to 90% only, so text and touch targets stay
         comfortable. A section that would need more keeps its full size and
         scrolls naturally (nothing is hidden or cropped).
     ------------------------------------------------------------------------ */
  function initSectionFit() {
    const desktopMq = window.matchMedia('(min-width: 901px) and (min-height: 600px)');
    const items = $$('.section--screen').map((section) => ({ section, content: section.firstElementChild }))
      .filter((it) => it.content);
    if (!items.length) return;

    // Stable viewport height (100svh): ignores the mobile address bar showing/hiding.
    const probe = doc.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:absolute;top:0;left:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none';
    doc.body.appendChild(probe);

    const outer = (el) => {
      const cs = getComputedStyle(el);
      return el.getBoundingClientRect().height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
    };

    let lastW = 0;
    let lastH = 0;
    const fit = (force) => {
      const vh = probe.getBoundingClientRect().height || window.innerHeight;
      const vw = window.innerWidth;
      if (!force && vw === lastW && Math.abs(vh - lastH) < 1) return;
      lastW = vw;
      lastH = vh;
      const desktop = desktopMq.matches;
      const minScale = desktop ? 0.78 : 0.9;
      items.forEach(({ section, content }) => {
        content.style.zoom = '';
        content.style.maxWidth = '';
        content.style.paddingLeft = '';
        content.style.paddingRight = '';
        content.style.marginLeft = '';
        content.style.marginRight = '';
        // Desktop show room stretches to the remaining height by itself; very
        // short landscape screens scroll naturally.
        if ((desktop && content.classList.contains('showroom__grid')) || vh < 480) return;
        const cs = getComputedStyle(section);
        let avail = vh - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        Array.from(section.children).forEach((child) => { if (child !== content) avail -= outer(child); });
        const need = content.getBoundingClientRect().height;
        if (need > avail && avail > 0) {
          // 6px of headroom absorbs sub-pixel rounding (1px borders don't scale below 1px).
          const ratio = Math.floor(((avail - 6) / need) * 1000) / 1000;
          let z = desktop ? Math.max(minScale, ratio) : ratio >= minScale ? ratio : 1;
          if (z < 1) {
            // Zoom scales the container's max-width, padding and margins too; divide them
            // back out so a scaled section keeps exactly the same width and side gutters as
            // every other section (only its content becomes smaller).
            const ccs = getComputedStyle(content);
            const box = (prop) => parseFloat(ccs[prop]) || 0;
            const maxW = ccs.maxWidth === 'none' ? null : box('maxWidth');
            const pl = box('paddingLeft');
            const pr = box('paddingRight');
            const ml = box('marginLeft');
            const mr = box('marginRight');
            const autoMargins = Math.abs(ml - mr) < 1 && maxW !== null;
            const apply = (zz) => {
              content.style.zoom = String(zz);
              if (maxW !== null) content.style.maxWidth = (maxW / zz) + 'px';
              content.style.paddingLeft = (pl / zz) + 'px';
              content.style.paddingRight = (pr / zz) + 'px';
              if (!autoMargins) {
                content.style.marginLeft = (ml / zz) + 'px';
                content.style.marginRight = (mr / zz) + 'px';
              }
            };
            apply(z);
            // Width-based boxes (photos with an aspect ratio) do not shrink with zoom, so
            // re-measure the real height and refine (at most twice, never below the minimum).
            for (let i = 0; i < 2; i += 1) {
              const real = content.getBoundingClientRect().height;
              if (real <= avail - 2) break;
              const next = Math.floor(z * ((avail - 6) / real) * 1000) / 1000;
              if (next < minScale || next >= z) break;
              z = next;
              apply(z);
            }
          }
        }
      });
    };

    const refit = debounce(() => fit(false), 120);
    window.addEventListener('resize', refit, { passive: true });
    desktopMq.addEventListener('change', () => fit(true));
    (doc.fonts ? doc.fonts.ready : Promise.resolve()).then(() => fit(true));
    window.addEventListener('load', () => fit(true), { once: true });
    fit(true);
  }

  /* ------------------------------------------------------------------------
     Scroll reveal
     ------------------------------------------------------------------------ */
  function initReveal() {
    const items = $$('[data-reveal]').filter((el) => !el.closest('.hero'));
    if (!('IntersectionObserver' in window) || reducedMotion.matches) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const onEnter = (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    };
    const io = new IntersectionObserver(onEnter, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    // Section end lines sit near the bottom edge of the screen: draw them as soon as they enter.
    const ruleIo = new IntersectionObserver(onEnter, { rootMargin: '0px', threshold: 0 });
    items.forEach((el) => (el.classList.contains('rule') ? ruleIo : io).observe(el));
  }

  /* Run CSS loops (orbit, polish sheen) only while visible. */
  function initInView() {
    const items = $$('.cleaning__art');
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-inview'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.target.classList.toggle('is-inview', e.isIntersecting));
    });
    items.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------------
     Hero: material switcher (background, title, description, tile cluster)
     ------------------------------------------------------------------------ */
  function initHero() {
    const hero = $('#pocetna');
    const buttons = $$('.materials__btn');
    if (!hero || !buttons.length) return { start() {} };

    const titleEl = $('#heroTitle');
    const titleMask = titleEl.parentElement;
    const descEl = $('#heroDesc');
    const layers = [$('#heroBgA'), $('#heroBgB')];
    const tiles = $$('.tile', hero);
    const tilesWrap = $('#heroTiles');
    const easing = 'cubic-bezier(0.2, 0.75, 0.2, 1)';

    const materials = buttons.map((b) => ({
      key: b.dataset.key,
      title: b.dataset.title,
      desc: b.dataset.desc,
      srcset: b.dataset.srcset,
      sizes: b.dataset.sizes,
      tile: b.dataset.tile,
    }));
    const count = materials.length;
    let current = 0;
    let activeLayer = 0;
    let token = 0;
    let order = tiles.map((_, i) => i % count);
    const pauseReasons = new Set();

    const firstCandidate = (srcset) => srcset.split(',')[0].trim().split(/\s+/)[0];

    /* Keep layout stable: fit the longest title on one line, reserve the tallest description. */
    const measure = doc.createElement('div');
    measure.setAttribute('aria-hidden', 'true');
    measure.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;left:-9999px;top:0;';
    hero.appendChild(measure);

    // Copy font longhands: the computed `font` shorthand can be an empty string.
    const copyFont = (cs) => {
      ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontStretch', 'letterSpacing', 'lineHeight']
        .forEach((k) => { measure.style[k] = cs[k]; });
    };

    const fit = () => {
      titleEl.style.fontSize = '';
      const cs = getComputedStyle(titleEl);
      const base = parseFloat(cs.fontSize);
      copyFont(cs);
      measure.style.whiteSpace = 'nowrap';
      measure.style.width = 'auto';
      let widest = 0;
      materials.forEach((m) => {
        measure.textContent = m.title;
        widest = Math.max(widest, measure.getBoundingClientRect().width);
      });
      const avail = titleMask.clientWidth;
      if (widest > avail && avail > 0) titleEl.style.fontSize = `${Math.floor(base * (avail / widest) * 0.98)}px`;

      const ds = getComputedStyle(descEl);
      copyFont(ds);
      measure.style.whiteSpace = 'normal';
      measure.style.width = `${descEl.clientWidth}px`;
      let tallest = 0;
      materials.forEach((m) => {
        measure.textContent = m.desc;
        tallest = Math.max(tallest, measure.getBoundingClientRect().height);
      });
      descEl.style.minHeight = `${Math.ceil(tallest)}px`;
    };

    const setButtons = (index) => {
      buttons.forEach((b, i) => {
        const on = i === index;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      // On phones the list is a horizontal strip: keep the active item in view.
      const list = buttons[index].closest('ul');
      if (list && list.scrollWidth > list.clientWidth + 1) {
        const li = buttons[index].parentElement;
        const pad = parseFloat(getComputedStyle(list).paddingLeft) || 0;
        list.scrollTo({ left: Math.max(0, li.offsetLeft - pad), behavior: reducedMotion.matches ? 'auto' : 'smooth' });
      }
      // Restart the progress animation on the newly active button.
      const bar = $('.materials__progress', buttons[index]);
      if (bar) {
        bar.style.animation = 'none';
        void bar.offsetWidth;
        bar.style.animation = '';
      }
    };

    const swapText = async (m) => {
      if (reducedMotion.matches || !titleEl.animate) {
        titleEl.textContent = m.title;
        descEl.textContent = m.desc;
        return;
      }
      const outT = titleEl.animate(
        [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-105%)', opacity: 0 }],
        { duration: 420, easing: 'cubic-bezier(0.7, 0, 0.84, 0)', fill: 'forwards' }
      );
      const outD = descEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
      await Promise.all([outT.finished, outD.finished]).catch(() => {});
      titleEl.textContent = m.title;
      descEl.textContent = m.desc;
      outT.cancel();
      outD.cancel();
      titleEl.animate(
        [{ transform: 'translateY(105%)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
        { duration: 820, easing }
      );
      descEl.animate(
        [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
        { duration: 700, delay: 140, easing, fill: 'backwards' }
      );
    };

    const swapBackground = async (m, myToken) => {
      const next = layers[1 - activeLayer];
      const prev = layers[activeLayer];
      next.sizes = m.sizes;
      next.srcset = m.srcset;
      next.src = firstCandidate(m.srcset);
      try { await next.decode(); } catch (e) { /* show anyway */ }
      if (myToken !== token) return;
      // Restart the slow zoom from its starting scale.
      next.style.transition = 'none';
      next.classList.remove('is-active');
      void next.offsetWidth;
      next.style.transition = '';
      next.classList.add('is-active');
      prev.classList.remove('is-active');
      activeLayer = 1 - activeLayer;
    };

    const swapTiles = (myToken) => {
      tiles.forEach((tile, slot) => {
        const img = $('img', tile);
        const m = materials[order[slot]];
        if (!img || img.dataset.key === m.key) return;
        setTimeout(async () => {
          if (myToken !== token) return;
          img.classList.add('is-swapping');
          await wait(reducedMotion.matches ? 0 : 340);
          if (myToken !== token) return;
          img.srcset = m.tile;
          img.src = firstCandidate(m.tile);
          img.dataset.key = m.key;
          try { await img.decode(); } catch (e) { /* ignore */ }
          img.classList.remove('is-swapping');
        }, slot * 70);
      });
    };

    const select = (index) => {
      index = ((index % count) + count) % count;
      if (index === current) return;
      current = index;
      token += 1;
      const m = materials[index];
      order = tiles.map((_, slot) => (index + slot) % count);
      setButtons(index);
      swapText(m);
      swapBackground(m, token);
      swapTiles(token);
    };

    // Initial tile keys
    tiles.forEach((tile, slot) => {
      const img = $('img', tile);
      if (img) img.dataset.key = materials[order[slot]].key;
    });

    buttons.forEach((b, i) => b.addEventListener('click', () => select(i)));
    tiles.forEach((tile, slot) => tile.addEventListener('click', () => select(order[slot])));

    /* Auto-rotation, driven by the CSS progress bar so pausing is frame-exact. */
    const setPaused = (reason, on) => {
      if (on) pauseReasons.add(reason);
      else pauseReasons.delete(reason);
      hero.classList.toggle('is-paused', pauseReasons.size > 0);
    };

    hero.addEventListener('animationend', (e) => {
      if (e.animationName === 'hero-progress' && hero.classList.contains('is-auto')) select(current + 1);
    });

    const content = $('.hero__content', hero);
    if (canHover.matches) {
      content.addEventListener('mouseenter', () => setPaused('hover', true));
      content.addEventListener('mouseleave', () => setPaused('hover', false));
      tilesWrap.addEventListener('mouseenter', () => setPaused('hover-tiles', true));
      tilesWrap.addEventListener('mouseleave', () => setPaused('hover-tiles', false));
    }
    content.addEventListener('focusin', () => setPaused('focus', true));
    content.addEventListener('focusout', (e) => {
      if (!content.contains(e.relatedTarget)) setPaused('focus', false);
    });
    doc.addEventListener('visibilitychange', () => setPaused('hidden', doc.hidden));
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => setPaused('offscreen', !entry.isIntersecting), { threshold: 0.2 }).observe(hero);
    }

    const refit = debounce(fit, 120);
    window.addEventListener('resize', refit, { passive: true });
    (doc.fonts ? doc.fonts.ready : Promise.resolve()).then(fit);
    fit();

    return {
      start() {
        $$('[data-reveal]', hero).forEach((el) => el.classList.add('is-visible'));
        tilesWrap?.classList.add('is-assembled');
        if (!reducedMotion.matches) hero.classList.add('is-auto');

        // Warm the cache so later switches are instant.
        onIdle(() => {
          materials.forEach((m, i) => {
            if (i === 0) return;
            const img = new Image();
            img.decoding = 'async';
            img.sizes = m.sizes;
            img.srcset = m.srcset;
            const t = new Image();
            t.srcset = m.tile;
            t.sizes = '20vw';
          });
        });
      },
    };
  }

  /* ------------------------------------------------------------------------
     Services mosaic: slice the tile illustration into 9 tiles that assemble
     ------------------------------------------------------------------------ */
  function initMosaic() {
    const mosaic = $('.mosaic');
    const base = $('.mosaic__base');
    if (!mosaic || !base || reducedMotion.matches) return;

    const W = 628;
    const H = 993;
    const R = 124; // half-diagonal of one tile in source pixels (incl. margin)
    const centers = [
      [250.5, 121.5], [121, 245], [251, 368.5], [121.5, 493.5], [251.5, 619.5],
      [505.5, 617.5], [378.5, 745.5], [250.5, 870.5], [505.5, 870.5],
    ];
    const cx = W / 2;
    const cy = H / 2;
    const px = (v, total) => `${((v / total) * 100).toFixed(3)}%`;

    const frag = doc.createDocumentFragment();
    centers.forEach(([x, y], i) => {
      const img = doc.createElement('img');
      img.className = 'mosaic__tile';
      img.alt = '';
      img.decoding = 'async';
      img.src = base.currentSrc || base.src;
      img.style.setProperty('--clip', `polygon(${px(x, W)} ${px(y - R, H)}, ${px(x + R, W)} ${px(y, H)}, ${px(x, W)} ${px(y + R, H)}, ${px(x - R, W)} ${px(y, H)})`);
      const dx = x - cx;
      const dy = y - cy;
      const len = Math.hypot(dx, dy) || 1;
      img.style.setProperty('--tx', `${((dx / len) * 46).toFixed(1)}px`);
      img.style.setProperty('--ty', `${((dy / len) * 46).toFixed(1)}px`);
      img.style.setProperty('--i', i);
      frag.appendChild(img);
    });

    const build = () => {
      mosaic.appendChild(frag);
      mosaic.classList.add('is-built');
    };
    if (base.complete && base.naturalWidth) build();
    else base.addEventListener('load', build, { once: true });
  }

  /* ------------------------------------------------------------------------
     Ticker: seamless infinite marquee (Web Animations API, compositor-driven)
     - two identical groups; the track moves by exactly one group width (-50%)
     - smooth slow-down on hover, drag/swipe support, pauses off-screen
     ------------------------------------------------------------------------ */
  function initTicker() {
    const ticker = $('#ticker');
    const track = $('#tickerTrack');
    const group = track && $('.ticker__group', track);
    if (!ticker || !track || !group) return;

    if (reducedMotion.matches || !track.animate) {
      ticker.classList.add('is-static');
      return;
    }

    const SPEED = 46; // px per second
    const originals = Array.from(group.children);
    originals.forEach((li) => $$('img', li).forEach((img) => { img.draggable = false; }));
    let anim = null;
    let groupWidth = 0;
    let lastViewport = 0;
    let rateRaf = 0;
    let visible = true;
    let dragging = false;

    const duration = () => (groupWidth / SPEED) * 1000;

    const build = () => {
      const progress = anim && anim.effect ? ((anim.currentTime || 0) % duration()) / duration() : 0;

      // Reset to the original single set.
      track.querySelectorAll('.ticker__group[aria-hidden]').forEach((g) => g.remove());
      Array.from(group.children).forEach((li) => { if (!originals.includes(li)) li.remove(); });

      // Repeat the set until one group is wider than the viewport (no gaps on ultra-wide screens).
      const vw = Math.max(window.innerWidth, ticker.clientWidth);
      let guard = 0;
      while (group.getBoundingClientRect().width < vw * 1.15 && guard < 8) {
        originals.forEach((li) => {
          const clone = li.cloneNode(true);
          clone.setAttribute('aria-hidden', 'true');
          $$('a', clone).forEach((a) => { a.tabIndex = -1; });
          group.appendChild(clone);
        });
        guard += 1;
      }

      // Second, identical group makes the loop seamless.
      const twin = group.cloneNode(true);
      twin.setAttribute('aria-hidden', 'true');
      $$('img', twin).forEach((img) => { img.alt = ''; img.loading = 'eager'; });
      $$('a', twin).forEach((a) => { a.tabIndex = -1; });
      track.appendChild(twin);

      groupWidth = group.getBoundingClientRect().width;
      lastViewport = window.innerWidth;

      anim?.cancel();
      anim = track.animate(
        [{ transform: 'translate3d(0, 0, 0)' }, { transform: 'translate3d(-50%, 0, 0)' }],
        { duration: duration(), iterations: Infinity, easing: 'linear' }
      );
      anim.currentTime = progress * duration();
      if (!visible) anim.pause();
    };

    const rampRate = (to, ms = 700) => {
      if (!anim) return;
      cancelAnimationFrame(rateRaf);
      const from = anim.playbackRate;
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / ms);
        const eased = 1 - Math.pow(1 - k, 3);
        const rate = from + (to - from) * eased;
        if (anim.updatePlaybackRate) anim.updatePlaybackRate(rate);
        else anim.playbackRate = rate;
        if (k < 1) rateRaf = requestAnimationFrame(step);
      };
      rateRaf = requestAnimationFrame(step);
    };

    /* Pause model: the ticker glides to a full stop while the user hovers it,
       touches it, drags it or has keyboard focus inside it, and glides back to
       full speed once every interaction has ended. */
    const holds = new Set();
    let touchTimer;
    const applyHolds = () => {
      if (!anim || dragging) return;
      rampRate(holds.size ? 0 : 1, holds.size ? 450 : 900);
    };
    const hold = (reason, on) => {
      if (on) holds.add(reason);
      else holds.delete(reason);
      applyHolds();
    };

    // Real mouse hover only (taps on phones emit emulated mouse events with no "leave").
    ticker.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hold('hover', true); });
    ticker.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hold('hover', false); });
    // Keyboard focus only (a tapped link also receives focus, which must not freeze the ticker).
    ticker.addEventListener('focusin', (e) => {
      let keyboard = true;
      try { keyboard = e.target.matches(':focus-visible'); } catch (err) { /* older browsers */ }
      if (keyboard) hold('focus', true);
    });
    ticker.addEventListener('focusout', (e) => { if (!ticker.contains(e.relatedTarget)) hold('focus', false); });

    // Drag / swipe (horizontal only; vertical scrolling stays native via touch-action: pan-y).
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let pointerId = null;
    let engaged = false;
    let suppressClick = false;

    const wrapTime = (t) => {
      const d = duration();
      return ((t % d) + d) % d;
    };

    ticker.addEventListener('pointerdown', (e) => {
      if (!anim || (e.pointerType === 'mouse' && e.button !== 0)) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      startTime = anim.currentTime || 0;
      engaged = false;
      if (e.pointerType !== 'mouse') {
        clearTimeout(touchTimer);
        hold('touch', true);
      }
    });

    ticker.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pointerId || !anim) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!engaged) {
        if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return;
        engaged = true;
        dragging = true;
        cancelAnimationFrame(rateRaf);
        anim.pause();
        ticker.classList.add('is-dragging');
        try { ticker.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
      anim.currentTime = wrapTime(startTime - (dx / groupWidth) * duration());
    });

    const release = (e) => {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      if (e.pointerType !== 'mouse') {
        // Give touch users a moment to look at (or tap) the item before resuming.
        clearTimeout(touchTimer);
        touchTimer = setTimeout(() => hold('touch', false), 2500);
      }
      if (!engaged) return;
      engaged = false;
      dragging = false;
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 80);
      ticker.classList.remove('is-dragging');
      if (visible) {
        anim.playbackRate = 0;
        anim.play();
        applyHolds();
      }
    };
    ticker.addEventListener('pointerup', release);
    ticker.addEventListener('pointercancel', release);
    ticker.addEventListener('lostpointercapture', release);

    // A drag must never open a link.
    ticker.addEventListener('click', (e) => {
      if (suppressClick) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    // Only animate while on screen.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (!anim || dragging) return;
        if (visible) { anim.play(); applyHolds(); } else anim.pause();
      }, { rootMargin: '120px 0px' }).observe(ticker);
    }

    window.addEventListener('resize', debounce(() => {
      if (Math.abs(window.innerWidth - lastViewport) > 2) build();
    }, 200), { passive: true });

    build();
  }

  /* ------------------------------------------------------------------------
     Show room slideshow
     ------------------------------------------------------------------------ */
  function initSlideshow() {
    const wrap = $('#slideshow');
    if (!wrap) return;
    const images = $$('.slideshow__img', wrap);
    const dots = $$('.slideshow__dots button', wrap);
    if (images.length < 2) return;
    const INTERVAL = 5200;
    let index = 0;
    let timer = null;
    let inView = false;

    const go = (i) => {
      index = (i + images.length) % images.length;
      images.forEach((img, n) => img.classList.toggle('is-active', n === index));
      dots.forEach((d, n) => {
        d.classList.toggle('is-active', n === index);
        d.setAttribute('aria-pressed', String(n === index));
      });
    };

    const stop = () => { clearInterval(timer); timer = null; };
    const start = () => {
      stop();
      if (reducedMotion.matches || !inView || doc.hidden) return;
      timer = setInterval(() => go(index + 1), INTERVAL);
    };

    dots.forEach((d, n) => d.addEventListener('click', () => { go(n); start(); }));

    // Swipe left / right to change the image (touch); vertical scrolling stays native.
    const viewport = $('.slideshow__viewport', wrap);
    let sx = null;
    let sy = 0;
    viewport.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      sx = e.clientX;
      sy = e.clientY;
    });
    viewport.addEventListener('pointerup', (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      sx = null;
      if (Math.abs(dx) > 32 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        go(index + (dx < 0 ? 1 : -1));
        start();
      }
    });
    viewport.addEventListener('pointercancel', () => { sx = null; });
    doc.addEventListener('visibilitychange', start);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; start(); }, { threshold: 0.25 }).observe(wrap);
    } else {
      inView = true;
      start();
    }
  }

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  // Each feature is isolated: one failure never blocks the rest of the page.
  const safe = (fn, fallback) => {
    try { return fn(); } catch (err) { console.error(err); return fallback; }
  };

  safe(initHeader);
  safe(initMobileMenu);
  safe(initSectionFit);
  safe(initNavigation);
  safe(initInView);
  safe(initMosaic);
  safe(initTicker);
  safe(initSlideshow);
  const hero = safe(initHero, { start() {} });

  runIntro().then(async () => {
    await nextFrame();
    safe(() => hero.start());
    safe(initReveal);
  });
})();
