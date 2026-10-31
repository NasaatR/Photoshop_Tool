# Photoshop Tool

A modular Adobe Photoshop UXP toolbox by NasaatR. It starts with full-resolution PNG export, image copying and selection-to-Smart-Object extraction. New bundled tools share the same panel, command registry, preferences, single-flight execution and host/file safety helpers.

[Инструкция на русском](README.ru.md)

## Download and install

**Development preview 0.3.2:** [Download Photoshop-Tool-0.3.2.ccx](https://github.com/NasaatR/Photoshop_Tool/raw/refs/heads/develop/dist/Photoshop-Tool-0.3.2.ccx). This is the installable plugin, not GitHub's source ZIP. [SHA-256](dist/SHA256SUMS.txt).

1. Close Photoshop. Double-click the `.ccx` file and approve installation/update in Creative Cloud Desktop.
2. Open Photoshop → **Plugins → Photoshop Tool → Photoshop Tool**.
3. Approve the updated file/clipboard permissions during installation. Export finds the saved PSD's folder automatically; no folder picker is shown.

UXP Developer Tool is not required for CCX installation. This updates the earlier **PNG Relay**: plugin ID `com.nasaat.pngrelay`, original menu command IDs, export preferences and folder-access keys are preserved. Unload any development copy in UDT before installing the CCX. To uninstall, use Creative Cloud Desktop → Manage Plugins → Photoshop Tool → Uninstall. Exported files remain.

Code is in **develop**, as requested by the repository owner. `main` is deliberately unchanged. This CCX is a checked repository download, not an Adobe Marketplace submission or a GitHub Release asset.

## Included tools

| Tool | Behavior |
| --- | --- |
| PNG + Copy | Current visible canvas → lossless PNG beside the local PSD/PSB, then image data for native paste. |
| Copy | Full visible composition as one image, ignoring the selection/selected layer. No PNG, folder access or disk staging. Also works on an unsaved document. |
| Selection → Smart Object | Selected area on one raster layer → Ctrl+J → new embedded Smart Object → open contents → export beside the parent PSD and copy. |
| PNG only | Export without changing the image clipboard. Works even when Export Clipboard is disabled. |

**PNG + Copy, Copy and Smart Object** are visible by default, in that order. This update exposes Copy once even if the old optional button was hidden; other settings remain intact and later hiding is respected. PNG only is an advanced option under **gear → Tool buttons**; all four commands are also in Photoshop's Plugins menu. Copy uses the existing `copyImageOnly` command ID. It copies image data for Ctrl+V, not a file path, file list or separate layers. Hidden layers remain hidden in the composite.

The label toggle, compact/roomy size, square/soft corners and Photoshop/dark/light theme are retained. Drag the floating panel's edge/corner or a dock divider to resize. The manifest explicitly permits 176×96 through 4096×4096 pixels; Photoshop's docking layout may impose additional limits. Content, options and reports share one scroll body at small sizes. Click the status line for full output names/errors; the small copy icon beside it copies a diagnostic text report, separate from the larger Copy image tool.

## Export behavior and limits

- Windows 11; Photoshop **26.9+**, UXP API v2. Version 0.1.1 was reported working by the user. This 0.3.2 build has not been executed in a real Photoshop host here.
- Original canvas dimensions and source 8/16-bit depth; RGB/Grayscale only. No lossy compression or arbitrary resizing. Other modes and 32-bit/HDR are refused instead of silently converted. Optional sRGB conversion changes only the temporary copy.
- PNG uses current in-memory artwork, including unsaved edits. It does **not** automatically save/flatten the source PSD. Artboards export the full document canvas, not separate board files.
- Smart Object extraction uses the selected raster layer's own content, not a merged crop of the whole composition. Text, groups, adjustment layers and existing Smart Objects are refused. Native Photoshop masks/styles/blending semantics apply.
- The new Smart Object contents stay open. Use PNG + Copy inside them to update the same derived PNG in this plugin session. Undo in the parent affects scene edits, not files or clipboard. Unrecognized temporary PSBs are refused.
- Copying uses Photoshop's native image clipboard. Receiving applications decide formats, bit depth, transparency and transparent-border handling. Universal paste/alpha support is not claimed. Enable Photoshop Export Clipboard with the explicit panel button if offered.
- PNG export now uses one temporary merged document for both saving and copying, then closes it and restores focus. It does **not** reopen the PNG in Photoshop. Before any clipboard change or file replacement, the plugin reads the staged PNG as binary and checks signature, dimensions, bit depth/color mode, chunk boundaries/order, image-data presence, ending and every chunk CRC. This reads the compressed file into memory; it is a structure/integrity check, not a pixel decode or visual/ICC comparison. Diagnostics record `verification.method` and `decodedPixels: false` honestly. Copy uses no PNG read/open/write. Neither action changes the original selection or merges source layers.
- Removing the PNG open/close cycle eliminates one document opening from each export. A temporary merged document and native save/copy operations remain and may still redraw Photoshop. Reduced document switching is source/mocked evidence; actual flashing has not been reproduced or confirmed fixed. There is no background polling, animation, forced redraw or idle Photoshop mutation.

## Recovery, data and permissions

Filesystem permission is **fullAccess** so the requested export beside a saved PSD needs no folder picker. Runtime resolves and verifies only the intended project-folder Entry for each export, using UXP's storage provider. Old folder-token settings remain untouched but are no longer needed. `clipboard: readAndWrite` is UXP's permission required for **Copy report**; the plugin only writes diagnostic text on that explicit action and never reads the clipboard. Image copying still uses Photoshop's native image commands. No network, process launch or native helper. Nothing is uploaded. Copy only writes no files; diagnostic text is exported only by its own buttons.

Before PNG replacement, the old file is moved to an operation-specific backup. Failed replacement attempts restore the backup when possible, retaining a direct handle instead of depending on a second file lookup. This is recovery handling, not an atomic filesystem transaction. Do not run simultaneous exporters on one output path. A PNG already open in Photoshop blocks replacement. Crashes or disk failures can leave `.photoshoptool-export-*` or `.photoshoptool-backup-*` files beside the PSD; inspect them before cleanup. Never delete a pre-existing PSD to recover an export.

PNG commit, clipboard updates and parent-document edits are separate effects. Partial success is reported accurately. If selection export fails after creating the Smart Object, keep its contents and retry PNG + Copy there. If copying fails, a valid PNG can still be saved. If PNG replacement fails after copying, the clipboard may already be changed.

**Copy report** is the copy icon beside the status line and is also under **gear → Help & report**. It writes text ready for Ctrl+V, replacing the current image clipboard. **Save report .txt** in the same section saves that report with a file picker and keeps the clipboard unchanged. Reports contain host/plugin versions, panel size, settings, source dimensions/mode/depth, acknowledged effects, timestamped steps, failure phase, error codes/stacks/causes and cleanup errors. The journal keeps the last eight operations and 100 events in memory for the current plugin session, including option-validation and report-export failures; a later success does not erase earlier errors. It is not a Photoshop-wide or persistent crash log. Local absolute paths are redacted; output filenames/error text can remain, so review before sharing. Nothing is sent automatically.

## Add a tool

See [docs/adding-tools.md](docs/adding-tools.md). A bundled module declares a stable tool ID, existing/custom icon, menu command ID, labels and an async handler. Register the module once in `plugin/tools/index.js`; the UI and generated manifest use that registry. Tool-specific option validation is optional and does not block unrelated tools. No editing the runner or hardcoded panel buttons is required.

| Location | Responsibility |
| --- | --- |
| `plugin/core/` | Registry, single-flight runner, bounded diagnostics, host/modal/history helpers, legacy preferences, direct project-folder access and safe file commit. |
| `plugin/tools/png/` | PNG/copy/Smart Object definitions, logic and service. |
| `plugin/ui/` | Registry-driven panel, original SVG icons and scoped theme-aware styling. |
| `plugin/main.js` | Dependency wiring and one UXP entrypoint registration. |
| `scripts/` | Manifest generation, dependency-free reproducible CCX packaging and runtime checks. |
| `tests/` | Node tests with mocked Photoshop/storage/DOM boundaries. |

For developers: Node.js 22+, no npm dependencies or install step. `npm test`, `npm run build`, `npm run check`. `package.json` is the version source; build generates runtime metadata/manifest and `dist/Photoshop-Tool-<version>.ccx` with `LICENSE.txt`. The archive is standard ZIP-based CCX, with `manifest.json` at its root, built using Adobe's documented independent packaging format. Runtime code never imports Node build/test modules.

The GitHub check workflow runs tests, build/source checks and a byte-for-byte comparison with the committed installer. It has read-only repository permission and does not publish/deploy. Native host tests are still required before describing a build as stable. Never silently replace an issued version with different bytes.

## Verification and provenance

Local checks cover registry extension/duplicate IDs, manifest parity, source syntax/imports, preference preservation, direct folder resolution with no picker, full-size 16-bit output, PNG structure/CRC verification without opening a document, full-composition copy with an existing selection, copy/save variants, file backup/restore failures, stale targets, cancellation, Smart Object rollback/retry, keyboard controls, one-time Copy visibility migration, idle no-op rendering and report export/failures/history bounds. They use mocks, not real Photoshop. CCX files are also checked with an independent ZIP reader.

Not verified here: native Photoshop 0.3.2 installation/rendering/resizing, real PNG appearance/ICC, external paste/alpha, text clipboard or Microsoft Defender acceptance. White flashing remains undiagnosed. No antivirus certification or release signing is claimed. A focused host check is: select a small region on a multilayer PSD, click Copy and paste the full visible composition; click PNG + Copy and compare the saved PNG/paste; confirm the original PSD selection/layers and final focus remain unchanged. Return Copy report if an action fails.

Original project: **[NasaatR/Photoshop_Tool](https://github.com/NasaatR/Photoshop_Tool)**. MIT licensed; [LICENSE](LICENSE). The understated UI credit is **Made by Nasaat**; it does not add a restriction to the MIT license. No third-party runtime dependencies or copied exporter code are bundled.

Primary platform references: [Photoshop document API](https://developer.adobe.com/photoshop/uxp/2022/ps-reference/classes/document), [modal/history](https://developer.adobe.com/photoshop/uxp/2022/ps-reference/media/executeasmodal), [Adobe independent package format](https://developer.adobe.com/developer-distribution/creative-cloud/docs/guides/submission/overview), [CCX installation](https://developer.adobe.com/uxp/guides/how-to/distribution/install/).

For this update: [manifest size fields](https://developer.adobe.com/photoshop/uxp/2022/guides/uxp-guide/uxp-misc/manifest-v4/), [file/clipboard permissions](https://developer.adobe.com/photoshop/uxp/2022/guides/uxp-guide/uxp-misc/manifest-v5/), [storage provider](https://developer.adobe.com/photoshop/uxp/2022/uxp-api/reference-js/modules/uxp/persistent-file-storage/file-system-provider), [text clipboard](https://developer.adobe.com/photoshop/uxp/2022/uxp-api/reference-js/global-members/data-transfers/clipboard).

Copy/verification references: [native merged layer copy](https://developer.adobe.com/photoshop/uxp/2022/ps-reference/classes/layer#copy), [binary File.read](https://developer.adobe.com/photoshop/uxp/2022/uxp-api/reference-js/modules/uxp/persistent-file-storage/storage), [W3C PNG specification](https://www.w3.org/TR/png-3/).
