import { prepend_path } from "@/lib/utils";
import { mutate } from "swr";
import { toast } from "sonner";
import { debounce } from "@/utils/debounce";

export const handleEditTrait = async (trait, setEditingTrait) => {
    setEditingTrait(trait);
};

export const handleDeleteTrait = async (traitId) => {
    await fetch(`${prepend_path}/api/traits`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: traitId })
    });
    mutate(`${prepend_path}/api/traits`);
};

const debouncedHandleStatusChangeTrait = debounce(async (traitId, field, value, withmutate = false) => {
    await fetch(`${prepend_path}/api/traits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: "setfield", id: traitId, field: field, value: value })
    });
    toast.message("Status changed");
    if (withmutate) {
        mutate(`${prepend_path}/api/traits`);
    }
}, 300);

export const handleStatusChangeTrait = (traitId, field, value, withmutate = false) => {
    debouncedHandleStatusChangeTrait(traitId, field, value, withmutate);
};


export const handleStatusIncrementTrait = debounce(async (traitId, field, withmutate = false) => {
    await fetch(`${prepend_path}/api/traits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: "incrementfield", id: traitId, field: field })
    });
    toast.message("increment");
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
                value: trait.measurement * conversionData.ratio
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
    a.download = `${trait.type}_data.json`;
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