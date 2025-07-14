import { useMemo, useState, useCallback } from "react";
import { FormField, FormItem, FormLabel, FormDescription, FormMessage, FormControl } from "@/components/ui/form";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import debounce from "lodash.debounce";

export const ComboFormBox = ({ 
  control, 
  setValue, 
  name: fieldname, 
  options, 
  fieldlabel, 
  description,
  others_enabled = false // Default to false for backward compatibility
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [open, setOpen] = useState(false);

  const sortedOptions = useMemo(() => {
    const sorted = options.sort((a, b) => a.label.localeCompare(b.label));
    if (others_enabled) {
      sorted.push({ label: "Other", value: "other" });
    }
    return sorted;
  }, [options, others_enabled]);

  const filteredOptions = useMemo(() => {
    if (!inputValue) return sortedOptions;
    return sortedOptions.filter(option =>
      option.label.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [inputValue, sortedOptions]);

  const debouncedSetInputValue = useCallback(
    debounce((value) => setInputValue(value), 100),
    []
  );

  const handleOptionSelect = (selectedValue, selectedLabel, currentFieldValue) => {
    if (selectedValue === "other") {
      if (isOtherSelected) {
        // Deselect "Other" option
        setIsOtherSelected(false);
        setCustomValue("");
        setValue(fieldname, "");
      } else {
        setIsOtherSelected(true);
        setCustomValue("");
        setValue(fieldname, ""); // Clear the value until custom input is provided
      }
    } else {
      // Check if the selected option is already selected
      if (currentFieldValue === selectedValue) {
        // Deselect the option
        setIsOtherSelected(false);
        setValue(fieldname, "");
      } else {
        // Select the option
        setIsOtherSelected(false);
        setValue(fieldname, selectedValue);
      }
    }
    setOpen(false);
  };

  const handleCustomValueChange = (e) => {
    const value = e.target.value;
    setCustomValue(value);
    setValue(fieldname, value);
  };

  return (
    <FormField
      control={control}
      name={fieldname}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{fieldlabel}</FormLabel>
          <div className="flex flex-col gap-2">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-[200px] justify-between",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {isOtherSelected 
                      ? customValue || "Enter custom value..."
                      : field.value
                        ? sortedOptions.find(
                            (option) => option.value === field.value
                          )?.label
                        : "Select " + fieldlabel}
                    <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput
                    placeholder="Search..."
                    className="h-9"
                    onChange={(e) => debouncedSetInputValue(e.target.value)}
                  />
                  <CommandList>
                    <CommandEmpty>No choice found.</CommandEmpty>
                    <CommandGroup>
                      {filteredOptions.map((option) => (
                        <CommandItem
                          value={option.label}
                          key={option.value}
                          onSelect={() => handleOptionSelect(option.value, option.label, field.value)}
                        >
                          {option.label}
                          <CheckIcon
                            className={cn(
                              "ml-auto h-4 w-4",
                              (!isOtherSelected && option.value === field.value) ||
                              (isOtherSelected && option.value === "other")
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            
            {isOtherSelected && (
              <FormControl>
                <Input
                  placeholder="Enter custom value..."
                  value={customValue}
                  onChange={handleCustomValueChange}
                  className="w-[200px]"
                />
              </FormControl>
            )}
          </div>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};