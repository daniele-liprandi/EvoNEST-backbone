# File Handling & Attachments

How EvoNEST decides what to do with an uploaded file, and how to give a new
entity type its own file gallery.

## The three paths

When a file reaches EvoNEST it takes one of three routes:

```
                        ┌─ recognised instrument format ─→ Data Format Parser ─→ structured experiment + traits
Uploaded file ─→ route ─┼─ image / document / any blob ──→ Attachment ─────────→ attachments collection + stored file
                        └─ plain text, no parser match ──→ processPlainTextFile ─→ raw experiment ("document")
```

1. **Data format parser** — machine-readable instrument output (tensile rigs,
   spectrometers, …). Parsers detect the format, extract data, and generate
   traits automatically. See the
   [Data Format Parser Development Guide](./data-format-parser-development.md).
2. **Attachment** — images, PDFs, spreadsheets, notes, or anything else that
   belongs *to* a sample / trait / experiment rather than being an experiment in
   itself. This is the path this guide covers.
3. **Plain-text fallback** — `src/utils/file-management/processors/readable-processor.ts`
   still handles `.txt` / `.csv` / `.json` files that no parser claims, creating
   a lightweight experiment. There is no longer a pluggable "file processor"
   registry — image, TIFF, lossless-image, and document processors were removed
   when file storage moved to the `attachments` collection.

## Attachments

Files are linked to entities through the polymorphic `attachments` collection.
One row joins a stored file (`fileId`) to a target by `targetType` + `targetId`.

- `targetType` resolves to its collection and capability prefix **by
  convention** — `"trait"` → collection `traits`, capabilities `traits.read` /
  `traits.delete`. Only exceptions register in
  `src/shared/config/attachment-targets.js` (`ATTACHMENT_TARGET_OVERRIDES`), so
  no handler ever enumerates a type list. A brand-new entity type gets
  attachments with **zero** changes here.
- `kind` — one of `ATTACHMENT_KINDS` (`image`, `video`, `audio`, `document`,
  `data`). A coarse render hint derived from the file's MIME type by
  `kindFromMime()`: `image/*` → `image`, spreadsheets/CSV/JSON → `data`,
  everything else → `document`. The panel makes finer choices (a PDF renders
  inline, an `.xlsx` does not) from the MIME type itself.
- `category` — a free-string semantic slot each lab defines: `"gallery"`,
  `"raw-data"`, `"sop"`, … Distinct from `kind`.

### API

`/api/attachments` (see `src/app/api/attachments/`):

| Call | Purpose |
| --- | --- |
| `GET /api/attachments?targetType=&targetId=` | attachments for one entity (also filters by `kind` / `category`) |
| `GET /api/attachments` | every attachment in the NEST (the `/attachments` page) |
| `GET /api/attachments/[id]` | one attachment |
| `POST /api/attachments` `{ method: "create", fileId, targetType, targetId, category, responsible }` | link an **already-uploaded** file (`/api/files`) to a target, mark it permanent, stamp the target logbook |
| `POST /api/attachments` `{ method: "setfield", id, field, value }` | update `caption` / `category` / `stepKey` / `order` |
| `DELETE /api/attachments` `{ id }` | remove the row, and the file if it was the last reference — needs `attachments.delete` |

`create` resolves `targetType` through `resolveAttachmentTarget()` and 404s if
the file or target document is missing; `category` is required. Uploading the
file itself is a separate `/api/files` request — `AttachmentPanel` does both via
the `uploadAndAttach` handler.

### Giving an entity a file gallery

Mount the panel on any detail view:

```tsx
import { AttachmentPanel } from "@/components/attachments/AttachmentPanel";

<AttachmentPanel
  targetType="experiment"
  targetId={experiment._id}
  defaultCategory="gallery"   // stamped on files uploaded here; defaults to "gallery"
  accept="image/*"            // optional <input accept>
/>
```

That is the whole integration — upload, gallery, caption editing, reorder, and
delete come with the component. For sample detail pages, `AttachmentsCard`
(`src/components/sample-cards/`) wraps the panel as a registry card.

If the new `targetType` does **not** follow the `type` → `types` collection
convention (or needs a different capability prefix), add one entry:

```js
// src/shared/config/attachment-targets.js
export const ATTACHMENT_TARGET_OVERRIDES = [
  { type: "equipment", collection: "labEquipment", capabilityPrefix: "equipment" },
];
```

## Related

- [Data Format Parser Development Guide](./data-format-parser-development.md) — structured instrument data
- [Sample Cards Development](./component-development.md) — registry cards for sample detail pages
