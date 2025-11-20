import { prepend_path } from "@/lib/utils";
import { mutate } from "swr";
import { toast } from "sonner";
import { debounce } from "@/utils/debounce";

export const handleEditSample = async (sample, setEditingSample) => {
    setEditingSample(sample);
};

export const handleDeleteSample = async (sampleId) => {
    await fetch(`${prepend_path}/api/samples`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sampleId })
    });
    mutate(`${prepend_path}/api/samples`);
};

const debouncedHandleStatusChangeSample = debounce(async (sampleId, field, value, customLogbookEntry, withmutate = false) => {
    await fetch(`${prepend_path}/api/samples`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: "setfield", id: sampleId, field: field, value: value, customLogbookEntry: customLogbookEntry})
    });
    toast.message("Status changed");
    if (withmutate) {
        mutate(`${prepend_path}/api/samples`);
    }
}, 300);

export const handleStatusChangeSample = (sampleId, field, value, customLogbookEntry = null, withmutate = false) => {
    debouncedHandleStatusChangeSample(sampleId, field, value, customLogbookEntry, withmutate);
};

export const handleStatusIncrementSample = debounce(async (sampleId, field, withmutate = false) => {
    await fetch(`${prepend_path}/api/samples`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: "incrementfield", id: sampleId, field: field })
    });
    toast.message("increment");
    if (withmutate) {
        mutate(`${prepend_path}/api/samples`);
    }
}, 40); // 25 requests per second (40ms per request)

/**
 * Export all samples with parent chain data
 */
export const handleExportAllSamplesRelated = async (format = 'json') => {
    try {
        toast.message(`Preparing ${format.toUpperCase()} export with related data...`);

        const params = new URLSearchParams({
            related: 'true'
        });
        
        const response = await fetch(`${prepend_path}/api/samples?${params}`, {
            method: 'GET',
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Export failed');
        }

        const data = await response.json();
        let blob;
        let filename;

        if (format === 'csv') {
            // Dynamically import the CSV exporter
            const { exportSamplesToCSV } = await import('@/utils/exporters/csv-exporter');
            const csvContent = exportSamplesToCSV(data);
            blob = new Blob([csvContent], { type: 'text/csv' });
            filename = `samples_related_${new Date().toISOString().split('T')[0]}.csv`;
        } else {
            blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            filename = `samples_related_${new Date().toISOString().split('T')[0]}.json`;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success(`Export completed: ${filename}`);
    } catch (error) {
        console.error('Export failed:', error);
        toast.error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

