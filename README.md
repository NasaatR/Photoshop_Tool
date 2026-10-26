# Photoshop Tool

A modular Adobe Photoshop UXP toolbox by NasaatR. It starts with full-resolution PNG export, image copying and selection-to-Smart-Object extraction. New bundled tools share the same panel, command registry, preferences, single-flight execution and host/file safety helpers.

[Инструкция на русском](README.ru.md)

## Download and install

**Development preview 0.3.0:** [Download Photoshop-Tool-0.3.0.ccx](https://github.com/NasaatR/Photoshop_Tool/raw/refs/heads/develop/dist/Photoshop-Tool-0.3.0.ccx). This is the installable plugin, not GitHub's source ZIP. [SHA-256](dist/SHA256SUMS.txt).

1. Close Photoshop. Double-click the `.ccx` file and approve installation/update in Creative Cloud Desktop.
2. Open Photoshop → **Plugins → Photoshop Tool → Photoshop Tool**.
3. On the first PNG export in a folder, select the PSD's parent folder when Photoshop requests access. The grant is remembered.

UXP Developer Tool is not required for CCX installation. This updates the earlier **PNG Relay**: plugin ID `com.nasaat.pngrelay`, original menu command IDs, export preferences and folder-access keys are preserved. Unload any development copy in UDT before installing the CCX. To uninstall, use Creative Cloud Desktop → Manage Plugins → Photoshop Tool → Uninstall. Exported files remain.

Code is in **develop**, as requested by the repository owner. `main` is deliberately unchanged. This CCX is a checked repository download, not an Adobe Marketplace submission or a GitHub Release asset.

## Included tools

| Tool | Behavior |
| --- | --- |
| PNG + Copy | Current visible canvas → lossless PNG beside the local PSD/PSB, then image data for native paste. |
| Selection → Smart Object | Selected area on one raster layer → Ctrl+J → new embedded Smart Object → open contents → export beside the parent PSD and copy. |
| PNG only | Export without changing the image clipboard. Works even when Export Clipboard is disabled. |
| Copy only | Copy visible artwork without a PNG, folder grant or disk staging. Also works on an unsaved document. |

The first two buttons are visible by default. Enable the other tools under **gear → Tool buttons**; all four commands are also in Photoshop's Plugins menu. The label toggle, compact/roomy size, square/soft corners and Photoshop/dark/light theme are retained. Options scroll inside the panel. Click the status line for full output names/errors.

## Export behavior and limits

- Windows 11; Photoshop **26.9+**, UXP API v2. Version 0.1.1 was reported working by the user. This modular 0.3.0 build has not been executed in a real Photoshop host here.
- Original canvas dimensions and source 8/16-bit depth; RGB/Grayscale only. No lossy compression or arbitrary resizing. Other modes and 32-bit/HDR are refused instead of silently converted. Optional sRGB conversion changes only the temporary copy.
- PNG uses current in-memory artwork, including unsaved edits. It does **not** automatically save/flatten the source PSD. Artboards export the full document canvas, not separate board files.
- Smart Object extraction uses the selected raster layer's own content, not a merged crop of the whole composition. Text, groups, adjustment layers and existing Smart Objects are refused. Native Photoshop masks/styles/blending semantics apply.
- The new Smart Object contents stay open. Use PNG + Copy inside them to update the same derived PNG in this plugin session. Undo in the parent affects scene edits, not files or clipboard. Unrecognized temporary PSBs are refused.
- Copying uses Photoshop's native image clipboard. Receiving applications decide formats, bit depth, transparency and transparent-border handling. Universal paste/alpha support is not claimed. Enable Photoshop Export Clipboard with the explicit panel button if offered.
- PNG verification opens the saved staging image once and checks dimensions/depth; the same document supplies clipboard pixels. Copy only needs no PNG open. There is no background polling, animation or idle Photoshop mutation. White panel flashes previously reported by the user were not reproduced or conclusively diagnosed.

## Recovery, data and permissions

Filesystem permission is **request**, limited to explicitly selected folders through persistent UXP tokens. No network, clipboard API, process-launch, native helper or full disk permission. Nothing is uploaded by the plugin. Settings/grants are local. Copy only writes no files; saving a diagnostic report is a separate explicit user action.

Before PNG replacement, the old file is moved to an operation-specific backup. Failed replacement attempts restore the backup when possible, retaining a direct handle instead of depending on a second file lookup. This is recovery handling, not an atomic filesystem transaction. Do not run simultaneous exporters on one output path. A PNG already open in Photoshop blocks replacement. Crashes or disk failures can leave `.photoshoptool-export-*` or `.photoshoptool-backup-*` files beside the PSD; inspect them before cleanup. Never delete a pre-existing PSD to recover an export.

PNG commit, clipboard updates and parent-document edits are separate effects. Partial success is reported accurately. If selection export fails after creating the Smart Object, keep its contents and retry PNG + Copy there. If copying fails, a valid PNG can still be saved. If PNG replacement fails after copying, the clipboard may already be changed.

**Help & report → Save diagnostic report** writes a user-selected text file with host/version, tool ID, elapsed operation time, bounded warnings/errors and panel lifecycle counters. Review filenames/error text before sharing; the report is not uploaded and does not replace the image clipboard.

## Add a tool

See [docs/adding-tools.md](docs/adding-tools.md). A bundled module declares a stable tool ID, existing/custom icon, menu command ID, labels and an async handler. Register the module once in `plugin/tools/index.js`; the UI and generated manifest use that registry. Tool-specific option validation is optional and does not block unrelated tools. No editing the runner or hardcoded panel buttons is required.

| Location | Responsibility |
| --- | --- |
| `plugin/core/` | Registry, single-flight runner, host/modal/history helpers, legacy preferences, explicit folder access and safe file commit. |
| `plugin/tools/png/` | PNG/copy/Smart Object definitions, logic and service. |
| `plugin/ui/` | Registry-driven panel, original SVG icons and scoped theme-aware styling. |
| `plugin/main.js` | Dependency wiring and one UXP entrypoint registration. |
| `scripts/` | Manifest generation, dependency-free reproducible CCX packaging and runtime checks. |
| `tests/` | Node tests with mocked Photoshop/storage/DOM boundaries. |

For developers: Node.js 22+, no npm dependencies or install step. `npm test`, `npm run build`, `npm run check`. `package.json` is the version source; build generates runtime metadata/manifest and `dist/Photoshop-Tool-<version>.ccx` with `LICENSE.txt`. The archive is standard ZIP-based CCX, with `manifest.json` at its root, built using Adobe's documented independent packaging format. Runtime code never imports Node build/test modules.

The GitHub check workflow runs tests, build/source checks and a byte-for-byte comparison with the committed installer. It has read-only repository permission and does not publish/deploy. Native host tests are still required before describing a build as stable. Never silently replace an issued version with different bytes.

## Verification and provenance

Local checks cover registry extension/duplicate IDs, manifest parity, source syntax/imports, preference preservation, folder grants, full-size 16-bit output, one-open PNG verification, copy/save variants, file backup/restore failures, stale targets, cancellation, Smart Object rollback/retry, keyboard controls, visibility and idle no-op rendering. They use mocks, not real Photoshop. CCX files are also checked with an independent ZIP reader.

Not verified here: native Photoshop 0.3.0 installation/rendering, real PNG appearance/ICC, external paste/alpha, white flashing or Microsoft Defender acceptance. No antivirus certification or release signing is claimed.

Original project: **[NasaatR/Photoshop_Tool](https://github.com/NasaatR/Photoshop_Tool)**. MIT licensed; [LICENSE](LICENSE). The understated UI credit is **Made by Nasaat**; it does not add a restriction to the MIT license. No third-party runtime dependencies or copied exporter code are bundled.

Primary platform references: [Photoshop document API](https://developer.adobe.com/photoshop/uxp/2022/ps-reference/classes/document), [modal/history](https://developer.adobe.com/photoshop/uxp/2022/ps-reference/media/executeasmodal), [Adobe independent package format](https://developer.adobe.com/developer-distribution/creative-cloud/docs/guides/submission/overview), [CCX installation](https://developer.adobe.com/uxp/guides/how-to/distribution/install/).
