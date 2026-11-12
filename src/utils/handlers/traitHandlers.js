import { prepend_path } from "@/lib/utils";
import { mutate } from "swr";
import { toast } from "sonner";
import { debounce } from "@/utils/debounce";

export const handleEditTrait = async (trait, setEditingTrait) => {
    setEditingTrait(trait);
};

export const handleDeleteTrait = async (traitId) => {
    try {
        const res = await fetch(`${prepend_path}/api/traits`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: traitId })
        });
        if (!res.ok) throw new Error('Could not delete the trait');
    } catch (e) {
        // Catches both a non-OK response and fetch() itself rejecting
        // (offline, DNS/CORS) — either way the delete didn't happen.
        toast.error('Could not delete the trait');
        throw e;
    } finally {
        mutate(`${prepend_path}/api/traits`);
    }
};

export const handleBulkDeleteTraits = async (traitIds) => {
    const results = await Promise.allSettled(
        traitIds.map((id) =>
            fetch(`${prepend_path}/api/traits`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            }).then((res) => {
                if (!res.ok) throw new Error(id);
            })
        )
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    mutate(`${prepend_path}/api/traits`);
    if (failed) {
        toast.error(`${failed} of ${traitIds.length} traits could not be deleted`);
    } else {
        toast.message(`Deleted ${traitIds.length} traits`);
    }
};

// One setfield request per field against a single trait. Returns the names of
// the fields that failed. No toast, no revalidation — the callers below own that.
const setTraitFields = async (traitId, changes) => {
    const entries = Object.entries(changes);
    const results = await Promise.allSettled(
        entries.map(([field, value]) =>
            fetch(`${prepend_path}/api/traits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method: 'setfield', id: traitId, field, value }),
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

// Write only the fields the caller passes (row edit dialog).
export const handleUpdateTraitFields = async (traitId, changes) => {
    if (Object.keys(changes).length === 0) return;
    const failed = await setTraitFields(traitId, changes);
    mutate(`${prepend_path}/api/traits`);
    if (failed.length) {
        toast.error(`Could not update: ${failed.join(', ')}`);
    } else {
        toast.message('Trait updated');
    }
};

// Same change applied to many traits (bulk edit).
export const handleBulkUpdateTraitFields = async (traitIds, changes) => {
    if (Object.keys(changes).length === 0) return;
    const perTrait = await Promise.all(traitIds.map((id) => setTraitFields(id, changes)));
    const failed = perTrait.filter((f) => f.length > 0).length;
    mutate(`${prepend_path}/api/traits`);
    if (failed) {
        toast.error(`${failed} of ${traitIds.length} traits could not be updated`);
    } else {
        toast.message(`Updated ${traitIds.length} traits`);
    }
};

// No success toast: called on every click of an inline control; only failures surface.
const debouncedHandleStatusChangeTrait = debounce(async (traitId, field, value, withmutate = false) => {
    const res = await fetch(`${prepend_path}/api/traits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: "setfield", id: traitId, field: field, value: value })
    });
    if (!res.ok) {
        toast.error("Could not save the change");
        return;
    }
    if (withmutate) {
        mutate(`${prepend_path}/api/traits`);
    }
}, 300);

export const handleStatusChangeTrait = (traitId, field, value, withmutate = false) => {
    debouncedHandleStatusChangeTrait(traitId, field, value, withmutate);
};


export const handleStatusIncrementTrait = debounce(async (traitId, field, withmutate = false) => {
    const res = await fetch(`${prepend_path}/api/traits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: "incrementfield", id: traitId, field: field })
    });
    if (!res.ok) {
        toast.error("Could not save the change");
        return;
    }
    if (withmutate) {
        mutate(`${prepend_path}/api/traits`);
    }
}, 40); // 25 requests per second (40ms per request)

export async function handleTraitConversion(traitsToUpdate, conversionData) {
    const response = await fetch(`${prepend_path}/api/traits`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            method: 'conversion',
            traits: traitsToUpdate.map(trait => ({
                id: trait._id,
                value: trait.value * conversionData.ratio
            })),
            conversion: {
                oldDiameters: conversionData.oldDiameters,
                newDiameters: conversionData.newDiameters,
                oldCrossSection: conversionData.oldCrossSection,
                newCrossSection: conversionData.newCrossSection,
                ratio: conversionData.ratio
            }
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to save conversion');
    }

    return response.json();
}

// Function to handle downloading 
export const handleTraitDataDownload = async (trait) => {
    const response = await fetch(`${prepend_path}/api/traits?id=${trait._id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to download list values');
    }

    const data = await response.json();

    // download as json
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${trait.quantity}_data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/**
 * Export all traits with related sample chain data
 */
export const handleExportAllTraitsRelated = async (format = 'json') => {
    try {
        toast.message(`Preparing ${format.toUpperCase()} export with related data...`);

        const params = new URLSearchParams({
            related: 'true'
        });
        
        const response = await fetch(`${prepend_path}/api/traits?${params}`, {
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
            const { exportTraitsToCSV } = await import('@/utils/exporters/csv-exporter');
            const csvContent = exportTraitsToCSV(data);
            blob = new Blob([csvContent], { type: 'text/csv' });
            filename = `traits_related_${new Date().toISOString().split('T')[0]}.csv`;
        } else {
            blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            filename = `traits_related_${new Date().toISOString().split('T')[0]}.json`;
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

/**
 * Preview unit conversion without applying changes
 * Returns the conversion analysis for display in confirmation dialog
 */
export const previewUnitConversion = async () => {
    try {
        const response = await fetch(`${prepend_path}/api/traits/convert-units/preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Preview failed');
        }

        return await response.json();
    } catch (error) {
        console.error('Unit conversion preview failed:', error);
        toast.error(`Preview failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
    }
};

/**
 * Convert all traits to their default units based on SI prefix conversion
 */
export const handleConvertAllUnits = async () => {
    try {
        toast.message('Starting unit conversion...');

        const response = await fetch(`${prepend_path}/api/traits/convert-units`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}) // Empty body = convert all traits
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Conversion failed');
        }

        const result = await response.json();
        
        // Show detailed results
        const message = `Conversion completed:\n- Total traits: ${result.totalTraits}\n- Converted: ${result.converted}\n- Skipped: ${result.skipped}`;
        
        if (result.converted > 0) {
            toast.success(message);
            // Refresh the data
            mutate(`${prepend_path}/api/traits`);
        } else {
            toast.info(message);
        }

        return result;
    } catch (error) {
        console.error('Unit conversion failed:', error);
        toast.error(`Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
    }
};