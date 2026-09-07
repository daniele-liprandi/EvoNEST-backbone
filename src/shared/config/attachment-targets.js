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
