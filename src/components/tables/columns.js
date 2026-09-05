
import Link from "next/link";
import React from "react";

import { ClipboardText, GenderFemale, GenderMale, Bug, Carrot, Egg, Shield, TestTube, Trash, X, ArrowClockwise, UploadSimple } from "@phosphor-icons/react";

import { SampleHoverCard } from "@/components/sample-hover-card";
import { DataTableColumnHeader } from "@/components/tables/column-header";
import { RowEditDialog } from "@/components/tables/row-edit-dialog";
import { ToggleField } from "@/components/tables/toggle-field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DebouncedInput } from "@/components/ui/custom/debounced-input";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { prepend_path } from "@/lib/utils";
import { uploadFiles } from '@/utils/handlers/fileHandlers';
import { useRef, useState } from 'react';
import { toast } from "sonner";
import { mutate } from 'swr';
import { Label } from "@/components/ui/label";
import { handleFileDownloads } from "@/utils/handlers/experimentHandlers";

 export const editableColumn = (key, label) => (
  {
    accessorKey: key,
    header: ({ column, table }) => (
      <div>
        <DataTableColumnHeader column={column} title={label} />
        <Filter column={column} table={table} />
      </div>
    ),
    cell: function Cell(info) {
      const dataRow = info.row.original;
      const { onStatusChange } = info.table.options.meta;
      // Use a local state to manage the input value
      const [inputValue, setInputValue] = React.useState(dataRow[key]);
      
      // Handle input changes
      const handleChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue); // Update local state
        
        // Convert to number if the original value was a number
        const processedValue = typeof dataRow[key] === 'number' ? 
          parseFloat(newValue) || 0 : // Convert to number, default to 0 if NaN
          newValue;                   // Keep as string if original wasn't a number
        
        onStatusChange(dataRow._id, key, processedValue); // Send the correctly typed value
      };

      return (
        <Input
          className='flex min-w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
          value={inputValue}
          onChange={handleChange}
          type={typeof dataRow[key] === 'number' ? 'number' : 'text'} // Use number input for numbers
        />
      );
    },
    meta: { label },
  }
);


