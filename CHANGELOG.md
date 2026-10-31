# Changelog

## 1.3 (native 1.3.0)

- Restore the main content/footer to normal flow after the 1.2 absolute-inset/auto-height viewport was reported to render blank except for the footer.
- Derive an explicit positive scroll height from the mounted host container, panel padding and footer. Use feature-detected ResizeObserver plus mount/show/window resize and one deferred layout pass; no polling. Unknown/zero measurements keep the working flow fallback instead of assigning zero height.
- Reuse one observer per host, avoid duplicate size writes, dispose listeners/timers and retain the original controls, visibility, appearance and order. Preserve tabbed settings, compact hints and mask inversion.
- Add numeric layout, zero-size startup/reopen, resize, observer failure and entrypoint integration regressions. Expose layout metrics/warnings in diagnostics. Native Photoshop visual confirmation remains outstanding.

## 1.2 (native 1.2.0)

- Make Black Mask / Invert conditional: add a full black pixel mask when absent; otherwise select and invert the whole existing mask. Preserve source pixels, mask density/feather, exact pixel selection and one-step history rollback. Report create/invert effects only after commit; retain stable tool/command IDs.
- Replace detailed hover descriptions with compact title-only hints, intrinsic width capped at 220 px and smaller padding. Preserve the 1.1 hover stability/placement/lifecycle fixes.
- Bound the main scroll viewport by panel edges with a fixed credit footer; prevent child shrinking and allow native overflow scroll. Add Page Up/Page Down and focused Home/End, preserving text-input keys and revealing Settings on open.
- Reorganize Settings into View / Tools / Export / Help tabs with roving keyboard navigation, short visibility labels, synchronized caption controls, an Arrange shortcut and direct report actions. Keep long usage text behind Tool guide and retain drafts across tabs.
- Add whole-mask inversion/repeat/failure, scroll-boundary and settings-tab regression coverage. Latest Photoshop host acceptance remains outstanding.

## 1.1 (native 1.1.0)

- Fix premature tooltip dismissal paths: fit height into free space above/below the anchor rather than covering the hovered button, ignore child blur/layout events, reposition on real resize/scroll, retain pointer transfer and cancel stale timers. Cache geometry during pointer movement; include tooltip counters/last dismissal in reports.
- Resolve all Layers command targets with native targetLayersIDs inside the modal scope. Validate IDs, target the owner layer and select component channels without reading a selected mask's DOM Channel properties. Preserve selection/masks and rollback semantics; invalid targets never broaden to composite input.
- Keep an existing pixel mask as a successful no-op. Add mask-focused/unsupported-DOM and sequential Black mask → Curves → Hue/Saturation regressions.
- Add Arrange buttons mode: internal mouse dragging, two-position clicking, keyboard arrows, Done/Escape and Reset order. Persist stable-ID order independently of appearance/visibility/export settings; keep sections, hidden tools and new-tool defaults. Reordering never executes tools and cleans up document listeners.
- Native Photoshop validation of these fixes remains outstanding; mocked/source/build/installer checks are recorded separately.

## 1.0 (native 1.0.0)

- Migrate the owner-requested release policy from 0.3.5 to personal sequential labels: 1.0, 1.1 … 1.9 → 2.0. Derive display/native metadata and installer names from package.json; preserve every issued package, plugin/command ID and preference key. JSON reports retain native version plus displayVersion.
- Replace title-only hints with a shared in-panel tooltip for tools, settings and report actions. Include action names/descriptions, immediate keyboard focus, short hover intent, canceled stale timers, hoverable text, bounded placement, Escape dismissal and hide/destroy cleanup. No host/document polling.
- Make Layers icons 32×32 px (Roomy 36×36), with 18 px glyphs and natural wrapping instead of two stretched columns. Caption mode uses compact three-column 56/62 px buttons. Preserve appearance/visibility preferences and resizable scrolling layout.
- Skip redundant native Move operations for adjustments/fills already above their target; keep explicit placement for groups/clipping chains. Add hover/focus/rapid-transfer/geometry/lifecycle/version and placement regressions.
- The owner reported 0.3.5 working. Version 1.0 is source/mocked/build checked here; native tooltip/layout and update acceptance remain unverified.

## 0.3.5

- Add six registry-driven layer commands: Smart Object, Smart Object + Camera Raw, full black layer mask, clipped Curves, clipped Hue/Saturation and Solid Color fill with native color picker.
- Convert selected layers/groups in place; with no selected layers, stamp the full visible composite nondestructively. Reuse existing Smart Objects; convert-only no-ops without a new history state. Keep exact pixel selections, original layers and document focus; do not open contents, export or use clipboard/folder access.
- Share safe numeric-ID layer/stamp helpers with the existing extraction pipeline. Re-resolve after native ID replacement/consumed helpers; keep owned selection channels and history rollback bounded to the actual document.
- Honor explicit native dialog options and interactive modal execution for Camera Raw/color picker. Apply Camera Raw as a Smart Filter; classify native cancellation, roll back the command and keep export-specific retry instructions out of layer-only errors.
- Add clipped adjustments directly above the chosen layer/group, guard existing pixel masks, require an unlocked Background for a new black mask, and preserve clipping chains when inserting an unclipped fill. No automatic mode/depth changes.
- Separate Export & copy / Layers in the compact rounded responsive panel; rename the existing export workflow to Extract + PNG without changing its command ID. Preserve saved visibility/appearance, scroll, resize limits and installation identity.
- Add mocked layer-ID/group/selection/clipping/dialog/cancellation/rollback and UI regressions. Build/source/CCX checks do not replace native Photoshop/Windows verification; host acceptance remains outstanding.

