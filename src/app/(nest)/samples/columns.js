import {
  boxColumn,
  dateColumn,
  eggsacButtonColumn,
  familyColumn,
  fedButtonColumn,
  genusColumn,
  hungryProgressbarColumn,
  lifestageColumn,
  lifestatusColumn,
  locationColumn,
  moltedButtonColumn,
  sampleNameColumn,
  parentColumn,
  recentChangeDateColumn,
  responsibleColumn,
  rowActionsColumn,
  selectColumn,
  sexButtonColumn,
  slotColumn,
  speciesColumn,
  typeColumn,
  sortableFilterableColumn,
  customColumn,
} from "@/components/tables/columns"
import { sampleEditFields, sampleRegenerateOn } from "@/components/tables/edit-fields"

const actions = rowActionsColumn({ entityLabel: "sample", editFields: sampleEditFields, regenerateOn: sampleRegenerateOn })

// The built-in columns a sample table can show, by key. A sample type's config
// `columns` list is a mix of these keys and custom column objects
// ({ key, label, kind, ... } — see customColumn); the admin edits the list.
const PALETTE = {
  name: sampleNameColumn,
  responsible: responsibleColumn,
  recentChange: recentChangeDateColumn,
  date: dateColumn,
  type: typeColumn,
  parent: parentColumn,
  location: locationColumn,
  box: boxColumn,
  slot: slotColumn,
  family: familyColumn,
  genus: genusColumn,
  species: speciesColumn,
  subsampletype: () => sortableFilterableColumn("subsampletype", "Subsample Type"),
  sex: sexButtonColumn,
  lifestage: lifestageColumn,
  lifestatus: lifestatusColumn,
  hungry: hungryProgressbarColumn,
  fed: fedButtonColumn,
  molted: moltedButtonColumn,
  eggsac: eggsacButtonColumn,
}

/** Every built-in column key a sample type may list. */
export const SAMPLE_COLUMN_KEYS = Object.keys(PALETTE)

/** The `kind` values a custom column may have. */
export const CUSTOM_COLUMN_KINDS = ["counter", "toggle", "progress", "text", "number", "date"]

// Used when a sample type does not name its own `columns`.
const DEFAULT_COLUMNS = ["name", "responsible", "recentChange", "date", "type", "parent", "location"]

// Fallbacks for the two types the app has always special-cased, so an install
// that has not configured `columns` yet behaves exactly as before.
const BUILTIN_TYPE_COLUMNS = {
  animal: [
    "name", "responsible", "recentChange", "date", "location",
    "family", "genus", "species",
    "sex", "lifestage", "lifestatus", "hungry", "fed", "molted", "eggsac",
  ],
  subsample: ["name", "parent", "recentChange", "date", "subsampletype", "box", "slot", "location"],
}

/**
 * The column list a type falls back to when it has not configured its own —
 * what the Settings editor seeds a fresh type's list from.
 */
export function defaultColumnsForType(type) {
  return BUILTIN_TYPE_COLUMNS[type] || DEFAULT_COLUMNS
}

/**
 * Column set for one sample type's table, from its config `columns` list (or a
 * sensible fallback). `typeConfig` is the config entry — `{ value, columns? }`.
 * Each list entry is a built-in key (string) or a custom column object.
 */
export function buildSampleColumns(typeConfig) {
  const type = typeof typeConfig === "string" ? typeConfig : typeConfig?.value
  const entries =
    (Array.isArray(typeConfig?.columns) && typeConfig.columns.length && typeConfig.columns) ||
    BUILTIN_TYPE_COLUMNS[type] ||
    DEFAULT_COLUMNS
  const cols = entries.flatMap((entry) => {
    if (typeof entry === "string") return PALETTE[entry] ? [PALETTE[entry]()] : []
    if (entry && entry.key && entry.kind) return [customColumn(entry)]
    return []
  })
  return [selectColumn(), ...cols, actions]
}

// The general samples table has no single type; it uses the default set.
export const baseColumns = buildSampleColumns()
