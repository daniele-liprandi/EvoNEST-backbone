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
    ["image/svg+xml", "image"],
    ["text/csv", "data"],
    ["text/tab-separated-values", "data"],
    ["application/json", "data"],
    ["application/geo+json", "data"],
    ["application/vnd.ms-excel", "data"],
    ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "data"],
    ["application/pdf", "document"],
    ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "document"],
    ["text/plain", "document"],
    ["application/octet-stream", "document"],
    ["", "document"],
    ["TEXT/CSV; charset=utf-8", "data"],
  ])("%s -> %s", (mimeType, kind) => {
    expect(kindFromMime(mimeType)).toBe(kind);
    expect(ATTACHMENT_KINDS).toContain(kind);
  });
});
