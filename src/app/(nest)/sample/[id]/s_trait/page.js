"use client"

import { dateColumn, editableColumn, fileDownloadColumn, fileUploadColumn, responsibleColumn, sampleColumn, sortableFilterableColumn } from '@/components/tables/columns';
import { DataTable } from '@/components/tables/data-table';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ReloadIcon } from "@radix-ui/react-icons";
import { toast } from "sonner";
import { handleDeleteTrait, handleTraitConversion } from "@/utils/handlers/traitHandlers"; import { Skeleton } from '@/components/ui/skeleton';
import { useSampleData } from '@/hooks/useSampleData';
import { useTraitData } from '@/hooks/useTraitData';
import { useUserData } from '@/hooks/useUserData';
import { getUserNameById } from '@/hooks/userHooks';
import { prepend_path } from "@/lib/utils";
import { handleStatusChangeTrait } from '@/utils/handlers/traitHandlers';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { MdDelete } from 'react-icons/md';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDownIcon } from "@radix-ui/react-icons"

function CrossSectionAnalysisCard({ traits }) {
  const diameterTraits = traits.filter(t => t.type === "diameter");
  const mechanicalTraits = traits.filter(t =>
    ["stressAtBreak", "toughness", "modulus"].includes(t.type)
  );

  // Group mechanical traits by experimentId for experiment-based selection
  const mechanicalExperimentGroups = useMemo(() => {
    const groups = {};
    mechanicalTraits.forEach(trait => {
      const experimentId = trait.experimentId || 'ungrouped';
      if (!groups[experimentId]) {
        groups[experimentId] = [];
      }
      groups[experimentId].push(trait);
    });
    return groups;
  }, [mechanicalTraits]);

  // Individual trait selection for diameter traits (original functionality)
  const [includeTraits, setIncludeTraits] = useState(
    Object.fromEntries(diameterTraits.map(t => [t._id, true]))
  );
  const [compareTraits, setCompareTraits] = useState(
    Object.fromEntries(diameterTraits.map(t => [t._id, false]))
  );

  // Experiment-based selection for mechanical traits
  const [selectedMechanicalExperiments, setSelectedMechanicalExperiments] = useState(
    Object.fromEntries(Object.keys(mechanicalExperimentGroups).map(expId => [expId, true]))
  );

  const [fiberCounts, setFiberCounts] = useState(
    Object.fromEntries(diameterTraits.map(t => [t._id, {
      original: t.nfibres || '',
      new: t.nfibres || ''
    }]))
  );

  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);


  const handleReset = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${prepend_path}/api/traits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: 'reset',
          traits: mechanicalTraits.map(trait => ({
            id: trait._id
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reset values');
      }

      toast.success("Reset completed successfully");
      // Optionally trigger a data refresh here
    } catch (error) {
      console.error('Error resetting values:', error);
      toast.error("Failed to reset values");
    } finally {
      setIsSaving(false);
      setShowConfirmDialog(false);
    }
  };

  const handleSaveConversion = async () => {
    setIsSaving(true);
    try {
      // Only convert mechanical traits from selected experiments
      const selectedMechanicalTraits = mechanicalTraits.filter(trait => {
        const experimentId = trait.experimentId || 'ungrouped';
        return selectedMechanicalExperiments[experimentId];
      });

      const conversionData = {
        oldDiameters: Object.entries(includeTraits)
          .filter(([_, included]) => included)
          .map(([id]) => id),
        newDiameters: Object.entries(compareTraits)
          .filter(([_, included]) => included)
          .map(([id]) => ({
            id,
            fiberCounts: fiberCounts[id]
          })),
        oldCrossSection: totals.included.hasRangeValues ?
          totals.included.area.min :
          totals.included.area,
        newCrossSection: totals.compared.hasRangeValues ?
          totals.compared.area.min :
          totals.compared.area,
        ratio: totals.ratio
      };

      await handleTraitConversion(selectedMechanicalTraits, conversionData);
    } catch (error) {
      console.error('Error saving conversion:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatChanges = () => {
    // Only show changes for mechanical traits from selected experiments
    const selectedMechanicalTraits = mechanicalTraits.filter(trait => {
      const experimentId = trait.experimentId || 'ungrouped';
      return selectedMechanicalExperiments[experimentId];
    });
    
    return selectedMechanicalTraits.map(trait => ({
      type: trait.type,
      experimentId: trait.experimentId || 'No Experiment',
      oldValue: `${trait.measurement.toFixed(3)} ${trait.unit}`,
      newValue: `${(trait.measurement * totals.ratio).toFixed(3)} ${trait.unit}`,
      percentChange: ((totals.ratio - 1) * 100).toFixed(1)
    }));
  };

  function SaveSection() {
    const resetDisabled = !mechanicalTraits.some(t => t.diameterConversion);

    return (
      <>
        <div className="flex flex-col gap-4">
          <div className="flex flex-row gap-2">
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={isSaving || !Object.values(compareTraits).some(v => v)}
            >
              Save Conversion
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowResetDialog(true);
              }}
              disabled={isSaving || resetDisabled}
            >
              Reset to Original
            </Button>
          </div>

          {/* Conversion History */}
          <Collapsible className="border rounded-lg p-2">
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <span>Conversion History</span>
              <ChevronDownIcon className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="space-y-2">
                {mechanicalTraits.map(trait =>
                  trait.diameterConversion ? (
                    <div key={trait._id} className="border rounded p-2 text-sm">
                      <div className="font-medium capitalize">{trait.type}</div>
                      <div className="text-muted-foreground">
                        <div>Date: {new Date(trait.diameterConversion.date).toLocaleString()}</div>
                        <div>Cross-section: {trait.diameterConversion.oldCrossSection.toFixed(3)} → {trait.diameterConversion.newCrossSection.toFixed(3)}</div>
                        <div>Ratio: {trait.diameterConversion.ratio.toFixed(3)}</div>
                      </div>
                    </div>
                  ) : null
                )}
                {!mechanicalTraits.some(t => t.diameterConversion) && (
                  <div className="text-muted-foreground text-sm">No previous conversions</div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Reset Confirmation Dialog */}
        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Conversion</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset all mechanical properties and experiment data to their original values.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReset}
                disabled={isSaving}
                className="bg-destructive text-destructive-foreground"
              >
                {isSaving ? (
                  <>
                    <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset Values'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Save Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Conversion</AlertDialogTitle>
              <AlertDialogDescription>
                <div className="space-y-4">
                  <p>The following changes will be applied:</p>

                  <div className="border rounded-lg p-2 bg-muted/50">
                    <p className="font-medium mb-2">Cross-section Change</p>
                    <p>From: {totals.included.hasRangeValues ?
                      totals.included.area.min.toFixed(3) :
                      totals.included.area.toFixed(3)} {totals.units.area}
                    </p>
                    <p>To: {totals.compared.hasRangeValues ?
                      totals.compared.area.min.toFixed(3) :
                      totals.compared.area.toFixed(3)} {totals.units.area}
                    </p>
                    <p className="mt-1 text-sm">Scale factor: {totals.ratio.toFixed(3)}</p>
                  </div>

                  <div className="border rounded-lg p-2">
                    <p className="font-medium mb-2">Property Changes</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Property</TableHead>
                          <TableHead>Experiment</TableHead>
                          <TableHead>Current</TableHead>
                          <TableHead>New</TableHead>
                          <TableHead>Change</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formatChanges().map((change, i) => (
                          <TableRow key={i}>
                            <TableCell className="capitalize">{change.type}</TableCell>
                            <TableCell>{change.experimentId}</TableCell>
                            <TableCell>{change.oldValue}</TableCell>
                            <TableCell>{change.newValue}</TableCell>
                            <TableCell>{change.percentChange}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  try {
                    await handleSaveConversion();
                    toast.success("Conversion saved successfully");
                    setShowConfirmDialog(false);
                  } catch (error) {
                    console.error('Error saving conversion:', error);
                    toast.error("Failed to save conversion");
                  }
                }}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Confirm Changes'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }



  if (!diameterTraits || diameterTraits.length === 0) {
    return null;
  }

  const calculateTotals = () => {
    const calculateArea = (selectedTraits) => {
      let totalArea = { single: 0, min: 0, avg: 0, max: 0 };
      let hasRangeValues = false;
    
      diameterTraits.forEach(trait => {
        if (!selectedTraits[trait._id] || !trait.crossSection || trait.crossSection.error) return;
    
        // Only apply fiber count ratio for comparison values, not for selected values
        const fiberCountRatio = selectedTraits === compareTraits && 
          fiberCounts[trait._id].original && 
          fiberCounts[trait._id].new ? 
          parseInt(fiberCounts[trait._id].new) / parseInt(fiberCounts[trait._id].original) : 1;
    
        if (trait.crossSection.area.single !== undefined) {
          const adjustedArea = trait.crossSection.area.single * fiberCountRatio;
          totalArea.single += adjustedArea;
          totalArea.min += adjustedArea;
          totalArea.avg += adjustedArea;
          totalArea.max += adjustedArea;
        } else if (trait.crossSection.area.min !== undefined) {
          hasRangeValues = true;
          totalArea.min += trait.crossSection.area.min * fiberCountRatio;
          totalArea.avg += trait.crossSection.area.avg * fiberCountRatio;
          totalArea.max += trait.crossSection.area.max * fiberCountRatio;
        }
      });
    
      return { totalArea, hasRangeValues };
    };

    const calculateEquivDiameter = (area) => 2 * Math.sqrt(area / Math.PI);

    const included = calculateArea(includeTraits);
    const compared = calculateArea(compareTraits);

    const unit = diameterTraits[0]?.crossSection?.unit || 'unit²';
    const linearUnit = unit.replace('²', '');

    // Calculate scaling ratio for mechanical properties
    const includedValue = included.hasRangeValues ? included.totalArea.avg : included.totalArea.single;
    const comparedValue = compared.hasRangeValues ? compared.totalArea.avg : compared.totalArea.single;
    const ratio = comparedValue === 0 ? 1 : includedValue / comparedValue;

    return {
      included: {
        area: included.hasRangeValues ? included.totalArea : included.totalArea.single,
        diameter: included.hasRangeValues ? {
          min: calculateEquivDiameter(included.totalArea.min),
          avg: calculateEquivDiameter(included.totalArea.avg),
          max: calculateEquivDiameter(included.totalArea.max)
        } : calculateEquivDiameter(included.totalArea.single),
        hasRangeValues: included.hasRangeValues
      },
      compared: {
        area: compared.hasRangeValues ? compared.totalArea : compared.totalArea.single,
        diameter: compared.hasRangeValues ? {
          min: calculateEquivDiameter(compared.totalArea.min),
          avg: calculateEquivDiameter(compared.totalArea.avg),
          max: calculateEquivDiameter(compared.totalArea.max)
        } : calculateEquivDiameter(compared.totalArea.single),
        hasRangeValues: compared.hasRangeValues
      },
      units: { area: unit, diameter: linearUnit },
      ratio
    };
  };

  const totals = calculateTotals();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cross Section Analysis</CardTitle>
        <CardDescription>
          Select measurements to include in calculations. Use comparison column to calculate adjusted mechanical properties.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Diameter Traits Table - Individual trait selection */}
          <div>
            <h3 className="text-lg font-medium mb-4">Diameter Measurements</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Measurement</TableHead>
                  <TableHead>Current Fibers</TableHead>
                  <TableHead>New Fibers</TableHead>
                  <TableHead className="w-[100px]">Include</TableHead>
                  <TableHead className="w-[100px]">Compare</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diameterTraits.map((trait) => (
                  <TableRow
                    key={trait._id}
                    className={cn(
                      !includeTraits[trait._id] && !compareTraits[trait._id] && "opacity-50 bg-muted",
                      compareTraits[trait._id] && "bg-green-200 dark:bg-green-900"
                    )}
                  >
                    <TableCell>{trait.silktype || 'Unknown'}</TableCell>
                    <TableCell>{trait.equipment}</TableCell>
                    <TableCell>
                      {trait.measurement} {trait.unit} (n={trait.nfibres})
                      {trait.crossSection?.area && (
                        <div className="text-sm text-muted-foreground">
                          {trait.crossSection.area.single !== undefined &&
                            `${trait.crossSection.area.single.toFixed(3)} ${trait.crossSection.unit}`
                          }
                          {trait.crossSection.area.min !== undefined &&
                            `${trait.crossSection.area.avg.toFixed(3)} (${trait.crossSection.area.min.toFixed(3)}-${trait.crossSection.area.max.toFixed(3)}) ${trait.crossSection.unit}`
                          }
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={fiberCounts[trait._id]?.original || ''}
                        onChange={(e) => setFiberCounts(prev => ({
                          ...prev,
                          [trait._id]: { ...prev[trait._id], original: e.target.value }
                        }))}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={fiberCounts[trait._id]?.new || ''}
                        onChange={(e) => setFiberCounts(prev => ({
                          ...prev,
                          [trait._id]: { ...prev[trait._id], new: e.target.value }
                        }))}
                        className="w-20"
                        disabled={!compareTraits[trait._id]}
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={includeTraits[trait._id] || false}
                        onCheckedChange={(checked) => {
                          setIncludeTraits(prev => ({
                            ...prev,
                            [trait._id]: checked
                          }));
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={compareTraits[trait._id] || false}
                        onCheckedChange={(checked) => {
                          setCompareTraits(prev => ({
                            ...prev,
                            [trait._id]: checked
                          }));
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mechanical Experiments Selection */}
          {Object.keys(mechanicalExperimentGroups).length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-4">Select Experiments to Convert</h3>
              <div className="border rounded-lg p-4 bg-muted/50">
                <p className="text-sm text-muted-foreground mb-4">
                  Select which experiments should have their mechanical properties converted based on the diameter changes above.
                </p>
                <div className="space-y-3">
                  {Object.entries(mechanicalExperimentGroups).map(([experimentId, traits]) => (
                    <div key={experimentId} className="flex items-center space-x-3 p-3 border rounded bg-background">
                      <Checkbox
                        checked={selectedMechanicalExperiments[experimentId] || false}
                        onCheckedChange={(checked) => {
                          setSelectedMechanicalExperiments(prev => ({
                            ...prev,
                            [experimentId]: checked
                          }));
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-medium">
                          {experimentId !== 'ungrouped' ? experimentId : 'No Experiment'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Properties: {traits.map(t => t.type).join(', ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg border p-4 bg-muted/50 space-y-4">
            {/* Total Areas and Equivalent Diameters */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Measurement</TableHead>
                  <TableHead>Selected Value</TableHead>
                  <TableHead>Comparison Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Total Area</TableCell>
                  <TableCell>
                    {totals.included.hasRangeValues ?
                      `${totals.included.area.avg.toFixed(3)} (${totals.included.area.min.toFixed(3)}-${totals.included.area.max.toFixed(3)})` :
                      totals.included.area.toFixed(3)
                    } {totals.units.area}
                  </TableCell>
                  <TableCell>
                    {totals.compared.area.single === 0 ? "-" :
                      totals.compared.hasRangeValues ?
                        `${totals.compared.area.avg.toFixed(3)} (${totals.compared.area.min.toFixed(3)}-${totals.compared.area.max.toFixed(3)})` :
                        totals.compared.area.toFixed(3)
                    } {totals.units.area}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Equivalent Diameter</TableCell>
                  <TableCell>
                    {totals.included.hasRangeValues ?
                      `${totals.included.diameter.avg.toFixed(3)} (${totals.included.diameter.min.toFixed(3)}-${totals.included.diameter.max.toFixed(3)})` :
                      totals.included.diameter.toFixed(3)
                    } {totals.units.diameter}
                  </TableCell>
                  <TableCell>
                    {totals.compared.area.single === 0 ? "-" :
                      totals.compared.hasRangeValues ?
                        `${totals.compared.diameter.avg.toFixed(3)} (${totals.compared.diameter.min.toFixed(3)}-${totals.compared.diameter.max.toFixed(3)})` :
                        totals.compared.diameter.toFixed(3)
                    } {totals.units.diameter}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {/* Mechanical Properties */}
            {mechanicalTraits.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Experiment</TableHead>
                    <TableHead>Original Value</TableHead>
                    <TableHead>Adjusted Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mechanicalTraits
                    .filter(trait => {
                      const experimentId = trait.experimentId || 'ungrouped';
                      return selectedMechanicalExperiments[experimentId];
                    })
                    .map((trait, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium capitalize">
                        {trait.type}
                      </TableCell>
                      <TableCell>
                        {trait.experimentId || 'No Experiment'}
                      </TableCell>
                      <TableCell>
                        {trait.measurement.toFixed(3)} {trait.unit}
                      </TableCell>
                      <TableCell>
                        {totals.compared.area.single === 0 ? "-" :
                          `${(trait.measurement * totals.ratio).toFixed(3)} ${trait.unit}`
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <SaveSection />

      </CardFooter>
    </Card>
  );
}

export default function IDTraitPage() {
  const pathname = usePathname();
  const pathSegments = pathname.split('/');
  const sampleId = pathSegments[pathSegments.length - 2];
  const { samplesData, samplesError } = useSampleData(prepend_path);
  const { traitsData, traitsError } = useTraitData(prepend_path);
  const { usersData } = useUserData(prepend_path);
  const [filteredData, setFilteredData] = useState([]);
  const [filteredChildrenData, setFilteredChildrenData] = useState([]);

  useEffect(() => {
    if (samplesData) {
      const filtered = samplesData.filter((sample) => sample._id === sampleId);
      setFilteredData(filtered);

      const childrens = samplesData.filter((sample) => sample.parentId === sampleId);
      setFilteredChildrenData(childrens);
    }
  }, [samplesData, sampleId]);


  const isLoading = !samplesData || !traitsData;
  const hasErrors = samplesError || traitsError;
  let filteredTraits = traitsData?.filter((trait) => trait.sampleId === sampleId);
  let childrenTraits = traitsData?.filter((trait) => filteredChildrenData.map((child) => child._id).includes(trait.sampleId));
  // add responsibleName to childrenTraits and filteredTraits
  if (childrenTraits) {
    childrenTraits = childrenTraits.map((trait) => {
      const responsibleName = getUserNameById(trait.responsible, usersData)
      return {
        ...trait,
        responsibleName: responsibleName
      }
    });
  }
  if (filteredTraits) {
    filteredTraits = filteredTraits.map((trait) => {
      const responsibleName = getUserNameById(trait.responsible, usersData)
      return {
        ...trait,
        responsibleName: responsibleName
      }
    });
  }

  


  // add sampleName to the traits
  if (filteredTraits && samplesData) {
    filteredTraits = filteredTraits.map((trait) => {
      const sample = samplesData.find((sample) => sample._id === trait.sampleId);
      return {
        ...trait,
        sampleName: sample?.name,
        sampleType: sample?.subsampletype,
      };
    });
  }
  if (childrenTraits && samplesData) {
    childrenTraits = childrenTraits.map((trait) => {
      const sample = samplesData.find((sample) => sample._id === trait.sampleId);
      return {
        ...trait,
        sampleName: sample?.name,
        sampleType: sample?.subsampletype,
      };
    });
  }

  const traitColumns = [
    sampleColumn("sampleId", "sampleName", "Sample"),
    sortableFilterableColumn("type", "Type", "equals"),
    responsibleColumn(),
    editableColumn("subsampletype", "Trait Subsample Type"),
    {
      accessorKey: "sampleType",
      header: "Sample Subsample Type",
    },
    dateColumn(),
    editableColumn("notes", "Notes"),
    editableColumn("measurement", "Measurement"),
    editableColumn("unit", "Unit"),
    editableColumn("std", "Standard Deviation"),
    editableColumn("listvals", "List of Values"),
    fileUploadColumn(),
    fileDownloadColumn(),
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
                  <AlertDialogAction onClick={() => handleDeleteTrait(trait._id)}>Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

        )
      },
    },
  ];

  if (isLoading) {
    return <Skeleton className="h-[500px] w-[1000px] rounded-xl" />;
  }

  if (hasErrors) {
    return <div>Error loading data</div>;
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/samples">
                  Samples
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/sample/${sampleId}`}>
                  {filteredData[0]?.name}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/sample/${sampleId}/s_trait`}>Sample traits
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex max-w-2xl mx-auto gap-4">
          <CrossSectionAnalysisCard traits={filteredTraits} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>
              Traits for sample {filteredData[0]?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={traitColumns} data={filteredTraits} onStatusChange={handleStatusChangeTrait}
            ></DataTable>
          </CardContent>
        </Card >
        <Card>
          <CardHeader>
            <CardTitle>
              Traits for subsamples of {filteredData[0]?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={traitColumns} data={childrenTraits} onStatusChange={handleStatusChangeTrait}
            ></DataTable>
          </CardContent>
        </Card >
      </div >
    </div >
  );
}
