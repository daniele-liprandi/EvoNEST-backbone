# Text file processing for the experiment form

`processPlainTextFile` (`readable-processor.ts`) is the only processor left. It
reads a `.txt`, `.csv`, `.tsv`, `.dat` or `.json` file dropped on the experiment
form and runs it through the data-format parser registry
(`../readable-data-extractors/`).

- A parser recognises the format: the processor fills the form with the parsed
  experiment and its traits.
- No parser recognises it: the processor throws `UnrecognisedDataFileError`. The
  file is a document, not an experiment, and `extension-processors.tsx` tells the
  user to attach it to a record instead.

Images, documents and other binary files never reach here. They are attachments,
handled by `AttachmentPanel` and `/api/attachments`. The old per-extension
processor registry (image, TIFF, lossless-image, document) was removed with the
attachments layer.

See [File Handling & Attachments](../../../../docs/technical-docs/file-processor-development.md)
for the full picture, and the
[Data Format Parser Development Guide](../../../../docs/technical-docs/data-format-parser-development.md)
for writing a parser.

## Shared helpers (`utils.ts`)

```typescript
import {
    generateUniqueName,        // unique experiment name against existing + this batch
    getSuggestedExperimentType, // map a detected format to an experiment type
    updateFormValues,          // push parsed values into the form and allFileData
    resetGeneratedNames,       // clear the per-batch name set before a new upload
} from "./utils";
```
