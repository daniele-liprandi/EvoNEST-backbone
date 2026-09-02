// The single registry of a sample type's data fields. A type config carries a
// `fields` list — built-in field keys (strings) and custom field objects
// ({ key, label, kind, options?, description? }). Everything downstream reads
// from it:
//   buildSampleFields  -> the create form inputs
//   buildEditFields    -> the RowEditDialog / bulk-edit inputs
//   customFieldMap     -> resolving a `columns` entry that names a field
// so a field is defined once and the form, the table cell and the edit dialog
// stay in step.

export const SEX_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "unknown", label: "Unknown" },
];

// Built-in form fields, by key. Each has bespoke rendering in the form
// (taxonomy resolution, the geolocation helpers, the parent-driven ID).
export const SAMPLE_FIELD_KEYS = [
  "taxonomy",
  "parent",
  "responsible",
  "date",
  "location",
  "sex",
  "subsampletype",
  "box",
  "slot",
];

// The `kind` values a custom field may have.
export const CUSTOM_FIELD_KINDS = ["text", "number", "date", "select", "textarea"];

// Built-in fields that can also be changed after creation. taxonomy, parent and
// responsible are set once at creation and are not offered in the edit dialog.
const BUILTIN_EDITABLE = {
  date: { label: "Date of collection", type: "date" },
  location: { label: "Location", type: "text" },
  sex: { label: "Sex", type: "select", options: SEX_OPTIONS },
  subsampletype: { label: "Subsample type", type: "text" },
  box: { label: "Box", type: "text" },
  slot: { label: "Slot", type: "text" },
};

// The type picker, the name and the notes box are always shown, so they are
// never part of a `fields` list.
const ALWAYS_SHOWN = ["type", "name", "notes"];

// Used when a type has no `fields` list at all (an admin adds a bare new type).
const DEFAULT_FIELDS = ["responsible", "date", "location", "box", "slot"];

const PRETTY = {
  taxonomy: "Taxonomy",
  parent: "Parent sample",
  responsible: "Responsible",
  date: "Date of collection",
  location: "Location",
  sex: "Sex",
  subsampletype: "Subsample type",
  box: "Box",
  slot: "Slot",
};

/** Label for a built-in field key, matching the wording used in the form. */
export function fieldLabel(key) {
  return PRETTY[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

/** The field list a type falls back to when it has none of its own. */
export function defaultFieldsForType() {
  return DEFAULT_FIELDS;
}

const isCustom = (entry) =>
  entry && typeof entry === "object" && entry.key && entry.kind;

function fieldList(typeConfig) {
  return Array.isArray(typeConfig?.fields) && typeConfig.fields.length
    ? typeConfig.fields
    : DEFAULT_FIELDS;
}

/**
 * Ordered descriptors for one sample type's create form. Each is
 * `{ key, label, builtin, kind?, options?, description? }`.
 */
export function buildSampleFields(typeConfig) {
  return fieldList(typeConfig).flatMap((entry) => {
    if (typeof entry === "string") {
      if (!SAMPLE_FIELD_KEYS.includes(entry) || ALWAYS_SHOWN.includes(entry)) {
        return [];
      }
      return [{ key: entry, label: fieldLabel(entry), builtin: true }];
    }
    if (isCustom(entry) && CUSTOM_FIELD_KINDS.includes(entry.kind)) {
      return [
        {
          key: entry.key,
          label: entry.label || entry.key,
          builtin: false,
          kind: entry.kind,
          options: entry.options || [],
          description: entry.description || "",
        },
      ];
    }
    return [];
  });
}

/**
 * The RowEditDialog / bulk-edit field list for a type: name and notes always,
 * plus every entry in the type's `fields` list that can be edited after
 * creation. `type` values are what RowEditDialog expects
 * (text | number | date | textarea | select).
 */
export function buildEditFields(typeConfig) {
  const out = [{ key: "name", label: "Name", type: "text" }];
  for (const entry of fieldList(typeConfig)) {
    if (typeof entry === "string") {
      if (BUILTIN_EDITABLE[entry]) {
        out.push({ key: entry, ...BUILTIN_EDITABLE[entry] });
      }
    } else if (isCustom(entry) && CUSTOM_FIELD_KINDS.includes(entry.kind)) {
      out.push({
        key: entry.key,
        label: entry.label || entry.key,
        type: entry.kind,
        ...(entry.kind === "select" ? { options: entry.options || [] } : {}),
      });
    }
  }
  out.push({ key: "notes", label: "Notes", type: "textarea" });
  return out;
}

/** Custom field key -> descriptor, for resolving a `columns` entry by key. */
export function customFieldMap(typeConfig) {
  const map = {};
  for (const entry of typeConfig?.fields || []) {
    if (isCustom(entry) && CUSTOM_FIELD_KINDS.includes(entry.kind)) {
      map[entry.key] = {
        key: entry.key,
        label: entry.label || entry.key,
        kind: entry.kind,
        options: entry.options || [],
        description: entry.description || "",
      };
    }
  }
  return map;
}

/** The custom (non-built-in) field keys a type config declares. */
export function customFieldKeys(typeConfig) {
  return Object.keys(customFieldMap(typeConfig));
}
