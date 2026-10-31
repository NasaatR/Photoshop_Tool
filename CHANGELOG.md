# Changelog

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
