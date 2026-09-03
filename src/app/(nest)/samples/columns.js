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
  toggleFieldColumn,
  customColumn,
} from "@/components/tables/columns"
import { buildEditFields, customFieldMap } from "./fields"
import { sampleRegenerateOn } from "@/components/tables/edit-fields"

// The built-in columns a sample table can show, by key. A type's `columns` list
// mixes these keys, the keys of the type's own custom fields (resolved against
// its `fields` list), and table-only widget objects — see COLUMN_WIDGET_KINDS.
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

// A custom column object is only for a table-only widget. Anything that holds a
// value entered on the form is a `fields` entry, named by key in the list.
export const COLUMN_WIDGET_KINDS = ["counter", "progress"]

// Used when a type does not name its own `columns` list.
const DEFAULT_COLUMNS = ["name", "responsible", "recentChange", "date", "type", "parent", "location"]

/** The column list the Settings editor seeds a fresh type's list from. */
export function defaultColumnsForType(_type) {
  return DEFAULT_COLUMNS
}

// A column for one of the type's custom fields: a select is an inline-editable
// cell (same options as the form), everything else is a sortable display cell.
function columnForField(def) {
  if (def.kind === "select") {
    return toggleFieldColumn(def.key, def.label, def.options, { filter: true })
  }
  return sortableFilterableColumn(def.key, def.label)
}

/**
 * Column set for one sample type's table, from its config `columns` list (or a
 * sensible default). `typeConfig` is the config entry (or a bare type string).
 * A list entry is a built-in key, a custom field key, or a widget object.
 */
export function buildSampleColumns(typeConfig) {
  const entries =
    (Array.isArray(typeConfig?.columns) && typeConfig.columns.length && typeConfig.columns) ||
    DEFAULT_COLUMNS
  const fields = customFieldMap(typeConfig)
  const cols = entries.flatMap((entry) => {
    if (typeof entry === "string") {
      if (PALETTE[entry]) return [PALETTE[entry]()]
      if (fields[entry]) return [columnForField(fields[entry])]
      return []
    }
    if (entry && COLUMN_WIDGET_KINDS.includes(entry.kind)) return [customColumn(entry)]
    return []
  })
  const actions = rowActionsColumn({
    entityLabel: "sample",
    editFields: buildEditFields(typeConfig),
    regenerateOn: sampleRegenerateOn,
  })
  return [selectColumn(), ...cols, actions]
}

// The general samples table has no single type; it uses the default set.
export const baseColumns = buildSampleColumns()
