"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface IdGenerationConfig {
  combinations: [number, number][];
  defaultGenusLength: number;
  defaultSpeciesLength: number;
  startingNumber: number;
  useCollisionAvoidance: boolean;
  numberPadding: number;
}

interface MainSettings {
  idGeneration: IdGenerationConfig;
  labInfo: {
    name: string;
    location: string;
    latitude?: number;
    longitude?: number;
  };
}

const formSchema = z.object({
  // ID Generation settings
  defaultGenusLength: z.number().min(1).max(10),
  defaultSpeciesLength: z.number().min(1).max(10),
  startingNumber: z.number().min(1),
  useCollisionAvoidance: z.boolean(),
  numberPadding: z.number().min(0).max(5),

  // Lab Info settings
  labName: z.string().min(1, "Lab name is required"),
  labLocation: z.string().min(1, "Lab location is required"),
  labLatitude: z.number().optional(),
  labLongitude: z.number().optional(),
});

export default function MainSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [combinationPairs, setCombinationPairs] = useState<[number, number][]>([
    [3, 3],
    [3, 4],
    [3, 5],
  ]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      defaultGenusLength: 3,
      defaultSpeciesLength: 3,
      startingNumber: 1,
      useCollisionAvoidance: true,
      numberPadding: 0,
      labName: "",
      labLocation: "",
      labLatitude: undefined,
      labLongitude: undefined,
    },
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const settings = result.data as MainSettings;

          // Set ID generation form values
          form.setValue(
            "defaultGenusLength",
            settings.idGeneration?.defaultGenusLength
          );
          form.setValue(
            "defaultSpeciesLength",
            settings.idGeneration?.defaultSpeciesLength
          );
          form.setValue(
            "startingNumber",
            settings.idGeneration?.startingNumber
          );
          form.setValue(
            "useCollisionAvoidance",
            settings.idGeneration?.useCollisionAvoidance ?? true
          );
          form.setValue(
            "numberPadding",
            settings.idGeneration?.numberPadding
          );

          // Set lab info form values
          form.setValue("labName", settings.labInfo?.name || "");
          form.setValue("labLocation", settings.labInfo?.location || "");
          form.setValue("labLatitude", settings.labInfo?.latitude);
          form.setValue("labLongitude", settings.labInfo?.longitude);

          // Set combination pairs
          if (settings.idGeneration?.combinations) {
            setCombinationPairs(settings.idGeneration.combinations);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const settings: MainSettings = {
        idGeneration: {
          combinations: combinationPairs,
          defaultGenusLength: values.defaultGenusLength,
          defaultSpeciesLength: values.defaultSpeciesLength,
          startingNumber: values.startingNumber,
          useCollisionAvoidance: values.useCollisionAvoidance,
          numberPadding: values.numberPadding,
        },
        labInfo: {
          name: values.labName,
          location: values.labLocation,
          latitude: values.labLatitude,
          longitude: values.labLongitude,
        },
      };

      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success("Settings saved successfully!");
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const addCombinationPair = () => {
    setCombinationPairs([...combinationPairs, [3, 3]]);
  };

  const updateCombinationPair = (
    index: number,
    genusLen: number,
    speciesLen: number
  ) => {
    const newPairs = [...combinationPairs];
    newPairs[index] = [genusLen, speciesLen];
    setCombinationPairs(newPairs);
  };

  const removeCombinationPair = (index: number) => {
    if (combinationPairs.length > 1) {
      setCombinationPairs(combinationPairs.filter((_, i) => i !== index));
    }
  };

  const resetToDefaults = () => {
    setCombinationPairs([
      [3, 3],
      [3, 4],
      [3, 5],
    ]);
    form.reset({
      defaultGenusLength: 3,
      defaultSpeciesLength: 3,
      startingNumber: 1,
      useCollisionAvoidance: true,
      numberPadding: 0,
    });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Main Settings</h1>
        <Button onClick={fetchSettings} disabled={loading} variant="outline">
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Sample ID Generation Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Sample ID Generation</CardTitle>
              <CardDescription>
                Configure how sample IDs are automatically generated from genus
                and species names
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Default lengths */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="defaultGenusLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Genus Length</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Number of characters from genus name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="defaultSpeciesLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Species Length</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Number of characters from species name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* Numbering settings */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startingNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Starting Number</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        First number to use for new samples
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numberPadding"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number Padding</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="5"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Zero-pad numbers (0 = no padding, 2 = 01, 02, etc.)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Collision avoidance */}
              <FormField
                control={form.control}
                name="useCollisionAvoidance"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Collision Avoidance
                      </FormLabel>
                      <FormDescription>
                        Automatically try different length combinations to avoid
                        ID conflicts
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Combination pairs */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-medium">
                    Length combinations for collision avoidance
                  </Label>
                  <div className="space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCombinationPair}
                    >
                      Add Combination
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={resetToDefaults}
                    >
                      Reset to Defaults
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2">
                  {combinationPairs.map((pair, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 p-2 border rounded"
                    >
                      <Label className="min-w-fit">Genus:</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={pair[0]}
                        onChange={(e) =>
                          updateCombinationPair(
                            index,
                            parseInt(e.target.value),
                            pair[1]
                          )
                        }
                        className="w-20"
                      />
                      <Label className="min-w-fit">Species:</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={pair[1]}
                        onChange={(e) =>
                          updateCombinationPair(
                            index,
                            pair[0],
                            parseInt(e.target.value)
                          )
                        }
                        className="w-20"
                      />
                      <div className="flex-1 text-sm text-muted-foreground">
                        Example: &quot;Tegenaria ferruginea&quot; → &quot;
                        {"Tegenaria".slice(0, pair[0])}
                        {"ferruginea".slice(0, pair[1])}&quot;
                      </div>
                      {combinationPairs.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeCombinationPair(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Lab Information Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Lab Information</CardTitle>
              <CardDescription>
                Configure your laboratory information for default location
                settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="labName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lab Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>Name of your laboratory</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="labLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lab Location</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      Address or description of lab location
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="labLatitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lab Latitude</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription>GPS latitude coordinate</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="labLongitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lab Longitude</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        GPS longitude coordinate
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
            >
              Reset Form
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