export const logbookColumn = (key, label) => ({
    accessorKey: 'logbook',
    header: "Log",
    cell: ({ row }) => {
        const logbook = row.original.logbook;

        return (
            <HoverCard>
                <HoverCardTrigger asChild>
                    <ClipboardText className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground" />
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                    <ScrollArea className="h-72">
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold">Logbook Entries</h4>
                            {logbook && logbook.length > 0 ? (
                                logbook.map(([date, log], index) => (
                                    <div key={index} className="text-sm">
                                        <span className="font-medium text-muted-foreground">
                                            {new Date(date).toLocaleDateString("en-UK", {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: 'numeric',
                                                minute: 'numeric',
                                            })}
                                        </span>
                                        <span className="ml-2">{log}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">No logbook entries.</p>
                            )}
                        </div>
                    </ScrollArea>
                </HoverCardContent>
            </HoverCard>
        );
    },
});

export const sortableFilterableColumn = (key, label, filterFn = "includesString") => (
  {
    accessorKey: key,
    header: ({ column, table }) => (
      <div>
        <DataTableColumnHeader column={column} title={label} />
        <Filter column={column} table={table} />
      </div>
    ),
    filterFn: filterFn,
    meta: { label },
  }
);

export const sortableFilterableNumericColumn = (key, label) => ({
  accessorKey: key,
  header: ({ column, table }) => (
    <div>
      <DataTableColumnHeader column={column} title={label}/>
      <Filter column={column} table={table} />
    </div>
  ),
  cell: (info) => {
    const row = info.row.original;
    if (!row[key]) {
      return "";
    }
    else
      return row[key];
  },
  filterFn: "inNumberRange",
  meta: { label },
});


export const selectColumn = () => (
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
  }
);

/**
 * Standard trailing column: an Edit dialog (when the page passes editFields and
 * an onUpdateFields handler) and a Delete confirmation. Replaces the per-page
 * hand-rolled "Actions" cells so every table row acts the same way.
 */
export const rowActionsColumn = ({ entityLabel, editFields = [], titleField = "name", regenerateOn = undefined }) => ({
  id: "actions",
  enableSorting: false,
  enableHiding: false,
  cell: function Cell(info) {
    const row = info.row.original;
    const { onDelete, onUpdateFields } = info.table.options.meta;
    const label = row?.[titleField] || `this ${entityLabel}`;
    const [deleting, setDeleting] = useState(false);

    // The AlertDialog closes as soon as Action is clicked (Radix's own
    // behaviour), so the pending state shows on the trash button itself,
    // which stays visible until the row disappears on revalidation.
    async function confirmDelete() {
      setDeleting(true);
      try {
        await onDelete(row._id);
      } catch {
        // onDelete already reported the failure via toast.
      } finally {
        setDeleting(false);
      }
    }

    return (
      <div className="flex items-center gap-1">
        {editFields.length > 0 && onUpdateFields ? (
          <RowEditDialog
            rows={[row]}
            fields={editFields}
            entityLabel={entityLabel}
            regenerateOn={regenerateOn}
            onSubmit={(ids, changes, opts) => onUpdateFields(ids[0], changes, opts)}
          />
        ) : null}
        {onDelete ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Delete ${entityLabel}`} disabled={deleting}>
                {deleting ? <ArrowClockwise className="size-4 animate-spin" /> : <Trash className="size-4" />}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>
    );
  },
});

export const nameColumn = () => (
  {
    accessorKey: "name",
    header: ({ column, table }) => (
      <div>
        <DataTableColumnHeader column={column} title="Name" />
        <Filter column={column} table={table} />
      </div>
    )
  }
);

export const sampleNameColumn = () => (
  {
    accessorKey: "name",
    header: ({ column, table }) => (
      <div>
        <DataTableColumnHeader column={column} title="Name" />
        <Filter column={column} table={table} />
      </div>
    ),
    cell: info => {
      const sample = info.row.original;
      return (
        <SampleHoverCard trigger={sample.name} sample={sample} />
      )
    }
  }
);
export const responsibleColumn = () => (
  {
    accessorKey: "responsibleName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Responsible" />
    ),
    meta: { label: "Responsible" },
  }
);

export const sampleColumn = (fieldId, fieldname, label, to_traits = false) => {

  return {
    accessorKey: fieldname,
    header: ({ column, table }) => (
      <div>
        <DataTableColumnHeader column={column} title={label} />
        <Filter column={column} table={table} />
      </div>
    ),
    cell: info => {
      const row = info.row.original;
      const sampleName = row[fieldname];
      const sampleId = row[fieldId];
      const url = to_traits ? `/sample/${sampleId}/s_trait` : `/sample/${sampleId}` ;
      return (
        <div>
          <Link href={url} target="_blank">{sampleName}</Link>
        </div>
      );
    },
    meta: { label },
  };
};

export const parentColumn = () => sampleColumn('parentId', 'parentName', 'Parent');


export const recentChangeDateColumn = () => (
  {
    accessorKey: "recentChangeDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last Change" />
    ),
    cell: info => {
      const date = new Date(info.row.original.recentChangeDate);
      return date.toLocaleDateString("en-UK", { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' });
    },
    meta: { label: "Last Change" },
  }
);

export const typeColumn = () => (
  {
    accessorKey: "type",
    header: "Type",
  }
);
export const dateColumn = () => (
  {
    accessorKey: "date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Collection Date" />
    ),    cell: info => {
      const date = new Date(info.row.original.date);
      return date.toLocaleDateString("en-UK", { year: 'numeric', month: 'short', day: 'numeric' });
    },
  }
);
export const locationColumn = () => (
  {
    accessorKey: "location",
    header: ({ column, table }) => (
      <div>
        <DataTableColumnHeader column={column} title="Location" />
        <Filter column={column} table={table} />
      </div>
    ),
  }
);



export const locationEditableColumn = () => (
  {
    accessorKey: "location",
    header: ({ column, table }) => (
      <div>
        <DataTableColumnHeader column={column} title="Location" />
        <Filter column={column} table={table} />
      </div>
    ),
    cell: function Cell(info) {
      const dataRow = info.row.original;
      const { onStatusChange } = info.table.options.meta;

      // Use a local state to manage the input value
      const [inputValue, setInputValue] = React.useState(dataRow.location);

      // Handle input changes
      const handleChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue); // Update local state
        onStatusChange(dataRow._id, "location", newValue); // Update global state or backend
      };

      return (
        <Input className='flex min-w-24' value={inputValue} onChange={handleChange} />
      );
    }
  }
);

export const latEditableColumn = () => (
  {
    accessorKey: "lat",
    header: "Latitude",
    cell: function Cell(info) {
      const sample = info.row.original;
      const { onStatusChange } = info.table.options.meta;

      // Use a local state to manage the input value
      const [inputValue, setInputValue] = React.useState(sample.lat);

      // Handle input changes
      const handleChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue); // Update local state
        onStatusChange(sample._id, "lat", newValue); // Update global state or backend
      };

      return (
        <Input className='flex max-w-40 min-w-20' value={inputValue} onChange={handleChange} />
      );
    }
  }
);
export const lonEditableColumn = () => (
  {
    accessorKey: "lon",
    header: "Longitude",
    cell: function Cell(info) {
      const sample = info.row.original;
      const { onStatusChange } = info.table.options.meta;

      // Use a local state to manage the input value
      const [inputValue, setInputValue] = React.useState(sample.lon);

      // Handle input changes
      const handleChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue); // Update local state
        onStatusChange(sample._id, "lon", newValue); // Update global state or backend
      };

      return (
        <Input className='flex max-w-40 min-w-20' value={inputValue} onChange={handleChange} />
      );
    }
  }
);

export const latColumn = () => (
  {
    accessorKey: "lat",
    header: "Latitude",
  }
);
export const lonColumn = () => (
  {
    accessorKey: "lon",
    header: "Longitude",
  }
);
export const familyColumn = () => (
  {
    accessorKey: "family",
    header: ({ column, table }) => (
      <div>
        <DataTableColumnHeader column={column} title="Family" />
        <Filter column={column} table={table} />
      </div>
    ),
  }
);
export const genusColumn = () => (
  {
    accessorKey: "genus",
    header: ({ column, table }) => (
      <div>
        <DataTableColumnHeader column={column} title="Genus" />
        <Filter column={column} table={table} />
      </div>
    ),
  }
);
export const speciesColumn = () => (
  {
    accessorKey: "species",
    header: "Species",
  }
);
const LIFESTAGE_OPTIONS = [
  { value: "egg", label: "Egg", icon: <Egg /> },
  { value: "juvenile", label: "Juvenile", icon: "J" },
  { value: "sub-adult", label: "Sub-adult", icon: "S" },
  { value: "adult", label: "Adult", icon: "A" },
];

const LIFESTATUS_OPTIONS = [
  { value: "alive", label: "Alive", icon: <Bug /> },
  { value: "preserved", label: "Preserved", icon: <TestTube /> },
  { value: "nonpreserved", label: "Lost", icon: <X /> },
];

const SEX_OPTIONS = [
  { value: "female", label: "Female", icon: <GenderFemale /> },
  { value: "male", label: "Male", icon: <GenderMale /> },
  { value: "unknown", label: "Unknown", icon: "U" },
];

// Column whose cell is a single-select ToggleField writing `key` via onStatusChange.
export const toggleFieldColumn = (key, header, options, { filter = false } = {}) => ({
  accessorKey: key,
  header: filter
    ? ({ column, table }) => (
        <div>
          <DataTableColumnHeader column={column} title={header} />
          <Filter column={column} table={table} />
        </div>
      )
    : header,
  ...(filter ? { filterFn: "equals" } : {}),
  cell: function Cell(info) {
    const row = info.row.original;
    const { onStatusChange } = info.table.options.meta;
    return (
      <ToggleField
        value={row[key]}
        options={options}
        onChange={(value) => onStatusChange(row._id, key, value)}
      />
    );
  },
  meta: { label: header },
});

export const lifestageColumn = () => toggleFieldColumn("lifestage", "Life Stage", LIFESTAGE_OPTIONS);
export const lifestatusColumn = () => toggleFieldColumn("lifestatus", "Status", LIFESTATUS_OPTIONS);
export const listToggleColumn = (key, label, possibleValues) =>
  toggleFieldColumn(
    key,
    label,
    possibleValues.map((value) => ({ value, label: value })),
    { filter: true },
  );
// A counter field bumped by one on each click (fed / molted / egg sac). Shows
// the current count next to the icon so the click needs no toast to confirm.
const incrementButtonColumn = (field, header, Icon, tooltip) => ({
  accessorKey: field,
  header,
  cell: function Cell(info) {
    const sample = info.row.original;
    const { onIncrement } = info.table.options.meta;
    const count = Number(sample[field]) || 0;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label={tooltip}
              onClick={() => onIncrement(sample._id, field)}
            >
              <Icon className="size-4" />
              {count > 0 ? <span className="tabular-nums">{count}</span> : null}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  },
  meta: { label: header },
});

export const fedButtonColumn = () => incrementButtonColumn("fed", "Feed", Carrot, "Record a feeding");
export const hungryProgressbarColumn = () => (
  {
    accessorKey: "lastFed",
    header: "Belly",
    meta: { label: "Belly" },
    cell: function Cell(info) {
      const sample = info.row.original;

      //calculate if seven days passed from the collection date
      const fedDate = new Date(sample.lastFed);
      const today = new Date();
      const diffTime = Math.abs(today - fedDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      // represent it as a percentage where 100% is 7 days
      let value = Math.min(100, Math.round(diffDays / 7 * 100));
      // invert the value so that 100% is full and 0% is empty
      value = 100 - value;
      return (
        <Progress value={value} />
      )
    },
  }
);

export const moltedButtonColumn = () => incrementButtonColumn("molted", "Molted", Shield, "Record a moult");
export const eggsacButtonColumn = () => incrementButtonColumn("eggsac", "Egg sac", Egg, "Record an egg sac");
export const sexButtonColumn = () => toggleFieldColumn("sex", "Sex", SEX_OPTIONS, { filter: true });

// --- Custom columns ---------------------------------------------------------
// A sample type can define its own columns in the config as
// { key, label, kind, ...opts } instead of a built-in palette key. These render
// through the same generic machinery as the built-ins.

function ProgressFromDate({ value, days }) {
  const then = new Date(value).getTime();
  if (!value || Number.isNaN(then)) return <Progress value={0} />;
  const elapsed = (Date.now() - then) / (1000 * 60 * 60 * 24);
  const remaining = Math.max(0, Math.min(100, 100 - (elapsed / (days || 7)) * 100));
  return <Progress value={Math.round(remaining)} />;
}

function formatCell(kind, value) {
  if (value == null || value === "") return "";
  if (kind === "date") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
  }
  return String(value);
}

/**
 * Build a column from a config-defined custom column.
 * @param {{ key: string, label: string, kind: "counter"|"toggle"|"progress"|"text"|"number"|"date",
 *           icon?: string, options?: {value:string,label:string}[], field?: string, days?: number }} def
 */
export function customColumn(def) {
  const { key, label, kind } = def;

  if (kind === "counter") {
    return {
      accessorKey: key,
      header: label,
      cell: function Cell(info) {
        const row = info.row.original;
        const { onIncrement } = info.table.options.meta;
        const count = Number(row[key]) || 0;
        return (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Record ${label}`}
            onClick={() => onIncrement?.(row._id, key)}
          >
            <span aria-hidden>{def.icon || "+"}</span>
            {count > 0 ? <span className="tabular-nums">{count}</span> : null}
          </Button>
        );
      },
      meta: { label },
    };
  }

  if (kind === "toggle") {
    return toggleFieldColumn(key, label, def.options ?? [], { filter: true });
  }

  if (kind === "progress") {
    return {
      accessorKey: def.field || key,
      header: label,
      cell: (info) => <ProgressFromDate value={info.row.original[def.field || key]} days={def.days} />,
      meta: { label },
    };
  }

  // text | number | date — plain, sortable, filterable display column
  return {
    accessorKey: key,
    header: ({ column, table }) => (
      <div>
        <DataTableColumnHeader column={column} title={label} />
        <Filter column={column} table={table} />
      </div>
    ),
    cell: (info) => formatCell(kind, info.getValue()),
    meta: { label },
  };
}

