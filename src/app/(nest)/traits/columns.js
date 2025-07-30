import { MdDelete, MdMoreHoriz } from "react-icons/md"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

import { DataTableColumnHeader } from "@/components/tables/column-header"

import React from "react"
import { dateColumn, logbookColumn, measurementColumn, parentColumn, responsibleColumn, sampleColumn, selectColumn, sortableFilterableColumn, unitColumn } from "@/components/tables/columns"
import { handleFileDownloads } from "@/utils/handlers/experimentHandlers"
import { Button } from "@/components/ui/button"
import { handleTraitDataDownload } from "@/utils/handlers/traitHandlers"



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
    // show only first 5 values
    cell: (info) => {
      const trait = info.row.original;
      if (!trait.listvals || trait.listvals.length === 0) {
        return "";
      }
      return trait.listvals.slice(0, 5).join(", ") + (trait.listvals.length > 5 ? ", ..." : "");
    },
  },
  {
    accessorKey: "trait_download",
    header: "Download JSON",
    cell: (info) => {
      const trait = info.row.original;
      return (
        <Button onClick={() => handleTraitDataDownload(trait)}>
          Download
        </Button>
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
