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

const animalColumns = [
  selectColumn(),
  sampleNameColumn(),
  familyColumn(),
  genusColumn(),
  speciesColumn(),
  recentChangeDateColumn(),
  dateColumn(),
  locationColumn(),
  sexButtonColumn(),
  lifestageColumn(),
  lifestatusColumn(),
  hungryProgressbarColumn(),
  fedButtonColumn(),
  moltedButtonColumn(),
  eggsacButtonColumn(),
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

export const typeColumns = {
  "animal": animalColumns,
  "subsample": subsampleColumns,
  // Add more types as needed
};
