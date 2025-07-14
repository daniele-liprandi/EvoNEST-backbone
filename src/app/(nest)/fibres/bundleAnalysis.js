"use client";

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Import shadcn/ui components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

// Dynamically import Plotly to ensure it only loads on the client side
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function FibreBundleAnalysis() {
    // State for fibre inputs
    const [fibreTypes, setFibreTypes] = useState([
        { name: 'Fibre Type 1', numFibres: '', diameter: '', stressAtBreak: '', strainAtBreak: '' },
        { name: 'Fibre Type 2', numFibres: '', diameter: '', stressAtBreak: '', strainAtBreak: '' },
        { name: 'Fibre Type 3', numFibres: '', diameter: '', stressAtBreak: '', strainAtBreak: '' },
    ]);

    // State for plots and calculations
    const [plotData, setPlotData] = useState({
        loadStrainPlot: [],
        stressStrainPlot: [],
        summary: null,
    });

    // Handle input changes
    const handleInputChange = (index, field, value) => {
        const newFibreTypes = [...fibreTypes];
        newFibreTypes[index][field] = value;
        setFibreTypes(newFibreTypes);
    };

    // Calculate load-strain and stress-strain curves
    const calculateCurves = () => {
        // Parse and validate input data
        const fibreData = fibreTypes
            .filter(fibre =>
                fibre.numFibres && fibre.diameter && fibre.stressAtBreak && fibre.strainAtBreak
            )
            .map(fibre => ({
                numFibres: parseInt(fibre.numFibres),
                diameter: parseFloat(fibre.diameter),
                area: Math.PI * Math.pow(parseFloat(fibre.diameter) / 2, 2),
                stressAtBreak: parseFloat(fibre.stressAtBreak),
                strainAtBreak: parseFloat(fibre.strainAtBreak),
                name: fibre.name
            }));

        if (fibreData.length === 0) return;

        // Calculate maximum strain among all fibre types
        const maxStrain = Math.max(...fibreData.map(fibre => fibre.strainAtBreak)) + 0.1;

        // Create strain range
        const strainPoints = 1000;
        const strainRange = Array.from({ length: strainPoints }, (_, i) => i * maxStrain / (strainPoints - 1));

        // Calculate total bundle area
        const totalArea = fibreData.reduce((sum, fibre) => sum + fibre.numFibres * fibre.area, 0);

        // Initialize total load array
        const totalLoad = new Array(strainPoints).fill(0);

        // Individual fibre loads for plotting
        const fibreLoads = fibreData.map(fibre => {
            // Calculate load at each strain point
            const load = strainRange.map((strain, i) => {
                if (strain <= fibre.strainAtBreak) {
                    // Linear relationship up to breaking strain
                    const stiffness = fibre.stressAtBreak / fibre.strainAtBreak;
                    return fibre.numFibres * fibre.area * stiffness * strain * 1e-6;
                } else {
                    // After breaking strain, load is zero
                    return 0;
                }
            });

            // Add to total load
            totalLoad.forEach((_, i) => {
                totalLoad[i] += load[i];
            });

            return {
                x: strainRange,
                y: load,
                type: 'scatter',
                mode: 'lines',
                name: fibre.name,
            };
        });

        // Calculate stress (load/area)
        const stress = totalLoad.map(load => load * 1e6 / totalArea);

        // Add total load to plot data
        const loadStrainPlot = [
            ...fibreLoads,
            {
                x: strainRange,
                y: totalLoad,
                type: 'scatter',
                mode: 'lines',
                name: 'Total Bundle',
                line: {
                    dash: 'dash',
                    width: 3,
                    color: 'black',
                },
            },
        ];

        // Stress-strain plot data
        const stressStrainPlot = [
            {
                x: strainRange,
                y: stress,
                type: 'scatter',
                mode: 'lines',
                name: 'Bundle Stress',
                line: {
                    color: 'blue',
                    width: 2,
                },
            },
        ];

        // Summary statistics
        const totalFibres = fibreData.reduce((sum, fibre) => sum + fibre.numFibres, 0);

        // Set plot data state
        setPlotData({
            loadStrainPlot,
            stressStrainPlot,
            summary: {
                totalFibres,
                totalArea,
                fibreData,
            },
        });
    };

    // Layout for load-strain plot
    const loadStrainLayout = {
        title: 'Load vs Strain',
        xaxis: { title: 'Strain' },
        yaxis: { title: 'Load (N)' },
        autosize: true,
        height: 400,
        margin: { l: 50, r: 50, b: 50, t: 50, pad: 4 },
        grid: { rows: 1, columns: 1 },
    };

    // Layout for stress-strain plot
    const stressStrainLayout = {
        title: 'Stress vs Strain',
        xaxis: { title: 'Strain' },
        yaxis: { title: 'Stress (GPa)' },
        autosize: true,
        height: 400,
        margin: { l: 50, r: 50, b: 50, t: 50, pad: 4 },
        grid: { rows: 1, columns: 1 },
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Simple Linear Fibre Bundle Analysis</CardTitle>
                    <CardDescription>
                        Generate the load-strain and stress-strain curves for a simple linear fibre bundle, using Hooke&apos;s linear elasticity laws.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fibre Type</TableHead>
                                    <TableHead>Number of Fibres</TableHead>
                                    <TableHead>Diameter (μm)</TableHead>
                                    <TableHead>Stress at Break (GPa)</TableHead>
                                    <TableHead>Strain at Break</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fibreTypes.map((fibre, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{fibre.name}</TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                value={fibre.numFibres}
                                                onChange={(e) => handleInputChange(index, 'numFibres', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                value={fibre.diameter}
                                                onChange={(e) => handleInputChange(index, 'diameter', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                value={fibre.stressAtBreak}
                                                onChange={(e) => handleInputChange(index, 'stressAtBreak', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                value={fibre.strainAtBreak}
                                                onChange={(e) => handleInputChange(index, 'strainAtBreak', e.target.value)}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <div className="flex justify-end">
                            <Button onClick={calculateCurves}>Calculate</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {plotData.summary && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>Load-Strain Curve</CardTitle>
                        </CardHeader>
                        <CardContent className="h-96">
                            <Plot
                                data={plotData.loadStrainPlot}
                                layout={loadStrainLayout}
                                useResizeHandler={true}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Stress-Strain Curve</CardTitle>
                        </CardHeader>
                        <CardContent className="h-96">
                            <Plot
                                data={plotData.stressStrainPlot}
                                layout={stressStrainLayout}
                                useResizeHandler={true}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Summary Statistics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-lg">Total Number of Fibres: {plotData.summary.totalFibres}</p>
                                    <p className="text-lg">Total Bundle Area: {plotData.summary.totalArea.toFixed(2)} μm²</p>
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    {plotData.summary.fibreData.map((fibre, index) => (
                                        <Card key={index}>
                                            <CardHeader>
                                                <CardTitle className="text-lg">{fibre.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <p>Number of Fibres: {fibre.numFibres}</p>
                                                        <p>Diameter: {fibre.diameter} μm</p>
                                                    </div>
                                                    <div>
                                                        <p>Area per Fibre: {fibre.area.toFixed(1)} μm²</p>
                                                        <p>Total Area: {(fibre.numFibres * fibre.area).toFixed(1)} μm²</p>
                                                    </div>
                                                    <div>
                                                        <p>Percentage of Bundle: {((fibre.numFibres * fibre.area / plotData.summary.totalArea) * 100).toFixed(2)}%</p>
                                                        <p>Stress at Break: {fibre.stressAtBreak} GPa</p>
                                                        <p>Strain at Break: {fibre.strainAtBreak}</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}