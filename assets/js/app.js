/* =========================================================================
   app.js — логика сайта «Голос и психика».
   Данные (даты, тарифы, программа, спикеры, отзывы, партнёры) лежат в data.js.
   Интеграции: платежи — CONFIG.payments, приём заявок — CONFIG.forms.
   ========================================================================= */
(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var RUB = new Intl.NumberFormat('ru-RU');
  function money(v) { return RUB.format(v) + ' ₽'; }

  /* ============================== ТОСТЫ ============================== */
  var toastBox = $('#toasts');
  function toast(title, text, kind) {
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' is-' + kind : '');
    el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    el.innerHTML = '<div><b></b><span></span></div>';
    el.querySelector('b').textContent = title;
    el.querySelector('span').textContent = text || '';
    toastBox.appendChild(el);
    setTimeout(function () {
      el.classList.add('is-out');
      setTimeout(function () { el.remove(); }, 320);
    }, kind === 'error' ? 8000 : 5200);
  }

  /* ============================== МОДАЛКА ============================== */
  var modal = $('#modal');
  var modalBody = $('#modal-body');
  var lastFocused = null;

  function openModal(html) {
    lastFocused = document.activeElement;
    modalBody.innerHTML = html;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.modal-dialog', modal).focus();
  }
  function closeModal() {
    modal.hidden = true;
    modalBody.innerHTML = '';
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }
  $$('[data-modal-close]').forEach(function (el) { el.addEventListener('click', closeModal); });
  document.addEventListener('keydown', function (e) {
    if (modal.hidden) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'Tab') {
      var f = $$('a[href], button:not([disabled]), input, select, textarea', modal)
        .filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ============================== ШАПКА ============================== */
  var header = $('#site-header');
  var burger = $('#burger');
  var mobileMenu = $('#mobile-menu');
  var navLinks = $$('.main-nav a');
  var sections = navLinks.map(function (a) { return document.querySelector(a.getAttribute('href')); });

  function onScroll() {
    header.classList.toggle('is-stuck', window.scrollY > 24);
    var y = window.scrollY + header.offsetHeight + 80;
    var active = -1;
    sections.forEach(function (sec, i) { if (sec && sec.offsetTop <= y) active = i; });
    navLinks.forEach(function (a, i) { a.classList.toggle('is-active', i === active); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function closeMenu() {
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
    mobileMenu.hidden = true;
    document.body.style.overflow = '';
  }
  burger.addEventListener('click', function () {
    var open = burger.getAttribute('aria-expanded') === 'true';
    if (open) { closeMenu(); return; }
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Закрыть меню');
    mobileMenu.hidden = false;
    document.body.style.overflow = 'hidden';
  });
  $$('#mobile-menu a').forEach(function (a) { a.addEventListener('click', closeMenu); });

  /* плавный переход по якорям с учётом фиксированной шапки */
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="#"]');
    if (!link) return;
    var id = link.getAttribute('href');
    if (id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    var top = target.getBoundingClientRect().top + window.scrollY - (header.offsetHeight + 12);
    window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
    if (history.replaceState) history.replaceState(null, '', id);
  });

  /* ============================== ПОЯВЛЕНИЕ ============================== */
  var revealItems = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var sibs = Array.prototype.slice.call(el.parentNode.children).indexOf(el);
        el.style.setProperty('--d', Math.min(sibs, 6) * 70 + 'ms');
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
    revealItems.forEach(function (el) { io.observe(el); });
  } else {
    revealItems.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ======================= ВОЛНА / СПЕКТРОГРАММА ======================= */
  function waveSVG(seed, w, h) {
    var pts = [], i, x, mid = h / 2;
    for (i = 0; i <= 40; i++) {
      x = i / 40;
      var env = Math.pow(Math.sin(Math.PI * x), 0.7);
      var v = Math.sin((x * 9 + seed) * Math.PI * 2) * 0.5 +
              Math.sin((x * 3.2 + seed * 1.7) * Math.PI * 2) * 0.32 +
              Math.sin((x * 17 + seed) * Math.PI * 2) * 0.12;
      var a = v * env * h * 0.4;
      pts.push([x * w, mid - a]);
      pts.push([x * w, mid + a]);
    }
    /* верхняя линия слева направо, нижняя — справа налево: замкнутая фигура */
    var half = 41;
    var shape = pts.slice(0, half).concat(pts.slice(half).reverse());
    var d = 'M' + shape.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') + ' Z';
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="' + d + '" fill="currentColor" opacity=".45"/></svg>';
  }

  var spectro = $('#hero-spectro');
  if (spectro) {
    var bars = 56, html = '';
    for (var b = 0; b < bars; b++) {
      var t = b / (bars - 1);
      var env = Math.pow(Math.sin(Math.PI * t), .55);
      var v = Math.abs(Math.sin(t * 11.3) * .55 + Math.sin(t * 4.1 + 1) * .3 + Math.sin(t * 23 + .5) * .15);
      var h = Math.max(6, v * env * 100);
      html += '<i style="height:' + h.toFixed(1) + '%;animation-delay:' + (b * 45 % 1800) + 'ms"></i>';
    }
    spectro.innerHTML = html;
  }

  function drawWave(canvas) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, t = 0, raf = null, visible = false;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);
      var layers = [
        { color: 'rgba(79,199,186,.55)', amp: .52, f: 1.0, speed: 1.0 },
        { color: 'rgba(120,150,225,.34)', amp: .34, f: 1.9, speed: -.6 }
      ];
      layers.forEach(function (L) {
        ctx.beginPath();
        for (var x = 0; x <= w; x += 3) {
          var p = x / w;
          var env = Math.pow(Math.sin(Math.PI * Math.pow(p, .85)), .6);
          var v = Math.sin(p * 34 * L.f + t * 2.1 * L.speed) * .52 +
                  Math.sin(p * 8 * L.f + t * 1.15 * L.speed) * .33 +
                  Math.sin(p * 88 * L.f + t * 3.1 * L.speed) * .15;
          var y = h * .58 - v * env * h * L.amp;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = L.color;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      });
      t += 0.012;
      if (visible && !reduceMotion) raf = requestAnimationFrame(frame);
    }

    function start() { if (!raf && visible) { raf = requestAnimationFrame(frame); } }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

    resize();
    frame();

    window.addEventListener('resize', function () { resize(); if (reduceMotion) frame(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; visible ? start() : stop(); },
        { threshold: 0 }).observe(canvas);
    }
  }
  drawWave($('#hero-wave'));
  drawWave($('#cta-wave'));

  /* ============================== ПРОГРАММА ============================== */
  var TRACK_LABEL = {
    science: 'Поток 1 · Научный',
    practice: 'Поток 2 · Практический',
    group: 'Поток 3 · Групповой',
    common: 'Общая программа'
  };
  var tabsBox = $('#program-tabs');
  var bodyBox = $('#program-body');
  var flatSessions = [];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }
  function isTbd(s) { return typeof s === 'string' && /\[.*\]/.test(s); }

  function sessionCard(item, sid) {
    var hasDesc = !!(item.desc && item.desc.length > 12);
    return '<article class="session" data-track="' + esc(item.track) + '">' +
      '<span class="session-type">' + esc(item.type) + '</span>' +
      '<h3 class="session-title">' + esc(item.title) + '</h3>' +
      (item.speaker ? '<p class="session-meta">Спикер: ' +
        (isTbd(item.speaker) ? '<span class="tbd">' + esc(item.speaker) + '</span>' : esc(item.speaker)) +
        '</p>' : '') +
      (hasDesc ? '<button class="session-more" type="button" data-session="' + sid + '">Подробнее</button>' : '') +
      '</article>';
  }

  function renderDay(day) {
    flatSessions = [];
    var out = '';
    day.slots.forEach(function (slot) {
      function push(item) {
        flatSessions.push({ s: item, time: slot.time, timeNote: slot.timeNote, day: day.dateLabel });
        return flatSessions.length - 1;
      }
      var cells;
      if (slot.common) {
        var commonId = slot.common.desc ? push(slot.common) : -1;
        cells = sessionCard(slot.common, commonId);
        cells = cells.replace('<article class="session"', '<article class="session session--common"');
      } else {
        cells = slot.items.map(function (item) {
          return sessionCard(item, item.desc ? push(item) : -1);
        }).join('');
      }
      out += '<div class="slot' + (slot.common ? ' slot--common' : '') + '">' +
        '<div class="slot-time">' + esc(slot.time) + (slot.timeNote ? '<span>' + esc(slot.timeNote) + '</span>' : '') + '</div>' +
        '<div class="slot-cells">' + cells + '</div></div>';
    });
    bodyBox.innerHTML = out;
  }

  function renderTabs() {
    tabsBox.innerHTML = PROGRAM.map(function (d, i) {
      return '<button type="button" role="tab" id="tab-' + d.id + '" aria-controls="program-body" ' +
        'aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? 0 : -1) + '" data-day="' + d.id + '">' +
        esc(d.tabLabel) + '<small>' + esc(d.dateLabel) + ' · ' + esc(d.title) + '</small></button>';
    }).join('');
  }

  renderTabs();
  renderDay(PROGRAM[0]);

  tabsBox.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-day]');
    if (!btn) return;
    $$('button', tabsBox).forEach(function (b) {
      b.setAttribute('aria-selected', b === btn);
      b.tabIndex = b === btn ? 0 : -1;
    });
    var day = PROGRAM.filter(function (d) { return d.id === btn.dataset.day; })[0];
    renderDay(day);
  });

  tabsBox.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var list = $$('button', tabsBox);
    var i = list.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    var next = list[(i + (e.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length];
    next.focus();
    next.click();
  });

  bodyBox.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-session]');
    if (!btn) return;
    var row = flatSessions[+btn.dataset.session];
    if (!row) return;
    var s = row.s;
    openModal(
      '<p class="modal-kicker">' + esc(TRACK_LABEL[s.track] || '') + ' · ' + esc(s.type) + '</p>' +
      '<h2 class="modal-title" id="modal-title">' + esc(s.title) + '</h2>' +
      '<div class="modal-text"><p>' + esc(s.desc) + '</p></div>' +
      '<dl class="modal-meta">' +
        '<div><dt>Формат</dt><dd>' + esc(s.type) + '</dd></div>' +
        (s.speaker ? '<div><dt>Спикер</dt><dd>' + esc(s.speaker) + '</dd></div>' : '') +
        '<div><dt>Время</dt><dd>' + esc(row.time) + (row.timeNote ? ' · ' + esc(row.timeNote) : '') + '</dd></div>' +
        '<div><dt>День</dt><dd>' + esc(row.day) + '</dd></div>' +
      '</dl>' +
      '<div class="modal-actions"><a class="btn btn-primary" href="#registration" data-modal-jump>Зарегистрироваться</a></div>'
    );
  });

  /* ============================== СПИКЕРЫ ============================== */
  var speakersBox = $('#speakers-grid');
  if (speakersBox) {
    speakersBox.innerHTML = SPEAKERS.map(function (s, i) {
      var photo = s.photo
        ? '<img src="' + esc(s.photo) + '" alt="' + esc(s.name) + '" loading="lazy">'
        : '<b>' + esc(s.initials) + '</b>' + waveSVG(i * 1.7 + .3, 200, 60);
      return '<article class="sp-card reveal">' +
        '<div class="sp-photo">' + (s.photo ? '' : '<span class="sp-photo-tag">фото</span>') + photo + '</div>' +
        '<h3 class="sp-name"><span class="tbd">' + esc(s.name) + '</span></h3>' +
        '<p class="sp-role">' + esc(s.role) + '<br><span class="tbd">' + esc(s.org) + '</span> · ' +
          '<span class="tbd">' + esc(s.degree) + '</span></p>' +
        '<p class="sp-talk">' + esc(s.talk) + '</p>' +
        '<button class="sp-more" type="button" data-speaker="' + esc(s.id) + '">Подробнее</button>' +
        '</article>';
    }).join('');

    speakersBox.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-speaker]');
      if (!btn) return;
      var s = SPEAKERS.filter(function (x) { return x.id === btn.dataset.speaker; })[0];
      if (!s) return;
      var photo = s.photo
        ? '<img src="' + esc(s.photo) + '" alt="' + esc(s.name) + '">'
        : '<b>' + esc(s.initials) + '</b>';
      openModal(
        '<div class="modal-speaker"><div class="sp-photo">' + (s.photo ? '' : '<span class="sp-photo-tag">фото</span>') + photo + '</div>' +
        '<div><b><span class="tbd">' + esc(s.name) + '</span></b><span>' + esc(s.role) + '</span></div></div>' +
        '<p class="modal-kicker" style="margin-top:22px">Тема выступления</p>' +
        '<h2 class="modal-title" id="modal-title">' + esc(s.talk) + '</h2>' +
        '<div class="modal-text"><p>' + esc(s.about) + '</p><p>' + esc(s.experience) + '</p></div>' +
        '<dl class="modal-meta">' +
          '<div><dt>Должность</dt><dd>' + esc(s.role) + '</dd></div>' +
          '<div><dt>Организация</dt><dd><span class="tbd">' + esc(s.org) + '</span></dd></div>' +
          '<div><dt>Статус</dt><dd><span class="tbd">' + esc(s.degree) + '</span></dd></div>' +
        '</dl>' +
        '<div class="modal-tags">' + (s.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>' +
        '<div class="modal-actions">' +
          '<a class="btn btn-primary" href="#registration" data-modal-jump>Зарегистрироваться на конференцию</a>' +
          '<a class="btn btn-outline" href="mailto:' + CONFIG.contacts.email + '?subject=' +
            encodeURIComponent(CONFIG.forms.subjectPrefix + ': вопрос спикеру ' + s.id) + '">Задать вопрос спикеру</a>' +
        '</div>'
      );
    });

    var newCards = $$('.sp-card', speakersBox);
    if ('IntersectionObserver' in window && !reduceMotion) {
      var io2 = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.add('is-in');
          io2.unobserve(en.target);
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: .1 });
      newCards.forEach(function (c) { io2.observe(c); });
    } else {
      newCards.forEach(function (c) { c.classList.add('is-in'); });
    }
  }

  /* ============================== ТАРИФЫ ============================== */
  var regForm = $('#regForm');
  var tariffSelect = $('#rg-tariff');
  var orderBody = $('#order-body');
  var promoInput = $('#rg-promo');
  var state = { tariff: 'practice', promo: null };

  if (tariffSelect) {
    tariffSelect.innerHTML = TARIFFS.map(function (t) {
      return '<option value="' + t.id + '">' + esc(t.name) + ' — ' + money(t.oldPrice) + '</option>';
    }).join('');
    tariffSelect.value = state.tariff;
  }

  var pricingBox = $('#pricing-grid');
  if (pricingBox) {
    pricingBox.innerHTML = TARIFFS.map(function (t) {
      return '<article class="price-card' + (t.featured ? ' price-card--featured' : '') + '">' +
        (t.badge ? '<span class="price-badge">' + esc(t.badge) + '</span>' : '') +
        '<h3 class="price-name">' + esc(t.name) + '</h3>' +
        '<p class="price-for">' + esc(t.forWhom) + '</p>' +
        '<p class="price-value">' + money(t.oldPrice) + ' <s>' + money(t.price) + '</s></p>' +
        '<p class="price-early">' + esc(t.priceNote) + '</p>' +
        '<ul class="price-list">' + t.features.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>' +
        '<button class="btn ' + (t.featured ? 'btn-primary' : 'btn-outline') + '" type="button" data-tariff="' + t.id + '">' +
        esc(t.cta) + '</button></article>';
    }).join('');

    pricingBox.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-tariff]');
      if (!btn) return;
      selectTariff(btn.dataset.tariff, true);
    });
  }

  function currentTariff() {
    return TARIFFS.filter(function (t) { return t.id === state.tariff; })[0] || TARIFFS[0];
  }

  function selectTariff(id, scroll) {
    state.tariff = id;
    if (tariffSelect) tariffSelect.value = id;
    renderOrder();
    if (scroll) {
      document.getElementById('registration').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      setTimeout(function () { tariffSelect.focus({ preventScroll: true }); }, 500);
      toast('Тариф выбран', currentTariff().name + ' — ' + money(currentTariff().oldPrice), 'info');
    }
  }

  function calcTotal() {
    var t = currentTariff();
    var total = t.oldPrice;
    var discount = 0;
    if (state.promo && PROMOS[state.promo]) {
      discount = Math.round(total * PROMOS[state.promo].value / 100);
      total -= discount;
    }
    return { tariff: t, total: total, discount: discount };
  }

  function formValues(form) {
    var out = {};
    $$('input, select, textarea', form).forEach(function (el) {
      if (!el.name) return;
      if (el.type === 'checkbox') {
        if (el.checked) out[el.name] = (out[el.name] ? out[el.name] + ', ' : '') + (el.value || 'да');
      } else if (el.type === 'radio') {
        if (el.checked) out[el.name] = el.value;
      } else if (el.type !== 'file') {
        out[el.name] = el.value;
      }
    });
    return out;
  }

  function renderOrder() {
    if (!orderBody) return;
    var v = regForm ? formValues(regForm) : {};
    var c = calcTotal();
    var html = '';
    html += '<div class="order-line"><span>Тариф</span><b>' + esc(c.tariff.name) + '<small>' + esc(c.tariff.oldPrice + ' ₽ за участника') + '</small></b></div>';
    html += '<div class="order-line"><span>Формат</span><b>' + esc(v.attend || 'Офлайн (Москва)') + '</b></div>';
    if (v.organization) html += '<div class="order-line"><span>Организация</span><b>' + esc(v.organization) + '</b></div>';
    html += '<div class="order-line"><span>Сертификат</span><b>' + (v.certificate ? 'Нужен' : 'Не требуется') + '</b></div>';
    if (v.dining) html += '<div class="order-line"><span>Питание на месте</span><b>Заказано</b></div>';
    if (c.discount > 0) {
      html += '<div class="order-line"><span>Промокод ' + esc(state.promo) + '</span><b class="order-discount">−' +
        money(c.discount) + '<small>' + esc(PROMOS[state.promo].label) + '</small></b></div>';
    }
    html += '<div class="order-total"><span>К оплате</span><b data-order-total>' + money(c.total) + '</b></div>';
    orderBody.innerHTML = html;
  }

  if (tariffSelect) {
    tariffSelect.addEventListener('change', function () { state.tariff = tariffSelect.value; renderOrder(); });
    regForm.addEventListener('change', function (e) {
      if (e.target.closest('[data-mask="phone"]')) return;
      renderOrder();
    });
  }
  renderOrder();

  /* промокод */
  var promoBtn = $('#promo-apply');
  var promoMsg = $('#promo-msg');
  function applyPromo() {
    var code = (promoInput.value || '').trim().toUpperCase();
    promoMsg.className = 'promo-msg';
    if (!code) { state.promo = null; renderOrder(); return; }
    if (PROMOS[code]) {
      state.promo = code;
      promoMsg.textContent = 'Промокод применён: ' + PROMOS[code].label + ' (−' + PROMOS[code].value + '%)';
      promoMsg.classList.add('is-ok');
    } else {
      state.promo = null;
      promoMsg.textContent = 'Промокод не найден или срок действия истёк.';
      promoMsg.classList.add('is-error');
    }
    renderOrder();
  }
  if (promoBtn) {
    promoBtn.addEventListener('click', applyPromo);
    promoInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); applyPromo(); } });
  }

  /* ============================== ВАЛИДАЦИЯ ============================== */
  function validateField(el) {
    var wrap = el.closest('.field') || el.closest('fieldset');
    var err = wrap ? $('.field-error', wrap) : null;
    var msg = '';
    var v = (el.value || '').trim();
    if (el.required && el.type === 'checkbox' && !el.checked) msg = 'Нужно подтвердить согласие';
    else if (el.required && el.type !== 'checkbox' && el.type !== 'file' && !v) msg = 'Заполните поле';
    else if (el.type === 'file' && el.required && !el.files.length) msg = 'Прикрепите файл';
    else if (el.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = 'Проверьте адрес почты';
    else if (el.type === 'tel' && v && (v.replace(/\D/g, '').length < 10)) msg = 'Проверьте номер телефона';
    else if (el.required && el.tagName === 'SELECT' && !v) msg = 'Выберите вариант';
    if (err) err.textContent = msg;
    el.classList.toggle('has-error', !!msg);
    return !msg;
  }

  function validateForm(form) {
    var fields = $$('input, select, textarea', form).filter(function (el) { return el.name; });
    var ok = true, firstBad = null;
    fields.forEach(function (el) {
      var good = validateField(el);
      if (!good && ok) { ok = false; firstBad = el; }
    });
    if (firstBad) {
      firstBad.focus();
      firstBad.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    return ok;
  }

  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el.matches('[data-mask="phone"]')) { phoneMask(el); }
    if (el.hasAttribute('data-count-for')) {
      var box = document.querySelector('[data-count-for="' + el.id + '"]');
      if (box) box.textContent = el.value.length;
    }
    if (el.classList.contains('has-error')) validateField(el);
  });

  function phoneMask(el) {
    var digits = el.value.replace(/\D/g, '');
    if (digits.indexOf('8') === 0) digits = '7' + digits.slice(1);
    if (digits.indexOf('7') !== 0) digits = '7' + digits;
    digits = digits.slice(0, 11);
    var out = '+7';
    if (digits.length > 1) out += ' (' + digits.slice(1, 4);
    if (digits.length >= 5) out += ') ' + digits.slice(4, 7);
    if (digits.length >= 8) out += '-' + digits.slice(7, 9);
    if (digits.length >= 10) out += '-' + digits.slice(9, 11);
    el.value = out;
  }
  $$('[data-mask="phone"]').forEach(function (el) {
    el.addEventListener('focus', function () { if (!el.value) el.value = '+7 ('; });
    el.addEventListener('blur', function () { if (el.value.replace(/\D/g, '').length <= 1) el.value = ''; });
  });

  $$('[data-file-label]').forEach(function (input) {
    input.addEventListener('change', function () {
      var nameEl = input.parentNode.querySelector('.file-name');
      if (!nameEl) {
        nameEl = document.createElement('span');
        nameEl.className = 'file-name';
        input.parentNode.appendChild(nameEl);
      }
      nameEl.textContent = input.files.length
        ? 'Прикреплено: ' + input.files[0].name + ' (' + Math.round(input.files[0].size / 1024) + ' КБ)'
        : '';
    });
  });

  /* ============================== ОТПРАВКА ЗАЯВОК ============================== */
  function mailtoBody(kind, values) {
    var lines = ['Тип заявки: ' + kind, ''];
    Object.keys(values).forEach(function (k) {
      if (values[k]) lines.push(k + ': ' + values[k]);
    });
    lines.push('', 'Дата: ' + new Date().toLocaleString('ru-RU'));
    return lines.join('\n');
  }

  function openMail(kind, values) {
    var to = kind === 'speaker' ? CONFIG.contacts.speakersEmail
      : kind === 'question' ? CONFIG.contacts.email : CONFIG.contacts.email;
    var subject = CONFIG.forms.subjectPrefix + ' — ' +
      (kind === 'speaker' ? 'заявка спикера' : kind === 'question' ? 'вопрос' : 'регистрация участника');
    window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(mailtoBody(kind, values));
  }

  function postToEndpoint(form, values) {
    var endpoint = form.dataset.endpoint || CONFIG.forms.endpoint;
    if (!endpoint) return Promise.resolve({ ok: true, offline: true });
    var fd = new FormData(form);
    return fetch(endpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r; });
  }

  function bindSimpleForm(formId, kind, successTitle, successText) {
    var form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateForm(form)) { toast('Проверьте форму', 'Некоторые поля заполнены неверно', 'error'); return; }
      var btn = $('button[type="submit"]', form);
      btn.disabled = true;
      btn.textContent = 'Отправляем…';
      var values = formValues(form);
      values.form = kind;
      postToEndpoint(form, values)
        .then(function (r) {
          if (r.offline && CONFIG.forms.mailFallback) openMail(kind, values);
          form.reset();
          $$('.has-error', form).forEach(function (el) { el.classList.remove('has-error'); });
          toast(successTitle, successText, 'success');
        })
        .catch(function () {
          toast('Не удалось отправить заявку', 'Проверьте соединение или напишите нам на ' + CONFIG.contacts.email, 'error');
          if (CONFIG.forms.mailFallback) openMail(kind, values);
        })
        .then(function () { btn.disabled = false; btn.textContent = btn.dataset.label || btn.textContent; });
    });
    var submit = $('button[type="submit"]', form);
    if (submit) submit.dataset.label = submit.textContent;
  }

  bindSimpleForm('speakerForm', 'speaker', 'Заявка отправлена',
    'Мы напишем вам в течение 10 рабочих дней.');
  bindSimpleForm('askForm', 'question', 'Вопрос отправлен',
    'Ответим в рабочие дни с 10:00 до 19:00 (МСК).');

  /* ============================== РЕГИСТРАЦИЯ И ОПЛАТА ============================== */
  var orderPanel = $('#order-panel');
  var payBtn = $('#pay-btn');
  var orderSuccess = $('#order-success');

  function showStep(n) {
    $$('[data-order-step]', orderPanel).forEach(function (el) {
      el.hidden = el.dataset.orderStep !== String(n);
    });
    // на шагах оплаты и подтверждения кнопки регистрации не нужны
    ['.form-actions', '.form-legal'].forEach(function (sel) {
      var el = $(sel, regForm);
      if (el) el.hidden = n > 1;
    });
  }

  if (regForm) {
    regForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateForm(regForm)) { toast('Проверьте форму', 'Некорректные данные в выделенных полях', 'error'); return; }
      var v = formValues(regForm);
      state.attend = v.attend;
      showStep(2);
      payBtn.textContent = 'Оплатить ' + money(calcTotal().total);
      orderPanel.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      toast('Данные приняты', 'Осталось выбрать способ оплаты', 'info');
    });

    var invoiceBtn = $('[data-send-invoice]', regForm);
    if (invoiceBtn) {
      invoiceBtn.addEventListener('click', function () {
        if (!validateForm(regForm)) { toast('Проверьте форму', 'Некорректные данные в выделенных полях', 'error'); return; }
        var values = formValues(regForm);
        values.form = 'participant-invoice';
        values.tariff = currentTariff().name;
        openMail('participant', values);
        toast('Заявка без оплаты отправлена',
          'Организаторы свяжутся с вами в течение одного рабочего дня.', 'success');
      });
    }

    var backBtn = $('[data-order-back]');
    if (backBtn) backBtn.addEventListener('click', function () { showStep(1); });

    $$('input[name="pay"]').forEach(function (r) {
      r.addEventListener('change', function () {
        var sbp = $('#sbp-phone-field');
        if (sbp) sbp.classList.toggle('hidden', r.value !== 'СБП' || !r.checked);
      });
    });

    if (payBtn) {
      payBtn.addEventListener('click', function () {
        var method = ($$('input[name="pay"]').filter(function (r) { return r.checked; })[0] || {}).value || 'Банковская карта';
        if (method === 'СБП') {
          var f = $('#sbp-phone');
          if (f && f.value.replace(/\D/g, '').length < 10) {
            toast('Проверьте номер', 'Для оплаты по СБП нужен полный номер телефона', 'error');
            f.focus();
            return;
          }
        }
        var c = calcTotal();
        var v = formValues(regForm);
        var no = 'GP-2027-' + String(Math.floor(1000 + Math.random() * 8999));
        payBtn.disabled = true;
        payBtn.textContent = 'Обрабатываем платёж…';

        var go = CONFIG.payments.checkoutUrl
          ? new Promise(function (resolve) { resolve({ redirect: true }); })
          : postToEndpoint(regForm, Object.assign({ form: 'payment', tariff: c.tariff.name, sum: c.total, method: method, order: no }, v));

        go.then(function (r) {
          if (r && r.redirect) {
            var url = CONFIG.payments.checkoutUrl +
              '?amount=' + c.total + '&order=' + no + '&tariff=' + encodeURIComponent(c.tariff.name) +
              '&email=' + encodeURIComponent(v.email || '') + '&name=' + encodeURIComponent(v.name || '');
            window.location.href = url;
            return;
          }
          if (/[?&]test=error\b/.test(location.search)) throw new Error('test');
          showSuccess(no, c, method, v);
        }).catch(function () {
          payBtn.disabled = false;
          payBtn.textContent = 'Оплатить ' + money(c.total);
          toast('Ошибка оплаты', 'Платёж не прошёл. Попробуйте ещё раз или выберите другой способ.', 'error');
          showStep(2);
        });
      });
    }
  }

  function showSuccess(no, c, method, v) {
    showStep(3);
    orderSuccess.innerHTML =
      '<div class="success-box">' +
        '<div class="success-mark"><svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M4 12.5l5.2 5.2L20 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
        '<h4>Оплата принята, регистрация подтверждена</h4>' +
        '<p>Спасибо! Подтверждение и детали участия отправлены на <b>' + esc(v.email || 'вашу почту') + '</b>.</p>' +
        '<p class="order-no">Номер заказа: ' + esc(no) + '</p>' +
        '<dl class="modal-meta">' +
          '<div><dt>Участник</dt><dd>' + esc(v.name || '—') + '</dd></div>' +
          '<div><dt>Тариф</dt><dd>' + esc(c.tariff.name) + '</dd></div>' +
          '<div><dt>Сумма</dt><dd>' + money(c.total) + ' · ' + esc(method) + '</dd></div>' +
        '</dl>' +
        '<p>Что дальше: письмо с программой и правилами участия, доступ к материалам, ' +
        'напоминание за неделю до конференции. Вопросы — ' +
        '<a href="mailto:' + CONFIG.contacts.email + '">' + CONFIG.contacts.email + '</a>.</p>' +
        '<div class="modal-actions">' +
          '<a class="btn btn-outline" href="#program" data-modal-jump>Смотреть программу</a>' +
          '<a class="btn btn-outline" href="mailto:' + CONFIG.contacts.email + '?subject=' +
            encodeURIComponent('Заказ ' + no) + '">Запросить подтверждение</a>' +
        '</div>' +
      '</div>';
    toast('Регистрация подтверждена', 'Номер заказа ' + no, 'success');
  }

  /* ============================== ОТЗЫВЫ ============================== */
  var track = $('#reviews-track');
  if (track) {
    var dots = $('#reviews-dots');
    track.innerHTML = REVIEWS.map(function (r) {
      var initial = r.name.trim().charAt(0);
      return '<article class="review">' +
        '<p class="review-quote" aria-hidden="true">“</p>' +
        '<p>' + esc(r.text) + (r.pending ? ' <span class="tbd">Отзыв ожидает подтверждения</span>' : '') + '</p>' +
        '<div class="review-author"><span class="review-avatar">' + esc(initial) + '</span>' +
        '<div><b><span class="tbd">' + esc(r.name) + '</span></b><span>' + esc(r.profession) + '</span></div></div>' +
        '</article>';
    }).join('');

    var cards = $$('.review', track);
    var idx = 0;

    function step() {
      if (cards.length < 2) return 1;
      return cards[1].offsetLeft - cards[0].offsetLeft;
    }
    function perView() {
      var s = step();
      return s > 0 ? Math.max(1, Math.round(track.clientWidth / s)) : 1;
    }
    function maxIdx() { return Math.max(0, cards.length - perView()); }

    function go(i) {
      idx = Math.min(Math.max(i, 0), maxIdx());
      track.style.transform = 'translateX(' + (-idx * step()) + 'px)';
      $$('button', dots).forEach(function (b, n) { b.setAttribute('aria-selected', n === idx); });
    }
    function buildDots() {
      dots.innerHTML = '';
      for (var i = 0; i <= maxIdx(); i++) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', i === idx);
        b.setAttribute('aria-label', 'Отзыв ' + (i + 1));
        b.addEventListener('click', function (e) { go(+e.target.dataset.i); });
        b.dataset.i = i;
        dots.appendChild(b);
      }
    }
    $('#rev-next').addEventListener('click', function () { go(idx + 1); });
    $('#rev-prev').addEventListener('click', function () { go(idx - 1); });

    var slider = $('#reviews-slider');
    slider.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
    });
    var sx = null;
    slider.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    slider.addEventListener('pointerup', function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx;
      if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
      sx = null;
    });
    window.addEventListener('resize', function () { buildDots(); go(idx); });
    buildDots();
    go(0);
  }

  /* ============================== ПАРТНЁРЫ ============================== */
  var partnersBox = $('#partners-grid');
  if (partnersBox) {
    partnersBox.innerHTML = PARTNERS.map(function (p) {
      var inner = p.logo
        ? '<img src="' + esc(p.logo) + '" alt="' + esc(p.name) + '" loading="lazy">'
        : '<b>' + esc(p.name) + '</b><span>' + esc(p.kind) + '</span>';
      return p.url
        ? '<li class="reveal"><a class="partner" href="' + esc(p.url) + '" target="_blank" rel="noopener">' + inner + '</a></li>'
        : '<li class="reveal"><div class="partner">' + inner + '</div></li>';
    }).join('');
    if ('IntersectionObserver' in window && !reduceMotion) {
      var io3 = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.add('is-in');
          io3.unobserve(en.target);
        });
      }, { threshold: .15 });
      $$('.reveal', partnersBox).forEach(function (el) { io3.observe(el); });
    } else {
      $$('.reveal', partnersBox).forEach(function (el) { el.classList.add('is-in'); });
    }
  }

  /* ============================== ПЛАВАЮЩАЯ ПАНЕЛЬ ============================== */
  var askBtn = $('#ask-btn');
  var askPanel = $('#ask-panel');
  function toggleAsk(force) {
    var open = force != null ? force : askPanel.hidden;
    askPanel.hidden = !open;
    askBtn.setAttribute('aria-expanded', String(open));
    if (open) setTimeout(function () { $('#ak-name').focus(); }, 60);
  }
  askBtn.addEventListener('click', function () { toggleAsk(); });
  $('#ask-close').addEventListener('click', function () { toggleAsk(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !askPanel.hidden) toggleAsk(false);
  });
  document.addEventListener('click', function (e) {
    if (askPanel.hidden) return;
    if (!askPanel.contains(e.target) && !askBtn.contains(e.target)) toggleAsk(false);
  });

  /* ============================== ССЫЛКИ ============================== */
  function fillLinks() {
    $$('[data-messenger]').forEach(function (a) {
      var label = a.textContent.trim();
      var s = CONFIG.contacts.socials.filter(function (x) { return x.label === label; })[0];
      var href = s && s.url ? s.url : '';
      if (href) { a.href = href; if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; } }
      else { a.removeAttribute('href'); a.setAttribute('aria-disabled', 'true'); }
    });
    $$('a[href^="tel:"]').forEach(function (a) { a.href = 'tel:' + CONFIG.contacts.phoneHref; });
    /* e-mail в разметке — заглушки; подставляем актуальные из CONFIG */
    var mailMap = {
      'conference@golos-i-psihika.ru': CONFIG.contacts.email,
      'speakers@golos-i-psihika.ru': CONFIG.contacts.speakersEmail,
      'press@golos-i-psihika.ru': CONFIG.contacts.pressEmail,
      'partners@golos-i-psihika.ru': CONFIG.contacts.partnersEmail
    };
    $$('a[href^="mailto:"]').forEach(function (a) {
      var m = a.getAttribute('href').match(/^mailto:([^?]+)/);
      if (m && mailMap[m[1]]) a.setAttribute('href', 'mailto:' + mailMap[m[1]]);
    });
  }
  fillLinks();

  document.addEventListener('click', function (e) {
    var link = e.target.closest('[data-modal-jump]');
    if (!link) return;
    closeModal();
    setTimeout(function () {
      var t = document.querySelector(link.getAttribute('href'));
      if (t) t.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    }, 60);
  });

  /* год в подвале */
  var yEl = $('#year');
  if (yEl) yEl.textContent = new Date().getFullYear();

  /* ============================== АНАЛИТИКА ============================== */
  if (CONFIG.analytics.yandexMetrikaId) {
    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.async = true;
    s.src = 'https://mc.yandex.ru/metrika/tag.js';
    document.head.appendChild(s);
  }
  if (CONFIG.analytics.googleAnalyticsId) {
    var g = document.createElement('script');
    g.async = true;
    g.src = 'https://www.googletagmanager.com/gtag/js?id=' + CONFIG.analytics.googleAnalyticsId;
    document.head.appendChild(g);
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    window.dataLayer.push({
      event: 'config.js',
      'google_analytics_id': CONFIG.analytics.googleAnalyticsId
    });
  }
})();
