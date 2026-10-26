# Adding a bundled tool

The plugin has one lifecycle owner (`main.js`), one registry and one single-flight runner. Tools are bundled local modules, not downloaded scripts or runtime plugins.

1. Create `plugin/tools/<name>/index.js` exporting an array of tool definitions.
2. Add the module to `plugin/tools/index.js`.
3. Reuse an icon from `ui/icons.js` or add an original path there.
4. Add meaningful tests, then run `npm test`, `npm run build` and `npm run check`.
5. Test the affected path in real Photoshop. Bump `package.json` before issuing changed installer bytes.

Example of a read-only document information tool (example only; not installed):

```js
module.exports = [{
  id: 'document.info',
  commandId: 'documentInfo',
  title: 'Document Information',
  label: 'Document',
  icon: 'copy',
  defaultVisible: true,
  description: 'Show current pixel dimensions',
  async execute(ctx) {
    const doc = ctx.services.host.app.activeDocument;
    if (!doc) throw new Error('Open a document first.');
    ctx.record.width = doc.width;
    ctx.record.height = doc.height;
    ctx.record.message = 'Document';
  }
}];
```

`id` is stable lowercase dotted text. `commandId` must be unique and is emitted into the generated manifest. Avoid changing old IDs: Photoshop Actions may refer to them. Existing `exportCopy` and `selectionSmart` are preserved. Metadata changes automatically reach the panel and menu during build.

`readOptions(draft)` is optional and runs before execution. Use it for tool-specific validation; an unrelated invalid PNG compression field must not prevent a different tool. A tool without this method receives an empty options object. Keep persistent tool settings under a versioned tool-specific key, retaining the original PNG keys.

`execute(ctx)` receives validated `options`, `services`, an operation `record`, `progress(text)` and bounded `warn(text)`. Await every asynchronous operation. Set `record.message` for a custom completion message. Record `pngSaved`, `imageCopied` or other effects only after the corresponding operation is acknowledged. Do not log private scene content, capability tokens or credentials.

For mutations, use `ctx.services.host.modal(name, async executionContext => …)` and the documented host APIs. Acquire folder grants/pickers before modal work and revalidate document/layer IDs afterward. The runner serializes all registered tools, but does not automatically put read-only work or file dialogs into a modal scope.

`core/host.js` exposes checked `batch()`, cancellation, temporary-document ownership/closing and `withHistory`. History is per document and does not undo exported files. Use operation-owned duplicates for rendering/conversion; never flatten/rasterize the original incidentally. Keep cleanup errors from masking the primary operation error.

`core/output-access.js` validates an explicitly selected folder against the intended parent path and remembers capabilities. `core/safe-output.js` stages replacement with backup/restore handling. Do not bypass folder permissions or turn all I/O errors into “file missing.” A backup mechanism is not a transaction or a lock against other applications.

Long-lived services are injected in `main.js`. A complex tool can add its own service there rather than hiding host state inside the registry or importing global Photoshop objects from pure logic. Avoid timers, polling, whole-panel replacement and global CSS. Controls must preserve keyboard/disabled states and long labels; scope styles beneath `#photoshoptool`.

`plugin/product.json` and `plugin/manifest.json` are generated. Do not edit their versions/menu lists manually. `package.json` is the version source, and the command registry is the tool source. New platform capabilities/permissions require an explicit design decision; metadata cannot grant an API.

The original project is https://github.com/NasaatR/Photoshop_Tool. Preserve applicable MIT notices in substantial reuse. `Made by Nasaat` is product branding, not an additional licensing condition.
