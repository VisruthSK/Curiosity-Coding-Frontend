# Curiosity Coding

Browser-only CSV coding tool for reviewing curiosity-question survey rows one at a time. The app asks for a coder first name, parses a CSV locally, lets the coder select rubric labels and notes, autosaves in `localStorage`, and exports the original CSV shape with updated `Label` and `Notes` columns.

No backend, API, auth, upload, or server-side data handling is used. CSV data stays in the browser.

## Stack

- Astro static site
- React islands
- TypeScript
- Tailwind CSS
- Papa Parse
- Inline Lucide-style SVG icons
- Playwright for browser tests

## Development

```sh
pnpm install
pnpm run dev
```

The default dev port is `1313`, configured in `astro.config.mjs`.

Useful checks:

```sh
pnpm run build
pnpm test
```

`pnpm run build` runs `astro check` before `astro build`. The site is static output in `dist/`.

## CSV Behavior

Input CSVs are expected to have the same column shape and must include `Label` and `Notes`. Export preserves the input columns and order, filling only those coding columns. Blank labels or notes export as `NA`.

Export filenames use:

```txt
<original-input-filename-without-extension> <FirstName>.csv
```

The first name is trimmed and title-cased before use.

## Tests

Playwright tests create temporary fake CSV files outside the repo. There are no committed CSV fixtures.

The tests cover:

- First-name cleanup, CSV upload, row coding, notes, review status, and export filename.
- Exported CSV column order, extra columns, commas, quotes, embedded newlines, existing coding values, multiple labels, and blank `Label`/`Notes` fallback to `NA`.
- Coder rename and in-app Start Over dialog behavior.

GitHub Actions runs install, browser setup, build, and Playwright tests on push and pull request.

## Deployment Notes

The app is fully static. Headers live in `public/_headers`; hashed Astro assets are cached for a year with `immutable`, while HTML uses `no-cache`. The CSP intentionally allows inline scripts/styles because Astro emits inline hydration code and the previous hash-based CSP was brittle under deploy output.

`public/robots.txt` blocks indexing and scraping. This is advisory, not an access-control mechanism.
