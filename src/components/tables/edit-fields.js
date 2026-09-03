/**
 * Field lists for the row and bulk edit dialogs. Kept to plain scalar fields
 * that are safe to write with `setfield`: no references (responsible, sampleId),
 * no measurement/unit pairs, nothing the API guards. Widen these deliberately.
 */

export const sampleEditFields = [
  { key: "name", label: "Name", type: "text" },
  { key: "family", label: "Family", type: "text" },
  { key: "genus", label: "Genus", type: "text" },
  { key: "species", label: "Species", type: "text" },
  { key: "date", label: "Date", type: "date" },
  { key: "location", label: "Location", type: "text" },
  { key: "box", label: "Box", type: "text" },
  { key: "slot", label: "Slot", type: "text" },
  { key: "notes", label: "Notes", type: "textarea" },
];

// When a taxon field is changed in the edit dialog, offer to regenerate the
// sample name(s) — the name is derived from genus + species.
export const sampleRegenerateOn = {
  fields: ["family", "genus", "species"],
  label: "Also update the sample name to match the new taxonomy (the QR code and id stay the same; printed labels will show the old name).",
};

export const traitEditFields = [
  { key: "equipment", label: "Equipment", type: "text" },
  { key: "notes", label: "Notes", type: "textarea" },
];

export const experimentEditFields = [
  { key: "name", label: "Name", type: "text" },
  { key: "date", label: "Date", type: "date" },
  { key: "notes", label: "Notes", type: "textarea" },
];
