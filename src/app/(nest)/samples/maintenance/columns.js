import {
  boxColumn,
  collectionColumn,
  editableColumn,
  eggsacButtonColumn,
  fedButtonColumn,
  genusColumn,
  hungryProgressbarColumn,
  latEditableColumn,
  lifestageColumn,
  lifestatusColumn,
  locationEditableColumn,
  lonEditableColumn,
  moltedButtonColumn,
  sampleNameColumn,
  rowActionsColumn,
  selectColumn,
  sexButtonColumn,
  slotColumn,
  speciesColumn,
} from "@/components/tables/columns"
import { sampleEditFields } from "@/components/tables/edit-fields"

const actions = rowActionsColumn({ entityLabel: "sample", editFields: sampleEditFields })

export const positionColumns = [
  selectColumn(),
  sampleNameColumn(),
  locationEditableColumn(),
  latEditableColumn(),
  lonEditableColumn(),
  actions,
]

export const aliveColumns = [
  selectColumn(),
  sampleNameColumn(),
  genusColumn(),
  speciesColumn(),
  hungryProgressbarColumn(),
  fedButtonColumn(),
  lifestageColumn(),
  lifestatusColumn(),
  moltedButtonColumn(),
  eggsacButtonColumn(),
  actions,
]

export const deadColumns = [
  selectColumn(),
  sampleNameColumn(),
  genusColumn(),
  speciesColumn(),
  sexButtonColumn(),
  lifestatusColumn(),
  editableColumn("preservation", "Method"),
  editableColumn("preservationDate", "Date of Preservation"),
  editableColumn("preservationNotes", "Preservation Notes"),
  editableColumn("notes", "Notes"),
  collectionColumn(),
  boxColumn(),
  slotColumn(),
  actions,
]
