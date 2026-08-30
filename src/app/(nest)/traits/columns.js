import { dateColumn, logbookColumn, measurementColumn, responsibleColumn, rowActionsColumn, sampleColumn, selectColumn, sortableFilterableColumn, unitColumn } from "@/components/tables/columns"
import { traitEditFields } from "@/components/tables/edit-fields"
import { Button } from "@/components/ui/button"
import { handleTraitDataDownload } from "@/utils/handlers/traitHandlers"



export const baseColumns = [
  selectColumn(),
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
  rowActionsColumn({ entityLabel: "trait", editFields: traitEditFields, titleField: "type" }),
]
