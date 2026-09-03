"use client";

import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";

import { ComboFormBox } from "@/components/forms/combo-form-box";
import { CustomSampleField } from "@/components/forms/custom-sample-field";
import { TaxonomicHierarchy } from "@/components/ui/custom/TaxonomicHierarchy";
import { buildSampleFields } from "@/app/(nest)/samples/fields";
import { nextNameFor } from "@/shared/config/sample-names";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getUserIdByName } from "@/hooks/userHooks";
import { prepend_path } from "@/lib/utils";
import { useConfigTypes } from "@/hooks/useConfigTypes";
import { useMainSettings } from "@/hooks/useMainSettings";
import { toast } from "sonner";
import { mutate } from "swr";

const formSchema = z.object({
  nomenclature: z.string().min(2, { message: "No species inserted" }),
  name: z.string().min(2, { message: "No sample name inserted" }),
  responsible: z.any(),
  parentId: z.string().optional(),
  family: z.string(),
  genus: z.string(),
  species: z.string().optional(),
  type: z.string(),
  date: z.date(),
  location: z.string().optional(),
  lat: z.coerce.number().optional(),
  lon: z.coerce.number().optional(),
  sex: z.string().optional(),
  box: z.string().optional(),
  slot: z.string().optional(),
  subsampletype: z.string().optional(),
  includeSubsampleShortened: z.boolean().optional(),
  notes: z.string().optional(),
  // Values for the type's admin-defined fields, keyed by field key.
  custom: z.record(z.string(), z.any()).optional(),
});

const sexOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "unknown", label: "Unknown" },
];

