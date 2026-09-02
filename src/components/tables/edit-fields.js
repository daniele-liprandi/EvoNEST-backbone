/**
 * Field lists for the row and bulk edit dialogs. Kept to plain scalar fields
 * that are safe to write with `setfield`: no references (responsible, sampleId),
 * no measurement/unit pairs, nothing the API guards. Widen these deliberately.
 */

export const sampleEditFields = [
  { key: "name", label: "Name", type: "text" },
  { key: "date", label: "Date", type: "date" },
  { key: "location", label: "Location", type: "text" },
  { key: "box", label: "Box", type: "text" },
  { key: "slot", label: "Slot", type: "text" },
  { key: "notes", label: "Notes", type: "textarea" },
];

export const traitEditFields = [
  { key: "equipment", label: "Equipment", type: "text" },
  { key: "notes", label: "Notes", type: "textarea" },
];

export const experimentEditFields = [
  { key: "name", label: "Name", type: "text" },
  { key: "date", label: "Date", type: "date" },
  { key: "notes", label: "Notes", type: "textarea" },
];
