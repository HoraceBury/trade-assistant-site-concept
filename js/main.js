/* =========================================================================
   PolTrade — page interactions
   ========================================================================= */
(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var scrollBehavior = function () { return reducedMotion.matches ? 'auto' : 'smooth'; };

  // i18n (js/i18n.js); falls back to Polish-only behaviour if it failed to load
  var I18n = window.PolTradeI18n || { t: function (k) { return k; }, lang: function () { return 'pl'; }, set: function () {}, onChange: function () {} };
  var t = I18n.t;

  /* ---------- Toast ---------- */
  var toastEl = $('#toast'), toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-visible'); }, 3200);
  }

  /* ---------- Header: compact on scroll ---------- */
  var header = $('.site-header');
  var progressBar = $('.scroll-progress-bar');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
      // how far down the whole page we are, 0–1
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (progressBar) progressBar.style.transform = 'scaleX(' + progress.toFixed(4) + ')';
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  // page height also changes when accordions, tabs or the form open and close
  if ('ResizeObserver' in window) new ResizeObserver(onScroll).observe(document.body);
  onScroll();

  /* ---------- Mobile menu ---------- */
  var nav = $('#primary-nav');
  var menuBtn = $('.menu-toggle');
  var desktopNav = window.matchMedia('(min-width: 1240px)');
  function setMenu(open, returnFocus) {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.querySelector('.menu-toggle-label').textContent = t(open ? 'menu.close' : 'menu.open');
    if (open) document.documentElement.style.setProperty('--nav-top', header.offsetHeight + 'px');
    nav.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) { var first = nav.querySelector('a'); if (first) first.focus(); }
    else if (returnFocus) menuBtn.focus();
  }
  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a') && !desktopNav.matches) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) setMenu(false, true);
  });
  var onDesktop = function () { if (desktopNav.matches) setMenu(false); };
  if (desktopNav.addEventListener) desktopNav.addEventListener('change', onDesktop);

  /* ---------- Active section in navigation ---------- */
  var navLinks = $$('.primary-nav ul a');
  var sections = navLinks.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
  if ('IntersectionObserver' in window) {
    var visibleSections = new Set();
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.isIntersecting ? visibleSections.add(en.target.id) : visibleSections.delete(en.target.id); });
      var current = null;
      sections.forEach(function (s) { if (visibleSections.has(s.id)) current = s.id; });
      navLinks.forEach(function (a) {
        if (a.getAttribute('href') === '#' + current) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Tabs (markets) ---------- */
  $$('[data-tabs]').forEach(function (root) {
    var tabs = $$('[role="tab"]', root);
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab); });
      tab.addEventListener('keydown', function (e) {
        var idx = null;
        if (e.key === 'ArrowRight') idx = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') idx = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') idx = 0;
        else if (e.key === 'End') idx = tabs.length - 1;
        if (idx !== null) { e.preventDefault(); select(tabs[idx], true); }
      });
    });
    select(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0]);
  });
  // footer market links preselect the matching tab
  $$('[data-market]').forEach(function (a) {
    a.addEventListener('click', function () {
      var tab = document.getElementById(a.getAttribute('data-market'));
      if (tab) tab.click();
    });
  });

  /* ---------- Switchers: tabs-like on desktop, accordion on mobile ---------- */
  $$('[data-switch]').forEach(function (root) {
    var items = $$('[data-switch-item]', root);
    var mq = window.matchMedia('(min-width: ' + root.getAttribute('data-switch-desktop') + 'px)');
    var current = 0;

    function apply(index) {
      current = index;
      items.forEach(function (item, i) {
        var on = i === index;
        var btn = $('.switch-btn', item), panel = $('.switch-panel', item);
        item.classList.toggle('is-active', on);
        item.classList.toggle('is-done', index > -1 && i < index);
        btn.setAttribute('aria-expanded', String(on));
        panel.hidden = !on;
      });
    }
    items.forEach(function (item, i) {
      var btn = $('.switch-btn', item);
      btn.addEventListener('click', function () {
        if (i === current) { if (!mq.matches) apply(-1); return; }  // mobile: tap open item to collapse
        apply(i);
        if (!mq.matches) {
          // keep the opened item in view on small screens
          var top = btn.getBoundingClientRect().top;
          if (top < header.offsetHeight) window.scrollTo({ top: window.scrollY + top - header.offsetHeight - 12, behavior: scrollBehavior() });
        }
      });
      btn.addEventListener('keydown', function (e) {
        if (!mq.matches) return;
        var next = null;
        var horiz = root.classList.contains('stages');
        if (e.key === (horiz ? 'ArrowRight' : 'ArrowDown')) next = Math.min(items.length - 1, i + 1);
        if (e.key === (horiz ? 'ArrowLeft' : 'ArrowUp')) next = Math.max(0, i - 1);
        if (next !== null) { e.preventDefault(); apply(next); $('.switch-btn', items[next]).focus(); }
      });
    });
    var onChange = function () { if (mq.matches && current < 0) apply(0); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    apply(0);
  });

  /* ---------- FAQ accordion (one answer open at a time) ---------- */
  $$('[data-accordion]').forEach(function (root) {
    var btns = $$('.acc-btn', root);
    function set(btn, open) {
      btn.setAttribute('aria-expanded', String(open));
      document.getElementById(btn.getAttribute('aria-controls')).classList.toggle('is-open', open);
    }
    btns.forEach(function (btn) {
      set(btn, false);
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') !== 'true';
        btns.forEach(function (b) { if (b !== btn) set(b, false); });
        set(btn, open);
      });
    });
  });

  /* ---------- Language switch ---------- */
  $$('.lang[lang]').forEach(function (b) {
    b.addEventListener('click', function () { I18n.set(b.getAttribute('lang')); });
  });
  I18n.onChange(function () {
    menuBtn.querySelector('.menu-toggle-label').textContent = t(menuBtn.getAttribute('aria-expanded') === 'true' ? 'menu.close' : 'menu.open');
  });
  menuBtn.querySelector('.menu-toggle-label').textContent = t('menu.open');

  /* ---------- Placeholder links (articles, privacy policy) ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-placeholder]');
    if (!a) return;
    e.preventDefault();
    toast(a.getAttribute('data-placeholder'));
  });

  /* ---------- Reveal on scroll ---------- */
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); revealer.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 70 + 'ms';
      revealer.observe(el);
    });
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Mobile persistent CTA ---------- */
  var mobileCta = $('.mobile-cta');
  if (mobileCta && 'IntersectionObserver' in window) {
    var blockers = new Set();
    var mobileCtaLinks = $$('a', mobileCta);
    var watch = [$('.hero'), $('#sprawdz'), $('.final-cta'), $('#kontakt'), $('.site-footer')];
    var ctaObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.isIntersecting ? blockers.add(en.target) : blockers.delete(en.target); });
      var show = blockers.size === 0;
      mobileCta.classList.toggle('is-visible', show);
      mobileCta.setAttribute('aria-hidden', String(!show));
      mobileCtaLinks.forEach(function (a) { a.tabIndex = show ? 0 : -1; });
    });
    watch.forEach(function (el) { if (el) ctaObserver.observe(el); });
  }

  /* ---------- Footer year ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* =======================================================================
     Assessment dialog
     ======================================================================= */
  var A = window.PolTradeAssessment;
  var dialog = $('#assess');
  var body = $('#assess-body');
  var track = $('#assess-track');
  var state = { step: 0, answers: {}, done: false };
  var pushedHistory = false;
  var opener = null;
  var afterClose = null;

  function activeQuestions() {
    return A.questions.filter(function (q) { return A.isActive(q, state.answers); });
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function renderProgress(total, current, finished) {
    var html = '';
    for (var i = 0; i < total; i++) {
      var cls = finished || i < current ? 'is-done' : (i === current ? 'is-current' : '');
      html += '<span class="' + cls + '"></span>';
    }
    track.innerHTML = html;
  }

  function renderQuestion() {
    var qs = activeQuestions();
    var q = qs[state.step];
    var selected = state.answers[q.id];
    var last = state.step === qs.length - 1;
    var T = A.tr(I18n.lang()).q[q.id];
    renderProgress(qs.length, state.step, false);

    var opts = q.options.map(function (o, i) {
      var id = 'aq-' + q.id + '-' + i;
      var label = T.o[o.v];
      return '<label class="assess-opt" for="' + id + '">' +
        '<input type="radio" name="' + q.id + '" id="' + id + '" value="' + esc(o.v) + '"' + (selected === o.v ? ' checked' : '') + '>' +
        '<span class="assess-opt-box"><span class="assess-radio" aria-hidden="true"></span>' +
        '<span class="assess-opt-text"><strong>' + esc(label[0]) + '</strong>' + (label[1] ? '<small>' + esc(label[1]) + '</small>' : '') + '</span></span>' +
        '</label>';
    }).join('');

    body.innerHTML =
      '<form class="assess-step is-entering" novalidate>' +
        '<p class="assess-count">' + esc(t('assess.count', { n: state.step + 1, total: qs.length })) + '</p>' +
        '<h2 class="assess-q" id="assess-q" tabindex="-1">' + esc(T.q) + '</h2>' +
        (T.help ? '<p class="assess-help" id="assess-help">' + esc(T.help) + '</p>' : '') +
        '<fieldset class="assess-options' + (q.twoCol ? ' is-two-col' : '') + '" aria-labelledby="assess-q"' + (T.help ? ' aria-describedby="assess-help"' : '') + '>' +
          '<legend class="visually-hidden">' + esc(T.q) + '</legend>' + opts +
        '</fieldset>' +
        '<div class="assess-nav">' +
          '<button type="button" class="assess-back" data-back' + (state.step === 0 ? ' disabled' : '') + '>' + esc(t('assess.back')) + '</button>' +
          '<span class="assess-keyhint">' + esc(t('assess.keyhint')) + '</span>' +
          '<button type="submit" class="btn btn-primary" data-next' + (selected ? '' : ' disabled') + '>' + esc(t(last ? 'assess.finish' : 'assess.next')) + ' <span class="btn-arrow" aria-hidden="true">→</span></button>' +
        '</div>' +
      '</form>';

    var form = $('form', body);
    var next = $('[data-next]', form);
    form.addEventListener('change', function (e) {
      if (e.target.name !== q.id) return;
      state.answers[q.id] = e.target.value;
      next.disabled = false;
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!state.answers[q.id]) return;
      go(1);
    });
    $('[data-back]', form).addEventListener('click', function () { go(-1); });
    $('#assess-q', body).focus();
  }

  function renderResult() {
    var qs = activeQuestions();
    renderProgress(qs.length, qs.length, true);
    var res = A.score(state.answers);
    var m = A.models[res.model];
    var lang = I18n.lang();
    var mt = A.tr(lang).models[res.model];
    var why = A.explain(state.answers, lang);
    state.result = res.model;

    $$('.model').forEach(function (el) { el.classList.remove('is-highlight'); });
    var modelEl = $(m.anchor);
    if (modelEl) modelEl.classList.add('is-highlight');

    body.innerHTML =
      '<div class="assess-step is-entering">' +
        '<p class="assess-done-mark">' + esc(t('assess.done', { n: qs.length })) + '</p>' +
        '<p class="assess-result-label">' + esc(t('assess.resultLabel')) + '</p>' +
        '<div class="assess-result-model"><span class="model-num">' + m.num + '</span><h2 id="assess-result" tabindex="-1">' + esc(m.name) + '</h2></div>' +
        '<p class="assess-result-sub">' + esc(mt.sub) + '</p>' +
        '<div class="assess-result-grid">' +
          '<div><h3>' + esc(t('assess.why')) + '</h3><p><strong>' + esc(why.context) + '</strong></p><p>' + esc(why.sentence) + '</p></div>' +
          '<div><h3>' + esc(t('assess.activities')) + '</h3><ul class="tick-list">' + mt.activities.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></div>' +
          '<div class="assess-next"><h3>' + esc(t('assess.nextStep')) + '</h3><p>' + esc(mt.next) + '</p>' +
            '<div class="assess-next-actions">' +
              '<button type="button" class="btn btn-primary" data-talk>' + esc(t('assess.talk')) + ' <span class="btn-arrow" aria-hidden="true">→</span></button>' +
              '<a href="tel:+48600000000">+48 600 000 000</a>' +
              '<a href="mailto:kontakt@poltrade.pl?subject=' + encodeURIComponent(t('assess.mailSubject', { model: m.name })) + '">kontakt@poltrade.pl</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="assess-nav">' +
          '<button type="button" class="assess-back" data-back>' + esc(t('assess.change')) + '</button>' +
          '<button type="button" class="assess-restart" data-restart>' + esc(t('assess.restart')) + '</button>' +
        '</div>' +
      '</div>';

    $('[data-back]', body).addEventListener('click', function () { go(-1); });
    $('[data-restart]', body).addEventListener('click', function () {
      state = { step: 0, answers: {}, done: false };
      $$('.model').forEach(function (el) { el.classList.remove('is-highlight'); });
      render();
    });
    $('[data-talk]', body).addEventListener('click', function () {
      prefillContact(res.model);
      afterClose = function () {
        var contact = $('#kontakt');
        contact.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
        var field = $('#f-name');
        setTimeout(function () { field.focus({ preventScroll: true }); }, reducedMotion.matches ? 0 : 600);
      };
      closeDialog();
    });
    $('#assess-result', body).focus();
  }

  function render() {
    var qs = activeQuestions();
    if (state.step >= qs.length) { state.done = true; renderResult(); }
    else { state.done = false; renderQuestion(); }
    body.scrollTop = 0;
  }

  function go(delta) {
    var qs = activeQuestions();
    state.step = Math.max(0, Math.min(qs.length, state.step + delta));
    // answers to now-skipped questions are dropped so they cannot influence the result
    A.questions.forEach(function (q) { if (!A.isActive(q, state.answers)) delete state.answers[q.id]; });
    render();
  }

  function prefillContact(modelKey) {
    // the select's option values match the assessment's company-type values
    if (state.answers.type) $('#f-who').value = state.answers.type;
    var msg = $('#f-msg');
    if (!msg.value.trim()) msg.value = A.summaryForContact(state.answers, modelKey, I18n.lang());
  }

  function openDialog(trigger) {
    if (!dialog) return;
    opener = trigger || document.activeElement;
    if (nav.classList.contains('is-open')) setMenu(false);
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      document.body.classList.add('dialog-open');
      if (location.hash !== '#sprawdz' || !history.state || !history.state.assess) {
        history.pushState({ assess: true }, '', '#sprawdz');
        pushedHistory = true;
      }
    }
    render();
  }

  function finishClose() {
    if (dialog.open) {
      if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
    }
  }

  function closeDialog() {
    if (pushedHistory) { pushedHistory = false; history.back(); }   // popstate closes the dialog
    else finishClose();
  }

  if (dialog) {
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-assess-open]');
      if (!t) return;
      e.preventDefault();
      openDialog(t);
    });
    $('[data-assess-close]', dialog).addEventListener('click', closeDialog);
    dialog.addEventListener('cancel', function (e) { e.preventDefault(); closeDialog(); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) closeDialog(); }); // backdrop
    dialog.addEventListener('close', function () {
      document.body.classList.remove('dialog-open');
      if (location.hash === '#sprawdz') history.replaceState(null, '', location.pathname + location.search);
      var fn = afterClose; afterClose = null;
      if (fn) fn();
      else if (opener && document.contains(opener) && typeof opener.focus === 'function') opener.focus({ preventScroll: true });
    });
    window.addEventListener('popstate', function () {
      if (dialog.open) { pushedHistory = false; finishClose(); }
    });
    if (location.hash === '#sprawdz') {
      history.replaceState({ assess: true }, '', '#sprawdz');
      openDialog(null);
      pushedHistory = false;
    }
  }

  /* =======================================================================
     Contact form
     ======================================================================= */
  var form = $('#contact-form');
  if (form) {
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var PHONE_RE = /^\+?[\d\s()\-]{7,}$/;
    var rules = {
      name: function (v) { return v.trim().length < 2 ? t('form.err.name') : ''; },
      email: function (v) {
        if (!v.trim()) return t('form.err.emailEmpty');
        return EMAIL_RE.test(v.trim()) ? '' : t('form.err.emailInvalid');
      },
      phone: function (v) { return !v.trim() || PHONE_RE.test(v.trim()) ? '' : t('form.err.phone'); },
      who: function (v) { return v ? '' : t('form.err.who'); },
      message: function (v) {
        if (!v.trim()) return t('form.err.messageEmpty');
        return v.trim().length < 10 ? t('form.err.messageShort') : '';
      },
      consent: function (v, el) { return el.checked ? '' : t('form.err.consent'); }
    };
    var attempted = false;
    var status = $('#form-status');
    var lastStatus = null;   // { key, vars }, kept so it can be re-rendered in another language
    function setStatus(key, vars) {
      lastStatus = key ? { key: key, vars: vars } : null;
      status.textContent = key ? t(key, vars) : '';
    }

    // switching language re-renders visible errors and the status line
    I18n.onChange(function () {
      $$('.field.has-error input, .field.has-error select, .field.has-error textarea', form).forEach(check);
      if (lastStatus) setStatus(lastStatus.key, lastStatus.vars);
    });

    function check(el) {
      var rule = rules[el.name];
      if (!rule) return true;
      var msg = rule(el.value, el);
      var field = el.closest('.field');
      var err = $('.field-error', field);
      field.classList.toggle('has-error', !!msg);
      field.classList.toggle('is-valid', !msg && el.type !== 'checkbox' && !!el.value.trim());
      el.setAttribute('aria-invalid', String(!!msg));
      if (err) err.textContent = msg;
      return !msg;
    }

    $$('input, select, textarea', form).forEach(function (el) {
      if (!rules[el.name]) return;
      var evt = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
      el.addEventListener(evt, function () { if (attempted || el.closest('.field').classList.contains('has-error')) check(el); });
      // validating on blur before the first submit would shift the layout under the pointer mid-click
      el.addEventListener('blur', function () { if (attempted) check(el); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      attempted = true;
      var invalid = $$('input, select, textarea', form).filter(function (el) { return rules[el.name] && !check(el); });
      if (invalid.length) {
        if (invalid.length === 1) setStatus('form.status.one'); else setStatus('form.status.many', { n: invalid.length });
        invalid[0].focus();
        return;
      }
      setStatus(null);

      var submit = $('.form-submit', form);
      var label = $('.submit-label', submit);
      submit.classList.add('is-loading'); submit.setAttribute('aria-disabled', 'true');
      label.textContent = t('form.sending');

      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      if (state.result) data.assessmentModel = A.models[state.result].name;
      data.language = I18n.lang();

      var endpoint = form.getAttribute('data-endpoint');
      var send;
      if (data.website) send = Promise.resolve();                          // honeypot: silently "succeed"
      else if (endpoint) {
        send = fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
          .then(function (r) { if (!r.ok) throw new Error(r.status); });
      } else send = new Promise(function (res) { setTimeout(res, 700); });  // no endpoint configured yet

      send.then(function () {
        var success = $('#form-success');
        form.hidden = true;
        success.hidden = false;
        success.classList.add('is-entering');
        success.focus();
      }).catch(function () {
        setStatus('form.status.failed');
      }).then(function () {
        submit.classList.remove('is-loading'); submit.removeAttribute('aria-disabled');
        label.textContent = t('form.send');
      });
    });
  }
})();
