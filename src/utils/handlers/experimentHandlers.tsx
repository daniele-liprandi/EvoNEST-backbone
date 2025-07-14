import { prepend_path } from "@/lib/utils";
import { mutate } from "swr";
import { toast } from "sonner";
import { debounce } from "@/utils/debounce";


export const handleDeleteExperiment = async (experimentId: any) => {
  // DELETE request to remove sample
  await fetch(`${prepend_path}/api/experiments`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: experimentId })
  });
  mutate(`${prepend_path}/api/experiments`);
};

// Create the core handler function
const debouncedHandleStatusChangeExperiment = debounce(async (experimentId: any, field: string, value: string) => {
  const response = await fetch(`${prepend_path}/api/experiments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: "setfield", id: experimentId, field: field, value: value })
  });
  if (!response.ok) {
    toast.error("Failed to change status");
  }
  else
    toast.message("Status changed");
}, 1000);

// Export the debounced version
export const handleStatusChangeExperiment = (experimentId: any, field: string, value: string) => {
  debouncedHandleStatusChangeExperiment(experimentId, field, value);
};

export const handleStatusIncrementExperiment = async (experimentId: any, field: string) => {
  await fetch(`${prepend_path}/api/experiments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: "incrementfield", id: experimentId, field: field })
  });

  toast.message("increment")
};

export const handleExperimentFileDownload = async (fileId: string) => {
  try {
    const response = await fetch(`${prepend_path}/api/download?id=${fileId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'download';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
      if (filenameMatch) {
        filename = filenameMatch[1].replace(/["']/g, '').replace(/_+$/, '');
      }
    }

    // Convert the response to a blob
    const blob = await response.blob();

    // Create a temporary URL for the blob
    const url = window.URL.createObjectURL(blob);

    // Create a temporary anchor element
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    // Append to the document, click it, and then remove it
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke the URL to free up resources
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
  }
};

export const handleFileDownloads = async (fileIds: string[]) => {
  fileIds.forEach((fileId) => {
    handleExperimentFileDownload(fileId);
  });
}