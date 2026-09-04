import { prepend_path } from "@/lib/utils";
import { mutate } from "swr";
import { toast } from "sonner";
import { debounce } from "@/utils/debounce";

export const handleEditSample = async (sample, setEditingSample) => {
    setEditingSample(sample);
};

export const handleDeleteSample = async (sampleId) => {
    try {
        const res = await fetch(`${prepend_path}/api/samples`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: sampleId })
        });
        if (!res.ok) throw new Error('Could not delete the sample');
    } catch (e) {
        // Catches both a non-OK response and fetch() itself rejecting
        // (offline, DNS/CORS) — either way the delete didn't happen.
        toast.error('Could not delete the sample');
        throw e;
    } finally {
        mutate(`${prepend_path}/api/samples`);
    }
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

const TAXON_FIELDS = ["family", "genus", "species"];
const splitTaxon = (changes) => {
    const taxon = {};
    const rest = {};
    for (const [k, v] of Object.entries(changes)) {
        (TAXON_FIELDS.includes(k) ? taxon : rest)[k] = v;
    }
    return { taxon, rest };
};

// Apply family/genus/species (and optionally regenerate the derived names) to a
// batch of samples in one race-free server pass.
const retaxon = async (ids, taxonChanges, regenerate) => {
    const res = await fetch(`${prepend_path}/api/samples`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'retaxon', ids, changes: taxonChanges, regenerateNames: regenerate }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'retaxon failed');
    return res.json();
};

// Write only the fields the caller passes, so an untouched field is never sent.
// Used by the row edit dialog. A taxon change routes through `retaxon`.
export const handleUpdateSampleFields = async (sampleId, changes, { regenerate = false } = {}) => {
    if (Object.keys(changes).length === 0) return;
    const { taxon, rest } = splitTaxon(changes);
    try {
        if (Object.keys(taxon).length) await retaxon([sampleId], taxon, regenerate);
        const failed = Object.keys(rest).length ? await setSampleFields(sampleId, rest) : [];
        mutate(`${prepend_path}/api/samples`);
        if (failed.length) toast.error(`Could not update: ${failed.join(', ')}`);
        else toast.message(regenerate && Object.keys(taxon).length ? 'Sample updated and renamed' : 'Sample updated');
    } catch (e) {
        mutate(`${prepend_path}/api/samples`);
        toast.error(e instanceof Error ? e.message : 'Could not update the sample');
    }
};

// Same change applied to many samples (bulk edit).
export const handleBulkUpdateSampleFields = async (sampleIds, changes, { regenerate = false } = {}) => {
    if (Object.keys(changes).length === 0) return;
    const { taxon, rest } = splitTaxon(changes);
    try {
        let renamed = 0;
        if (Object.keys(taxon).length) {
            const result = await retaxon(sampleIds, taxon, regenerate);
            renamed = result.renamed?.length ?? 0;
        }
        const perSample = Object.keys(rest).length
            ? await Promise.all(sampleIds.map((id) => setSampleFields(id, rest)))
            : [];
        const failed = perSample.filter((f) => f.length > 0).length;
        mutate(`${prepend_path}/api/samples`);
        if (failed) toast.error(`${failed} of ${sampleIds.length} samples could not be updated`);
        else toast.message(renamed ? `Updated ${sampleIds.length} samples, renamed ${renamed}` : `Updated ${sampleIds.length} samples`);
    } catch (e) {
        mutate(`${prepend_path}/api/samples`);
        toast.error(e instanceof Error ? e.message : 'Could not update the samples');
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