export const imageColumn = (imagefield) => ({
  accessorKey: imagefield,
  header: "Image",
  cell: function Cell(info) {
    const rowdata = info.row.original;
    const base64Data = rowdata[imagefield]; 
    
    if (base64Data === undefined || base64Data === null) {
      console.warn("base64Data is undefined or null for this row");
      return null;
    } 

    // Handle different data types
    let imageData;
    const imageAlt = rowdata?.name
      ? `Image associated with ${rowdata.name}`
      : "Image associated with this record";

    if (typeof base64Data === 'string') {
      imageData = base64Data;
    } else if (base64Data instanceof Blob) {
      // If it's a Blob, we need to convert it to a data URL
      return <BlobImage blob={base64Data} imageAlt={imageAlt} />;
    } else if (typeof base64Data === 'object' && base64Data.type === 'Buffer') {
      // If it's a Buffer object from Node.js
      imageData = Buffer.from(base64Data).toString('base64');
    } else {
      console.error("Unsupported data type for base64Data:", base64Data);
      return null;
    }

    return <ImageDisplay base64Data={imageData} imageAlt={imageAlt} />;
  }
});

// Separate component to handle Blob data
const BlobImage = ({ blob, imageAlt }) => {
  const [imageSrc, setImageSrc] = React.useState(null);

  React.useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => setImageSrc(e.target.result);
    reader.readAsDataURL(blob);

    return () => {
      if (reader.readyState === FileReader.LOADING) {
        reader.abort();
      }
    };
  }, [blob]);

  if (!imageSrc) return null;

  return <ImageDisplay base64Data={imageSrc} imageAlt={imageAlt} />;
};

