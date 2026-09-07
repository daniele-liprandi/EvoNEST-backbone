import {
  resolveAttachmentTarget,
  kindFromMime,
  ATTACHMENT_KINDS,
} from "@/shared/config/attachment-targets";

describe("resolveAttachmentTarget", () => {
  test("resolves an unknown type by convention", () => {
    expect(resolveAttachmentTarget("trait")).toEqual({
      type: "trait",
      collection: "traits",
      capabilityPrefix: "traits",
    });
  });

  test("returns null for a non-string or empty type", () => {
    expect(resolveAttachmentTarget("")).toBeNull();
    expect(resolveAttachmentTarget(undefined)).toBeNull();
  });
});

describe("kindFromMime", () => {
  test.each([
    ["image/png", "image"],
    ["video/mp4", "video"],
    ["audio/mpeg", "audio"],
    ["text/csv", "data"],
    ["application/json", "data"],
    ["application/pdf", "document"],
    ["text/plain", "document"],
    ["", "document"],
  ])("%s -> %s", (mimeType, kind) => {
    expect(kindFromMime(mimeType)).toBe(kind);
    expect(ATTACHMENT_KINDS).toContain(kind);
  });
});
