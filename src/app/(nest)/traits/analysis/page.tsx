"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  sortableFilterableColumn,
  sortableFilterableNumericColumn,
} from "@/components/tables/columns";
import { DataTable } from "@/components/tables/data-table";
import { useConfigTypes } from "@/hooks/useConfigTypes";
import {
  useTraitAnalysis,
  AnalysisRequest,
  AnalysisFilters,
} from "@/hooks/useTraitAnalysis";

// Function to generate columns based on groupBy selection
const getAnalysisColumns = (groupBy: string) => {
  const baseColumns = [sortableFilterableColumn("name", "Name")];

  // Add subsample type column for fullSpeciesSubsampletype grouping
  if (groupBy === "fullSpeciesSubsampletype") {
    baseColumns.push(
      sortableFilterableColumn("sampleSubTypes", "Sample Sub Type")
    );
  }

  // Add statistical columns
  baseColumns.push(
    sortableFilterableNumericColumn("mean", "Mean"),
    sortableFilterableNumericColumn("stddev", "Standard deviation"),
    sortableFilterableNumericColumn("min", "Min"),
    sortableFilterableNumericColumn("max", "Max"),
    sortableFilterableNumericColumn("median", "Median"),
    sortableFilterableNumericColumn("count", "Count")
  );

  return baseColumns;
};

const selectOptions = [
  {
    value: "fullSpeciesSubsampletype",
    label: "Full species + subsample type",
    secondary: "All selected full species with subsample types",
  },
  {
    value: "fullSpecies",
    label: "All full species (genus + species)",
    secondary: "All selected full species",
  },
  { value: "all", label: "Sum of all", secondary: "Sum of all selected" },
  {
    value: "family",
    label: "All families",
    secondary: "All selected families",
  },
  { value: "genus", label: "All genera", secondary: "All selected genera" },
  { value: "species", label: "All species", secondary: "All selected species" },
  {
    value: "sampleSubTypes",
    label: "All sample subtypes",
    secondary: "All selected sample subtypes",
  },
];

