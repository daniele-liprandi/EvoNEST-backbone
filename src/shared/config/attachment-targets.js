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
// filters on. Distinct from `category` — the semantic slot ("gallery", "sop",
// "raw-data", ...), which stays a free string each lab defines for itself.
export const ATTACHMENT_KINDS = ["image", "video", "audio", "document", "data"];

/** Map a MIME type to an {@link ATTACHMENT_KINDS} value. Unknown types are documents. */
export function kindFromMime(mimeType) {
  const type = typeof mimeType === "string" ? mimeType : "";
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (type === "text/csv" || type === "application/json") return "data";
  return "document";
}
