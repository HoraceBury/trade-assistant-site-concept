# PolTrade — website

Static single-page site built from [concept-spec.md](concept-spec.md). No build step, no framework.

```
index.html          all content (Polish)
css/styles.css      design tokens + all styles
js/galaxy.js        animated swirling-galaxy background (canvas)
js/assessment.js    model-assessment questions, scoring and result copy
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
- **EN / DE**: the language buttons show a "being prepared" notice. Only the Polish version exists.
- **Assessment logic**: the scoring weights in `js/assessment.js` are a reasonable first pass and are meant to be tuned.