export default function TraitAnalysisPage() {
  // Use the backend-driven hook
  const {
    data,
    loading,
    error,
    filterOptions,
    fetchAnalysis,
    fetchFilterOptions,
  } = useTraitAnalysis();
  const { traittypes, samplesubtypes } = useConfigTypes();
  // State for UI controls
  const [selectedTrait, setSelectedTrait] = useState(traittypes[0].value);
  const [selectedGroupBy, setSelectedGroupBy] = useState<
    | "all"
    | "family"
    | "genus"
    | "species"
    | "fullSpecies"
    | "sampleSubTypes"
    | "fullSpeciesSubsampletype"
  >("fullSpeciesSubsampletype");
  // Filter states
  const [selectedSampleSubtypes, setSelectedSampleSubtypes] = useState<
    Set<string>
  >(new Set());
  const [selectedNFibres, setSelectedNFibres] = useState<Set<string>>(
    new Set()
  );

  // Filter activation states
  const [sampleSubtypesActive, setSampleSubtypesActive] =
    useState<boolean>(true);
  const [nfibresActive, setNFibresActive] = useState<boolean>(true);

  // Debounced analysis function to prevent excessive API calls
  const [analysisTimer, setAnalysisTimer] = useState<NodeJS.Timeout | null>(
    null
  );
  const performAnalysis = useCallback(() => {
    const filters: AnalysisFilters = {};

    if (selectedSampleSubtypes.size > 0 && sampleSubtypesActive) {
      filters.sampleSubtypes = Array.from(selectedSampleSubtypes);
    }

    if (selectedNFibres.size > 0 && nfibresActive) {
      filters.nfibres = Array.from(selectedNFibres);
    }

    const request: AnalysisRequest = {
      traitType: selectedTrait,
      groupBy: selectedGroupBy,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      unitConversion: true,
    };

    fetchAnalysis(request);
  }, [
    selectedTrait,
    selectedGroupBy,
    selectedSampleSubtypes,
    selectedNFibres,
    sampleSubtypesActive,
    nfibresActive,
    fetchAnalysis,
  ]);

  // Debounced effect to prevent rapid API calls
  useEffect(() => {
    if (analysisTimer) {
      clearTimeout(analysisTimer);
    }

    const timer = setTimeout(() => {
      performAnalysis();
    }, 300); // 300ms debounce

    setAnalysisTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [performAnalysis]);

  // Load filter options on mount
  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  const handleTraitChange = (value: string) => {
    setSelectedTrait(value);
  };

  const handleGroupByChange = (value: string) => {
    setSelectedGroupBy(value as any);
  };

  const handleSampleSubtypeChange = (
    subtypeValue: string,
    checked: boolean
  ) => {
    const newSet = new Set(selectedSampleSubtypes);
    if (checked) {
      newSet.add(subtypeValue);
    } else {
      newSet.delete(subtypeValue);
    }
    setSelectedSampleSubtypes(newSet);
  };
  const handleNFibresChange = (nfibreValue: string, checked: boolean) => {
    const newSet = new Set(selectedNFibres);
    if (checked) {
      newSet.add(nfibreValue);
    } else {
      newSet.delete(nfibreValue);
    }
    setSelectedNFibres(newSet);
  };
  const selectAllSampleSubtypes = () => {
    const allTypes = new Set(samplesubtypes.map((subtype) => subtype.value));
    allTypes.add("__NOT_DECLARED__");
    setSelectedSampleSubtypes(allTypes);
  };
  const selectAllNFibres = () => {
    if (filterOptions?.nfibres) {
      const allNFibres = new Set(filterOptions.nfibres);
      allNFibres.add("__NOT_DECLARED__");
      setSelectedNFibres(allNFibres);
    }
  };

  const clearSampleSubtypes = () => {
    setSelectedSampleSubtypes(new Set());
  };

  const clearNFibres = () => {
    setSelectedNFibres(new Set());
  };

  const toggleSampleSubtypesActive = () => {
    setSampleSubtypesActive(!sampleSubtypesActive);
  };

  const toggleNFibresActive = () => {
    setNFibresActive(!nfibresActive);
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="h-4 w-[250px]" />
      <Skeleton className="h-4 w-[200px]" />
      <Skeleton className="h-32 w-full" />
    </div>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <div className="flex flex-col sm:gap-4 sm:py-2 sm:pl-5 sm:pr-5">
        <Card>
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Trait Analysis</CardTitle>
              <CardDescription>
                Analyze sample traits with advanced filtering and grouping
                capabilities.
                {loading && (
                  <Badge variant="secondary" className="ml-2">
                    Processing...
                  </Badge>
                )}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>Error: {error}</AlertDescription>
              </Alert>
            )}

            {/* Main Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Trait Selection */}
              <div className="space-y-2">
                <Label htmlFor="trait-select">Select Trait</Label>
                <Select value={selectedTrait} onValueChange={handleTraitChange}>
                  <SelectTrigger id="trait-select">
                    <SelectValue placeholder="Select a trait" />
                  </SelectTrigger>
                  <SelectContent>
                    {traittypes.map((trait) => (
                      <SelectItem key={trait.value} value={trait.value}>
                        {trait.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Group By Selection */}
              <div className="space-y-2">
                <Label htmlFor="groupby-select">Group By</Label>
                <Select
                  value={selectedGroupBy}
                  onValueChange={handleGroupByChange}
                >
                  <SelectTrigger id="groupby-select">
                    <SelectValue placeholder="Select grouping" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Filters Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Filters</h3>
                <div className="flex gap-2">
                  {selectedSampleSubtypes.size > 0 && sampleSubtypesActive && (
                    <Badge variant="secondary">
                      {selectedSampleSubtypes.size} subtypes
                    </Badge>
                  )}
                  {selectedSampleSubtypes.size > 0 && !sampleSubtypesActive && (
                    <Badge variant="outline">
                      {selectedSampleSubtypes.size} subtypes (inactive)
                    </Badge>
                  )}
                  {selectedNFibres.size > 0 && nfibresActive && (
                    <Badge variant="secondary">
                      {selectedNFibres.size} fibre counts
                    </Badge>
                  )}
                  {selectedNFibres.size > 0 && !nfibresActive && (
                    <Badge variant="outline">
                      {selectedNFibres.size} fibre counts (inactive)
                    </Badge>
                  )}
                </div>
              </div>
              {/* Sample Subtype Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">
                      Sample Subtypes
                    </Label>
                    <Button
                      size="sm"
                      variant={sampleSubtypesActive ? "default" : "outline"}
                      onClick={toggleSampleSubtypesActive}
                    >
                      {sampleSubtypesActive ? "Active" : "Inactive"}
                    </Button>
                  </div>
                  <div className="space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={selectAllSampleSubtypes}
                    >
                      Select All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearSampleSubtypes}
                      disabled={selectedSampleSubtypes.size === 0}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-40 rounded-md border p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {samplesubtypes.map((subtype) => (
                      <div
                        key={subtype.value}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`subtype-${subtype.value}`}
                          checked={selectedSampleSubtypes.has(subtype.value)}
                          onCheckedChange={(checked) =>
                            handleSampleSubtypeChange(subtype.value, !!checked)
                          }
                          disabled={!sampleSubtypesActive}
                        />
                        <Label
                          htmlFor={`subtype-${subtype.value}`}
                          className={`text-sm cursor-pointer ${
                            !sampleSubtypesActive ? "text-muted-foreground" : ""
                          }`}
                        >
                          {subtype.label}
                        </Label>
                      </div>
                    ))}
                    {/* Special "Not declared" option */}
                    <div className="flex items-center space-x-2 col-span-full border-t pt-2 mt-2">
                      <Checkbox
                        id="silk-not-declared"
                        checked={selectedSampleSubtypes.has("__NOT_DECLARED__")}
                        onCheckedChange={(checked) =>
                          handleSampleSubtypeChange(
                            "__NOT_DECLARED__",
                            !!checked
                          )
                        }
                        disabled={!sampleSubtypesActive}
                      />
                      <Label
                        htmlFor="silk-not-declared"
                        className={`text-sm cursor-pointer font-medium ${
                          !sampleSubtypesActive
                            ? "text-muted-foreground"
                            : "text-amber-700"
                        }`}
                      >
                        Not declared / Empty
                      </Label>
                    </div>
                  </div>
                </ScrollArea>
              </div>
              {/* NFibres Filter */}
              {filterOptions?.nfibres && filterOptions.nfibres.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">
                        Number of Fibres
                      </Label>
                      <Button
                        size="sm"
                        variant={nfibresActive ? "default" : "outline"}
                        onClick={toggleNFibresActive}
                      >
                        {nfibresActive ? "Active" : "Inactive"}
                      </Button>
                    </div>
                    <div className="space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={selectAllNFibres}
                      >
                        Select All
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={clearNFibres}
                        disabled={selectedNFibres.size === 0}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-32 rounded-md border p-4">
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                      {filterOptions.nfibres.map((nfibre) => (
                        <div
                          key={nfibre}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`nfibre-${nfibre}`}
                            checked={selectedNFibres.has(nfibre)}
                            onCheckedChange={(checked) =>
                              handleNFibresChange(nfibre, !!checked)
                            }
                            disabled={!nfibresActive}
                          />
                          <Label
                            htmlFor={`nfibre-${nfibre}`}
                            className={`text-sm cursor-pointer ${
                              !nfibresActive ? "text-muted-foreground" : ""
                            }`}
                          >
                            {nfibre}
                          </Label>
                        </div>
                      ))}
                      {/* Special "Not declared" option */}
                      <div className="flex items-center space-x-2 col-span-full border-t pt-2 mt-2">
                        <Checkbox
                          id="nfibre-not-declared"
                          checked={selectedNFibres.has("__NOT_DECLARED__")}
                          onCheckedChange={(checked) =>
                            handleNFibresChange("__NOT_DECLARED__", !!checked)
                          }
                          disabled={!nfibresActive}
                        />
                        <Label
                          htmlFor="nfibre-not-declared"
                          className={`text-sm cursor-pointer font-medium ${
                            !nfibresActive
                              ? "text-muted-foreground"
                              : "text-amber-700"
                          }`}
                        >
                          Not declared / Empty
                        </Label>
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              )}{" "}
            </div>

            <Separator />

            {/* Results Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Results</h3>
                {data?.metadata && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {data.metadata.filteredTraits} /{" "}
                      {data.metadata.totalTraits} traits
                    </Badge>
                    <Badge variant="outline">
                      {data.metadata.processingTime}
                    </Badge>
                    {data.unit && (
                      <Badge variant="secondary">Units: {data.unit}</Badge>
                    )}
                  </div>
                )}
              </div>

              {loading ? (
                <LoadingSkeleton />
              ) : data?.results ? (
                <DataTable
                  columns={getAnalysisColumns(selectedGroupBy)}
                  data={data.results}
                  onDelete={null}
                  onEdit={null}
                  onIncrement={null}
                  onStatusChange={null}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No data available. Try adjusting your filters.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
