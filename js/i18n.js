/* =========================================================================
   PolTrade — language switching (PL / EN / DE)
   Polish text is read from the page itself on load, so index.html stays the
   single source for Polish. EN/DE come from js/translations.js. Nothing is
   fetched or machine-translated at runtime.

   Markup contract:
     data-i18n="key"                     element innerHTML is translated
     data-i18n-attr="attr:key;attr:key"  attributes are translated
   ========================================================================= */
(function () {
  'use strict';

  var LANGS = ['pl', 'en', 'de'];
  var STORE_KEY = 'poltrade-lang';
  var data = window.PolTradeTranslations || { ui: { pl: {} } };
  var root = document.documentElement;
  var source = {};              // key → Polish original
  var textEls = [], attrEls = [];
  var current = 'pl';
  var listeners = [];

  function parseAttrSpec(el) {
    return el.getAttribute('data-i18n-attr').split(';').map(function (pair) {
      var i = pair.indexOf(':');
      return { attr: pair.slice(0, i), key: pair.slice(i + 1) };
    });
  }

  function collect() {
    textEls = Array.prototype.slice.call(document.querySelectorAll('[data-i18n]'));
    attrEls = Array.prototype.slice.call(document.querySelectorAll('[data-i18n-attr]'));
    textEls.forEach(function (el) { source[el.getAttribute('data-i18n')] = el.innerHTML; });
    attrEls.forEach(function (el) {
      parseAttrSpec(el).forEach(function (s) { source[s.key] = el.getAttribute(s.attr); });
    });
  }

  function lookup(lang, key) {
    if (lang !== 'pl' && data[lang] && data[lang][key] != null) return data[lang][key];
    return source[key];
  }

  function apply(lang) {
    textEls.forEach(function (el) {
      var v = lookup(lang, el.getAttribute('data-i18n'));
      if (v != null && el.innerHTML !== v) el.innerHTML = v;
    });
    attrEls.forEach(function (el) {
      parseAttrSpec(el).forEach(function (s) {
        var v = lookup(lang, s.key);
        if (v != null) el.setAttribute(s.attr, v);
      });
    });
    root.lang = lang;
    Array.prototype.forEach.call(document.querySelectorAll('.lang[lang]'), function (b) {
      var on = b.getAttribute('lang') === lang;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  function set(lang, opts) {
    if (LANGS.indexOf(lang) === -1) lang = 'pl';
    var changed = lang !== current;
    current = lang;
    apply(lang);
    try { localStorage.setItem(STORE_KEY, lang); } catch (e) {}
    if (!(opts && opts.keepUrl)) {
      // keep ?lang= in sync so the current view can be shared
      try {
        var url = new URL(location.href);
        if (lang === 'pl') url.searchParams.delete('lang'); else url.searchParams.set('lang', lang);
        history.replaceState(history.state, '', url.pathname + url.search + url.hash);
      } catch (e) {}
    }
    if (changed) listeners.forEach(function (fn) { fn(lang); });
  }

  // Script strings: t('form.err.name'), t('assess.count', { n: 2, total: 7 })
  function t(key, vars) {
    var s = (data.ui[current] && data.ui[current][key]) || (data.ui.pl && data.ui.pl[key]) || key;
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return s;
  }

  function initialLang() {
    var lang = null;
    try { lang = new URLSearchParams(location.search).get('lang'); } catch (e) {}
    if (LANGS.indexOf(lang) === -1) { try { lang = localStorage.getItem(STORE_KEY); } catch (e) {} }
    return LANGS.indexOf(lang) === -1 ? 'pl' : lang;
  }

  collect();
  var start = initialLang();
  if (start !== 'pl') { current = 'pl'; set(start, { keepUrl: true }); } else apply('pl');
  root.classList.remove('i18n-pending');

  window.PolTradeI18n = {
    t: t,
    set: set,
    lang: function () { return current; },
    onChange: function (fn) { listeners.push(fn); }
  };
})();
