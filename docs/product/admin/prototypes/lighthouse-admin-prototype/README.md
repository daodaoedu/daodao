# Lighthouse Admin Prototype

Static prototype for Lighthouse cohort admin workflows.

## Preview

From this directory:

```sh
python -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173/
```

## Included

- `index.html` - single-page static prototype
- `support.js` - prototype runtime support
- `assets/` - prototype image assets
- `_ds/` - design/runtime generated assets
- `session-outcome-report.pdf` - sample outcome report export

## Notes

- The outcome report export button links directly to `session-outcome-report.pdf`, so the prototype should be served from this directory for the PDF download to work.
- The sample PDF reflects the current MVP outcome report and does not include a `下一步觀察` section.
