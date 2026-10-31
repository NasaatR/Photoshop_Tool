# Photoshop Tool

A modular Adobe Photoshop UXP toolbox by NasaatR. It combines full-resolution PNG export/copy with Smart Objects, Camera Raw, masks, clipped adjustments and color fills. New bundled tools share the same panel, command registry, preferences, single-flight execution and host/file safety helpers.

[Инструкция на русском](README.ru.md)

## Download and install

**Development preview 1.1:** [Download Photoshop-Tool-v1.1.ccx](https://github.com/NasaatR/Photoshop_Tool/raw/refs/heads/develop/dist/Photoshop-Tool-v1.1.ccx). This is the installable plugin, not GitHub's source ZIP. [SHA-256](dist/SHA256SUMS.txt).

1. Close Photoshop. Double-click the `.ccx` file and approve installation/update in Creative Cloud Desktop.
2. Open Photoshop → **Plugins → Photoshop Tool → Photoshop Tool**.
3. Approve the updated file/clipboard permissions during installation. Export finds the saved PSD's folder automatically; no folder picker is shown.

UXP Developer Tool is not required for CCX installation. This updates the earlier **PNG Relay**: plugin ID `com.nasaat.pngrelay`, original menu command IDs, export preferences and folder-access keys are preserved. Unload any development copy in UDT before installing the CCX. To uninstall, use Creative Cloud Desktop → Manage Plugins → Photoshop Tool → Uninstall. Exported files remain.

Code is in **develop**, as requested by the repository owner. `main` is deliberately unchanged. This CCX is a checked repository download, not an Adobe Marketplace submission or a GitHub Release asset.

## Version numbering

The owner-requested migration starts **v1.0**, native manifest/package **1.0.0**, after the issued **0.3.5**. Future personal releases are **1.1 … 1.9 → 2.0**, with native **1.1.0 … 1.9.0 → 2.0.0**. These are sequential release labels, not compatibility promises. `package.json.version` is the single source; the build derives display version and `Photoshop-Tool-v1.1.ccx`. Current release: display **1.1**, native **1.1.0**. The panel/report header shows 1.1; JSON diagnostics retain native `version: 1.1.0` plus `displayVersion: 1.1`. Plugin/command IDs and settings stay unchanged. Issued 0.3.x packages keep their names/bytes; installing this CCX is the normal update path.

## Included tools

| Tool | Behavior |
| --- | --- |
| PNG + Copy | Current visible canvas → lossless PNG beside the local PSD/PSB, then image data for native paste. |
| Copy | Full visible composition as one image, ignoring the selection/selected layer. No PNG, folder access or disk staging. Also works on an unsaved document. |
| Extract + PNG | Pixel selection or full canvas → new embedded Smart Object → open contents → PNG beside parent PSD + copy. Creates a visible composite when no suitable pixel layer is selected. |
| PNG only | Export without changing the image clipboard. Works even when Export Clipboard is disabled. |
| Smart Object | Convert selected layers in place. With no selected layer, create a nondestructive Stamp Visible copy first. An existing Smart Object is reused. No extraction, export or contents opening. |
| Camera Raw | Same target logic, then open the native Camera Raw dialog. OK applies it as an editable Smart Filter; Cancel rolls back this command. |
| Black mask | Add a full black Hide All pixel mask to one unlocked selected layer/group. Existing masks are never replaced. Unlock a special Background layer first. |
| Curves | Add a neutral Curves adjustment immediately above one selected layer/group and clip it. |
| Hue / Sat | Add a neutral Hue/Saturation adjustment immediately above one selected layer/group and clip it. |
| Solid Color | Choose a color in the native picker and create an editable, unclipped fill. Cancellation adds nothing. |

The **Export & copy** and **Layers** sections keep image export separate from document editing. All tools except PNG only are visible by default; existing visibility overrides remain respected. **Gear → Tool buttons** controls each button. All ten commands also appear in Photoshop's Plugins menu. Existing command IDs remain stable, including `selectionSmart` (now labeled Extract + PNG) and `copyImageOnly`. Copy transfers image data for Ctrl+V, not file paths or separate layers. Hidden layers stay excluded from the composition.

The six layer tools work in unsaved documents, require no export-folder access or external clipboard preference, and ignore unrelated PNG options. Smart Object and Camera Raw act on whole selected layers, preserving the pixel selection via an owned alpha channel. No selected layers means a full visible stamp, without merging/deleting original layers. Selecting multiple layers embeds them together; a selected group embeds its descendants. Layer actions select the composite image channel when a mask/channel was active. Black mask selects its new mask for painting afterward.

Curves/Hue / Sat require exactly one selected target; edit them in Photoshop's Properties panel. A current pixel selection follows native adjustment-mask behavior. Existing clipping chains keep Photoshop's base-layer/group semantics. Solid Color follows native insertion/selection-mask behavior; when inserted into a clipping chain, it is moved above that chain before unclipping so existing clipped layers are not released. Layer operations share one history step and roll back on failure/cancellation. An already-smart Convert command is a no-op and does not create a history/selection channel.

The panel now uses rounded filled tool buttons with visible captions, consistent 24-unit SVG icons, a distinct report icon, a status indicator and grouped options. A one-time design refresh enables captions/rounded corners while retaining theme, density, export settings and button visibility; later changes are respected. The label toggle, compact/roomy size, Square/Rounded corners and Auto/Dark/Light theme are retained. Auto follows Photoshop's host colors. Export buttons retain their larger layout. Layers use compact 32×32 px icons (Roomy: 36×36), wrapping as needed rather than stretching into two large columns. With captions, Layers use three columns and shorter 56/62 px buttons. Hidden empty sections take no space. Every tool, setting and report control has an in-panel hover/focus hint with a name and description; it does not rely on the host rendering HTML title. Hints stay inside the panel, allow pointer transfer, dismiss with Escape and clean up on hide/destroy. No idle timer, document polling or tooltip animation is used. Captions can be hidden for a compact icon toolbar.

Drag the floating panel's edge/corner or a dock divider to resize. The manifest explicitly permits 176×96 through 4096×4096 pixels; Photoshop's docking layout may impose additional limits. Content, options and reports share one scroll body at small sizes. Click the status line for full output names/errors; the small document icon beside it copies a diagnostic text report, separate from the larger Copy image tool.

## Arrange buttons

Use the **Arrange buttons** arrow icon beside the caption/settings controls. In this mode, drag a tool onto its desired position, or click the tool and then the destination. Arrow keys move the focused tool one position. Order is changed within Export & copy or Layers; moving does not run a Photoshop command. Choose **Done** or Escape to finish; **Reset order** restores the registry order without changing tool visibility, appearance or export options. Ordering includes hidden tools, survives recreation/update and appends new tools to their section. Settings failures appear in the status/report.

## Export behavior and limits

- Windows 11; Photoshop **26.9+**, UXP API v2. Version 0.1.1 was reported working by the user. This 1.1 build has not been executed in a real Photoshop host here.
- Original canvas dimensions and source 8/16-bit depth; RGB/Grayscale only. No lossy compression or arbitrary resizing. Other modes and 32-bit/HDR are refused instead of silently converted. Optional sRGB conversion changes only the temporary copy.
- PNG uses current in-memory artwork, including unsaved edits. It does **not** automatically save/flatten the source PSD. Artboards export the full document canvas, not separate board files.
- Extract + PNG input follows the table below. The visible-composite path uses native Stamp Visible (`mergeVisible` with `duplicate: true`, equivalent to Shift+Ctrl+Alt+E) on an owned temporary pixel layer at the top. Original layers remain editable and hidden layers stay excluded. The full stamp and helper are removed after extracting the region, leaving exactly one new Smart Object. The original pixel selection is saved/loaded through an owned alpha channel so a feathered/nonrectangular mask is applied once, then that channel is removed. No selection means an explicit full-canvas rectangle, including when artboards are present; the original no-selection state is restored. Quick Mask and non-composite channels are still refused. Native Photoshop masks/styles/blending semantics apply.
- The new Smart Object contents stay open. Use PNG + Copy inside them to update the same derived PNG in this plugin session. Undo in the parent affects scene edits, not files or clipboard. Unrecognized temporary PSBs are refused.
- Copying uses Photoshop's native image clipboard. Receiving applications decide formats, bit depth, transparency and transparent-border handling. Universal paste/alpha support is not claimed. Enable Photoshop Export Clipboard with the explicit panel button if offered.
- PNG export now uses one temporary merged document for both saving and copying, then closes it and restores focus. It does **not** reopen the PNG in Photoshop. Before any clipboard change or file replacement, the plugin reads the staged PNG as binary and checks signature, dimensions, bit depth/color mode, chunk boundaries/order, image-data presence, ending and every chunk CRC. This reads the compressed file into memory; it is a structure/integrity check, not a pixel decode or visual/ICC comparison. Diagnostics record `verification.method` and `decodedPixels: false` honestly. Copy uses no PNG read/open/write. Neither action changes the original selection or merges source layers.
- Removing the PNG open/close cycle eliminates one document opening from each export. A temporary merged document and native save/copy operations remain and may still redraw Photoshop. Reduced document switching is source/mocked evidence; actual flashing has not been reproduced or confirmed fixed. There is no background polling, animation, forced redraw or idle Photoshop mutation.

| State when Extract + PNG is clicked | Input |
| --- | --- |
| One pixel layer + pixel selection | Selected pixel layer's own content, as before. |
| Text, group, adjustment, Smart Object, multiple or no selected layers + pixel selection | All visible artwork, cropped by the exact selection. |
| No pixel selection | Visible composite of the full canvas, regardless of active layer. |

Composite preparation, extraction and conversion share one parent-document history step. Errors before conversion commits roll back owned layers/channels. Errors during later PNG export retain the new Smart Object and its open contents for retry. Empty visible artwork reports an error instead of converting an original layer.

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
| `plugin/tools/png/` | PNG/copy/extraction definitions, logic and service. |
| `plugin/tools/layers/` | Convert/Camera Raw/mask/adjustment/fill commands and service; no file/clipboard dependency. |
| `plugin/ui/` | Registry-driven panel, original SVG icons and scoped theme-aware styling. |
| `plugin/main.js` | Dependency wiring and one UXP entrypoint registration. |
| `scripts/` | Manifest generation, dependency-free reproducible CCX packaging and runtime checks. |
| `tests/` | Node tests with mocked Photoshop/storage/DOM boundaries. |

For developers: Node.js 22+, no npm dependencies or install step. `npm test`, `npm run build`, `npm run check`. `package.json` is the version source; build generates runtime metadata/manifest and `dist/Photoshop-Tool-v<display>.ccx` with `LICENSE.txt`. The archive is standard ZIP-based CCX, with `manifest.json` at its root, built using Adobe's documented independent packaging format. Runtime code never imports Node build/test modules.

The GitHub check workflow runs tests, build/source checks and a byte-for-byte comparison with the committed installer. It has read-only repository permission and does not publish/deploy. Native host tests are still required before describing a build as stable. Never silently replace an issued version with different bytes.

## Verification and provenance

The owner reported the 0.3.5 layer tools working. This update additionally skips redundant Move commands when new adjustments/fills are already directly above their target; group/clipping placement is still validated.

Local checks cover registry extension/duplicate IDs, manifest parity, source syntax/imports, preference preservation, direct folder resolution with no picker, full-size 16-bit output, PNG structure/CRC verification without opening a document, full-composition copy with an existing selection, copy/save variants, file backup/restore failures, stale targets, cancellation, Smart Object rollback/retry, keyboard controls, one-time Copy visibility migration, idle no-op rendering and report export/failures/history bounds. They use mocks, not real Photoshop. CCX files are also checked with an independent ZIP reader.

Not verified here: native Photoshop 1.1 installation/rendering/resizing, real Stamp Visible/selection-alpha behavior, PNG appearance/ICC, external paste/alpha, text clipboard or Microsoft Defender acceptance. UI structure/keyboard/preferences are checked with DOM mocks; a screenshot/native visual review of this version was not available. White flashing remains undiagnosed. No antivirus certification or release signing is claimed. A focused host check is: select a region with a text/group layer active (then with no active layer), click Extract + PNG, confirm one new object/open contents plus PNG/copy and unchanged original layers/selection; repeat with no pixel selection to check the whole canvas. Return Copy report if an action fails.

Original project: **[NasaatR/Photoshop_Tool](https://github.com/NasaatR/Photoshop_Tool)**. MIT licensed; [LICENSE](LICENSE). The understated UI credit is **Made by Nasaat**; it does not add a restriction to the MIT license. No third-party runtime dependencies or copied exporter code are bundled.

Primary platform references: [Photoshop document API](https://developer.adobe.com/photoshop/uxp/2022/ps-reference/classes/document), [modal/history](https://developer.adobe.com/photoshop/uxp/2022/ps-reference/media/executeasmodal), [Adobe independent package format](https://developer.adobe.com/developer-distribution/creative-cloud/docs/guides/submission/overview), [CCX installation](https://developer.adobe.com/uxp/guides/how-to/distribution/install/).

For this update: [manifest size fields](https://developer.adobe.com/photoshop/uxp/2022/guides/uxp-guide/uxp-misc/manifest-v4/), [file/clipboard permissions](https://developer.adobe.com/photoshop/uxp/2022/guides/uxp-guide/uxp-misc/manifest-v5/), [storage provider](https://developer.adobe.com/photoshop/uxp/2022/uxp-api/reference-js/modules/uxp/persistent-file-storage/file-system-provider), [text clipboard](https://developer.adobe.com/photoshop/uxp/2022/uxp-api/reference-js/global-members/data-transfers/clipboard).

Copy/verification references: [native merged layer copy](https://developer.adobe.com/photoshop/uxp/2022/ps-reference/classes/layer#copy), [binary File.read](https://developer.adobe.com/photoshop/uxp/2022/uxp-api/reference-js/modules/uxp/persistent-file-storage/storage), [W3C PNG specification](https://www.w3.org/TR/png-3/).

Smart Object references: [Adobe Stamp Visible workflow](https://helpx.adobe.com/photoshop/desktop/create-manage-layers/get-started-layers/merge-and-stamp-layers.html), [selection save/load](https://developer.adobe.com/photoshop/uxp/2022/ps-reference/classes/selection), [recorded native descriptor discussion](https://forums.creativeclouddeveloper.com/t/get-layer-id-from-doing-mergevisible-batchplay-command/7737). Descriptor behavior is source-backed and mocked, not a claim of execution on the user's host.

Smart Object reliability: native Stamp Visible may consume its owned helper. Preparation stores numeric IDs, reacquires live layer/channel references after mutations and skips already-consumed helpers. Reports include `smartStep`, `smartLayerIDs`, nested native causes and Photoshop/UXP versions from UXP host metadata. New layer commands reuse these shared `core/layers.js` helpers. The previously reported missing-layer error is reproduced with strict mocked handles; this is not a claim of native Photoshop confirmation.

Layer-tool references: [Layer move/clipping API](https://developer.adobe.com/photoshop/uxp/2022/ps-reference/classes/layer), [native adjustment descriptor](https://forums.creativeclouddeveloper.com/t/open-the-curves-adjustment-layer-dialog/7881), [native black mask/target scope](https://forums.creativeclouddeveloper.com/t/manifest-v5-the-command-make-is-not-currently-available/8805), [Camera Raw filter descriptor](https://forums.creativeclouddeveloper.com/t/opening-a-camera-raw-specific-panel/4913), [color picker and cancellation result](https://forums.creativeclouddeveloper.com/t/uxp-get-user-adjustments-from-displayed-dialog/2372), [Solid Color descriptor nesting](https://forums.creativeclouddeveloper.com/t/modal-scope-confusion-adding-solid-color-layer/7842). Forum snippets are primary developer reports, not authoritative validation on the latest host. No Camera Raw version/preset parameters are hardcoded.

Focused native acceptance for 1.1: run Smart Object/Camera Raw on a selected pixel layer, group, multiple layers and no selected layers; confirm exact selection and unrelated originals survive, no PSB/PNG opens, Camera Raw is a Smart Filter, and Cancel restores the pre-command state. Add Black mask on an unlocked layer with a pixel selection, then Curves/Hue / Sat on a layer and group, including an existing clipping chain. Confirm Properties edits and clipping, Solid Color's chosen color/cancellation, and narrow/wide panel layouts. These host checks have not been run here.

Tooltip platform references: [UXP Element geometry/attributes](https://developer.adobe.com/photoshop/uxp/2022/uxp-api/reference-js/global-members/html-dom/element), [Adobe UI/event sample](https://github.com/AdobeDocs/uxp-photoshop-plugin-samples/blob/main/ui-kitchen-sink/index.html). The in-panel implementation avoids reliance on host title behavior; latest-host visual/focus acceptance is still required.

Version 1.1 addresses the reported tooltip flash by limiting hint height to free space above/below its anchor, so the hint cannot cover its own button. Layout/child blur no longer dismisses it; real resize/scroll repositions it without repeated geometry writes. Pointer transfer and Escape remain supported; the report includes bounded tooltip show/dismiss counters and last dismissal reason. Latest-host verification remains outstanding.

Layer targets are resolved from native `targetLayersIDs` inside the modal scope and validated against the live tree. Before editing, the owner layer is targeted and component channels selected without probing a selected mask's DOM Channel kind/name. This applies to all six Layers commands. Existing masks are kept as a successful no-op rather than overwritten. Native target/selection/channel failures stop or roll back the command; an invalid target never becomes a composite fallback. References: [native target query/selection discussion](https://forums.creativeclouddeveloper.com/t/manifest-v5-the-command-make-is-not-currently-available/8805), [UXP channel reference](https://developer.adobe.com/photoshop/uxp/2022/ps-reference/classes/channel).
