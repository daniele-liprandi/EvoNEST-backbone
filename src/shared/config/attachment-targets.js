// What an attachment can point at. `targetType` is a free string; its collection
// and capability prefix follow by convention — `"trait"` -> collection `traits`,
// capabilities `traits.read` / `traits.delete`. Only the cases where that rule
// does not hold register here, so no handler ever enumerates a type list.
//
// Shape: { type, collection, capabilityPrefix }.

export const ATTACHMENT_TARGET_OVERRIDES = [];

/**
 * Resolve a `targetType` to `{ type, collection, capabilityPrefix }`, or `null`
 * when it is not a usable string. Unknown types resolve by convention rather
 * than failing — a new entity gets attachments with no change here.
 */
export function resolveAttachmentTarget(targetType) {
  if (typeof targetType !== "string" || targetType.length === 0) return null;
  const override = ATTACHMENT_TARGET_OVERRIDES.find((o) => o.type === targetType);
  if (override) return override;
  return {
    type: targetType,
    collection: `${targetType}s`,
    capabilityPrefix: `${targetType}s`,
  };
}

// The rendering bucket for an attachment's file, a closed set the UI groups and
// filters on: media renders inline, `data` offers a table/preview, `document`
// is a link. It is a coarse hint — finer choices (PDF renders inline, .xlsx
// does not) are the panel's to make from the file's MIME type. Distinct from
// `category`, the semantic slot ("gallery", "sop", "raw-data", ...), which
// stays a free string each lab defines for itself.
export const ATTACHMENT_KINDS = ["image", "video", "audio", "document", "data"];

// Structured data rather than prose. Spreadsheets included — a workbook is data
// a lab analyses, not a document it reads.
const DATA_MIME = new Set([
  "text/csv",
  "text/tab-separated-values",
  "application/json",
  "application/ld+json",
  "application/x-ndjson",
  "application/xml",
  "text/xml",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.spreadsheet",
]);

const DOCUMENT_MIME = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/html",
  "application/rtf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text",
]);

/**
 * Map a MIME type to an {@link ATTACHMENT_KINDS} value. Parameters (`; charset=`)
 * and case are ignored. An unknown type is a `document` — the "just link it"
 * bucket is the safe default.
 */
export function kindFromMime(mimeType) {
  const type = (typeof mimeType === "string" ? mimeType : "").toLowerCase().split(";")[0].trim();
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (DATA_MIME.has(type) || type.endsWith("+json") || type.endsWith("+xml")) return "data";
  if (DOCUMENT_MIME.has(type)) return "document";
  return "document";
}
