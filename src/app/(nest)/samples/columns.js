import { MdDelete, MdMoreHoriz } from "react-icons/md"

import { Button } from "@/components/ui/button"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { boxColumn, collectionColumn, dateColumn, eggsacButtonColumn, familyColumn, fedButtonColumn, genusColumn, hungryProgressbarColumn, latColumn, lifestageColumn, lifestatusColumn, locationColumn, lonColumn, moltedButtonColumn, sampleNameColumn, parentColumn, recentChangeDateColumn, responsibleColumn, selectColumn, sexButtonColumn, slotColumn, speciesColumn, typeColumn, sortableFilterableColumn } from "@/components/tables/columns"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

export const baseColumns = [
  selectColumn(),
  sampleNameColumn(),
  responsibleColumn(),
  recentChangeDateColumn(),
  dateColumn(),
  typeColumn(),
  parentColumn(),
  locationColumn(),
  {
    accessorKey: "Actions",
    cell: info => {
      const sample = info.row.original;
      const { onDelete, onEdit, onStatusChange } = info.table.options.meta;
      return (
        <div >

          <DropdownMenu>
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
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MdMoreHoriz className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(sample.name)}
              >
                Copy Sample Name
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/*<DropdownMenuItem>Action placeholder</DropdownMenuItem>*/}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      )
    },
  },
]

const animalColumns = [
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

const subsampleColumns = [
  sampleNameColumn(),
  parentColumn(),
  recentChangeDateColumn(),
  dateColumn(),
  sortableFilterableColumn("subsampletype", "Subsample Type"),
  boxColumn(),
  slotColumn(),
  locationColumn(),
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

export const typeColumns = {
  "animal": animalColumns,
  "subsample": subsampleColumns,
  // Add more types as needed
};

