// The form-side twin of ./columns.js. A sample type's config carries a `fields`
// list — built-in field keys (strings) and custom field objects
// ({ key, label, kind, ... }) — and buildSampleFields turns it into an ordered
// list of descriptors the create form renders. `animal` and `subsample` keep
// their historical layout when a type has not configured its own list, so an
// install that predates this behaves exactly as before.

// Built-in fields, by key. These map to bespoke blocks in the form (taxonomy
// resolution, the geolocation helpers, the parent-driven ID generation), so the
// palette is just the set of keys the form knows how to render.
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

// The type picker, the name/ID field and the notes box are always shown, so they
// are not part of the list.
const ALWAYS_SHOWN = ["type", "name", "notes"];

// A type without its own list gets the layout the old form gave every
// non-animal type: the shared details plus the subsample-style fields.
const DEFAULT_FIELDS = [
  "parent",
  "taxonomy",
  "subsampletype",
  "box",
  "slot",
  "responsible",
  "date",
  "location",
];

// `animal` is the one type the app has always had a distinct form for.
const BUILTIN_TYPE_FIELDS = {
  animal: ["taxonomy", "sex", "responsible", "date", "location"],
  subsample: DEFAULT_FIELDS,
};

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

/**
 * The field list a type falls back to when it has not configured its own — also
 * what the Settings editor seeds a fresh type's list from.
 */
export function defaultFieldsForType(type) {
  return BUILTIN_TYPE_FIELDS[type] || DEFAULT_FIELDS;
}

const isCustom = (entry) =>
  entry && typeof entry === "object" && entry.key && entry.kind;

/**
 * Ordered field descriptors for one sample type's create form, from its config
 * `fields` list or a fallback. `typeConfig` is the config entry (or a bare type
 * string). Each descriptor is `{ key, label, builtin, kind?, options?, description? }`.
 */
export function buildSampleFields(typeConfig) {
  const type = typeof typeConfig === "string" ? typeConfig : typeConfig?.value;
  const list =
    (Array.isArray(typeConfig?.fields) &&
      typeConfig.fields.length &&
      typeConfig.fields) ||
    BUILTIN_TYPE_FIELDS[type] ||
    DEFAULT_FIELDS;

  return list.flatMap((entry) => {
    if (typeof entry === "string") {
      if (!SAMPLE_FIELD_KEYS.includes(entry) || ALWAYS_SHOWN.includes(entry)) {
        return [];
      }
      return [{ key: entry, label: fieldLabel(entry), builtin: true }];
    }
    if (isCustom(entry)) {
      if (!CUSTOM_FIELD_KINDS.includes(entry.kind)) return [];
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

/** The custom (non-built-in) field keys a type config declares. */
export function customFieldKeys(typeConfig) {
  if (!Array.isArray(typeConfig?.fields)) return [];
  return typeConfig.fields.filter(isCustom).map((entry) => entry.key);
}
