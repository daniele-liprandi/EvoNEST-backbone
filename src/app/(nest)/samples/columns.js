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
} from "@/components/tables/columns"
import { sampleEditFields, sampleRegenerateOn } from "@/components/tables/edit-fields"

const actions = rowActionsColumn({ entityLabel: "sample", editFields: sampleEditFields, regenerateOn: sampleRegenerateOn })

// The columns a sample table can show, by key. A sample type names the subset it
// wants (config `columns`); the admin edits that list. Adding a genuinely new
// kind of column (a custom counter, a lab-specific toggle) is the dynamic-columns
// epic — this is the fixed built-in set.
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

/** Every column key a sample type may list. */
export const SAMPLE_COLUMN_KEYS = Object.keys(PALETTE)

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
 * Column set for one sample type's table, from its config `columns` list (or a
 * sensible fallback). `typeConfig` is the config entry — `{ value, columns? }`.
 */
export function buildSampleColumns(typeConfig) {
  const type = typeof typeConfig === "string" ? typeConfig : typeConfig?.value
  const keys =
    (Array.isArray(typeConfig?.columns) && typeConfig.columns.length && typeConfig.columns) ||
    BUILTIN_TYPE_COLUMNS[type] ||
    DEFAULT_COLUMNS
  const cols = keys.flatMap((key) => (PALETTE[key] ? [PALETTE[key]()] : []))
  return [selectColumn(), ...cols, actions]
}

// The general samples table has no single type; it uses the default set.
export const baseColumns = buildSampleColumns()