## 0.3.4

- Fix a stale-layer-handle path in Smart Object composite preparation: native Stamp Visible can consume the temporary helper, so cache primitive IDs, re-resolve live layers after each mutation and skip cleanup when an owned helper is already absent.
- Create the helper with native make and identify it from the live layer-ID difference instead of depending on a createLayer return wrapper when no layer is active. Re-resolve region/Smart Object/channel references across copy, delete and conversion; preserve original-layer guards and history rollback.
- Add exact Smart Object substep, owned IDs and original-cause diagnostics. Read Photoshop version from UXP host metadata instead of reporting undefined from app.version; include UXP version/source.
- Reproduce the reported no-active-layer/selected-region failure with invalidated mock handles and verify the fix. Native Photoshop confirmation remains outstanding.
- Record the owner's concise Photoshop workflow/UI preferences for future changes without modifying the attached project playbook.

## 0.3.3

- Extend Smart Object extraction: text/group/adjustment/smart/multiple/no-layer inputs use a native visible-composite stamp; no pixel selection uses the entire canvas. Preserve the direct selected-pixel-layer path when a selection exists.
- Preserve exact selection/feathering with a short-lived alpha channel, move the owned stamp helper above root layers, require original layer IDs to survive stamping and remove owned intermediates. Retain exactly one new Smart Object; rollback preparation failures in one parent history step.
- Separate Smart Object preparation into a bundled module, keep stable commands/permissions and record input/scope in diagnostic reports.
- Refresh the compact panel with rounded filled tools, captions, normalized icon bounds, separate report icon, status indicator, grouped options and two-column layout for extra tools. Apply captions/rounding once while preserving theme/density and later overrides.
- Add mocked coverage for composite cases, exact selection restoration, nested placement, empty/invalid stamp, cleanup failures, rollback/cancellation and appearance migration. Native Photoshop and visual acceptance remain outstanding.

## 0.3.2

- Show a dedicated Copy image button beside PNG + Copy by default. Expose the previously optional Copy command once on update, preserving other settings and subsequent visibility choices.
- Clarify that Copy transfers the full visible composition as one image, ignoring the current selection/active layer, with no output file or folder access. PNG + Copy continues to perform both effects; native image copy never uses the text-report clipboard code.
- Remove the output PNG document open/close cycle. Save and copy from one operation-owned merged document; verify the staged binary PNG signature, geometry, depth/color type, chunk structure and CRCs before copying/committing.
- Preserve output backup/recovery, partial-success reporting, cancellation and source state. Log the new integrity-verification method explicitly; this does not decode/visually inspect exported pixels.
- Add regression tests for full-composition copy, default/upgrade visibility, no PNG reopening, malformed/truncated/corrupt PNGs and read/depth failures. Native Photoshop/clipboard/flash acceptance remains outstanding.

## 0.3.1

- Set an explicit independent panel size range (176×96–4096×4096), remove viewport-height coupling and place content/settings/report controls in one scroll body.
- Restore automatic PNG export beside the saved PSD/PSB with no folder picker. Declare fullAccess and resolve/verify the intended project folder directly before modal work; old settings remain untouched.
- Add one-click Copy report beside the operation status and in Help & report, plus Save report .txt. Declare the UXP clipboard write permission; never read clipboard data.
- Capture the last eight operations/100 session events, timed steps, source/options context, option-validation failures, partial effects, nested errors and separate cleanup failures. Redact absolute local paths in shared reports and report export failures honestly.
- Add mocked regression coverage for the requested workflows. Native Photoshop resize, filesystem and clipboard acceptance remain to be checked on Windows.

## 0.3.0

- Establish Photoshop Tool as a modular successor to PNG Relay, retaining plugin/menu IDs and local preference/folder keys.
- Share registry-driven buttons and menu commands, single-flight execution, checked modal/history helpers, explicit folder access, diagnostics and safe file commit.
- Add optional PNG only and Copy only commands. Copy only uses no file/folder access and supports unsaved documents.
- Revalidate selection bounds/layer identity after folder access. Retain a direct moved-backup handle for recovery without a second lookup.
- Generate runtime metadata/menu manifest and reproducible CCX from one version source; add checks, documentation and CI.
- Native Photoshop 0.3.0 and Defender testing remain outstanding. Earlier 0.1.1 host functionality was reported working by the user.

## 0.2.0 — earlier conversation build

Compact square icon panel, optional captions/appearance settings, scoped styles and one PNG open for verification/copy. Source recovery for this repository used the implementation recorded in the conversation; old temporary workspace files were removed by environment maintenance. A byte-identical 0.2.0 archive was not used as a baseline.

## 0.1.1 — earlier conversation build

JavaScript entrypoint, folder-scoped permissions, local diagnostic reports and installable CCX. User reported successful installation and core functions.
