/* =========================================================================
   PolTrade — cooperation model assessment
   Questions, scoring and result copy live here so the decision logic can be
   changed without touching the UI (main.js renders it). Structure and scoring
   are language-independent; all wording is in TEXT[pl|en|de].
   ========================================================================= */
(function () {
  'use strict';

  var MODELS = {
    entry: { num: '01', name: 'Market Entry', anchor: '#model-entry' },
    development: { num: '02', name: 'Sales Development', anchor: '#model-development' },
    representation: { num: '03', name: 'Market Representation', anchor: '#model-representation' }
  };

  // Each option: s = score contribution per model; why = include a reason in the result explanation.
  var QUESTIONS = [
    { id: 'type', twoCol: true, options: [
      { v: 'pl_producer', s: { entry: 1, development: 1 } },
      { v: 'foreign_producer', s: { entry: 1, development: 1 } },
      { v: 'brand_owner', s: { development: 2 } },
      { v: 'capacity', s: { development: 2 } },
      { v: 'retailer', s: { development: 2 } },
      { v: 'group', s: { development: 1, representation: 1 } }
    ] },
    { id: 'category', twoCol: true, options: [
      { v: 'chilled', s: {} }, { v: 'ambient', s: {} }, { v: 'frozen', s: {} },
      { v: 'drinks', s: {} }, { v: 'nonfood', s: {} }, { v: 'other', s: {} }
    ] },
    { id: 'export', help: true, options: [
      { v: 'none', s: { entry: 3 }, why: true },
      { v: 'occasional', s: { development: 2, entry: 1 }, why: true },
      { v: 'regular', s: { development: 2, representation: 1 }, why: true },
      { v: 'established', s: { representation: 3 }, why: true }
    ] },
    { id: 'market', skipIf: function (a) { return a.type === 'foreign_producer'; }, options: [
      { v: 'uk', s: {} }, { v: 'de', s: {} }, { v: 'eu', s: {} }, { v: 'pl', s: {} },
      { v: 'unsure', s: { entry: 2 }, why: true }
    ] },
    { id: 'goal', options: [
      { v: 'verify', s: { entry: 3 }, why: true },
      { v: 'first', s: { development: 3 }, why: true },
      { v: 'grow', s: { development: 1, representation: 2 }, why: true },
      { v: 'presence', s: { representation: 3 }, why: true }
    ] },
    { id: 'relations', options: [
      { v: 'none', s: { entry: 2 } },
      { v: 'contacts', s: { development: 2 }, why: true },
      { v: 'active', s: { representation: 2 }, why: true }
    ] },
    { id: 'support', options: [
      { v: 'assess', s: { entry: 3 } },
      { v: 'execute', s: { development: 3 } },
      { v: 'represent', s: { representation: 3 } }
    ] }
  ];

  /* ------------------------------------------------------------------ copy
     q[id]: { q: question, help?, o: { value: [title, description?] } }
     why[id][value]: reason fragment, written to follow the `because` lead-in
     (in German: a verb-final subordinate clause after "dass"). */
  var TEXT = {
    pl: {
      q: {
        type: { q: 'Która sytuacja najlepiej opisuje Twoją firmę?', o: {
          pl_producer: ['Polski producent', 'Chcę sprzedawać za granicą'],
          foreign_producer: ['Producent zagraniczny', 'Chcę wejść do Polski'],
          brand_owner: ['Właściciel marki / private label', 'Szukam producenta'],
          capacity: ['Producent z wolnymi mocami', 'Szukam zleceń produkcyjnych'],
          retailer: ['Sklep lub hurtownia', 'Szukam dostawców i produktów'],
          group: ['Grupa zakupowa', 'Chcemy kupować wspólnie'] } },
        category: { q: 'Jakiej kategorii produktów dotyczy współpraca?', o: {
          chilled: ['Nabiał, mięso, garmażerka', 'Produkty chłodzone'],
          ambient: ['Przetwory, słodycze, przyprawy', 'Produkty suche i trwałe'],
          frozen: ['Mrożonki'], drinks: ['Napoje'], nonfood: ['Kosmetyki i chemia'],
          other: ['Inne FMCG lub kilka kategorii'] } },
        export: { q: 'Jak dziś wygląda Twoja sprzedaż zagraniczna?',
          help: 'Dla sklepów i grup zakupowych: chodzi o zakupy od dostawców spoza dotychczasowej bazy.', o: {
          none: ['Jeszcze jej nie ma'],
          occasional: ['Pojedyncze, nieregularne zamówienia'],
          regular: ['Regularna sprzedaż na jednym lub dwóch rynkach'],
          established: ['Stała sprzedaż, chcę ją rozwijać'] } },
        market: { q: 'Który rynek jest dla Ciebie najważniejszy?', o: {
          uk: ['Wielka Brytania'], de: ['Niemcy'], eu: ['Inny kraj Unii Europejskiej'], pl: ['Polska'],
          unsure: ['Jeszcze nie wiem', 'Chcę, żeby to wynikało z analizy'] } },
        goal: { q: 'Co chcesz osiągnąć w ciągu najbliższego roku?', o: {
          verify: ['Sprawdzić, czy rynek ma sens', 'Zanim zainwestuję w sprzedaż'],
          first: ['Zdobyć pierwszych klientów i zamówienia'],
          grow: ['Więcej klientów na rynku, na którym już jestem'],
          presence: ['Stałą obecność i opiekę nad klientami'] } },
        relations: { q: 'Czy masz już relacje z kupcami lub partnerami na tym rynku?', o: {
          none: ['Nie, zaczynamy od zera'],
          contacts: ['Kilka kontaktów, ale bez zamówień'],
          active: ['Tak, mam aktywnych klientów'] } },
        support: { q: 'Jakiego wsparcia potrzebujesz najbardziej?', o: {
          assess: ['Rzetelnej oceny i planu', 'Resztą zajmę się sam albo zdecyduję później'],
          execute: ['Kogoś, kto przeprowadzi rozmowy i doprowadzi do zamówień'],
          represent: ['Stałego przedstawiciela na rynku'] } }
      },
      why: {
        export: { none: 'zaczynasz bez dotychczasowej sprzedaży na nowym rynku', occasional: 'masz już pierwsze zamówienia, ale bez regularności', regular: 'sprzedajesz regularnie i szukasz kolejnych odbiorców', established: 'masz stałą sprzedaż, którą trzeba utrzymać i rozwijać' },
        market: { unsure: 'wybór rynku jest jeszcze otwarty' },
        goal: { verify: 'najpierw chcesz wiedzieć, czy rynek ma sens', first: 'Twoim celem są pierwsi klienci i zamówienia', grow: 'chcesz rosnąć na rynku, na którym już jesteś', presence: 'zależy Ci na stałej obecności na rynku' },
        relations: { contacts: 'masz kontakty, które trzeba zamienić w zamówienia', active: 'masz aktywnych klientów, o których trzeba dbać' }
      },
      sentence: 'Z Twoich odpowiedzi wynika, że {parts}.',
      fallback: 'jesteś na etapie, w którym ten model daje najwięcej',
      and: ' i ',
      marketLabel: 'rynek',
      marketNames: { uk: 'Wielka Brytania', de: 'Niemcy', eu: 'wybrany rynek UE', pl: 'Polska' },
      summaryTitle: 'Wynik testu',
      models: {
        entry: {
          sub: 'Najpierw sprawdzamy, czy i jak wejść na rynek. Dopiero potem inwestujesz w sprzedaż.',
          activities: ['Ocena gotowości produktu i firmy do sprzedaży za granicą', 'Analiza rynku: kupcy, kanały, ceny, wymagania', 'Cennik eksportowy i oferta w języku rynku', 'Lista potencjalnych odbiorców z priorytetami'],
          next: 'Krótka rozmowa o produkcie i rynku, który bierzesz pod uwagę. Po niej dostajesz propozycję zakresu na piśmie.' },
        development: {
          sub: 'Masz co sprzedawać. Teraz potrzebne są rozmowy z właściwymi kupcami i pierwsze zamówienia.',
          activities: ['Bezpośredni kontakt z wybranymi importerami, dystrybutorami i sieciami', 'Prezentacje produktu, próbki i spotkania', 'Negocjacje cen, wolumenów i warunków', 'Doprowadzenie do pierwszego zamówienia i jego realizacji'],
          next: 'Przegląd Twojej obecnej oferty i rynków. Ustalamy, do kogo dzwonimy najpierw i czego oczekujemy po pierwszych trzech miesiącach.' },
        representation: {
          sub: 'Sprzedaż już ruszyła. Potrzebujesz kogoś, kto stale reprezentuje Cię na rynku i ją rozwija.',
          activities: ['Opieka nad obecnymi klientami i kluczowymi kupcami', 'Nowe listingi i kolejne indeksy u obecnych odbiorców', 'Pozyskiwanie kolejnych odbiorców na rynku', 'Koordynacja zamówień, terminów i komunikacji'],
          next: 'Rozmowa o obecnych klientach, wynikach i celach na rynku. Ustalamy zakres reprezentacji i sposób raportowania.' }
      }
    },

    en: {
      q: {
        type: { q: 'Which situation best describes your company?', o: {
          pl_producer: ['Polish manufacturer', 'I want to sell abroad'],
          foreign_producer: ['Foreign manufacturer', 'I want to enter Poland'],
          brand_owner: ['Brand owner / private label', 'I’m looking for a manufacturer'],
          capacity: ['Manufacturer with spare capacity', 'I’m looking for production orders'],
          retailer: ['Retailer or wholesaler', 'I’m looking for suppliers and products'],
          group: ['Buying group', 'We want to buy together'] } },
        category: { q: 'Which product category is this about?', o: {
          chilled: ['Dairy, meat, deli', 'Chilled products'],
          ambient: ['Preserves, confectionery, spices', 'Dry and shelf-stable products'],
          frozen: ['Frozen food'], drinks: ['Beverages'], nonfood: ['Cosmetics and household'],
          other: ['Other FMCG or several categories'] } },
        export: { q: 'What do your international sales look like today?',
          help: 'For retailers and buying groups: this means buying from suppliers outside your current base.', o: {
          none: ['There aren’t any yet'],
          occasional: ['Occasional, irregular orders'],
          regular: ['Regular sales in one or two markets'],
          established: ['Steady sales that I want to grow'] } },
        market: { q: 'Which market matters most to you?', o: {
          uk: ['United Kingdom'], de: ['Germany'], eu: ['Another EU country'], pl: ['Poland'],
          unsure: ['I don’t know yet', 'I’d like the analysis to decide'] } },
        goal: { q: 'What do you want to achieve in the next year?', o: {
          verify: ['Find out whether the market makes sense', 'Before I invest in sales'],
          first: ['Win the first customers and orders'],
          grow: ['More customers in a market I’m already in'],
          presence: ['A permanent presence and account care'] } },
        relations: { q: 'Do you already have relationships with buyers or partners in that market?', o: {
          none: ['No, we’re starting from scratch'],
          contacts: ['A few contacts, but no orders'],
          active: ['Yes, I have active customers'] } },
        support: { q: 'What kind of support do you need most?', o: {
          assess: ['A reliable assessment and plan', 'I’ll handle the rest myself or decide later'],
          execute: ['Someone to lead the conversations and get to orders'],
          represent: ['A permanent representative in the market'] } }
      },
      why: {
        export: { none: 'you’re starting without any existing sales in the new market', occasional: 'you already have first orders, but not on a regular basis', regular: 'you sell regularly and are looking for more customers', established: 'you have steady sales that need maintaining and growing' },
        market: { unsure: 'the choice of market is still open' },
        goal: { verify: 'you first want to know whether the market makes sense', first: 'your goal is first customers and orders', grow: 'you want to grow in a market you’re already in', presence: 'a permanent market presence matters to you' },
        relations: { contacts: 'you have contacts that need turning into orders', active: 'you have active customers who need looking after' }
      },
      sentence: 'Your answers suggest that {parts}.',
      fallback: 'you’re at the stage where this model delivers the most',
      and: ' and ',
      marketLabel: 'market',
      marketNames: { uk: 'United Kingdom', de: 'Germany', eu: 'chosen EU market', pl: 'Poland' },
      summaryTitle: 'Assessment result',
      models: {
        entry: {
          sub: 'First we find out whether and how to enter the market. Only then do you invest in sales.',
          activities: ['Assessing how ready the product and company are to sell abroad', 'Market analysis: buyers, channels, prices, requirements', 'Export price list and an offer in the market’s language', 'A prioritised list of potential customers'],
          next: 'A short conversation about the product and the market you have in mind. Afterwards you receive a written scope proposal.' },
        development: {
          sub: 'You have something to sell. What’s needed now is conversations with the right buyers and first orders.',
          activities: ['Direct contact with selected importers, distributors and chains', 'Product presentations, samples and meetings', 'Negotiating prices, volumes and terms', 'Getting to the first order and seeing it delivered'],
          next: 'A review of your current offer and markets. We agree who to call first and what we expect after the first three months.' },
        representation: {
          sub: 'Sales are already under way. You need someone who represents you in the market on an ongoing basis and grows them.',
          activities: ['Looking after current customers and key buyers', 'New listings and further products with existing customers', 'Winning further customers in the market', 'Coordinating orders, deadlines and communication'],
          next: 'A conversation about your current customers, results and goals in the market. We agree the scope of representation and how I report.' }
      }
    },

    de: {
      q: {
        type: { q: 'Welche Situation beschreibt Ihr Unternehmen am besten?', o: {
          pl_producer: ['Polnischer Hersteller', 'Ich möchte ins Ausland verkaufen'],
          foreign_producer: ['Ausländischer Hersteller', 'Ich möchte in den polnischen Markt'],
          brand_owner: ['Markeninhaber / Handelsmarke', 'Ich suche einen Hersteller'],
          capacity: ['Hersteller mit freien Kapazitäten', 'Ich suche Produktionsaufträge'],
          retailer: ['Einzel- oder Großhändler', 'Ich suche Lieferanten und Produkte'],
          group: ['Einkaufsgemeinschaft', 'Wir möchten gemeinsam einkaufen'] } },
        category: { q: 'Um welche Produktkategorie geht es?', o: {
          chilled: ['Molkerei, Fleisch, Feinkost', 'Kühlprodukte'],
          ambient: ['Konserven, Süßwaren, Gewürze', 'Trockene und haltbare Produkte'],
          frozen: ['Tiefkühlkost'], drinks: ['Getränke'], nonfood: ['Kosmetik und Haushaltschemie'],
          other: ['Andere FMCG oder mehrere Kategorien'] } },
        export: { q: 'Wie sieht Ihr Auslandsvertrieb heute aus?',
          help: 'Für Händler und Einkaufsgemeinschaften: gemeint ist der Einkauf bei Lieferanten außerhalb Ihres bisherigen Stamms.', o: {
          none: ['Es gibt noch keinen'],
          occasional: ['Einzelne, unregelmäßige Aufträge'],
          regular: ['Regelmäßiger Absatz auf ein oder zwei Märkten'],
          established: ['Stabiler Absatz, den ich ausbauen möchte'] } },
        market: { q: 'Welcher Markt ist für Sie am wichtigsten?', o: {
          uk: ['Vereinigtes Königreich'], de: ['Deutschland'], eu: ['Ein anderes EU-Land'], pl: ['Polen'],
          unsure: ['Das weiß ich noch nicht', 'Das soll sich aus der Analyse ergeben'] } },
        goal: { q: 'Was möchten Sie im nächsten Jahr erreichen?', o: {
          verify: ['Prüfen, ob der Markt sinnvoll ist', 'Bevor ich in den Vertrieb investiere'],
          first: ['Die ersten Kunden und Aufträge gewinnen'],
          grow: ['Mehr Kunden auf einem Markt, auf dem ich schon bin'],
          presence: ['Dauerhafte Präsenz und Kundenbetreuung'] } },
        relations: { q: 'Haben Sie auf diesem Markt bereits Beziehungen zu Einkäufern oder Partnern?', o: {
          none: ['Nein, wir fangen bei null an'],
          contacts: ['Einige Kontakte, aber keine Aufträge'],
          active: ['Ja, ich habe aktive Kunden'] } },
        support: { q: 'Welche Unterstützung brauchen Sie am meisten?', o: {
          assess: ['Eine fundierte Bewertung und einen Plan', 'Den Rest übernehme ich selbst oder entscheide später'],
          execute: ['Jemanden, der die Gespräche führt und zu Aufträgen bringt'],
          represent: ['Einen dauerhaften Vertreter auf dem Markt'] } }
      },
      why: {
        export: { none: 'Sie ohne bisherigen Absatz auf dem neuen Markt starten', occasional: 'Sie bereits erste Aufträge haben, aber noch ohne Regelmäßigkeit', regular: 'Sie regelmäßig verkaufen und weitere Abnehmer suchen', established: 'Sie einen stabilen Absatz haben, den es zu halten und auszubauen gilt' },
        market: { unsure: 'die Wahl des Marktes noch offen ist' },
        goal: { verify: 'Sie zuerst wissen möchten, ob der Markt sinnvoll ist', first: 'Ihr Ziel die ersten Kunden und Aufträge sind', grow: 'Sie auf einem Markt wachsen möchten, auf dem Sie bereits sind', presence: 'Ihnen eine dauerhafte Marktpräsenz wichtig ist' },
        relations: { contacts: 'Sie Kontakte haben, die zu Aufträgen werden müssen', active: 'Sie aktive Kunden haben, die betreut werden müssen' }
      },
      sentence: 'Ihre Antworten zeigen, dass {parts}.',
      fallback: 'Sie sich in der Phase befinden, in der dieses Modell am meisten bringt',
      and: ' und ',
      marketLabel: 'Markt',
      marketNames: { uk: 'Vereinigtes Königreich', de: 'Deutschland', eu: 'gewählter EU-Markt', pl: 'Polen' },
      summaryTitle: 'Ergebnis des Checks',
      models: {
        entry: {
          sub: 'Zuerst klären wir, ob und wie der Markteintritt gelingt. Erst dann investieren Sie in den Vertrieb.',
          activities: ['Bewertung, wie bereit Produkt und Unternehmen für den Auslandsvertrieb sind', 'Marktanalyse: Einkäufer, Kanäle, Preise, Anforderungen', 'Exportpreisliste und Angebot in der Landessprache', 'Eine priorisierte Liste potenzieller Abnehmer'],
          next: 'Ein kurzes Gespräch über das Produkt und den Markt, den Sie im Blick haben. Danach erhalten Sie einen schriftlichen Vorschlag zum Umfang.' },
        development: {
          sub: 'Sie haben etwas zu verkaufen. Jetzt braucht es Gespräche mit den richtigen Einkäufern und erste Aufträge.',
          activities: ['Direkter Kontakt zu ausgewählten Importeuren, Distributoren und Ketten', 'Produktpräsentationen, Muster und Termine', 'Verhandlung von Preisen, Mengen und Konditionen', 'Bis zum ersten Auftrag und seiner Abwicklung'],
          next: 'Durchsicht Ihres aktuellen Angebots und Ihrer Märkte. Wir legen fest, wen wir zuerst anrufen und was wir nach den ersten drei Monaten erwarten.' },
        representation: {
          sub: 'Der Vertrieb läuft bereits. Sie brauchen jemanden, der Sie dauerhaft auf dem Markt vertritt und ihn ausbaut.',
          activities: ['Betreuung bestehender Kunden und wichtiger Einkäufer', 'Neue Listungen und weitere Artikel bei bestehenden Abnehmern', 'Gewinnung weiterer Abnehmer auf dem Markt', 'Koordination von Bestellungen, Terminen und Kommunikation'],
          next: 'Ein Gespräch über Ihre aktuellen Kunden, Ergebnisse und Ziele auf dem Markt. Wir legen den Umfang der Vertretung und die Art der Berichterstattung fest.' }
      }
    }
  };

  function tr(lang) { return TEXT[lang] || TEXT.pl; }

  function questionFor(qid) {
    for (var i = 0; i < QUESTIONS.length; i++) if (QUESTIONS[i].id === qid) return QUESTIONS[i];
    return null;
  }
  function optionFor(qid, value) {
    var q = questionFor(qid);
    if (!q) return null;
    for (var j = 0; j < q.options.length; j++) if (q.options[j].v === value) return q.options[j];
    return null;
  }

  function score(answers) {
    var totals = { entry: 0, development: 0, representation: 0 };
    QUESTIONS.forEach(function (q) {
      var opt = optionFor(q.id, answers[q.id]);
      if (!opt) return;
      Object.keys(opt.s).forEach(function (k) { totals[k] += opt.s[k]; });
    });
    // tie-break order: development beats entry and representation (start with sales before ongoing representation)
    var order = ['development', 'entry', 'representation'];
    var best = order[0];
    order.forEach(function (k) { if (totals[k] > totals[best]) best = k; });
    return { model: best, totals: totals };
  }

  function joinList(list, and) {
    if (list.length === 1) return list[0];
    return list.slice(0, -1).join(', ') + and + list[list.length - 1];
  }

  function explain(answers, lang) {
    var T = tr(lang), parts = [];
    ['export', 'goal', 'relations', 'market'].forEach(function (qid) {
      var opt = optionFor(qid, answers[qid]);
      if (opt && opt.why && T.why[qid] && T.why[qid][opt.v]) parts.push(T.why[qid][opt.v]);
    });
    parts = parts.slice(0, 3);
    var typeText = answers.type ? T.q.type.o[answers.type][0] : '';
    var market = T.marketNames[answers.market] || '';
    return {
      context: typeText + (market ? ' · ' + T.marketLabel + ': ' + market : ''),
      sentence: T.sentence.replace('{parts}', parts.length ? joinList(parts, T.and) : T.fallback)
    };
  }

  function isActive(q, answers) { return !(q.skipIf && q.skipIf(answers)); }

  function summaryForContact(answers, modelKey, lang) {
    var T = tr(lang), lines = [];
    QUESTIONS.forEach(function (q) {
      var v = answers[q.id];
      if (v && isActive(q, answers)) lines.push('• ' + T.q[q.id].q + ' ' + T.q[q.id].o[v][0]);
    });
    return T.summaryTitle + ': ' + MODELS[modelKey].num + ' ' + MODELS[modelKey].name + '\n' + lines.join('\n') + '\n\n';
  }

  window.PolTradeAssessment = {
    models: MODELS,
    questions: QUESTIONS,
    tr: tr,
    score: score,
    explain: explain,
    isActive: isActive,
    summaryForContact: summaryForContact
  };
})();
