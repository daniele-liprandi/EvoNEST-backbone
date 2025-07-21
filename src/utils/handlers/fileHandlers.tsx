// src/utils/handlers/fileHandlers.tsx
/*
This file contains utility functions for handling file uploads and linking files to entries.
It uses the Fetch API to communicate with the backend and Sonner for notifications.
*/

import { prepend_path } from "@/lib/utils";
import { toast } from "sonner";

// Define possible entry types for better type safety
export type EntryType = "sample" | "trait" | "experiment";

// Interface for file metadata
interface FileMetadata {
  entryType?: EntryType;
  entryId?: string;
  deferredLink?: boolean;
  mediaType?: string;
  // Add any other metadata fields needed
}

/**
 * Uploads a single file with appropriate metadata
 */
export const uploadFile = async (
  file: File,
  type: string,
  metadata: FileMetadata
): Promise<string | null> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);
  formData.append("metadata", JSON.stringify(metadata));

  try {
    const response = await fetch(`${prepend_path}/api/files`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to upload file");
    }

    const result = await response.json();
    toast.success("File uploaded successfully");
    return result.fileId;
  } catch (error) {
    console.error("Upload error:", error);
    toast.error("Failed to upload file");
    return null;
  }
};

/**
 * Uploads multiple files at once
 */
export const uploadFiles = async (
  files: FileList,
  type: string,
  metadata: FileMetadata
): Promise<(string | null)[]> => {
  const promises = Array.from(files).map((file) =>
    uploadFile(file, type, metadata)
  );

  const results = await Promise.all(promises);

  const successCount = results.filter(Boolean).length;
  if (successCount === files.length) {
    toast.success(`All ${files.length} files uploaded successfully`);
  } else if (successCount > 0) {
    toast.warning(
      `${successCount} of ${files.length} files uploaded successfully`
    );
  } else {
    toast.error("Failed to upload any files");
  }

  return results;
};

/**
 * Links a previously uploaded file to an entry
 */
export const linkFileToEntry = async (
  fileId: string,
  entryType: EntryType,
  entryId: string
): Promise<boolean> => {
  try {
    console.log("Linking file", fileId, "to", entryType, entryId);

    const response = await fetch(`${prepend_path}/api/files/link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileId,
        entryType,
        entryId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to link file");
    }

    return true;
  } catch (error) {
    console.error("Link error:", error);
    toast.error("Failed to link file");
    return false;
  }
};
