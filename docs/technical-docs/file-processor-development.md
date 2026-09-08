# File Handling & Attachments

EvoNEST handles an uploaded file in one of three ways, and any entity type can be
given its own file gallery. This page covers both.

## The three paths

```
Text file in the experiment form
  ├─ a parser recognises the format  →  experiment + traits
  └─ no parser matches               →  the form fills, but there is nothing to submit

Any file in AttachmentPanel or POST /api/attachments
  └─ /api/files (deferred)  →  /api/attachments  →  attachments row + stored file
```

### Recognised instrument data

Machine-readable output from lab instruments, such as tensile rigs, spectrometers
and dataloggers. The experiment form runs every text file through the parser
registry (`src/utils/file-management/readable-data-extractors/`). When a parser
recognises the format it extracts the data, builds the experiment, and generates
its traits. Writing a parser is covered in the
[Data Format Parser Development Guide](./data-format-parser-development.md).

### Attachments

A file that belongs to a sample, trait or experiment rather than being one: a
specimen photo, a PDF protocol, a spreadsheet, a field note. Attachments are
uploaded through `AttachmentPanel` or the `/api/attachments` route, never the
experiment form. The rest of this page is about them.

### Text a parser cannot place

`readable-processor.ts` still reads `.txt`, `.tsv`, `.dat` and non-experiment
`.json` files that no parser claims, and fills the experiment form from them.
Image and document handling was removed with the attachments layer, and no submit
path replaced it for these files, so the form fills but nothing is stored. Attach
an unrecognised data file to the record it belongs to, or write a parser for it.

::: tip Images and documents are not experiments
Before the attachments layer you uploaded a photo or a PDF as an experiment and
chose `image` or `document` as the type. Those types are gone, along with their
processors. Attach the file to the sample, subsample or trait it documents.
:::

## Attachments

A file links to an entity through the polymorphic `attachments` collection. One
row joins a stored file to a target.

| Field | Holds |
| --- | --- |
| `targetType`, `targetId` | the entity the file belongs to |
| `fileId` | the stored file, in the `files` collection |
| `kind` | coarse render bucket, described below |
| `contentType` | the file's exact MIME type, which the panel reads for finer choices such as embedding a PDF but only linking a `.docx` |
| `category` | free-string slot for what the file is for, for example `gallery`, `raw-data`, `sop` |
| `caption`, `order` | shown and editable in the panel |

### How targetType resolves

`targetType` maps to a collection and a capability prefix by convention. `trait`
gives the `traits` collection and the `traits.read` and `traits.delete`
capabilities. Only the exceptions sit in
`src/shared/config/attachment-targets.js` under `ATTACHMENT_TARGET_OVERRIDES`, so
no handler carries a list of known types, and a new entity type needs no change
here.

### How kind is set

`kind` is one of `image`, `video`, `audio`, `document`, `data`. `kindFromMime()`
derives it from the file's MIME type: `image/*`, `video/*` and `audio/*` map to
themselves; spreadsheets, CSV and JSON map to `data`; anything else maps to
`document`. It stays coarse on purpose. The panel reads `contentType` when it
needs the exact type.

### API

`/api/attachments` lives in `src/app/api/attachments/`. It is a separate route
from `/api/files`, which stores the bytes.

| Call | Purpose |
| --- | --- |
| `GET /api/attachments?targetType=&targetId=` | one entity's attachments, also filterable by `kind` and `category` |
| `GET /api/attachments` | every attachment in the NEST, behind the Files nav item |
| `GET /api/attachments/[id]` | one attachment |
| `POST /api/attachments` with `{ method: "create", fileId, targetType, targetId, category, responsible }` | link a file to a target |
| `POST /api/attachments` with `{ method: "setfield", id, field, value }` | change `caption`, `category` or `order` |
| `DELETE /api/attachments` with `{ id }` | remove the row, and the file with it when nothing else points at it |

`create` expects a file already uploaded to `/api/files` with
`deferredLink: true`, which stores it as temporary; the `create` call is what
marks it permanent. It reads the target through `resolveAttachmentTarget()`,
requires `category` and a valid `responsible` user, and returns 404 when the file
or the target document is missing. It also accepts an optional `caption` and an
explicit `kind`. `delete` needs the `attachments.delete` capability. The `GET`
routes check only that the caller is signed in.

For an upload that does not go through `AttachmentPanel`, `uploadAndAttach()` and
`createAttachment()` in `src/utils/handlers/attachmentHandlers.tsx` do both steps
together.

### Giving an entity a file gallery

Mount the panel on the detail view:

```tsx
import { AttachmentPanel } from "@/components/attachments/AttachmentPanel";

<AttachmentPanel
  targetType="experiment"
  targetId={experiment._id}
  defaultCategory="gallery"  // stamped on files uploaded here, "gallery" if omitted
  accept="image/*"           // optional, passed to the file input
/>
```

Upload, gallery, caption editing, reordering and delete come with it. On sample
detail pages, `AttachmentsCard` in `src/components/sample-cards/` wraps the panel
as a registry card, so every sample type has one.

When a `targetType` does not follow the `type` to `types` collection naming, or
needs a different capability prefix, add one line:

```js
// src/shared/config/attachment-targets.js
export const ATTACHMENT_TARGET_OVERRIDES = [
  { type: "equipment", collection: "labEquipment", capabilityPrefix: "equipment" },
];
```

## Related

- [Data Format Parser Development Guide](./data-format-parser-development.md), for structured instrument data
- [Sample Cards Development](./component-development.md), for registry cards on sample pages
