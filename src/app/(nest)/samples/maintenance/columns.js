import { MdDelete } from "react-icons/md"


import { boxColumn, collectionColumn, eggsacButtonColumn, fedButtonColumn, genusColumn, hungryProgressbarColumn, latEditableColumn, lifestageColumn, lifestatusColumn, locationEditableColumn, lonEditableColumn, moltedButtonColumn, sampleNameColumn, parentColumn, recentChangeDateColumn, responsibleColumn, selectColumn, sexButtonColumn, silktypeColumn, slotColumn, speciesColumn, typeColumn, sortableFilterableColumn, editableColumn } from "@/components/tables/columns"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"


export const positionColumns = [
  sampleNameColumn(),
  locationEditableColumn(),
  latEditableColumn(),
  lonEditableColumn(),
]

export const aliveColumns = [
  sampleNameColumn(),
  genusColumn(),
  speciesColumn(),
  hungryProgressbarColumn(),
  fedButtonColumn(),
  lifestageColumn(),
  lifestatusColumn(),
  moltedButtonColumn(),
  eggsacButtonColumn(),
  {
    accessorKey: "Actions",
    cell: info => {
      const sample = info.row.original;
      const { onDelete, onEdit, onStatusChange } = info.table.options.meta;
      return (
        <div >
          <AlertDialog>
            <AlertDialogTrigger><MdDelete className="h-4 w-4" /></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete sample {sample.name}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(sample._id)}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )
    },
  },
]


export const deadColumns = [
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
  {
    accessorKey: "Actions",
    cell: info => {
      const sample = info.row.original;
      const { onDelete, onEdit, onStatusChange } = info.table.options.meta;
      return (
        <div >
          <AlertDialog>
            <AlertDialogTrigger><MdDelete className="h-4 w-4" /></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete sample {sample.name}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(sample._id)}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )
    },
  },
]
