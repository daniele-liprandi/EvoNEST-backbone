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
import { sampleEditFields } from "@/components/tables/edit-fields"

const actions = rowActionsColumn({ entityLabel: "sample", editFields: sampleEditFields })

// The feeding / moulting / egg-sac / life-stage controls. Only meaningful for a
// sample type flagged `husbandry` in the config (a living organism kept in the
// collection), so a plant or a tissue sample never gets a "Molted" button.
const husbandryColumns = [
  familyColumn(),
  genusColumn(),
  speciesColumn(),
  sexButtonColumn(),
  lifestageColumn(),
  lifestatusColumn(),
  hungryProgressbarColumn(),
  fedButtonColumn(),
  moltedButtonColumn(),
  eggsacButtonColumn(),
]

// Generic table for any sample type.
export const baseColumns = [
  selectColumn(),
  sampleNameColumn(),
  responsibleColumn(),
  recentChangeDateColumn(),
  dateColumn(),
  typeColumn(),
  parentColumn(),
  locationColumn(),
  actions,
]

const subsampleColumns = [
  selectColumn(),
  sampleNameColumn(),
  parentColumn(),
  recentChangeDateColumn(),
  dateColumn(),
  sortableFilterableColumn("subsampletype", "Subsample Type"),
  boxColumn(),
  slotColumn(),
  locationColumn(),
  actions,
]

/**
 * Column set for one sample type's table. `husbandry` types get the organism
 * and husbandry controls; `subsample` gets the box/slot layout; everything else
 * gets the generic set.
 */
export function buildSampleColumns({ type, husbandry = false } = {}) {
  if (type === "subsample") return subsampleColumns
  if (!husbandry) return baseColumns
  return [
    selectColumn(),
    sampleNameColumn(),
    recentChangeDateColumn(),
    dateColumn(),
    locationColumn(),
    ...husbandryColumns,
    actions,
  ]
}