// Update ImageDisplay component
const ImageDisplay = ({ base64Data, imageAlt }) => {
  if (!base64Data) {
    return null;
  }
  // If base64 data doesn't include the prefix, add it
  const imageSrc = base64Data.startsWith('data:')
    ? base64Data
    : `data:image/jpeg;base64,${base64Data}`;

  return (
    <img
      src={imageSrc}
      alt={imageAlt}
      className="h-12 rounded-lg"
      onError={(e) => {
        console.error("Error loading image:", e);
        e.target.style.display = 'none';
      }}
    />
  );
};

// A silktype Badge that changes colour based on the silktype
const SilkTypeBadge = ({ silktype, ...props }) => {
  let colour = "gray";
  if (silktype === "dragline" || silktype === "walking") {
    colour = "green";
  } else if (silktype === "eggsac") {
    colour = "teal";
  } else if (silktype === "bridging line" || silktype === "bridging web") {
    colour = "purple";
  } else if (silktype === "sheet web" || silktype === "tangle web	" || silktype === "tangle web" || silktype === "retreat") {
    colour = "orange";
  } else if (silktype === "prey wrap" || silktype === "intercepted prey wrap" || silktype === "cribellar net") {
    colour = "red";
  } else if (silktype === "gumfoot") {
    colour = "pink";
  } else if (silktype === "manual collection" || silktype === "aciniform" || silktype === "major ampullate") {
    colour = "blue";
  }
  return <Badge variant={colour} {...props}>{silktype}</Badge>;
};

