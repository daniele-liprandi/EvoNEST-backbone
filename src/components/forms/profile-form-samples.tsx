"use client";

import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";

import { ComboFormBox } from "@/components/forms/combo-form-box";

import { useCallback } from "react";

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUserIdByName } from "@/hooks/userHooks";
import { prepend_path } from "@/lib/utils";
import { useConfigTypes } from "@/hooks/useConfigTypes";
import { useMainSettings } from "@/hooks/useMainSettings";
import { useWatch } from "react-hook-form";
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
  fibretype: z.string().optional(),
  notes: z.string().optional(),
});

const sexOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "unknown", label: "Unknown" },
];

export function ProfileFormSamples({
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
  // Fetching sample types and subsample types from the config
  const {
    sampletypes,
    samplesubtypes,
    loading: configLoading,
  } = useConfigTypes();

  // Fetching main settings for ID generation
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
      type:
        page === "subsample"
          ? "subsample"
          : page === "animal"
          ? "animal"
          : page === "artificial"
          ? "artificial"
          : "",
      sex: "unknown",
      date: new Date(),
      responsible: getUserIdByName(user?.name, users),
    },
  });

  const selectedType = useWatch({
    control: form.control,
    name: "type",
  });

  const selectedParentId = useWatch({
    control: form.control,
    name: "parentId",
  });

  const selectedSubsampleType = useWatch({
    control: form.control,
    name: "subsampletype",
  });

  const includeSubsampleShortened = useWatch({
    control: form.control,
    name: "includeSubsampleShortened",
  });

  const selectedGenus = useWatch({
    control: form.control,
    name: "genus",
  });

  const selectedSpecies = useWatch({
    control: form.control,
    name: "species",
  });

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

      toast.success("Submitted!", {
        description: (
          <code className="text-white">{JSON.stringify(values, null, 2)}</code>
        ),
      });

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

  // Unified ID generation function that uses settings
  const generateBaseID = useCallback(
    (genus: string, species: string, sampleType: string) => {
      // Wait for settings to load
      if (settingsLoading || !idGeneration) {
        return null; // Return null while loading
      }

      const combinations = idGeneration.combinations;

      // Function to generate base ID with variable lengths
      const generateBaseId = (genusLen: number, speciesLen: number) => {
        const genusPrefix = genus.slice(0, Math.min(genusLen, genus.length));
        const speciesPrefix = species.slice(
          0,
          Math.min(speciesLen, species.length)
        );
        return genusPrefix + speciesPrefix;
      };

      // Check if base ID has collision with different genus/species combinations
      const hasCollisionWithDifferentSpecies = (baseId: string) => {
        return samples.some((sample: any) => {
          if (sample.type !== sampleType) return false;
          if (sample.genus === genus && sample.species === species)
            return false; // Same species, not a collision

          // Extract the base part of the sample name (without numbers)
          const sampleBasePart = sample.name.replace(/\d+$/, "");
          return sampleBasePart === baseId;
        });
      };

      // Find the first combination that doesn't have collisions
      for (const [genusLen, speciesLen] of combinations) {
        const candidateId = generateBaseId(genusLen, speciesLen);
        if (!hasCollisionWithDifferentSpecies(candidateId)) {
          return candidateId;
        }
      }
    },
    [samples, idGeneration, settingsLoading]
  );

  const generateIDanimal = useCallback(
    (form: any, parentname?: string) => {
      const values = form.getValues();
      const genus = values.genus || "";
      const species = values.species || "";

      // Wait for settings to load
      if (settingsLoading || !idGeneration) {
        return ""; // Return empty string while loading
      }

      const baseId = generateBaseID(genus, species, "animal");
      if (!baseId) return "";

      // Get all existing samples with same genus, species, and type
      const existingNames = samples
        .filter(
          (sample: { genus: any; species: any; type: string }) =>
            sample.genus === genus &&
            sample.species === species &&
            sample.type === values.type
        )
        .map((sample: { name: string }) => sample.name);

      // Find the first available number
      const startingNumber = idGeneration.startingNumber;
      const numberPadding = idGeneration.numberPadding;
      const formatNumber = (num: number) =>
        numberPadding > 0
          ? num.toString().padStart(numberPadding, "0")
          : num.toString();

      let count = startingNumber;
      while (existingNames.includes(baseId + formatNumber(count))) {
        count++;
      }

      return (baseId + formatNumber(count)) as string;
    },
    [samples, idGeneration, settingsLoading, generateBaseID]
  );

  const generateIDsubsample = useCallback(
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
        // Find the subsample type configuration to get the shortened version
        const subsampleConfig = samplesubtypes.find(
          (subtype) => subtype.value === values.subsampletype
        );

        if (subsampleConfig && subsampleConfig.shortened) {
          id += "_" + subsampleConfig.shortened;
        }
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
    [samples, idGeneration, settingsLoading, generateBaseID, samplesubtypes]
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
        const id = generateIDsubsample(form, parent.name);
        form.setValue("name", id);
      } else {
        toast.error("Parent sample not found");
      }
    }
  }, [selectedParentId, form, samples, generateIDsubsample]);

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
        const id = generateIDsubsample(form, parent.name);
        form.setValue("name", id);
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
    generateIDsubsample,
  ]);

  useEffect(() => {
    if (selectedType === "artificial") {
      form.setValue("family", "N/A");
      form.setValue("genus", "N/A");
      form.setValue("species", "N/A");
      form.setValue("nomenclature", "N/A");
    }
  }, [selectedType, form]);

  
  useEffect(() => {
    if (selectedType && selectedGenus && selectedSpecies) {
      const id = generateIDanimal(form);
      form.setValue("name", id);
    }
  }, [samples, selectedType, selectedGenus, selectedSpecies, form, generateIDanimal]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Tabs
          defaultValue={
            page === "subsample"
              ? "details"
              : page === "animal"
              ? "details"
              : "general"
          }
          className="w-auto"
        >
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            {selectedType === "animal" && (
              <TabsTrigger value="animal">Animal</TabsTrigger>
            )}
            {selectedType !== "animal" && (
              <TabsTrigger value="subsample">{selectedType}</TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="general" className="flex flex-col space-y-4">
            <ComboFormBox
              control={form.control}
              setValue={form.setValue}
              name="type"
              options={sampletypes.map((type) => ({
                value: type.value,
                label: type.label,
              }))}
              fieldlabel={"Sample type"}
              description={""}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Optional notes</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      placeholder=" "
                      rows={3}
                      style={{
                        width: "100%",
                        resize: "vertical",
                        minHeight: "60px",
                        padding: "8px 8px 8px 8px", // Top, Right, Bottom, Left padding
                        boxSizing: "border-box",
                        border: "1px solid #ccc",
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <ComboFormBox
              control={form.control}
              setValue={form.setValue}
              name="responsible"
              options={users.map((user: { _id: any; name: any }) => ({
                value: user._id,
                label: user.name,
              }))}
              fieldlabel={"Responsible"}
              description={""}
            />
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
                      className="w-5/6"
                      onBlur={async () => {
                        if (!form.getValues().location) return;
                        var coord = await fetchCoordinates(form.getValues());
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
            <div className="grid grid-cols-2 space-y-1">
              <FormField
                control={form.control}
                name="lat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input placeholder="0.0" {...field} className="w-5/6" />
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
                      <Input placeholder="0.0" {...field} className="w-5/6" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                key="current_loc"
                type="button"
                className="w-2/3"
                onClick={checkNavigator}
              >
                Current location
              </Button>
              <Button
                key="lab_loc"
                type="button"
                className="w-2/3"
                onClick={useLabLocation}
              >
                Lab location
              </Button>
            </div>

            <FormField
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
                            "w-[240px] pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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
            <ComboFormBox
              control={form.control}
              setValue={form.setValue}
              name="parentId"
              options={samples
                .filter((sample: { type: string }) => sample.type === "animal")
                .map((sample: { _id: any; name: any }) => ({
                  value: sample._id,
                  label: sample.name,
                }))}
              fieldlabel={"Parent Sample"}
              description={""}
            />
          </TabsContent>
          <TabsContent value="animal" className="space-y-4">
            <FormField
              control={form.control}
              name="family"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Family</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter family name"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        const id = generateIDanimal(form);
                        form.setValue("name", id);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="genus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Genus</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter genus name"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        const id = generateIDanimal(form);
                        form.setValue("name", id);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="species"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Species</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter species name"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        const id = generateIDanimal(form);
                        form.setValue("name", id);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ComboFormBox
              control={form.control}
              setValue={form.setValue}
              name="sex"
              options={sexOptions.map(
                (sexOption: { value: any; label: any }) => ({
                  value: sexOption.value,
                  label: sexOption.label,
                })
              )}
              fieldlabel={"Sex"}
              description={""}
            />
          </TabsContent>
          <TabsContent value="subsample" className="space-y-4">
            <ComboFormBox
              control={form.control}
              setValue={form.setValue}
              name="parentId"
              options={samples
                .filter((sample: { type: string }) => sample.type === "animal")
                .map((sample: { _id: any; name: any }) => ({
                  value: sample._id,
                  label: sample.name,
                }))}
              fieldlabel={"Parent Sample"}
              description={
                "Parent sample from which the current sample is derived"
              }
            />
            <FormField
              control={form.control}
              name="family"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Family</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter family name"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        const id = generateIDanimal(form);
                        form.setValue("name", id);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="genus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Genus</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter genus name"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        const id = generateIDanimal(form);
                        form.setValue("name", id);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="species"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Species</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter species name"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        const id = generateIDanimal(form);
                        form.setValue("name", id);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-row items-center space-x-2 justify-between">
              <FormField
                control={form.control}
                name="subsampletype"
                render={({ field }) => (
                  <FormItem className="flex flex-col w-4/6">
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
                  <FormItem className="flex flex-row items-center space-x-2 w-1/6">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          // Regenerate ID when checkbox changes
                          if (selectedParentId) {
                            const parent = samples.find(
                              (sample: { _id: any }) =>
                                sample._id === selectedParentId
                            );
                            if (parent) {
                              const id = generateIDsubsample(form, parent.name);
                              form.setValue("name", id);
                            }
                          }
                        }}
                      />
                    </FormControl>
                    <FormDescription className="text-sm mb-2 pb-2">
                      In ID
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2">
              <FormField
                control={form.control}
                name="box"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Box</FormLabel>
                    <FormControl>
                      <Input placeholder="Box" {...field} className="w-1/2" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slot"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slot</FormLabel>
                    <FormControl>
                      <Input placeholder="Slot" {...field} className="w-1/2" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>
          <TabsContent value="artificial" className="space-y-4">
            <FormField
              control={form.control}
              name="fibretype"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fibre type</FormLabel>
                  <FormControl>
                    <Input type="text" className="w-5/6" {...field} />
                  </FormControl>
                  <FormDescription>Type of artificial fibre</FormDescription>
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <div>
              {/* Horizontal black line */}
              <hr style={{ border: "1px solid black", margin: "10px 0" }} />

              {/* Form field */}
              <FormItem>
                <FormLabel>Sample Name/ID</FormLabel>
                <FormControl>
                  <Input type="text" className="w-5/6" {...field} />
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
