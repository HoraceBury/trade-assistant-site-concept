/* =========================================================================
   PolTrade — cooperation model assessment
   Questions, scoring and result copy live here so the decision logic can be
   changed without touching the UI (main.js renders it).
   ========================================================================= */
(function () {
  'use strict';

  var MODELS = {
    entry: {
      num: '01', name: 'Market Entry', anchor: '#model-entry',
      sub: 'Najpierw sprawdzamy, czy i jak wejść na rynek. Dopiero potem inwestujesz w sprzedaż.',
      activities: [
        'Ocena gotowości produktu i firmy do sprzedaży za granicą',
        'Analiza rynku: kupcy, kanały, ceny, wymagania',
        'Cennik eksportowy i oferta w języku rynku',
        'Lista potencjalnych odbiorców z priorytetami'
      ],
      next: 'Krótka rozmowa o produkcie i rynku, który bierzesz pod uwagę. Po niej dostajesz propozycję zakresu na piśmie.'
    },
    development: {
      num: '02', name: 'Sales Development', anchor: '#model-development',
      sub: 'Masz co sprzedawać. Teraz potrzebne są rozmowy z właściwymi kupcami i pierwsze zamówienia.',
      activities: [
        'Bezpośredni kontakt z wybranymi importerami, dystrybutorami i sieciami',
        'Prezentacje produktu, próbki i spotkania',
        'Negocjacje cen, wolumenów i warunków',
        'Doprowadzenie do pierwszego zamówienia i jego realizacji'
      ],
      next: 'Przegląd Twojej obecnej oferty i rynków. Ustalamy, do kogo dzwonimy najpierw i czego oczekujemy po pierwszych trzech miesiącach.'
    },
    representation: {
      num: '03', name: 'Market Representation', anchor: '#model-representation',
      sub: 'Sprzedaż już ruszyła. Potrzebujesz kogoś, kto stale reprezentuje Cię na rynku i ją rozwija.',
      activities: [
        'Opieka nad obecnymi klientami i kluczowymi kupcami',
        'Nowe listingi i kolejne indeksy u obecnych odbiorców',
        'Pozyskiwanie kolejnych odbiorców na rynku',
        'Koordynacja zamówień, terminów i komunikacji'
      ],
      next: 'Rozmowa o obecnych klientach, wynikach i celach na rynku. Ustalamy zakres reprezentacji i sposób raportowania.'
    }
  };

  // Each option: s = score contribution per model; why = sentence fragment used in the result explanation.
  var QUESTIONS = [
    {
      id: 'type',
      q: 'Która sytuacja najlepiej opisuje Twoją firmę?',
      twoCol: true,
      options: [
        { v: 'pl_producer', t: 'Polski producent', d: 'Chcę sprzedawać za granicą', s: { entry: 1, development: 1 }, contact: 'Polski producent: sprzedaż za granicą' },
        { v: 'foreign_producer', t: 'Producent zagraniczny', d: 'Chcę wejść do Polski', s: { entry: 1, development: 1 }, contact: 'Producent zagraniczny: wejście do Polski' },
        { v: 'brand_owner', t: 'Właściciel marki / private label', d: 'Szukam producenta', s: { development: 2 }, contact: 'Właściciel marki / private label: szukam producenta' },
        { v: 'capacity', t: 'Producent z wolnymi mocami', d: 'Szukam zleceń produkcyjnych', s: { development: 2 }, contact: 'Producent z wolnymi mocami: szukam zleceń' },
        { v: 'retailer', t: 'Sklep lub hurtownia', d: 'Szukam dostawców i produktów', s: { development: 2 }, contact: 'Sklep lub hurtownia: szukam dostawców' },
        { v: 'group', t: 'Grupa zakupowa', d: 'Chcemy kupować wspólnie', s: { development: 1, representation: 1 }, contact: 'Grupa zakupowa: wspólne zakupy' }
      ]
    },
    {
      id: 'category',
      q: 'Jakiej kategorii produktów dotyczy współpraca?',
      twoCol: true,
      options: [
        { v: 'chilled', t: 'Nabiał, mięso, garmażerka', d: 'Produkty chłodzone', s: {} },
        { v: 'ambient', t: 'Przetwory, słodycze, przyprawy', d: 'Produkty suche i trwałe', s: {} },
        { v: 'frozen', t: 'Mrożonki', s: {} },
        { v: 'drinks', t: 'Napoje', s: {} },
        { v: 'nonfood', t: 'Kosmetyki i chemia', s: {} },
        { v: 'other', t: 'Inne FMCG lub kilka kategorii', s: {} }
      ]
    },
    {
      id: 'export',
      q: 'Jak dziś wygląda Twoja sprzedaż zagraniczna?',
      help: 'Dla sklepów i grup zakupowych: chodzi o zakupy od dostawców spoza dotychczasowej bazy.',
      options: [
        { v: 'none', t: 'Jeszcze jej nie ma', s: { entry: 3 }, why: 'zaczynasz bez dotychczasowej sprzedaży na nowym rynku' },
        { v: 'occasional', t: 'Pojedyncze, nieregularne zamówienia', s: { development: 2, entry: 1 }, why: 'masz już pierwsze zamówienia, ale bez regularności' },
        { v: 'regular', t: 'Regularna sprzedaż na jednym lub dwóch rynkach', s: { development: 2, representation: 1 }, why: 'sprzedajesz regularnie i szukasz kolejnych odbiorców' },
        { v: 'established', t: 'Stała sprzedaż, chcę ją rozwijać', s: { representation: 3 }, why: 'masz stałą sprzedaż, którą trzeba utrzymać i rozwijać' }
      ]
    },
    {
      id: 'market',
      q: 'Który rynek jest dla Ciebie najważniejszy?',
      skipIf: function (a) { return a.type === 'foreign_producer'; },
      autoValue: 'pl',
      options: [
        { v: 'uk', t: 'Wielka Brytania', s: {} },
        { v: 'de', t: 'Niemcy', s: {} },
        { v: 'eu', t: 'Inny kraj Unii Europejskiej', s: {} },
        { v: 'pl', t: 'Polska', s: {} },
        { v: 'unsure', t: 'Jeszcze nie wiem', d: 'Chcę, żeby to wynikało z analizy', s: { entry: 2 }, why: 'wybór rynku jest jeszcze otwarty' }
      ]
    },
    {
      id: 'goal',
      q: 'Co chcesz osiągnąć w ciągu najbliższego roku?',
      options: [
        { v: 'verify', t: 'Sprawdzić, czy rynek ma sens', d: 'Zanim zainwestuję w sprzedaż', s: { entry: 3 }, why: 'najpierw chcesz wiedzieć, czy rynek ma sens' },
        { v: 'first', t: 'Zdobyć pierwszych klientów i zamówienia', s: { development: 3 }, why: 'Twoim celem są pierwsi klienci i zamówienia' },
        { v: 'grow', t: 'Więcej klientów na rynku, na którym już jestem', s: { development: 1, representation: 2 }, why: 'chcesz rosnąć na rynku, na którym już jesteś' },
        { v: 'presence', t: 'Stałą obecność i opiekę nad klientami', s: { representation: 3 }, why: 'zależy Ci na stałej obecności na rynku' }
      ]
    },
    {
      id: 'relations',
      q: 'Czy masz już relacje z kupcami lub partnerami na tym rynku?',
      options: [
        { v: 'none', t: 'Nie, zaczynamy od zera', s: { entry: 2 } },
        { v: 'contacts', t: 'Kilka kontaktów, ale bez zamówień', s: { development: 2 }, why: 'masz kontakty, które trzeba zamienić w zamówienia' },
        { v: 'active', t: 'Tak, mam aktywnych klientów', s: { representation: 2 }, why: 'masz aktywnych klientów, o których trzeba dbać' }
      ]
    },
    {
      id: 'support',
      q: 'Jakiego wsparcia potrzebujesz najbardziej?',
      options: [
        { v: 'assess', t: 'Rzetelnej oceny i planu', d: 'Resztą zajmę się sam albo zdecyduję później', s: { entry: 3 } },
        { v: 'execute', t: 'Kogoś, kto przeprowadzi rozmowy i doprowadzi do zamówień', s: { development: 3 } },
        { v: 'represent', t: 'Stałego przedstawiciela na rynku', s: { representation: 3 } }
      ]
    }
  ];

  var MARKET_NAMES = { uk: 'Wielka Brytania', de: 'Niemcy', eu: 'wybrany rynek UE', pl: 'Polska', unsure: '' };

  function optionFor(qid, value) {
    for (var i = 0; i < QUESTIONS.length; i++) {
      if (QUESTIONS[i].id !== qid) continue;
      var opts = QUESTIONS[i].options;
      for (var j = 0; j < opts.length; j++) if (opts[j].v === value) return opts[j];
    }
    return null;
  }

  function score(answers) {
    var totals = { entry: 0, development: 0, representation: 0 };
    QUESTIONS.forEach(function (q) {
      var opt = optionFor(q.id, answers[q.id]);
      if (!opt) return;
      Object.keys(opt.s).forEach(function (k) { totals[k] += opt.s[k]; });
    });
    // tie-break order: the more hands-on model wins a tie between entry and development,
    // development wins a tie with representation (start with sales before ongoing representation)
    var order = ['development', 'entry', 'representation'];
    var best = order[0];
    order.forEach(function (k) { if (totals[k] > totals[best]) best = k; });
    return { model: best, totals: totals };
  }

  function explain(answers, modelKey) {
    var parts = [];
    ['export', 'goal', 'relations', 'market'].forEach(function (qid) {
      var opt = optionFor(qid, answers[qid]);
      if (opt && opt.why) parts.push(opt.why);
    });
    parts = parts.slice(0, 3);
    var typeOpt = optionFor('type', answers.type);
    var market = MARKET_NAMES[answers.market] || '';
    var intro = typeOpt ? typeOpt.t : 'Twoja firma';
    var sentence = 'Z Twoich odpowiedzi wynika, że ' + (parts.length ? joinPl(parts) : 'jesteś na etapie, w którym ten model daje najwięcej') + '.';
    var context = intro + (market ? ' · rynek: ' + market : '');
    return { context: context, sentence: sentence };
  }

  function joinPl(list) {
    if (list.length === 1) return list[0];
    return list.slice(0, -1).join(', ') + ' i ' + list[list.length - 1];
  }

  function summaryForContact(answers, modelKey) {
    var lines = [];
    QUESTIONS.forEach(function (q) {
      var opt = optionFor(q.id, answers[q.id]);
      if (opt && !(q.skipIf && q.skipIf(answers))) lines.push('• ' + q.q + ' ' + opt.t);
    });
    return 'Wynik testu: ' + MODELS[modelKey].num + ' ' + MODELS[modelKey].name + '\n' + lines.join('\n') + '\n\n';
  }

  window.PolTradeAssessment = {
    models: MODELS,
    questions: QUESTIONS,
    score: score,
    explain: explain,
    optionFor: optionFor,
    summaryForContact: summaryForContact
  };
})();
