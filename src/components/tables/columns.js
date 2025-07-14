
import Link from "next/link";
import React from "react";

import { ClipboardList } from "lucide-react"; // Using lucide for the icon
import { MdFemale, MdMale } from "react-icons/md";
import { PiBug, PiCarrotBold, PiEggBold, PiShieldBold, PiTestTube, PiXBold } from "react-icons/pi";

import { SampleHoverCard } from "@/components/sample-hover-card";
import { DataTableColumnHeader } from "@/components/tables/column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DebouncedInput } from "@/components/ui/custom/debounced-input";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { prepend_path } from "@/lib/utils";
import { uploadFiles } from '@/utils/handlers/fileHandlers';
import { ReloadIcon, UploadIcon } from "@radix-ui/react-icons";
import { useRef, useState } from 'react';
import { toast } from "sonner";
import { mutate } from 'swr';
import { Label } from "@/components/ui/label";
import { handleFileDownloads } from "@/utils/handlers/experimentHandlers";

// A new component for rendering the cell content
const SampleSexCell = ({ sample, onStatusChange }) => {
  const [value, setValue] = React.useState(sample.sex);

  const handleStatusChange = (newValue) => {
    setValue(newValue);
    onStatusChange(sample._id, "sex", newValue);
  };

  return (
    <ToggleGroup type="single"
      value={value}
      onValueChange={handleStatusChange}
      size="lg"
    >
      <ToggleGroupItem value="female"><MdFemale /></ToggleGroupItem>
      <ToggleGroupItem value="male"><MdMale /></ToggleGroupItem>
      <ToggleGroupItem value="unknown">U</ToggleGroupItem>
    </ToggleGroup>
  );
};

/* ---------------------------------- 
          General columns
 ------------------------------------*/

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
    }
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
                    <ClipboardList className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground" />
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
  filterFn: "inNumberRange"
});


/* ---------------------------------- 
          Specific columns
 ------------------------------------*/

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
    }
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
export const lifestageColumn = () => (
  {
    accessorKey: "lifestage",
    header: "Life Stage",
    cell: function Cell(info) {

      const sample = info.row.original;
      const { onDelete, onEdit, onStatusChange } = info.table.options.meta;

      const [value, setValue] = React.useState(sample.lifestage);


      return (
        <ToggleGroup type="single"
          value={value}
          onValueChange={(value) => {
            if (value) setValue(value);
          }}
          size="lg"
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <ToggleGroupItem onClick={() => onStatusChange(sample._id, "lifestage", "egg")} value="egg"><PiEggBold /></ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>Egg</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <ToggleGroupItem onClick={() => onStatusChange(sample._id, "lifestage", "juvenile")} value="juvenile">J</ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>Juvenile</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <ToggleGroupItem onClick={() => onStatusChange(sample._id, "lifestage", "sub-adult")} value="sub-adult">S</ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>Sub-adult</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <ToggleGroupItem onClick={() => onStatusChange(sample._id, "lifestage", "adult")} value="adult">A</ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>Adult</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </ToggleGroup>
      )
    }
  }
);

export const listToggleColumn = (key, label, possibleValues) => (
  {
    accessorKey: key,
    header: ({ column, table }) => (
      <div>
        <DataTableColumnHeader column={column} title={label} />
        <Filter column={column} table={table} />
      </div>
    ),
    cell: function Cell(info) {
      const object = info.row.original;
      const { onStatusChange } = info.table.options.meta;

      const [value, setValue] = React.useState(object[key]);

      return (
        <ToggleGroup type="single"
          value={value}
          onValueChange={(value) => {
            if (value) setValue(value);
          }}
          size="lg"
        >
          {possibleValues.map((possibleValue) => (
            <ToggleGroupItem key={possibleValue} onClick={() => onStatusChange(object._id, key, possibleValue)} value={possibleValue}>{possibleValue}</ToggleGroupItem>
          ))}
        </ToggleGroup>
      )
    }
  }
);  