export const silktypeColumn = () => ({
  accessorKey: "silktype",
  header: ({ column, table }) => (
    <div>
      <DataTableColumnHeader column={column} title="Type of silk" />
      <Filter column={column} table={table} />
    </div>
  ), cell: function Cell(info) {

    const sample = info.row.original;

    return (
      <SilkTypeBadge silktype={sample.silktype}></SilkTypeBadge>
    );
  },
  meta: { label: "Type of silk" },
});


export const collectionColumn = () => ({

  accessorKey: "collection",
  header: ({ column, table }) => (
    <div>
      <DataTableColumnHeader column={column} title="Collection" />
      <Filter column={column} table={table} />
    </div>
  ), cell: function Cell(info) {

    const sample = info.row.original;
    const { onStatusChange } = info.table.options.meta;

    // Use a local state to manage the input value
    const [inputValue, setInputValue] = React.useState(sample.collection);

    // Handle input changes
    const handleChange = (e) => {
      const newValue = e.target.value;
      setInputValue(newValue); // Update local state
      onStatusChange(sample._id, "collection", newValue); // Update global state or backend
    };

    return (
      <Input className='flex max-w-20 min-w-12' type="text" value={inputValue} onChange={handleChange} />
    );
  }
});

export const boxColumn = () => ({

  accessorKey: "box",
  header: ({ column, table }) => (
    <div>
      <DataTableColumnHeader column={column} title="Box" />
      <Filter column={column} table={table} />
    </div>
  ), cell: function Cell(info) {

    const sample = info.row.original;
    const { onStatusChange } = info.table.options.meta;

    // Use a local state to manage the input value
    const [inputValue, setInputValue] = React.useState(sample.box ?? '');

    // Handle input changes
    const handleChange = (e) => {
      const newValue = e.target.value;
      setInputValue(newValue); // Update local state
      onStatusChange(sample._id, "box", newValue); // Update global state or backend
    };

    return (
      <Input className='flex max-w-20 min-w-12' type="text" value={inputValue} onChange={handleChange} />
    );
  }
});
export const slotColumn = () => ({

  accessorKey: "slot",
  header: "Slot",
  cell: function Cell(info) {

    const sample = info.row.original;
    const { onStatusChange } = info.table.options.meta;

    // Use a local state to manage the input value
    const [inputValue, setInputValue] = React.useState(sample.slot ?? '');

    // Handle input changes
    const handleChange = (e) => {
      const newValue = e.target.value;
      setInputValue(newValue); // Update local state
      onStatusChange(sample._id, "slot", newValue); // Update global state or backend
    };

    return (
      <Input className='flex max-w-20 min-w-12' type="text" value={inputValue} onChange={handleChange} />
    );
  }
});

