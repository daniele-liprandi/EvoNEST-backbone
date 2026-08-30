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

export const handleBulkDeleteSamples = async (sampleIds) => {
    const results = await Promise.allSettled(
        sampleIds.map((id) =>
            fetch(`${prepend_path}/api/samples`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            }).then((res) => {
                if (!res.ok) throw new Error(id);
            })
        )
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    mutate(`${prepend_path}/api/samples`);
    if (failed) {
        toast.error(`${failed} of ${sampleIds.length} samples could not be deleted`);
    } else {
        toast.message(`Deleted ${sampleIds.length} samples`);
    }
};

// One setfield request per field against a single sample. Returns the names of
// the fields that failed. No toast, no revalidation — the callers below own that.
const setSampleFields = async (sampleId, changes) => {
    const entries = Object.entries(changes);
    const results = await Promise.allSettled(
        entries.map(([field, value]) =>
            fetch(`${prepend_path}/api/samples`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method: 'setfield', id: sampleId, field, value }),
            }).then((res) => {
                if (!res.ok) throw new Error(field);
            })
        )
    );
    const failed = [];
    results.forEach((r, i) => {
        if (r.status === 'rejected') failed.push(entries[i][0]);
    });
    return failed;
};

// Write only the fields the caller passes, so an untouched field is never sent.
// Used by the row edit dialog.
export const handleUpdateSampleFields = async (sampleId, changes) => {
    if (Object.keys(changes).length === 0) return;
    const failed = await setSampleFields(sampleId, changes);
    mutate(`${prepend_path}/api/samples`);
    if (failed.length) {
        toast.error(`Could not update: ${failed.join(', ')}`);
    } else {
        toast.message('Sample updated');
    }
};

// Same change applied to many samples (bulk edit).
export const handleBulkUpdateSampleFields = async (sampleIds, changes) => {
    if (Object.keys(changes).length === 0) return;
    const perSample = await Promise.all(sampleIds.map((id) => setSampleFields(id, changes)));
    const failed = perSample.filter((f) => f.length > 0).length;
    mutate(`${prepend_path}/api/samples`);
    if (failed) {
        toast.error(`${failed} of ${sampleIds.length} samples could not be updated`);
    } else {
        toast.message(`Updated ${sampleIds.length} samples`);
    }
};

// No success toast on these two: the husbandry buttons call them on every
// click and the cell already reflects the new value. Only failures surface.
const debouncedHandleStatusChangeSample = debounce(async (sampleId, field, value, customLogbookEntry, withmutate = false) => {
    const res = await fetch(`${prepend_path}/api/samples`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: "setfield", id: sampleId, field: field, value: value, customLogbookEntry: customLogbookEntry})
    });
    if (!res.ok) {
        toast.error("Could not save the change");
        return;
    }
    if (withmutate) {
        mutate(`${prepend_path}/api/samples`);
    }
}, 300);

export const handleStatusChangeSample = (sampleId, field, value, customLogbookEntry = null, withmutate = false) => {
    debouncedHandleStatusChangeSample(sampleId, field, value, customLogbookEntry, withmutate);
};

export const handleStatusIncrementSample = debounce(async (sampleId, field, withmutate = false) => {
    const res = await fetch(`${prepend_path}/api/samples`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: "incrementfield", id: sampleId, field: field })
    });
    if (!res.ok) {
        toast.error("Could not save the change");
        return;
    }
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

