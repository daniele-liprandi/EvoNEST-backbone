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