export const valueColumn = () => ({
  accessorKey: "value",
  header: ({ column, table }) => (
    <div>
      <DataTableColumnHeader column={column} title="Value" />
      <Filter column={column} table={table} />
    </div>
  ),
  cell: (info) => {
    const trait = info.row.original;
    if (!trait.value) {
      return "";
    }
    else
      return trait.value;
  }
});

export const unitColumn = () => ({
  accessorKey: "unit",
  header: ({ column, table }) => (
    <div>
      <DataTableColumnHeader column={column} title="Unit" />
      <Filter column={column} table={table} />
    </div>
  )
});


function Filter({
  column,
  table,
}) {
  const firstValue = table
    .getPreFilteredRowModel()
    .flatRows[0]?.getValue(column.id)

  const columnFilterValue = column.getFilterValue()

  const sortedUniqueValues = React.useMemo(
    () =>
      typeof firstValue === 'number'
        ? []
        : Array.from(column.getFacetedUniqueValues().keys()).sort(),
    [column, firstValue]
  )

  return typeof firstValue === 'number' ? (
    <div>
      <div className="flex space-x-2">
        <DebouncedInput
          type="number"
          min={Number(column.getFacetedMinMaxValues()?.[0] ?? '')}
          max={Number(column.getFacetedMinMaxValues()?.[1] ?? '')}
          value={(columnFilterValue)?.[0] ?? ''}
          onChange={value =>
            column.setFilterValue((old) => [value, old?.[1]])
          }
          placeholder={`Min ${column.getFacetedMinMaxValues()?.[0]
            ? `(${column.getFacetedMinMaxValues()?.[0]})`
            : ''
            }`}
          className="border md-rounded"
        />
        <DebouncedInput
          type="number"
          min={Number(column.getFacetedMinMaxValues()?.[0] ?? '')}
          max={Number(column.getFacetedMinMaxValues()?.[1] ?? '')}
          value={(columnFilterValue)?.[1] ?? ''}
          onChange={value =>
            column.setFilterValue((old) => [old?.[0], value])
          }
          placeholder={`Max ${column.getFacetedMinMaxValues()?.[1]
            ? `(${column.getFacetedMinMaxValues()?.[1]})`
            : ''
            }`}
          className="border md-rounded"
        />
      </div>
      <div className="h-1" />
    </div>
  ) : (
    <>
      <datalist id={column.id + 'list'}>
        {sortedUniqueValues.slice(0, 5000).map((value) => (
          <option value={value} key={value} />
        ))}
      </datalist>
      <DebouncedInput
        type="text"
        value={(columnFilterValue ?? '')}
        onChange={value => column.setFilterValue(value)}
        placeholder={`Search... (${column.getFacetedUniqueValues().size})`}
        className="border md-rounded w-32"
        list={column.id + 'list'}
      />
      <div className="h-1" />
    </>
  )
}


export const fileDownloadColumn = () => ({
  id: 'Download',
  header: "Download",
  cell: function Cell(info) {
    const entry = info.row.original;

    return (
      <Button onClick={() => handleFileDownloads(entry.filesId)}>Download</Button>
    );
  }
});
  

export const fileUploadColumn = () => ({
  id: 'fileUpload',
  header: "Upload Files",
  cell: function Cell(info) {
    const trait = info.row.original;
    const [isUploading, setIsUploading] = useState(false);

    const handleFileSelect = async (files) => {
      if (!files || files.length === 0) return;

      setIsUploading(true);
      try {
        await uploadFiles(files, 'trait-files', {
          entryType: 'trait',
          entryId: trait._id,
          deferredLink: false
        });
        mutate(`${prepend_path}/api/traits`);
        toast.success('Files uploaded successfully');
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload files');
      } finally {
        setIsUploading(false);
      }
    };

    return (
      <div className="flex items-center">
        <Input 
          type="file"
          className="hidden"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          id={`file-upload-${trait._id}`}
        />
        <Label htmlFor={`file-upload-${trait._id}`}>
          <Button 
            asChild
            size="sm"
            variant="outline"
            disabled={isUploading}
          >
            <span>
              {isUploading ? (
                <ArrowClockwise className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UploadSimple className="mr-2 h-4 w-4" />
              )}
              Upload
            </span>
          </Button>
        </Label>
      </div>
    );
  }
});