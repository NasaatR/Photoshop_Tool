# Photoshop Tool contributor guidance

- Work on `develop` unless the owner explicitly changes the branch scope. Do not merge into `main` automatically.
- Run `npm test`, `npm run build`, and `npm run check`. Python's `zipfile` can independently inspect the CCX. No npm dependencies/install step.
- `package.json` owns the version. Build generates `plugin/product.json`, `plugin/manifest.json` and `dist/Photoshop-Tool-<version>.ccx`. Do not silently change issued version bytes.
- Runtime is Photoshop UXP, not Node/browser/ExtendScript. Keep `node:*`, fs/child_process and build modules out of `plugin/`.
- Tools register in `plugin/tools/index.js`; the panel and menu consume that registry. Retain the stable plugin ID `com.nasaat.pngrelay`, panel ID `relayPanel`, original commands and legacy `pngrelay.*` preference keys.
- Acquire explicit file grants before modal work, revalidate targets and await all host changes. Preserve unrelated layers, selection, document path, source save state and output recovery. History cannot undo external files/clipboard.
- Keep scope and claims precise: mocks/builds do not prove native Photoshop rendering, clipboard alpha, Defender acceptance or flicker resolution.
- No network, native helpers, process launch, full-disk/clipboard API permissions or background polling without a concrete authorized need.
- Preserve the MIT license and original project provenance: https://github.com/NasaatR/Photoshop_Tool. Product credit remains Made by Nasaat; it does not add license restrictions.