export function SampleForm({
  users,
  samples,
  id,
  user,
  page,
}: {
  users: any;
  samples: any;
  id?: string | number;
  user: any;
  page?: string;
}) {
  const { sampletypes, samplesubtypes } = useConfigTypes();
  const { idGeneration, labInfo, loading: settingsLoading } = useMainSettings();

  //Check if the user is using Safari or Chrome and only for chrome check if the user has granted permission
  const checkNavigator = async () => {
    // Use feature detection to check for Geolocation support
    if ("geolocation" in navigator) {
      // Check if the Permissions API is supported
      if ("permissions" in navigator) {
        try {
          const permissionStatus = await navigator.permissions.query({
            name: "geolocation",
          });

          // Handle the permission status
          switch (permissionStatus.state) {
            case "granted":
              // Geolocation was granted
              getAndSetLocation();
              break;
            case "prompt":
              // Geolocation permission needs to be requested
              navigator.geolocation.getCurrentPosition(
                async (position) => {
                  const { latitude: lat, longitude: lon } = position.coords;
                  form.setValue("lat", lat);
                  form.setValue("lon", lon);
                  try {
                    const geodata = await fetchNameLocationFromCoordinates({
                      lat,
                      lon,
                    });

                    // Destructuring the location object to extract necessary fields
                    const { road, neighbourhood, city, county, country } =
                      geodata.location;

                    // Constructing the address string with safe checks
                    const addressParts = [
                      road,
                      neighbourhood,
                      city,
                      county,
                      country,
                    ].filter((part) => part !== undefined); // Filters out undefined parts to avoid "undefined" in the string

                    // Join the parts with a comma and space
                    const address = addressParts.join(", ");

                    // Setting the value in the form
                    form.setValue("location", address);
                  } catch (error) {
                    console.error("Failed to fetch location data:", error);
                    toast.error("Failed to fetch location data");
                  }
                },
                (error) => {
                  console.error("Geolocation access error:", error);
                  toast.error("Unable to access geolocation");
                }
              );
              break;
            case "denied":
              // Geolocation was denied
              toast.error("Geolocation permission has been denied");
              break;
          }
        } catch (error) {
          console.error("Error checking geolocation permission:", error);
          toast.error("Error checking geolocation permission");
        }
      } else {
        // Fallback if Permissions API is not supported
        getAndSetLocation();
      }
    } else {
      // Geolocation is not supported
      toast.error("Geolocation is not supported by this browser");
    }
  };

  // Helper function to get and set location if permission is already granted
  function getAndSetLocation() {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lon } = position.coords;
        form.setValue("lat", lat);
        form.setValue("lon", lon);
        fetchNameLocationFromCoordinates({ lat, lon })
          .then((geodata) => {
            form.setValue("location", geodata.location);
          })
          .catch((error) => {
            console.error("Failed to fetch location data:", error);
            toast.error("Failed to fetch location data");
          });
      },
      (error) => {
        console.error("Error obtaining location:", error);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("User denied the request for Geolocation.");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            toast.error("The request to get user location timed out.");
            break;
          default:
            toast.error("An unknown error occurred.");
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nomenclature: "",
      name: "",
      type: page,
      sex: "unknown",
      date: new Date(),
      responsible: getUserIdByName(user?.name, users),
      includeSubsampleShortened: true,
      custom: {},
    },
  });

  const selectedType = useWatch({ control: form.control, name: "type" });
  const selectedParentId = useWatch({ control: form.control, name: "parentId" });
  const selectedSubsampleType = useWatch({
    control: form.control,
    name: "subsampletype",
  });
  const includeSubsampleShortened = useWatch({
    control: form.control,
    name: "includeSubsampleShortened",
  });
  const selectedGenus = useWatch({ control: form.control, name: "genus" });
  const selectedSpecies = useWatch({ control: form.control, name: "species" });

  // The field list for the chosen type, from its config or a built-in fallback.
  const typeConfig = useMemo(
    () => sampletypes.find((t: any) => t.value === selectedType),
    [sampletypes, selectedType]
  );
  const fields = useMemo(
    () => buildSampleFields(typeConfig || selectedType),
    [typeConfig, selectedType]
  );
  const fieldKeys = useMemo(
    () => new Set(fields.map((f: any) => f.key)),
    [fields]
  );
  const hasTaxonomy = fieldKeys.has("taxonomy");

  type SampleJsonBody = {
    method: string;
    name: any;
    nomenclature: string;
    parentId?: string;
    family: string;
    genus: string;
    species?: string;
    responsible: any;
    type: string;
    date: Date;
    location?: string;
    lat?: number;
    lon?: number;
    sex?: string;
    box?: string;
    slot?: string;
    subsampletype?: string;
    fields?: Record<string, unknown>;
    _id?: number | string;
    notes?: string;
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const method = "create";
    const endpoint = `${prepend_path}/api/samples`;

    try {
      let jsonbody: SampleJsonBody = {
        method: method,
        name: values.name,
        nomenclature: values.nomenclature,
        parentId: values.parentId,
        family: values.family,
        genus: values.genus,
        species: values.species,
        responsible: values.responsible,
        type: values.type,
        date: values.date,
        location: values.location,
        lat: values.lat,
        lon: values.lon,
        sex: values.sex,
        box: values.box,
        slot: values.slot,
        subsampletype: values.subsampletype,
        notes: values.notes,
        fields: values.custom,
      };

      if (id !== undefined) {
        jsonbody = { ...jsonbody, _id: id } as SampleJsonBody;
      }

      if (values.type && values.slot && values.type === "subsample") {
        let slotval = parseInt(values.slot);
        form.setValue("slot", String(slotval + 1));
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonbody),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      toast.success("Sample saved");

      mutate(`${prepend_path}/api/samples`);
    } catch (error) {
      console.error("Error submitting the form", error);
      toast.error("Error!", {
        description: "Error submitting the form. Please try again.",
      });
    }
  }

  async function fetchCoordinates(data: {
    name?: string;
    responsible?: string;
    parentId?: string;
    date: Date;
    type?: string | undefined;
    location?: string | undefined;
    lat?: number | undefined;
    lon?: number | undefined;
  }) {
    const location = data.location;
    const response = await fetch(prepend_path + "/api/geocoding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location }),
    });

    if (response.ok) {
      const geodata = await response.json();
      toast.message(JSON.stringify(geodata.coordinates));
      if (geodata.attribution) {
        toast.info(geodata.attribution);
      }
      return geodata.coordinates;
    } else {
      toast.error("Error fetching coordinates");
    }
  }

  async function useLabLocation() {
    // Get lab info from settings, fall back to defaults if not available
    const labLocation = labInfo?.name + ", " + labInfo?.location;
    const labLat = labInfo?.latitude;
    const labLon = labInfo?.longitude;

    form.setValue("location", labLocation);
    form.setValue("lat", labLat);
    form.setValue("lon", labLon);

    if (!labInfo?.location) {
      toast.warning(
        "Lab location not configured. Please set up lab information in Settings > Main Settings."
      );
    }
  }

  async function fetchNameLocationFromCoordinates(data: {
    lat?: number;
    lon?: number;
  }) {
    const { lat, lon } = data;

    // Check for valid latitude and longitude values
    if (typeof lat !== "number" || typeof lon !== "number") {
      toast.error("Invalid latitude or longitude values.");
      return;
    }

    try {
      const response = await fetch(prepend_path + "/api/reversegeo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon }),
      });

      if (response.ok) {
        const geodata = await response.json();
        // Displaying information as a message; adjust based on your UI framework's capabilities
        toast.message(JSON.stringify(geodata));
        if (geodata.attribution) {
          toast.info(geodata.attribution);
        }
        return geodata;
      } else {
        // It's helpful to log or handle specific response status codes
        switch (response.status) {
          case 400:
            toast.error(
              "Bad Request: The server could not understand the request."
            );
            break;
          case 404:
            toast.error(
              "Not Found: No location data available for the given coordinates."
            );
            break;
          case 500:
            toast.error(
              "Internal Server Error: Something went wrong on the server."
            );
            break;
          default:
            toast.error(
              `Error fetching coordinates: Server responded with status ${response.status}`
            );
            break;
        }
      }
    } catch (error) {
      // Log the error to the console or a monitoring service
      console.error("Failed to fetch location name:", error);
      toast.error("Network error or CORS issue encountered");
    }
  }

  // Name generation uses the shared rules in @/shared/config/sample-names, so
  // the server's taxon-rename regeneration produces identical names.
  const generateNameAnimal = useCallback(
    (form: any) => {
      if (settingsLoading || !idGeneration) return "";
      const values = form.getValues();
      return nextNameFor(
        { genus: values.genus || "", species: values.species || "", type: values.type },
        samples,
        idGeneration
      );
    },
    [samples, idGeneration, settingsLoading]
  );

  const generateNameSubsample = useCallback(
    (form: any, parentname?: string) => {
      const values = form.getValues();

      // Wait for settings to load
      if (settingsLoading || !idGeneration) {
        return ""; // Return empty string while loading
      }

      // If no parent name is provided, return empty string
      if (!parentname) {
        return "";
      }

      let id = parentname;

      // Add subtype identifiers if not an animal sample and checkbox is checked
      if (values.includeSubsampleShortened && values.subsampletype) {
        // Use the configured short code for the subtype if it is a known one,
        // otherwise fall back to the entered text.
        const subsampleConfig = samplesubtypes.find(
          (subtype: { value: string }) => subtype.value === values.subsampletype
        );
        id += "_" + (subsampleConfig?.shortened || values.subsampletype);
      }

      // Get all samples with same parent and subsample type
      const matchingSamples = samples
        .filter(
          (sample: { parentId: any; subsampletype: string }) =>
            sample.parentId === values.parentId &&
            sample.subsampletype === values.subsampletype
        )
        .sort((a: { name: string }, b: { name: string }) => {
          // Extract numbers from names and compare
          const aNum = parseInt(a.name.replace(/.*?(\d+)$/, "$1")) || 0;
          const bNum = parseInt(b.name.replace(/.*?(\d+)$/, "$1")) || 0;
          return aNum - bNum;
        });

      // Use the same numbering strategy as animal samples
      const startingNumber = idGeneration.startingNumber;

      // Find the first available number using the same padding strategy
      const numberPadding = idGeneration.numberPadding;
      const formatNumber = (num: number) =>
        numberPadding > 0
          ? num.toString().padStart(numberPadding, "0")
          : num.toString();

      const existingNames = matchingSamples.map(
        (sample: { name: string }) => sample.name
      );

      let count = startingNumber;
      while (existingNames.includes(id + formatNumber(count))) {
        count++;
      }

      return (id + formatNumber(count)) as string;
    },
    [samples, idGeneration, settingsLoading, samplesubtypes]
  );

  // Regenerate the sample name from whatever identifying fields are set: a
  // parent makes it a subsample-style name, otherwise it is derived from the
  // taxonomy like an animal.
  const regenerateName = useCallback(
    (form: any) => {
      const parentId = form.getValues("parentId");
      if (parentId) {
        const parent = samples.find((s: { _id: any }) => s._id === parentId);
        if (parent) {
          form.setValue("name", generateNameSubsample(form, parent.name));
        }
        return;
      }
      form.setValue("name", generateNameAnimal(form));
    },
    [samples, generateNameSubsample, generateNameAnimal]
  );

  useEffect(() => {
    if (selectedParentId) {
      const parent = samples.find(
        (sample: { _id: any }) => sample._id === selectedParentId
      );
      if (parent) {
        form.setValue("family", parent.family);
        form.setValue("genus", parent.genus);
        form.setValue("species", parent.species);
        form.setValue("nomenclature", `${parent.genus} ${parent.species}`);
        form.setValue("name", generateNameSubsample(form, parent.name));
      } else {
        toast.error("Parent sample not found");
      }
    }
  }, [selectedParentId, form, samples, generateNameSubsample]);

  useEffect(() => {
    if (selectedGenus && selectedSpecies) {
      form.setValue("nomenclature", `${selectedGenus} ${selectedSpecies}`);
    }
  }, [selectedGenus, selectedSpecies, form]);

  useEffect(() => {
    if (selectedSubsampleType && selectedParentId) {
      const parent = samples.find(
        (sample: { _id: any }) => sample._id === selectedParentId
      );
      if (parent) {
        form.setValue("name", generateNameSubsample(form, parent.name));
      } else {
        toast.error("Please select a parent animal sample first");
      }
    }
  }, [
    selectedSubsampleType,
    selectedParentId,
    includeSubsampleShortened,
    form,
    samples,
    generateNameSubsample,
  ]);

  // A type with no taxonomy field carries no species; keep the required
  // taxonomy columns filled so name generation and the schema still work.
  useEffect(() => {
    if (selectedType && !hasTaxonomy) {
      form.setValue("family", "N/A");
      form.setValue("genus", "N/A");
      form.setValue("species", "N/A");
      form.setValue("nomenclature", "N/A");
    }
  }, [selectedType, hasTaxonomy, form]);

  useEffect(() => {
    if (hasTaxonomy && selectedType && selectedGenus && selectedSpecies) {
      form.setValue("name", generateNameAnimal(form));
    }
  }, [
    samples,
    hasTaxonomy,
    selectedType,
    selectedGenus,
    selectedSpecies,
    form,
    generateNameAnimal,
  ]);

  const parentOptions = samples
    .filter((sample: { type: string }) => sample.type === "animal")
    .map((sample: { _id: any; name: any }) => ({
      value: sample._id,
      label: sample.name,
    }));

  function renderField(field: any) {
    if (!field.builtin) {
      return (
        <CustomSampleField
          key={field.key}
          control={form.control}
          field={field}
        />
      );
    }

    switch (field.key) {
      case "taxonomy":
        return (
          <TaxonomicHierarchy
            key="taxonomy"
            values={{
              family: form.watch("family") || "",
              genus: form.watch("genus") || "",
              species: form.watch("species") || "",
            }}
            onChange={(values: {
              family: string;
              genus: string;
              species: string | undefined;
            }) => {
              form.setValue("family", values.family);
              form.setValue("genus", values.genus);
              form.setValue("species", values.species);
              form.setValue(
                "nomenclature",
                `${values.genus} ${values.species}`
              );
              regenerateName(form);
            }}
            onValidated={(
              correctedValues: {
                family: string;
                genus: string;
                species: string | undefined;
              },
              _source: any,
              fullName: string
            ) => {
              form.setValue("family", correctedValues.family);
              form.setValue("genus", correctedValues.genus);
              form.setValue("species", correctedValues.species);
              form.setValue("nomenclature", fullName);
              regenerateName(form);
            }}
            autoCorrect={true}
            disabled={false}
            fieldProps={{}}
          />
        );

      case "parent":
        return (
          <ComboFormBox
            key="parent"
            control={form.control}
            setValue={form.setValue}
            name="parentId"
            options={parentOptions}
            fieldlabel={"Parent sample"}
            description={"Parent sample from which this sample is derived"}
          />
        );

      case "responsible":
        return (
          <ComboFormBox
            key="responsible"
            control={form.control}
            setValue={form.setValue}
            name="responsible"
            options={users.map((u: { _id: any; name: any }) => ({
              value: u._id,
              label: u.name,
            }))}
            fieldlabel={"Responsible"}
            description={""}
          />
        );

      case "sex":
        return (
          <ComboFormBox
            key="sex"
            control={form.control}
            setValue={form.setValue}
            name="sex"
            options={sexOptions}
            fieldlabel={"Sex"}
            description={""}
          />
        );

      case "date":
        return (
          <FormField
            key="date"
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date of collection</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        type="button"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarDays className="ml-auto size-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "location":
        return (
          <div key="location" className="space-y-4">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="City, State"
                      {...field}
                      onBlur={async () => {
                        if (!form.getValues().location) return;
                        const coord = await fetchCoordinates(form.getValues());
                        if (!coord) return;
                        form.setValue("lat", parseFloat(coord.lat));
                        form.setValue("lon", parseFloat(coord.lon));
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Collection location of the sample
                  </FormDescription>
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="lat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input placeholder="0.0" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input placeholder="0.0" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                key="current_loc"
                type="button"
                className="w-full"
                onClick={checkNavigator}
              >
                Current location
              </Button>
              <Button
                key="lab_loc"
                type="button"
                className="w-full"
                onClick={useLabLocation}
              >
                Lab location
              </Button>
            </div>
          </div>
        );

      case "subsampletype":
        return (
          <div
            key="subsampletype"
            className="flex flex-row items-center justify-between space-x-2"
          >
            <FormField
              control={form.control}
              name="subsampletype"
              render={({ field }) => (
                <FormItem className="flex flex-1 flex-col">
                  <FormLabel>Subsample type</FormLabel>
                  <FormControl>
                    <Input type="text" {...field} />
                  </FormControl>
                  <FormDescription>Type of subsample</FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="includeSubsampleShortened"
              render={({ field }) => (
                <FormItem className="flex shrink-0 flex-row items-center gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        regenerateName(form);
                      }}
                    />
                  </FormControl>
                  <FormDescription>In ID</FormDescription>
                </FormItem>
              )}
            />
          </div>
        );

      case "box":
      case "slot":
        return (
          <FormField
            key={field.key}
            control={form.control}
            name={field.key}
            render={({ field: f }) => (
              <FormItem>
                <FormLabel>{field.label}</FormLabel>
                <FormControl>
                  <Input placeholder={field.label} {...f} />
                </FormControl>
              </FormItem>
            )}
          />
        );

      default:
        return null;
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <ComboFormBox
          control={form.control}
          setValue={form.setValue}
          name="type"
          options={sampletypes.map((type: { value: any; label: any }) => ({
            value: type.value,
            label: type.label,
          }))}
          fieldlabel={"Sample type"}
          description={""}
        />

        {fields.map((field: any) => renderField(field))}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Optional notes</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <div className="space-y-4">
              <Separator />
              <FormItem>
                <FormLabel>Sample name / ID</FormLabel>
                <FormControl>
                  <Input type="text" {...field} />
                </FormControl>
                <FormDescription>
                  Unique identifier for the sample
                </FormDescription>
              </FormItem>
            </div>
          )}
        />

        <Button key="submit" type="submit">
          Submit
        </Button>
      </form>
    </Form>
  );
}
