# PolTrade — website

Static single-page site built from [concept-spec.md](concept-spec.md). No build step, no framework.

```
index.html          all content (Polish)
css/styles.css      design tokens + all styles
js/translations.js  English and German text (Polish lives in index.html)
js/i18n.js          PL / EN / DE switching
js/galaxy.js        animated swirling-galaxy background (canvas)
js/assessment.js    model-assessment questions, scoring and result copy (PL/EN/DE)
js/main.js          navigation, switchers, accordion, assessment dialog, contact form
```

## Run locally

```
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy

Upload the folder as-is to S3 (or any static host) with `index.html` as the index document.

## Before launch: placeholders to replace

- **Contact details**: phone `+48 600 000 000`, `kontakt@poltrade.pl`, address `ul. Przykładowa 1…`, NIP `000-000-00-00` (in the header menu, contact section, footer, mobile CTA bar and `js/main.js` result screen).
- **Photography**: `.photo-frame` blocks (founder portrait plus factory/warehouse/shelf) are styled placeholders. Put an `<img>` inside each one; it fills the frame automatically.
- **Contact form endpoint**: set `data-endpoint="https://…"` on `#contact-form`. The form POSTs JSON. With no endpoint it simulates success.
- **Articles, "Wszystkie wpisy", privacy policy**: links marked `data-placeholder` show a "coming soon" toast.
- **Assessment logic**: the scoring weights in `js/assessment.js` are a reasonable first pass and are meant to be tuned.

## Languages

The PL / EN / DE buttons switch the page in place, with no reload and no translation service. The choice is remembered, and `?lang=en` or `?lang=de` links open the page in that language.

- **Polish is the source.** Every translatable element in `index.html` carries `data-i18n="key"` (inner HTML) or `data-i18n-attr="attr:key"` (attributes such as `aria-label`).
- **Editing copy:** change the Polish in `index.html` and the matching key in `js/translations.js` (`en` and `de`). A key missing from a translation falls back to Polish.
- **Adding text:** give the new element a new `data-i18n` key and add that key to both translations.
- **Script text** (form errors, assessment UI) is under `ui` in `js/translations.js`. Assessment questions and results are in `js/assessment.js` under `TEXT`.
- **Have a native speaker review the EN/DE copy before launch.** I translated it myself.