export const lifestatusColumn = () => (
  {
    accessorKey: "lifestatus",
    header: "Status",
    cell: function Cell(info) {

      const sample = info.row.original;
      const { onStatusChange } = info.table.options.meta;

      const [value, setValue] = React.useState(sample.lifestatus);


      return (
        <ToggleGroup type="single"
          value={value}
          onValueChange={(value) => {
            if (value) setValue(value);
          }}
          size="lg"
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <ToggleGroupItem onClick={() => onStatusChange(sample._id, "lifestatus", "alive")} value="alive"><PiBug /></ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>Alive</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <ToggleGroupItem onClick={() => onStatusChange(sample._id, "lifestatus", "preserved")} value="preserved"><PiTestTube /></ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>Preserved</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <ToggleGroupItem onClick={() => onStatusChange(sample._id, "lifestatus", "nonpreserved")} value="nonpreserved"><PiXBold /></ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>Lost</TooltipContent>
            </Tooltip>
          </TooltipProvider >
        </ToggleGroup>
      )
    }
  }
);
export const fedButtonColumn = () => (
  {
    accessorKey: "fed",
    header: "Feed",
    cell: function Cell(info) {

      const sample = info.row.original;
      const { onIncrement } = info.table.options.meta;

      const [value, setValue] = React.useState(sample.fed);
      return (

        <Button value={value} onValueChange={(value) => {
          if (value) setValue(value);
        }}
          onClick={() => onIncrement(sample._id, "fed")}
        ><PiCarrotBold /></Button>
      )
    },
  }
);
export const hungryProgressbarColumn = () => (
  {
    accessorKey: "lastFed",
    header: "Belly",
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

export const moltedButtonColumn = () => (
  {
    accessorKey: "molted",
    header: "Molted",
    cell: function Cell(info) {

      const sample = info.row.original;
      const { onIncrement } = info.table.options.meta;

      const [value, setValue] = React.useState(sample.fed);
      return (

        <Button value={value} onValueChange={(value) => {
          if (value) setValue(value);
        }}
          onClick={() => onIncrement(sample._id, "molted")}
        ><PiShieldBold /></Button>
      )
    },
  }
);
export const eggsacButtonColumn = () => (
  {
    accessorKey: "eggsac",
    header: "with Egg Sac",
    cell: function Cell(info) {

      const sample = info.row.original;
      const { onDelete, onEdit, onStatusChange, onIncrement } = info.table.options.meta;

      const [value, setValue] = React.useState(sample.eggsac);
      return (

        <Button value={value} onValueChange={(value) => {
          if (value) setValue(value);
        }}
          onClick={() => onIncrement(sample._id, "eggsac")}
        ><PiEggBold /></Button>
      )
    },
  }
);
export const sexButtonColumn = () => (
  {
    accessorKey: "sex",
    header: ({ column, table }) => (
      <div>
        <DataTableColumnHeader column={column} title="Sex" />
        <Filter column={column} table={table} />
      </div>
    ),
    filterFn: "equals",
    cell: info => {
      const sample = info.row.original;
      const { onStatusChange } = info.table.options.meta;
      return <SampleSexCell sample={sample} onStatusChange={onStatusChange} />;
    }
  }
);

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
    if (typeof base64Data === 'string') {
      imageData = base64Data;
    } else if (base64Data instanceof Blob) {
      // If it's a Blob, we need to convert it to a data URL
      return <BlobImage blob={base64Data} />;
    } else if (typeof base64Data === 'object' && base64Data.type === 'Buffer') {
      // If it's a Buffer object from Node.js
      imageData = Buffer.from(base64Data).toString('base64');
    } else {
      console.error("Unsupported data type for base64Data:", base64Data);
      return null;
    }

    return <ImageDisplay base64Data={imageData} />;
  }
});

// Separate component to handle Blob data
const BlobImage = ({ blob }) => {
  const [imageSrc, setImageSrc] = React.useState(null);

  React.useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => setImageSrc(e.target.result);
    reader.readAsDataURL(blob);
  }, [blob]);

  if (!imageSrc) return null;

  return <ImageDisplay base64Data={imageSrc} />;
};

// Update ImageDisplay component
const ImageDisplay = ({ base64Data }) => {
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
      alt="Experiment Image"
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
  }
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
    const [inputValue, setInputValue] = React.useState(sample.box);

    // Handle input changes
    const handleChange = (e) => {
      const newValue = e.target.value;
      setInputValue(newValue); // Update local state
      onStatusChange(sample._id, "box", newValue); // Update global state or backend
    };

    return (
      <Input className='flex max-w-20 min-w-12' type="number" value={inputValue} onChange={handleChange} />
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
    const [inputValue, setInputValue] = React.useState(sample.slot);

    // Handle input changes
    const handleChange = (e) => {
      const newValue = e.target.value;
      setInputValue(newValue); // Update local state
      onStatusChange(sample._id, "slot", newValue); // Update global state or backend
    };

    return (
      <Input className='flex max-w-20 min-w-12' type="number" value={inputValue} onChange={handleChange} />
    );
  }
});

export const measurementColumn = () => ({
  accessorKey: "measurement",
  header: ({ column, table }) => (
    <div>
      <DataTableColumnHeader column={column} title="Measurement" />
      <Filter column={column} table={table} />
    </div>
  ),
  cell: (info) => {
    const trait = info.row.original;
    if (!trait.measurement) {
      return "";
    }
    else
      return trait.measurement;
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
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UploadIcon className="mr-2 h-4 w-4" />
              )}
              Upload
            </span>
          </Button>
        </Label>
      </div>
    );
  }
});