import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/tables/column-header"
import { MdDelete } from "react-icons/md"
import { Database } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { ChangeDatabasesDialog } from "@/components/forms/change-databases-dialog"

import React from "react"

const statusColorMap = {
  active: "success",
  paused: "danger",
  vacation: "warning",
};

export const getColumns = (isAdmin) => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    )
  },
  {
    accessorKey: "role",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Role" />
    ),
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
  },  {
    accessorKey: "institution",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Institution" />
    ),
  },
  {
    accessorKey: "databases",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Databases" />
    ),
    cell: ({ row }) => {
      const databases = row.getValue("databases");
      return databases && databases.length > 0 
        ? databases.join(", ") 
        : "No databases";
    },
  },...(isAdmin ? [{
    accessorKey: "Actions",
    cell: info => {
      const user = info.row.original;
      const { onDelete } = info.table.options.meta;
      return (
        <div className="flex items-center gap-2">
          <ChangeDatabasesDialog user={user}>
            <Button variant="outline" size="sm">
              <Database className="h-4 w-4" />
            </Button>
          </ChangeDatabasesDialog>
          
          <AlertDialog>
            <AlertDialogTrigger>
              <Button variant="outline" size="sm">
                <MdDelete className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete user {user.name}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(user._id)}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )
    },
  }] : []),
]

// Keep baseColumns for backward compatibility
export const baseColumns = getColumns(true);
