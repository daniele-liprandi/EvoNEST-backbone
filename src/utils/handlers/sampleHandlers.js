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

