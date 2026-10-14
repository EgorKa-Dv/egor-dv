/* egor.dev — поведение страницы. Без зависимостей. */
(function () {
  'use strict';

  var CONFIG = window.SITE_CONFIG || {};
  var CASES = window.CASES || [];
  var CATS = window.CASE_CATS || {};
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function scrollToTarget(selector) {
    var target = $(selector);
    if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function focusNameField() {
    var name = $('#f-name');
    if (name) window.setTimeout(function () { name.focus({ preventScroll: true }); }, reduceMotion ? 0 : 650);
  }

  /* ---------- Контакты из конфига ---------- */

  function applyContacts() {
    var hrefs = {
      telegram: CONFIG.telegramUrl,
      phone: CONFIG.phoneHref && 'tel:' + CONFIG.phoneHref,
      email: CONFIG.email && 'mailto:' + CONFIG.email
    };
    var texts = { telegram: CONFIG.telegram, phone: CONFIG.phone, email: CONFIG.email };

    $$('[data-contact-href]').forEach(function (el) {
      var href = hrefs[el.getAttribute('data-contact-href')];
      if (href) el.setAttribute('href', href);
    });
    $$('[data-contact-text]').forEach(function (el) {
      var text = texts[el.getAttribute('data-contact-text')];
      if (text) el.textContent = text;
    });
  }

  /* ---------- Шапка и меню ---------- */

  function initNav() {
    var header = $('.header');
    var burger = $('#burger');
    var nav = $('#nav');
    if (!header || !burger || !nav) return;

    function setOpen(open) {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      header.classList.toggle('is-open', open);
      document.body.classList.toggle('is-locked', open);
    }

    burger.addEventListener('click', function () {
      setOpen(burger.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('is-open')) {
        setOpen(false);
        burger.focus();
      }
    });
    var desktop = window.matchMedia('(min-width: 1101px)');
    var onDesktop = function (e) { if (e.matches) setOpen(false); };
    if (desktop.addEventListener) desktop.addEventListener('change', onDesktop);

    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 12); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Подсветка пункта меню текущей секции
    var links = $$('.nav__link');
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle('is-current', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (a) {
      var section = $(a.getAttribute('href'));
      if (section) io.observe(section);
    });
  }

  /* ---------- Появление блоков ---------- */

  function initReveal() {
    var items = $$('[data-reveal]');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Hero: появление и параллакс карточек ---------- */

  function initHero() {
    var hero = $('.hero');
    if (!hero) return;
    window.requestAnimationFrame(function () { hero.classList.add('is-ready'); });

    if (reduceMotion || !window.matchMedia('(pointer: fine) and (min-width: 901px)').matches) return;
    var raf = 0;
    var x = 0;
    var y = 0;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      x = (e.clientX - r.left) / r.width - 0.5;
      y = (e.clientY - r.top) / r.height - 0.5;
      if (raf) return;
      raf = window.requestAnimationFrame(function () {
        hero.style.setProperty('--mx', x.toFixed(3));
        hero.style.setProperty('--my', y.toFixed(3));
        raf = 0;
      });
    });
    hero.addEventListener('pointerleave', function () {
      hero.style.setProperty('--mx', '0');
      hero.style.setProperty('--my', '0');
    });
  }

  /* ---------- Схема «как сайт находит клиентов» ---------- */

  function initJourney() {
    var root = $('#journey');
    if (!root) return;

    var query = $('[data-typing]', root);
    var fullQuery = query.textContent;
    var site = $('.j-browser', root);
    var note = $('.note--journey', root);
    var leadName = $('[data-lead-name]', root);
    var leadTask = $('[data-lead-task]', root);
    var leadSource = $('[data-lead-source]', root);
    var bars = $$('.j-metrika__bar', root);

    var sources = ['Поиск', 'Яндекс.Карты', 'Директ'];
    var order = [0, 1, 0, 2, 0, 1, 2, 0, 2];
    var people = [
      ['Марина', 'потолок на кухню'],
      ['Алексей', 'замер в двух комнатах'],
      ['Ольга', 'потолок с подсветкой'],
      ['Дмитрий', 'расчёт на квартиру'],
      ['Ирина', 'глянцевый в спальню'],
      ['Сергей', 'замер на даче']
    ];
    var counts = [0, 0, 0];
    var step = 0;
    var timer = 0;
    var typed = false;
    var playing = false;

    function renderBars() {
      var max = Math.max(3, Math.max.apply(null, counts));
      bars.forEach(function (bar, i) { bar.style.setProperty('--v', (counts[i] / max).toFixed(3)); });
    }

    function showStep() {
      var ch = order[step % order.length];
      var person = people[step % people.length];
      step += 1;
      root.setAttribute('data-active', String(ch));
      window.setTimeout(function () { site.classList.add('is-hit'); }, 650);
      window.setTimeout(function () {
        site.classList.remove('is-hit');
        leadName.textContent = person[0];
        leadTask.textContent = person[1];
        leadSource.textContent = sources[ch];
        note.classList.remove('is-pop');
        void note.offsetWidth;
        note.classList.add('is-pop');
        counts[ch] += 1;
        renderBars();
      }, 1150);
    }

    function type(done) {
      if (typed) return done();
      typed = true;
      var i = 0;
      query.textContent = '';
      (function next() {
        i += 1;
        query.textContent = fullQuery.slice(0, i);
        if (i < fullQuery.length) window.setTimeout(next, 55);
        else window.setTimeout(done, 400);
      })();
    }

    function play() {
      if (playing) return;
      playing = true;
      root.classList.add('is-playing');
      type(function () {
        if (!playing) return;
        showStep();
        timer = window.setInterval(showStep, 3200);
      });
    }

    function pause() {
      playing = false;
      window.clearInterval(timer);
    }

    if (reduceMotion || !('IntersectionObserver' in window)) {
      root.classList.add('is-playing', 'is-static');
      return;
    }

    renderBars();
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) play();
        else pause();
      });
    }, { threshold: 0.3 }).observe(root);
  }

  /* ---------- Работы: витрина, фильтр, страница проекта ---------- */

  function luminance(hex) {
    var m = /^#?([\da-fA-F]{6})$/.exec(hex || '');
    if (!m) return 0;
    var n = parseInt(m[1], 16);
    var ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }

  /* Страница проекта окрашивается цветом самого макета. На тёмном фоне тёмный цвет
     не читается, поэтому берём первый достаточно светлый — сначала акцент, потом деталь. */
  function pickAccent(palette) {
    var order = ['Акцент', 'Деталь', 'Текст', 'Фон'];
    var found = '';
    order.forEach(function (name) {
      if (found) return;
      (palette || []).forEach(function (c) {
        if (found || c.name !== name) return;
        var l = luminance(c.hex);
        if (l > 0.15 && l < 0.94) found = c.hex;
      });
    });
    return found;
  }

  function trapFocus(e, container) {
    var focusable = $$('a[href], button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])', container)
      .filter(function (el) { return el.offsetParent !== null; });
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function initWorks() {
    var slidesBox = $('#showcaseSlides');
    if (!slidesBox || !CASES.length) return;

    var stage = $('#showcase');
    var strip = $('#filmstrip');
    var chipsBox = $('#worksChips');
    var catEl = $('#showcaseCat');
    var titleEl = $('#showcaseTitle');
    var nicheEl = $('#showcaseNiche');

    slidesBox.innerHTML = CASES.map(function (c, i) {
      return '<button class="slide" type="button" data-id="' + c.id + '" tabindex="-1"' +
        ' aria-label="Открыть концепт «' + esc(c.title) + '»">' +
        '<img src="assets/img/cases/' + c.id + '-desktop.jpg" alt="" width="1280" height="800" loading="' + (i ? 'lazy' : 'eager') + '" decoding="async">' +
        '<span class="slide__open" aria-hidden="true"><svg class="icon"><use href="#i-arrow-up-right"/></svg></span>' +
        '</button>';
    }).join('');

    strip.innerHTML = CASES.map(function (c) {
      return '<button class="filmstrip__item" type="button" role="tab" data-id="' + c.id + '" aria-selected="false"' +
        ' aria-label="' + esc(c.title) + '">' +
        '<img src="assets/img/cases/' + c.id + '-card.jpg" alt="" width="640" height="400" loading="lazy" decoding="async">' +
        '</button>';
    }).join('');

    chipsBox.innerHTML = CASES.map(function (c) {
      return '<button class="chip chip--work" type="button" data-id="' + c.id + '" aria-pressed="false">' + esc(c.title) + '</button>';
    }).join('');

    var slides = $$('.slide', slidesBox);
    var thumbs = $$('.filmstrip__item', strip);
    var chips = $$('.chip--work', chipsBox);
    var list = CASES.slice();
    var index = 0;

    function indexOfId(id) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) return i;
      }
      return 0;
    }

    // Лента миниатюр прокручивается сама, но только внутри себя — страницу не трогаем
    function centerThumb(el) {
      var left = el.offsetLeft - strip.clientWidth / 2 + el.offsetWidth / 2;
      if (strip.scrollTo) strip.scrollTo({ left: left, behavior: reduceMotion ? 'auto' : 'smooth' });
      else strip.scrollLeft = left;
    }

    function show(i) {
      if (!list.length) return;
      index = (i % list.length + list.length) % list.length;
      var current = list[index];

      slides.forEach(function (el) {
        var on = el.getAttribute('data-id') === current.id;
        el.classList.toggle('is-active', on);
        el.setAttribute('aria-hidden', String(!on));
        el.tabIndex = on ? 0 : -1;
      });
      thumbs.forEach(function (el) {
        var on = el.getAttribute('data-id') === current.id;
        el.setAttribute('aria-selected', String(on));
        if (on) centerThumb(el);
      });
      chips.forEach(function (el) {
        el.setAttribute('aria-pressed', String(el.getAttribute('data-id') === current.id));
      });

      catEl.textContent = CATS[current.cat] || '';
      titleEl.textContent = current.title;
      nicheEl.textContent = current.niche + ' · ' + current.summary;
    }

    var filters = $$('[data-filter]');
    function applyFilter(cat) {
      filters.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === cat)); });
      list = cat === 'all' ? CASES.slice() : CASES.filter(function (c) { return c.cat === cat; });
      var shown = {};
      list.forEach(function (c) { shown[c.id] = true; });
      thumbs.concat(chips).forEach(function (el) { el.hidden = !shown[el.getAttribute('data-id')]; });
      stage.classList.toggle('is-single', list.length < 2);
      show(0);
    }

    filters.forEach(function (b) {
      b.addEventListener('click', function () { applyFilter(b.getAttribute('data-filter')); });
    });
    $$('[data-filter-link]').forEach(function (link) {
      link.addEventListener('click', function () { applyFilter(link.getAttribute('data-filter-link')); });
    });

    $$('[data-step]', stage).forEach(function (b) {
      b.addEventListener('click', function () { show(index + Number(b.getAttribute('data-step'))); });
    });

    strip.addEventListener('click', function (e) {
      var el = e.target.closest('.filmstrip__item');
      if (el) show(indexOfId(el.getAttribute('data-id')));
    });

    chipsBox.addEventListener('click', function (e) {
      var el = e.target.closest('.chip--work');
      if (!el) return;
      var i = indexOfId(el.getAttribute('data-id'));
      if (i === index) openCase(el.getAttribute('data-id'));
      else show(i);
    });

    // Свайп по экрану ноутбука; после свайпа клик не должен открывать кейс
    var startX = null;
    var swiped = false;
    slidesBox.addEventListener('pointerdown', function (e) { startX = e.clientX; swiped = false; });
    slidesBox.addEventListener('pointerup', function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 44) {
        swiped = true;
        show(index + (dx < 0 ? 1 : -1));
      }
    });

    slidesBox.addEventListener('click', function (e) {
      var el = e.target.closest('.slide');
      if (el && el.classList.contains('is-active') && !swiped) openCase(el.getAttribute('data-id'));
    });

    var inView = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { inView = en.isIntersecting; });
      }, { threshold: 0.35 }).observe(stage);
    }

    var modal = $('#caseModal');
    var dialog = $('.case__dialog', modal);
    var lastFocus = null;
    var lightbox = initLightbox();

    document.addEventListener('keydown', function (e) {
      var el = e.target;
      if (!inView || !modal.hidden) return;
      if (el && el.closest && el.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
    });

    show(0);

    function shotMarkup(c) {
      var base = 'assets/img/cases/' + c.id + '-';
      var shots = [
        {
          kind: 'desktop',
          src: base + 'desktop.jpg',
          alt: 'Концепт «' + c.title + '» — версия для компьютера',
          caption: 'Десктоп — страница целиком'
        },
        {
          kind: 'mobile',
          src: base + 'mobile.jpg',
          alt: 'Концепт «' + c.title + '» — версия для телефона',
          caption: 'Телефон — та же страница в адаптиве'
        }
      ];
      return shots.map(function (s) {
        var frame = s.kind === 'desktop'
          ? '<span class="shot__bar" aria-hidden="true"><i></i><i></i><i></i><span class="shot__field"></span></span>'
          : '<span class="shot__notch" aria-hidden="true"></span>';
        return '<figure class="shot shot--' + s.kind + '">' +
          '<button class="shot__btn" type="button" data-shot="' + esc(s.src) + '" data-shot-alt="' + esc(s.alt) + '">' +
            frame +
            '<img src="' + esc(s.src) + '" alt="' + esc(s.alt) + '" loading="lazy" decoding="async">' +
            '<span class="shot__zoom" aria-hidden="true"><svg class="icon"><use href="#i-zoom"/></svg></span>' +
            '<span class="visually-hidden">Открыть экран крупно</span>' +
          '</button>' +
          '<figcaption>' + esc(s.caption) + '</figcaption>' +
          '</figure>';
      }).join('');
    }

    function renderCase(c) {
      var accent = pickAccent(c.palette);
      dialog.style.setProperty('--case-accent', accent || '#60A5FA');

      $('#caseBarTitle').textContent = c.title;
      $('#caseTitle').textContent = c.title;
      $('#caseNiche').textContent = c.niche + ' · ' + (CATS[c.cat] || '');
      $('#caseYear').textContent = c.year;
      $('#caseType').textContent = c.type;
      $('#caseSummary').textContent = c.summary;
      $('#caseAbout').textContent = c.about;

      var hero = $('#caseHeroImg');
      hero.src = 'assets/img/cases/' + c.id + '-desktop.jpg';

      $('#caseLeads').innerHTML = c.leads.map(function (item, i) {
        return '<li><span class="case__num">' + (i + 1) + '</span><span>' + esc(item) + '</span></li>';
      }).join('');

      $('#casePalette').innerHTML = (c.palette || []).map(function (col) {
        return '<li class="swatch" style="--c:' + esc(col.hex) + '">' +
          '<span class="swatch__chip"></span>' +
          '<span class="swatch__name">' + esc(col.name) + '</span>' +
          '<span class="swatch__hex">' + esc(col.hex.toUpperCase()) + '</span>' +
          '</li>';
      }).join('');

      $('#caseFonts').innerHTML =
        '<p class="font"><span class="font__role">заголовки</span><span class="font__name">' + esc(c.fonts.display) + '</span></p>' +
        '<p class="font"><span class="font__role">текст</span><span class="font__name">' + esc(c.fonts.body) + '</span></p>';

      $('#caseStack').innerHTML = (window.CASE_STACK || []).map(function (t) {
        return '<li class="tag">' + esc(t) + '</li>';
      }).join('');

      $('#caseFacts').innerHTML = [
        ['Год', c.year],
        ['Ниша', c.niche],
        ['Категория', CATS[c.cat] || ''],
        ['Тип', c.type],
        ['Экраны', 'десктоп и телефон']
      ].map(function (row) {
        return '<div><dt>' + esc(row[0]) + '</dt><dd>' + esc(row[1]) + '</dd></div>';
      }).join('');

      $('#caseResults').innerHTML = (c.results || []).map(function (item) {
        return '<li><svg class="icon" aria-hidden="true"><use href="#i-check"/></svg><span>' + esc(item) + '</span></li>';
      }).join('');

      $('#caseShotsGrid').innerHTML = shotMarkup(c);
    }

    function openCase(id) {
      var c = CASES.filter(function (x) { return x.id === id; })[0];
      if (!c) return;
      renderCase(c);

      lastFocus = document.activeElement;
      modal.hidden = false;
      document.body.classList.add('is-locked');
      dialog.scrollTop = 0;
      window.requestAnimationFrame(function () { modal.classList.add('is-open'); });
      $('.case__close', modal).focus();
    }

    function closeCase(goTo) {
      lightbox.close(true);
      modal.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      window.setTimeout(function () {
        modal.hidden = true;
        if (goTo) {
          scrollToTarget(goTo);
          focusNameField();
        } else if (lastFocus) {
          lastFocus.focus();
        }
      }, reduceMotion ? 0 : 240);
    }

    modal.addEventListener('click', function (e) {
      var shot = e.target.closest('[data-shot]');
      if (shot) {
        lightbox.open(shot.getAttribute('data-shot'), shot.getAttribute('data-shot-alt'), shot);
        return;
      }
      var toShots = e.target.closest('[data-scroll-shots]');
      if (toShots) {
        e.preventDefault();
        $('#caseShots').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        return;
      }
      var go = e.target.closest('[data-close-go]');
      if (go) {
        e.preventDefault();
        closeCase(go.getAttribute('href'));
      } else if (e.target.closest('[data-close]')) {
        closeCase();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (modal.hidden || !lightbox.isClosed()) return;
      if (e.key === 'Escape') closeCase();
      else if (e.key === 'Tab') trapFocus(e, dialog);
    });
  }

  /* ---------- Просмотр экрана крупно ---------- */

  function initLightbox() {
    var box = $('#lightbox');
    var img = $('#lightboxImg');
    var stage = $('.lightbox__stage', box);
    var back = null;

    function close(silent) {
      if (box.hidden) return;
      box.classList.remove('is-open');
      window.setTimeout(function () {
        box.hidden = true;
        img.src = 'data:,';
        if (!silent && back) back.focus();
        back = null;
      }, reduceMotion ? 0 : 180);
    }

    function open(src, alt, opener) {
      back = opener || null;
      img.src = src;
      img.alt = alt || '';
      box.hidden = false;
      window.requestAnimationFrame(function () { box.classList.add('is-open'); });
      $('.lightbox__close', box).focus();
    }

    box.addEventListener('click', function (e) {
      if (e.target.closest('[data-lb-close]') || !e.target.closest('.lightbox__stage')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      } else if (e.key === 'Tab') {
        trapFocus(e, box);
      }
    });

    return { open: open, close: close, isClosed: function () { return box.hidden; }, stage: stage };
  }

  /* ---------- Дополнения к пакету ---------- */

  function initAddons() {
    var grid = $('#addonsGrid');
    var items = window.ADDONS || [];
    var cats = window.ADDON_CATS || {};
    if (!grid || !items.length) return;

    grid.innerHTML = items.map(function (a) {
      return '<article class="addon" data-addon-cat="' + esc(a.cat) + '">' +
        '<div class="addon__head">' +
          '<h3 class="addon__name">' + esc(a.name) + '</h3>' +
          '<p class="addon__price">' + esc(a.price) + '</p>' +
        '</div>' +
        '<p class="addon__note">' + esc(a.note) + '</p>' +
        '<p class="addon__cat">' + esc(cats[a.cat] || '') + '</p>' +
        '</article>';
    }).join('');

    var buttons = $$('[data-addon-filter]');
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        var cat = b.getAttribute('data-addon-filter');
        buttons.forEach(function (x) {
          x.setAttribute('aria-pressed', String(x.getAttribute('data-addon-filter') === cat));
        });
        $$('.addon', grid).forEach(function (card) {
          card.hidden = !(cat === 'all' || card.getAttribute('data-addon-cat') === cat);
        });
        grid.classList.remove('is-filtering');
        void grid.offsetWidth;
        grid.classList.add('is-filtering');
      });
    });
  }

  /* ---------- Выбор пакета из секции цен ---------- */

  function initPlanPicker() {
    $$('.js-choose-plan').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var value = btn.getAttribute('data-plan');
        $$('#leadForm input[name="package"]').forEach(function (radio) {
          radio.checked = radio.value === value;
        });
        scrollToTarget('#contacts');
        focusNameField();
      });
    });
  }

  /* ---------- Форма заявки ---------- */

  function initLeadForm() {
    var form = $('#leadForm');
    if (!form || !window.LeadCore) return;
    var status = $('#formStatus');
    var submit = $('button[type="submit"]', form);
    var fields = { name: $('#f-name'), contact: $('#f-contact'), consent: $('#f-consent') };

    function readForm() {
      var data = new FormData(form);
      return {
        package: data.get('package') || '',
        name: data.get('name') || '',
        contact: data.get('contact') || '',
        message: data.get('message') || '',
        consent: fields.consent.checked,
        website: data.get('website') || ''
      };
    }

    function setFieldError(key, message) {
      var input = fields[key];
      var box = $('#f-' + key + '-error');
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
      if (message) input.setAttribute('aria-describedby', 'f-' + key + '-error');
      else input.removeAttribute('aria-describedby');
      if (box) box.textContent = message || '';
    }

    function showErrors(errors) {
      Object.keys(fields).forEach(function (key) { setFieldError(key, errors[key]); });
    }

    function setStatus(type, html) {
      status.className = 'form-status' + (type ? ' form-status--' + type : '');
      status.innerHTML = html || '';
    }

    function showFallback(reason) {
      var url = esc(CONFIG.telegramUrl || '#contacts');
      setStatus('error', reason + ' <a href="' + url + '" target="_blank" rel="noopener">Напишите мне в Telegram</a> — отвечу там.');
    }

    // Ошибка у поля исчезает, как только его исправили
    form.addEventListener('input', function (e) {
      var key = e.target.name;
      if (!fields[key] || fields[key].getAttribute('aria-invalid') !== 'true') return;
      setFieldError(key, window.LeadCore.validateLead(readForm()).errors[key]);
    });
    form.addEventListener('change', function (e) {
      if (e.target === fields.consent && fields.consent.getAttribute('aria-invalid') === 'true') {
        setFieldError('consent', window.LeadCore.validateLead(readForm()).errors.consent);
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = readForm();
      var result = window.LeadCore.validateLead(data);
      showErrors(result.errors);
      if (!result.ok) {
        setStatus('', '');
        var firstInvalid = ['name', 'contact', 'consent'].filter(function (k) { return result.errors[k]; })[0];
        fields[firstInvalid].focus();
        return;
      }

      if (window.location.protocol === 'file:') {
        showFallback('Форма заработает, когда сайт будет опубликован.');
        return;
      }

      submit.disabled = true;
      submit.classList.add('is-loading');
      setStatus('', 'Отправляю заявку…');

      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            return { status: res.status, body: body };
          });
        })
        .then(function (r) {
          if (r.status === 200 && r.body.ok) {
            form.reset();
            showErrors({});
            setStatus('success', 'Заявка отправлена. Отвечу в течение дня.');
            if (window.ym && CONFIG.metrikaId) window.ym(Number(CONFIG.metrikaId), 'reachGoal', 'lead');
          } else if (r.status === 400 && r.body.errors) {
            showErrors(r.body.errors);
            setStatus('', '');
          } else {
            showFallback('Не получилось отправить заявку.');
          }
        })
        .catch(function () {
          showFallback('Не получилось отправить заявку: нет связи с сервером.');
        })
        .then(function () {
          submit.disabled = false;
          submit.classList.remove('is-loading');
        });
    });
  }

  /* ---------- Яндекс.Метрика (если указан номер счётчика) ---------- */

  function initMetrika() {
    var id = CONFIG.metrikaId;
    if (!id) return;
    /* eslint-disable */
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
    /* eslint-enable */
    window.ym(Number(id), 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
  }

  applyContacts();
  initNav();
  initWorks();
  initAddons();
  initReveal();
  initHero();
  initJourney();
  initPlanPicker();
  initLeadForm();
  initMetrika();
})();
