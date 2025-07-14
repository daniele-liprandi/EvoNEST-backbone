import { MdDelete, MdMoreHoriz } from "react-icons/md"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

import { DataTableColumnHeader } from "@/components/tables/column-header"

import React from "react"
import { dateColumn, logbookColumn, measurementColumn, parentColumn, responsibleColumn, sampleColumn, selectColumn, sortableFilterableColumn, unitColumn } from "@/components/tables/columns"
import { handleFileDownloads } from "@/utils/handlers/experimentHandlers"
import { Button } from "@/components/ui/button"



export const baseColumns = [
  logbookColumn(),
  sampleColumn("sampleId", "sampleName", "Sample", true), // go directly to the traits page
  sampleColumn("animalId", "animalName", "Animal"),
  sortableFilterableColumn("type", "Trait type", "equals"),
  sortableFilterableColumn("sampleType", "Sample type", "equals"),
  sortableFilterableColumn("sampleSubType", "Sample subtype", "equals"),
  sortableFilterableColumn("detail", "Sample detail", "equals"),
  sortableFilterableColumn("responsibleName", "Responsible", "equals"),
  dateColumn(),
  measurementColumn(),
  unitColumn(),
  sortableFilterableColumn("equipment", "Equipment", "equals"),
  {
    accessorKey: "notes",
    header: "Notes",
  },
  {
    accessorKey: "std",
    header: "Standard Deviation",
    // show only 4 decimal places
    cell: (info) => {
      const trait = info.row.original;
      if (!trait.std) {
        return "";
      }
      else
        return trait.std.toFixed(4);
    },
  },
  {
    accessorKey: "listvals",
    header: "List of Values",
  },
  {
    accessorKey: "fileId",
    header: "Download",
    cell: (info) => {
      const trait = info.row.original;
      return (
        (trait.filesId) &&
        <Button onClick={() => handleFileDownloads(trait.filesId)}>Download</Button>
      );
    },
  },
  {
    accessorKey: "Actions",
    cell: info => {
      const trait = info.row.original;
      const { onDelete } = info.table.options.meta;
      return (
        <div >
          <AlertDialog>
            <AlertDialogTrigger><MdDelete className="h-4 w-4" /></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete trait {trait._id}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(trait._id)}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

      )
    },
  },
]
