// Client-side helpers for the polymorphic attachments layer, modelled on
// experimentHandlers. The `/api/attachments` route is the join between a stored
// `files` blob and any entity.

import { prepend_path } from "@/lib/utils";
import { mutate } from "swr";
import { toast } from "sonner";
import { uploadFile } from "@/utils/handlers/fileHandlers";

const ATTACHMENTS_URL = `${prepend_path}/api/attachments`;

export interface CreateAttachmentInput {
  fileId: string;
  targetType: string;
  targetId: string;
  category: string;
  kind?: string;
  caption?: string | null;
  stepKey?: string | null;
  responsible: string;
  date?: string;
}

/** Link an already-uploaded file to a target. Returns the new attachment id. */
export const createAttachment = async (input: CreateAttachmentInput): Promise<string | null> => {
  try {
    const res = await fetch(ATTACHMENTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "create", ...input }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || "Failed to attach file");
    }
    const result = await res.json();
    return result.id ?? null;
  } catch (error) {
    console.error("Attachment create error:", error);
    toast.error(error instanceof Error ? error.message : "Failed to attach file");
    return null;
  }
};

/**
 * Upload one file (deferred) and attach it to a target in a single step — the
 * path both the sample gallery and the trait photo upload take now.
 */
export const uploadAndAttach = async (
  file: File,
  target: { targetType: string; targetId: string; category?: string; responsible: string },
  storageType = "attachments",
): Promise<string | null> => {
  const fileId = await uploadFile(file, storageType, {
    deferredLink: true,
    mediaType: file.type,
  });
  if (!fileId) return null;
  return createAttachment({
    fileId,
    targetType: target.targetType,
    targetId: target.targetId,
    category: target.category ?? "gallery",
    responsible: target.responsible,
  });
};

export const updateAttachmentField = async (
  id: string,
  field: "caption" | "category" | "stepKey" | "order",
  value: unknown,
): Promise<boolean> => {
  try {
    const res = await fetch(ATTACHMENTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "setfield", id, field, value }),
    });
    if (!res.ok) throw new Error("Failed to update the attachment");
    return true;
  } catch (error) {
    console.error("Attachment setfield error:", error);
    toast.error("Failed to update the attachment");
    return false;
  }
};

/** Persist a new order for a reordered list — one setfield per moved row. */
export const reorderAttachments = async (orderedIds: string[]): Promise<void> => {
  await Promise.allSettled(orderedIds.map((id, index) => updateAttachmentField(id, "order", index)));
};

export const handleDeleteAttachment = async (id: string): Promise<void> => {
  try {
    const res = await fetch(ATTACHMENTS_URL, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error("Could not delete the attachment");
  } catch (e) {
    toast.error("Could not delete the attachment");
    throw e;
  } finally {
    mutate((key) => typeof key === "string" && key.startsWith(ATTACHMENTS_URL));
  }
};

export const handleBulkDeleteAttachments = async (ids: string[]): Promise<void> => {
  const results = await Promise.allSettled(
    ids.map((id) =>
      fetch(ATTACHMENTS_URL, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }).then((res) => {
        if (!res.ok) throw new Error(id);
      }),
    ),
  );
  const failed = results.filter((r) => r.status === "rejected").length;
  mutate((key) => typeof key === "string" && key.startsWith(ATTACHMENTS_URL));
  if (failed) {
    toast.error(`${failed} of ${ids.length} attachments could not be deleted`);
  } else {
    toast.message(`Deleted ${ids.length} attachments`);
  }
};

/** Stream an attachment's file to the browser as a download. */
export const handleAttachmentDownload = async (fileId: string): Promise<void> => {
  try {
    const response = await fetch(`${prepend_path}/api/download?id=${fileId}`);
    if (!response.ok) throw new Error("Network response was not ok");

    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "download";
    const match = contentDisposition?.match(/filename="?(.+?)"?$/i);
    if (match) filename = match[1].replace(/["']/g, "").replace(/_+$/, "");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Download failed:", error);
    toast.error("Download failed");
  }
};
