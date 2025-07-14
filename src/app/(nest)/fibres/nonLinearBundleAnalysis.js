// pages/non-linear-fibre-bundle-analysis.js
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
import { Slider } from "@/components/ui/slider";
import * as XLSX from 'xlsx';
import { MdDownload } from 'react-icons/md';
import { Download, Upload } from 'lucide-react';

// Dynamically import Plotly to ensure it only loads on the client side
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function NonLinearFibreBundleAnalysis() {
    // State for fibre inputs
    const [fibreTypes, setFibreTypes] = useState([
        {
            name: 'Fibre Type 1',
            numFibres: '2',
            diameter: '',
            stressAtBreak: '',
            strainAtBreak: '',
            referenceDiameter: '1.0',
            humidityValue: '50'
        },
        {
            name: 'Fibre Type 2',
            numFibres: '2',
            diameter: '',
            stressAtBreak: '',
            strainAtBreak: '',
            referenceDiameter: '1.0',
            humidityValue: '50'
        },
        {
            name: 'Fibre Type 3',
            numFibres: '2',
            diameter: '',
            stressAtBreak: '',
            strainAtBreak: '',
            referenceDiameter: '1.0',
            humidityValue: '50'
        },
    ]);

    // Add to your existing useState declarations
    const [importData, setImportData] = useState("");
    const [showImportModal, setShowImportModal] = useState(false);
    const [importType, setImportType] = useState("csv"); // Options: csv, json

    // State for hyperelastic model parameters
    const [hyperelasticParams, setHyperelasticParams] = useState({
        alpha1: 1.0,    // Initial stiffness parameter
        alpha2: 0.3,    // Post-yield slope (softening region)
        alpha3: 1.2,    // Strain-hardening parameter (quadratic)
        alpha4: 1.2,    // Strain-hardening parameter (cubic)
        yieldPoint: 0.2, // Normalized strain at which yielding begins
        hardPoint: 0.4,  // Normalized strain at which hardening begins
    });

    // State for humidity effect parameters
    const [humidityParams, setHumidityParams] = useState({
        referenceHumidity: 50,    // %RH reference point
        strainCoefficient: 0.005, // Strain increase per %RH
        stressCoefficient: 0.002, // Stress decrease per %RH
        stiffnessCoefficient: 0.005 // Stiffness decrease per %RH
    });

    const [weibullParams, setWeibullParams] = useState({
        weibullShape: 75,
        scalingExponent: -0.25
    });

    // State for plots and calculations
    const [plotData, setPlotData] = useState({
        loadStrainPlot: [],
        stressStrainPlot: [],
        weibullDistributionPlot: [],
        summary: null,
    });

    // Handle input changes
    const handleInputChange = (index, field, value) => {
        const newFibreTypes = [...fibreTypes];
        newFibreTypes[index][field] = value;
        setFibreTypes(newFibreTypes);
    };

    // Handle hyperelastic parameter changes
    const handleParamChange = (param, value) => {
        setHyperelasticParams(prev => ({
            ...prev,
            [param]: value
        }));
    };

    // Handle humidity parameter changes
    const handleHumidityParamChange = (param, value) => {
        setHumidityParams(prev => ({
            ...prev,
            [param]: value
        }));
    };

    /* -------------------------------------------------------------------------- */
    /*                                Import Export                               */
    /* -------------------------------------------------------------------------- */

    // Function to handle CSV data import
    const handleCSVImport = (csvText) => {
        try {
            const lines = csvText.trim().split('\n');
            const headers = lines[0].split(',').map(h => h.trim());

            // Find column indices
            const nameIdx = headers.findIndex(h => h.toLowerCase().includes('name') || h.toLowerCase().includes('type'));
            const numFibresIdx = headers.findIndex(h => h.toLowerCase().includes('num') || h.toLowerCase().includes('count'));
            const diameterIdx = headers.findIndex(h => h.toLowerCase().includes('diameter'));
            const stressIdx = headers.findIndex(h => h.toLowerCase().includes('stress'));
            const strainIdx = headers.findIndex(h => h.toLowerCase().includes('strain'));
            const refDiameterIdx = headers.findIndex(h => h.toLowerCase().includes('ref'));
            const humidityIdx = headers.findIndex(h => h.toLowerCase().includes('humid'));

            if ([nameIdx, numFibresIdx, diameterIdx, stressIdx, strainIdx].includes(-1)) {
                alert("CSV format not recognized. Please check the template.");
                return;
            }

            // Parse data rows
            const newFibreTypes = [];
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim() === '') continue;

                const values = lines[i].split(',').map(v => v.trim());
                newFibreTypes.push({
                    name: values[nameIdx] || `Fibre Type ${i}`,
                    numFibres: values[numFibresIdx] || '1',
                    diameter: values[diameterIdx] || '',
                    stressAtBreak: values[stressIdx] || '',
                    strainAtBreak: values[strainIdx] || '',
                    referenceDiameter: values[refDiameterIdx !== -1 ? refDiameterIdx : diameterIdx] || '1.0',
                    humidityValue: values[humidityIdx] || '50'
                });
            }

            if (newFibreTypes.length > 0) {
                setFibreTypes(newFibreTypes);
                setShowImportModal(false);
            } else {
                alert("No valid data rows found in the CSV.");
            }
        } catch (error) {
            alert("Error processing CSV: " + error.message);
        }
    };

    // Function to handle JSON import
    const handleJSONImport = (jsonText) => {
        try {
            const data = JSON.parse(jsonText);

            if (Array.isArray(data)) {
                // Check if it's an array of fibre types
                const newFibreTypes = data.map(item => ({
                    name: item.name || item.type || "Fibre Type",
                    numFibres: item.numFibres || item.count || "1",
                    diameter: item.diameter || "",
                    stressAtBreak: item.stressAtBreak || item.stress || "",
                    strainAtBreak: item.strainAtBreak || item.strain || "",
                    referenceDiameter: item.referenceDiameter || item.refDiameter || "1.0",
                    humidityValue: item.humidityValue || item.humidity || "50"
                }));

                setFibreTypes(newFibreTypes);
            } else if (data.fibreTypes) {
                // Check if it's an object with fibreTypes array
                setFibreTypes(data.fibreTypes);

                // If it has hyperelasticParams, import those too
                if (data.hyperelasticParams) setHyperelasticParams(data.hyperelasticParams);
                if (data.humidityParams) setHumidityParams(data.humidityParams);
                if (data.weibullParams) setWeibullParams(data.weibullParams);
            } else {
                alert("JSON format not recognized. Please check the template.");
                return;
            }

            setShowImportModal(false);
        } catch (error) {
            alert("Error processing JSON: " + error.message);
        }
    };

    // Function to process import based on selected type
    const processImport = () => {
        if (!importData.trim()) {
            alert("Please enter data to import.");
            return;
        }

        if (importType === "csv") {
            handleCSVImport(importData);
        } else if (importType === "json") {
            handleJSONImport(importData);
        }
    };

    // Function to export data as CSV
    const exportAsCSV = () => {
        const headers = ["Name", "Number of Fibres", "Diameter (μm)", "Stress at Break (GPa)",
            "Strain at Break", "Reference Diameter (μm)", "Humidity (%RH)"];

        let csvContent = headers.join(",") + "\n";

        fibreTypes.forEach(fibre => {
            const row = [
                fibre.name,
                fibre.numFibres,
                fibre.diameter,
                fibre.stressAtBreak,
                fibre.strainAtBreak,
                fibre.referenceDiameter,
                fibre.humidityValue
            ];
            csvContent += row.join(",") + "\n";
        });

        downloadFile(csvContent, "fibre_data.csv", "text/csv");
    };

    // Function to export results as Excel
    // Function to export results as Excel
    const exportResults = () => {
        if (!plotData.summary) {
            alert("Please calculate results first.");
            return;
        }

        // Create a new workbook
        const wb = XLSX.utils.book_new();

        // Add fibre parameters sheet
        const fibreData = fibreTypes.map(fibre => ({
            'Name': fibre.name,
            'Number of Fibres': fibre.numFibres,
            'Diameter (μm)': fibre.diameter,
            'Stress at Break (GPa)': fibre.stressAtBreak,
            'Strain at Break': fibre.strainAtBreak,
            'Reference Diameter (μm)': fibre.referenceDiameter,
            'Humidity (%RH)': fibre.humidityValue
        }));
        const fibreSheet = XLSX.utils.json_to_sheet(fibreData);
        XLSX.utils.book_append_sheet(wb, fibreSheet, "Fibre Parameters");

        // Add model parameters sheet
        const paramData = [
            // Hyperelastic parameters
            { Parameter: 'alpha1 (Initial Stiffness)', Value: hyperelasticParams.alpha1 },
            { Parameter: 'alpha2 (Yield Region)', Value: hyperelasticParams.alpha2 },
            { Parameter: 'alpha3 (Strain Hardening)', Value: hyperelasticParams.alpha3 },
            { Parameter: 'alpha4 (Strain Hardening)', Value: hyperelasticParams.alpha4 },
            { Parameter: 'Yield Point', Value: hyperelasticParams.yieldPoint },
            { Parameter: 'Hardening Point', Value: hyperelasticParams.hardPoint },
            // Humidity parameters
            { Parameter: 'Reference Humidity (%RH)', Value: humidityParams.referenceHumidity },
            { Parameter: 'Strain Coefficient', Value: humidityParams.strainCoefficient },
            { Parameter: 'Stress Coefficient', Value: humidityParams.stressCoefficient },
            { Parameter: 'Stiffness Coefficient', Value: humidityParams.stiffnessCoefficient },
            // Weibull parameters
            { Parameter: 'Weibull Shape', Value: weibullParams.weibullShape },
            { Parameter: 'Scaling Exponent', Value: weibullParams.scalingExponent }
        ];
        const paramSheet = XLSX.utils.json_to_sheet(paramData);
        XLSX.utils.book_append_sheet(wb, paramSheet, "Model Parameters");

        // Add plot data sheet - prepare data for plotting
        if (plotData.loadStrainPlot && plotData.loadStrainPlot.length > 0) {
            // Extract strain values (x-axis)
            const strainValues = plotData.loadStrainPlot[0].x;

            // First, collect all the raw data without cumulative energy
            const rawPlotDataRows = strainValues.map((strain, index) => {
                const dataRow = { 'Strain': strain };

                // Add stress value
                if (plotData.stressStrainPlot && plotData.stressStrainPlot[0]) {
                    dataRow['Stress (GPa)'] = plotData.stressStrainPlot[0].y[index];
                }

                // Add individual fibre loads and total load
                plotData.loadStrainPlot.forEach((loadSeries, seriesIndex) => {
                    if (seriesIndex < plotData.loadStrainPlot.length - 1) {
                        // Individual fibre type
                        dataRow[`${loadSeries.name} Load (N)`] = loadSeries.y[index];
                    } else {
                        // Total bundle (last series)
                        dataRow['Total Load (N)'] = loadSeries.y[index];
                    }
                });

                return dataRow;
            });

            // Now calculate cumulative energy in a separate pass
            let cumulativeEnergy = 0;
            const plotDataRows = rawPlotDataRows.map((dataRow, index) => {
                if (index > 0) {
                    const prevStrain = rawPlotDataRows[index - 1]['Strain'];
                    const prevLoad = rawPlotDataRows[index - 1]['Total Load (N)'];
                    const currentLoad = dataRow['Total Load (N)'];
                    const deltaStrain = dataRow['Strain'] - prevStrain;

                    // Incremental energy (μJ)
                    const incrementalEnergy = 0.5 * (prevLoad + currentLoad) * deltaStrain * 1e6;

                    // Add to cumulative energy
                    cumulativeEnergy += incrementalEnergy;
                }

                // Add cumulative energy to the data row
                return {
                    ...dataRow,
                    'Cumulative Energy (μJ)': cumulativeEnergy
                };
            });

            const plotSheet = XLSX.utils.json_to_sheet(plotDataRows);
            XLSX.utils.book_append_sheet(wb, plotSheet, "Plot Data");
        }

        // Add summary results sheet
        const summaryData = [
            { Metric: 'Total Bundle Area (μm²)', Value: plotData.summary.totalArea },
            { Metric: 'Maximum Load (μN)', Value: plotData.summary.maxLoad },
            { Metric: 'Strain at Max Load', Value: plotData.summary.strainAtMaxLoad },
            { Metric: 'Energy to Break (μJ)', Value: plotData.summary.energyToBreak }
        ];

        // Add per-fibre summaries
        plotData.summary.fibreData.forEach((fibre, index) => {
            summaryData.push(
                { Metric: `${fibre.name} - Number of Fibres`, Value: fibre.numFibres },
                { Metric: `${fibre.name} - Diameter (μm)`, Value: fibre.diameter },
                { Metric: `${fibre.name} - Area per Fibre (μm²)`, Value: fibre.area },
                { Metric: `${fibre.name} - Total Area (μm²)`, Value: fibre.numFibres * fibre.area },
                { Metric: `${fibre.name} - Bundle Percentage (%)`, Value: (fibre.numFibres * fibre.area / plotData.summary.totalArea) * 100 },
                { Metric: `${fibre.name} - Base Stress at Break (GPa)`, Value: fibre.stressAtBreak / (fibre.humidityEffects.stressScaleFactor) },
                { Metric: `${fibre.name} - Adjusted Stress (GPa)`, Value: fibre.stressAtBreak },
                { Metric: `${fibre.name} - Base Strain at Break`, Value: fibre.strainAtBreak / fibre.humidityEffects.strainScaleFactor },
                { Metric: `${fibre.name} - Adjusted Strain`, Value: fibre.strainAtBreak }
            );
        });

        const summarySheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summarySheet, "Results Summary");

        // Create Excel file and trigger download
        XLSX.writeFile(wb, "fibre_bundle_analysis.xlsx");
    };

    // Function to export configuration only as Excel
    const exportConfig = () => {
        // Create a new workbook
        const wb = XLSX.utils.book_new();

        // Add fibre parameters sheet
        const fibreData = fibreTypes.map(fibre => ({
            'Name': fibre.name,
            'Number of Fibres': fibre.numFibres,
            'Diameter (μm)': fibre.diameter,
            'Stress at Break (GPa)': fibre.stressAtBreak,
            'Strain at Break': fibre.strainAtBreak,
            'Reference Diameter (μm)': fibre.referenceDiameter,
            'Humidity (%RH)': fibre.humidityValue
        }));
        const fibreSheet = XLSX.utils.json_to_sheet(fibreData);
        XLSX.utils.book_append_sheet(wb, fibreSheet, "Fibre Parameters");

        // Add model parameters sheet
        const paramData = [
            // Hyperelastic parameters
            { Parameter: 'alpha1 (Initial Stiffness)', Value: hyperelasticParams.alpha1 },
            { Parameter: 'alpha2 (Yield Region)', Value: hyperelasticParams.alpha2 },
            { Parameter: 'alpha3 (Strain Hardening)', Value: hyperelasticParams.alpha3 },
            { Parameter: 'alpha4 (Strain Hardening)', Value: hyperelasticParams.alpha4 },
            { Parameter: 'Yield Point', Value: hyperelasticParams.yieldPoint },
            { Parameter: 'Hardening Point', Value: hyperelasticParams.hardPoint },
            // Humidity parameters
            { Parameter: 'Reference Humidity (%RH)', Value: humidityParams.referenceHumidity },
            { Parameter: 'Strain Coefficient', Value: humidityParams.strainCoefficient },
            { Parameter: 'Stress Coefficient', Value: humidityParams.stressCoefficient },
            { Parameter: 'Stiffness Coefficient', Value: humidityParams.stiffnessCoefficient },
            // Weibull parameters
            { Parameter: 'Weibull Shape', Value: weibullParams.weibullShape },
            { Parameter: 'Scaling Exponent', Value: weibullParams.scalingExponent }
        ];
        const paramSheet = XLSX.utils.json_to_sheet(paramData);
        XLSX.utils.book_append_sheet(wb, paramSheet, "Model Parameters");

        // Create Excel file and trigger download
        XLSX.writeFile(wb, "fibre_bundle_config.xlsx");
    };

    // Helper function to download a file
    const downloadFile = (content, fileName, contentType) => {
        const a = document.createElement("a");
        const file = new Blob([content], { type: contentType });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    // Function to handle file upload
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            setImportData(e.target.result);
        };

        if (file.name.endsWith('.csv')) {
            setImportType("csv");
            reader.readAsText(file);
        } else if (file.name.endsWith('.json')) {
            setImportType("json");
            reader.readAsText(file);
        } else {
            alert("Please upload a CSV or JSON file.");
        }
    };

    /* -------------------------------------------------------------------------- */
    /*                                  Mechanics                                 */
    /* -------------------------------------------------------------------------- */

    // Function to generate Weibull-distributed breaking strains
    const generateWeibullStrains = (medianStrain, shape, count) => {
        // Weibull scale parameter calculation from median
        const scale = medianStrain / Math.pow(Math.log(2), 1 / shape);

        // Generate array of breaking strains
        return Array.from({ length: count }, () => {
            // Generate uniform random number between 0 and 1
            const u = Math.random();
            // Transform to Weibull distribution
            return scale * Math.pow(-Math.log(1 - u), 1 / shape);
        });
    };

    // Humidity effect on silk properties
    const calculateHumidityEffect = (humidity) => {
        // Parameters based on silk literature
        // Humidity significantly affects spider silk mechanical properties
        // References:
        // - Yazawa et al. (2020), "Simultaneous effect of strain rate and humidity on the structure and mechanical behavior of spider silk"

        const { referenceHumidity, strainCoefficient, stressCoefficient, stiffnessCoefficient } = humidityParams;

        // Effect on strain at break (increases with humidity)
        const strainScaleFactor = 1 + strainCoefficient * (humidity - referenceHumidity);

        // Effect on stress at break (decreases with humidity)
        const stressScaleFactor = 1 - stressCoefficient * (humidity - referenceHumidity);

        // Effect on stiffness (decreases with humidity)
        const stiffnessScaleFactor = 1 - stiffnessCoefficient * (humidity - referenceHumidity);

        return { strainScaleFactor, stressScaleFactor, stiffnessScaleFactor };
    };

    // Diameter effect on strength based on Weibull statistics
    const calculateDiameterEffect = (diameter, referenceDiameter) => {
        // Based on Weibull statistics, smaller diameters have fewer defects
        return Math.pow(diameter / referenceDiameter, weibullParams.scalingExponent);
    };

    // Calculate hyperelastic stress with silk-like behavior
    const calculateHyperelasticStress = (strain, strainAtBreak, stressAtBreak, alphas) => {
        // Normalized strain
        const normalizedStrain = strain / strainAtBreak;

        // Calculate transition stresses to ensure continuity
        const yieldStress = alphas.alpha1 * alphas.yieldPoint;
        const hardPointStress = yieldStress + alphas.alpha2 * (alphas.hardPoint - alphas.yieldPoint);

        // Determine which region of the stress-strain curve we're in
        if (normalizedStrain < alphas.yieldPoint) {
            // Region I: Initial stiff response (pre-yield)
            return stressAtBreak * (normalizedStrain * alphas.alpha1);
        } else if (normalizedStrain < alphas.hardPoint) {
            // Region II: Softening after yield point (entropic unfolding)
            return stressAtBreak * (
                yieldStress +
                alphas.alpha2 * (normalizedStrain - alphas.yieldPoint)
            );
        } else {
            // Region III & IV: Stiffening and alignment region
            return stressAtBreak * (
                hardPointStress +
                alphas.alpha3 * Math.pow(normalizedStrain - alphas.hardPoint, 2) +
                alphas.alpha4 * Math.pow(normalizedStrain - alphas.hardPoint, 3)
            );
        }
    };

    // Calculate load-strain and stress-strain curves with non-linear effects
    const calculateCurves = () => {
        // Parse and validate input data
        const fibreData = fibreTypes
            .filter(fibre =>
                fibre.numFibres && parseInt(fibre.numFibres) > 0 && fibre.diameter && fibre.stressAtBreak &&
                fibre.strainAtBreak && fibre.referenceDiameter && fibre.humidityValue
            )
            .map(fibre => {
                const humidity = parseFloat(fibre.humidityValue);
                const humidityEffects = calculateHumidityEffect(humidity);
                const diameterEffect = calculateDiameterEffect(parseFloat(fibre.diameter), parseFloat(fibre.referenceDiameter));

                return {
                    numFibres: parseInt(fibre.numFibres),
                    diameter: parseFloat(fibre.diameter),
                    area: Math.PI * Math.pow(parseFloat(fibre.diameter) / 2, 2),
                    stressAtBreak: parseFloat(fibre.stressAtBreak) * humidityEffects.stressScaleFactor,
                    strainAtBreak: parseFloat(fibre.strainAtBreak) * humidityEffects.strainScaleFactor * diameterEffect,
                    referenceDiameter: parseFloat(fibre.referenceDiameter),
                    humidity: humidity,
                    humidityEffects: humidityEffects,
                    diameterEffect: diameterEffect,
                    name: fibre.name
                };
            });

        if (fibreData.length === 0) return;

        // Calculate maximum strain among all fibre types with some margin
        const maxStrain = Math.max(...fibreData.map(fibre => fibre.strainAtBreak)) * 1.2;

        // Create strain range
        const strainPoints = 1000;
        const strainRange = Array.from({ length: strainPoints }, (_, i) => i * maxStrain / (strainPoints - 1));

        // Calculate total bundle area
        const totalArea = fibreData.reduce((sum, fibre) => sum + fibre.numFibres * fibre.area, 0);

        // Initialize total load array
        const totalLoad = new Array(strainPoints).fill(0);

        // Individual fibre loads for plotting with Weibull distributions
        const fibreLoads = fibreData.map(fibre => {
            // Generate breaking strains for each individual fibre
            const breakingStrains = generateWeibullStrains(
                fibre.strainAtBreak,
                weibullParams.weibullShape,
                fibre.numFibres
            );

            // Sort breaking strains in ascending order
            breakingStrains.sort((a, b) => a - b);

            // Create histogram data for Weibull distribution plot
            const binCount = 20;
            const binWidth = maxStrain / binCount;
            const histogram = Array(binCount).fill(0);

            breakingStrains.forEach(strain => {
                const binIndex = Math.min(Math.floor(strain / binWidth), binCount - 1);
                histogram[binIndex]++;
            });

            // Calculate load at each strain point considering progressive failure
            const load = strainRange.map((strain) => {
                // Count intact fibres at current strain
                const intactFibres = breakingStrains.filter(breakStrain => strain <= breakStrain).length;

                if (intactFibres === 0) return 0;

                // Calculate stress using hyperelastic model
                const stress = calculateHyperelasticStress(
                    strain,
                    fibre.strainAtBreak,
                    fibre.stressAtBreak,
                    hyperelasticParams
                );

                return intactFibres * fibre.area * stress * 1e-3;
            });

            // Add to total load
            totalLoad.forEach((_, i) => {
                totalLoad[i] += load[i];
            });

            // Create Weibull distribution plot data
            const weibullDistPlot = {
                x: Array.from({ length: binCount }, (_, i) => (i + 0.5) * binWidth),
                y: histogram,
                type: 'bar',
                name: `${fibre.name} Breaking Strain Distribution`,
                marker: {
                    opacity: 0.7,
                }
            };

            return {
                load: {
                    x: strainRange,
                    y: load,
                    type: 'scatter',
                    mode: 'lines',
                    name: fibre.name,
                },
                weibullDist: weibullDistPlot,
                intactFibresFraction: strainRange.map(strain =>
                    breakingStrains.filter(breakStrain => strain <= breakStrain).length / fibre.numFibres
                ),
            };
        });

        // Calculate stress (load/area)
        const stress = totalLoad.map(load => load * 1e3 / totalArea);

        // Load-strain plot data
        const loadStrainPlot = [
            ...fibreLoads.map(fibre => fibre.load),
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

        // Weibull distribution plot data
        const weibullDistributionPlot = fibreLoads.map(fibre => fibre.weibullDist);

        // Find maximum load and corresponding strain
        const maxLoadIndex = totalLoad.findIndex(load => load === Math.max(...totalLoad));
        const maxLoad = totalLoad[maxLoadIndex] * 1e6; //convert to μN
        const strainAtMaxLoad = strainRange[maxLoadIndex];

        // Calculate energy to break (area under curve)
        const energyToBreak = totalLoad.reduce((sum, load, i) => {
            if (i === 0) return sum;
            const strainInterval = strainRange[i] - strainRange[i - 1];
            // Trapezoidal rule for integration
            return sum + 0.5 * (load + totalLoad[i - 1]) * strainInterval;
        }, 0) * 1e6; //convert to μJ 

        // Set plot data state
        setPlotData({
            loadStrainPlot,
            stressStrainPlot,
            weibullDistributionPlot,
            summary: {
                fibreData,
                totalArea,
                maxLoad,
                strainAtMaxLoad,
                energyToBreak,
                intactFibresFraction: fibreLoads.map((fibre, i) => ({
                    name: fibreData[i].name,
                    values: fibre.intactFibresFraction
                })),
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
    };

    // Layout for stress-strain plot
    const stressStrainLayout = {
        title: 'Stress vs Strain',
        xaxis: { title: 'Strain' },
        yaxis: { title: 'Stress (GPa)' },
        autosize: true,
        height: 400,
        margin: { l: 50, r: 50, b: 50, t: 50, pad: 4 },
    };

    // Layout for Weibull distribution plot
    const weibullLayout = {
        title: 'Breaking Strain Distribution (Weibull)',
        xaxis: { title: 'Strain' },
        yaxis: { title: 'Number of Fibres' },
        autosize: true,
        height: 400,
        margin: { l: 50, r: 50, b: 50, t: 50, pad: 4 },
        barmode: 'overlay',
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Import Data Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl">
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-semibold">Import Data</h3>
                                <button
                                    onClick={() => setShowImportModal(false)}
                                    className="p-1 rounded-full hover:bg-gray-200"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="importType">Import Format</Label>
                                <div className="flex space-x-2">
                                    <Button
                                        variant={importType === "csv" ? "default" : "outline"}
                                        onClick={() => setImportType("csv")}
                                    >
                                        CSV
                                    </Button>
                                    <Button
                                        variant={importType === "json" ? "default" : "outline"}
                                        onClick={() => setImportType("json")}
                                    >
                                        JSON
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="importData">Paste your data below</Label>
                                <textarea
                                    id="importData"
                                    className="w-full h-64 p-2 border rounded"
                                    value={importData}
                                    onChange={(e) => setImportData(e.target.value)}
                                    placeholder={importType === "csv"
                                        ? "Name,Number of Fibres,Diameter,Stress at Break,Strain at Break,Reference Diameter,Humidity\nFibre Type 1,2,5.0,1.2,0.3,5.0,50"
                                        : '[\n  {\n    "name": "Fibre Type 1",\n    "numFibres": "2",\n    "diameter": "5.0",\n    "stressAtBreak": "1.2",\n    "strainAtBreak": "0.3",\n    "referenceDiameter": "5.0",\n    "humidityValue": "50"\n  }\n]'
                                    }
                                />
                            </div>

                            <div className="flex space-x-2">
                                <Label htmlFor="fileUpload" className="cursor-pointer px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 inline-flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="17 8 12 3 7 8"></polyline>
                                        <line x1="12" y1="3" x2="12" y2="15"></line>
                                    </svg>
                                    Upload File
                                    <input
                                        id="fileUpload"
                                        type="file"
                                        accept=".csv,.json"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                </Label>
                                <div className="text-sm text-gray-500 flex items-center">
                                    Accepts CSV or JSON files
                                </div>
                            </div>

                            <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setShowImportModal(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={processImport}>
                                    Import Data
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <Card>
                <CardHeader>
                    <CardTitle>Non-Linear Fibre Bundle Analysis</CardTitle>
                    <CardDescription>
                        Generate load-strain and stress-strain curves for a fibre bundle using hyperelastic model with Weibull distribution for strain at break and humidity effects.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-end space-x-2 mt-2">
                        <Button size="sm" onClick={() => setShowImportModal(true)}>
                            <Upload className="mr-2 h-4 w-4" />
                            Import Data
                        </Button>
                        <Button variant="secondary" size="sm" onClick={exportAsCSV}>
                            <Download className="mr-2 h-4 w-4" />
                            Export Config to CSV
                        </Button>
                        <Button variant="secondary" size="sm" onClick={exportConfig}>
                            <Download className="mr-2 h-4 w-4" />
                            Export Config to Excel
                        </Button>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Hyperelastic Model Parameters</h3>
                            <p className="mt-2 text-xs italic">This model is based on research by Cranford et al. (2012) and Blackledge et al. (2006, 2012) on the nonlinear material behavior of spider silk.</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="alpha1">α₁ (Initial Stiffness): {hyperelasticParams.alpha1.toFixed(2)}</Label>
                                    <Slider
                                        id="alpha1"
                                        min={0.5}
                                        max={5}
                                        step={0.1}
                                        value={[hyperelasticParams.alpha1]}
                                        onValueChange={value => handleParamChange('alpha1', value[0])}
                                    />
                                    <p className="text-xs text-gray-500">Controls the slope of the initial linear region, related to Young&apos;s modulus<br />Set to 1.0 to obtain linear behaviour</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="alpha2">α₂ (Yield Region): {hyperelasticParams.alpha2.toFixed(2)}</Label>
                                    <Slider
                                        id="alpha2"
                                        min={-0.1}
                                        max={2}
                                        step={0.01}
                                        value={[hyperelasticParams.alpha2]}
                                        onValueChange={value => handleParamChange('alpha2', value[0])}
                                    />
                                    <p className="text-xs text-gray-500">Determines the softening behavior after yielding (lower values create a more pronounced plateau)</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="alpha3">α₃ (Strain Hardening): {hyperelasticParams.alpha3.toFixed(2)}</Label>
                                    <Slider
                                        id="alpha3"
                                        min={0}
                                        max={10}
                                        step={0.1}
                                        value={[hyperelasticParams.alpha3]}
                                        onValueChange={value => handleParamChange('alpha3', value[0])}
                                    />
                                    <p className="text-xs text-gray-500">Control the quadratic rate of strain-hardening, with higher values creating more pronounced stiffening</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="alpha4">α₄ (Strain Hardening): {hyperelasticParams.alpha4.toFixed(2)}</Label>
                                    <Slider
                                        id="alpha4"
                                        min={0}
                                        max={10}
                                        step={0.1}
                                        value={[hyperelasticParams.alpha4]}
                                        onValueChange={value => handleParamChange('alpha4', value[0])}
                                    />
                                    <p className="text-xs text-gray-500">Control the cubic rate of strain-hardening, with higher values creating more pronounced stiffening</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="yieldPoint">Yield Point: {hyperelasticParams.yieldPoint.toFixed(2)}</Label>
                                    <Slider
                                        id="yieldPoint"
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        value={[hyperelasticParams.yieldPoint]}
                                        onValueChange={value => handleParamChange('yieldPoint', value[0])}
                                    />
                                    <p className="text-xs text-gray-500">Normalized strain at which yielding begins, marking the transition to softening region<br />Set to 1.0 to obtain linear behaviour</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="hardPoint">Hardening Point: {hyperelasticParams.hardPoint.toFixed(2)}</Label>
                                    <Slider
                                        id="hardPoint"
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        value={[hyperelasticParams.hardPoint]}
                                        onValueChange={value => handleParamChange('hardPoint', value[0])}
                                    />
                                    <p className="text-xs text-gray-500">Normalized strain at which hardening begins, marking the transition to molecular alignment<br />Set to 1.0 to obtain linear behaviour</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Humidity Effect Parameters</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="referenceHumidity">Reference Humidity: {humidityParams.referenceHumidity.toFixed(0)}% RH</Label>
                                    <Slider
                                        id="referenceHumidity"
                                        min={0}
                                        max={100}
                                        step={1}
                                        value={[humidityParams.referenceHumidity]}
                                        onValueChange={value => handleHumidityParamChange('referenceHumidity', value[0])}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="strainCoefficient">Strain Coefficient: {humidityParams.strainCoefficient.toFixed(4)}</Label>
                                    <Slider
                                        id="strainCoefficient"
                                        min={0}
                                        max={0.02}
                                        step={0.0002}
                                        value={[humidityParams.strainCoefficient]}
                                        onValueChange={value => handleHumidityParamChange('strainCoefficient', value[0])}
                                    />
                                    <p className="text-xs text-gray-500">Set to 0 for linear behavior</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="stressCoefficient">Stress Coefficient: {humidityParams.stressCoefficient.toFixed(4)}</Label>
                                    <Slider
                                        id="stressCoefficient"
                                        min={0}
                                        max={0.02}
                                        step={0.0002}
                                        value={[humidityParams.stressCoefficient]}
                                        onValueChange={value => handleHumidityParamChange('stressCoefficient', value[0])}
                                    />
                                    <p className="text-xs text-gray-500">Set to 0 for linear behavior</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="stiffnessCoefficient">Stiffness Coefficient: {humidityParams.stiffnessCoefficient.toFixed(4)}</Label>
                                    <Slider
                                        id="stiffnessCoefficient"
                                        min={0}
                                        max={0.02}
                                        step={0.0002}
                                        value={[humidityParams.stiffnessCoefficient]}
                                        onValueChange={value => handleHumidityParamChange('stiffnessCoefficient', value[0])}
                                    />
                                    <p className="text-xs text-gray-500">Set to 0 for linear behavior</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Fibre Scaling Parameters</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="weibullShape">Weibull Shape: {weibullParams.weibullShape.toFixed(2)}</Label>
                                    <Slider
                                        id="weibullShape"
                                        min={1}
                                        max={100}
                                        step={0.1}
                                        value={[weibullParams.weibullShape]}
                                        onValueChange={value => setWeibullParams({ weibullShape: value[0], scalingExponent: weibullParams.scalingExponent })}
                                    />
                                    <p className="text-xs text-gray-500">Shape parameter for Weibull distribution. Lower values means that there is a higher difference in strain at break between fibres of the same type.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="scalingExponent">Scaling Exponent: {weibullParams.scalingExponent.toFixed(2)}</Label>
                                    <Slider
                                        id="scalingExponent"
                                        min={-1}
                                        max={1}
                                        step={0.01}
                                        value={[weibullParams.scalingExponent]}
                                        onValueChange={value => setWeibullParams({ weibullShape: weibullParams.weibullShape, scalingExponent: value[0] })}
                                    />
                                    <p className="text-xs text-gray-500">Scaling exponent for diameter effect on strain based on Weibull statistics. Values close to 0 lead to no effect.</p>
                                </div>
                            </div>
                        </div>
                        <Separator />

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fibre Type</TableHead>
                                    <TableHead>Number of Fibres</TableHead>
                                    <TableHead>Diameter (μm)</TableHead>
                                    <TableHead>Stress at Break (GPa)</TableHead>
                                    <TableHead>Strain at Break</TableHead>
                                    <TableHead>Reference Diameter (μm)</TableHead>
                                    <TableHead>Humidity (%RH)</TableHead>
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
                                                value={fibre.diameter}
                                                onChange={(e) => handleInputChange(index, 'diameter', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                value={fibre.stressAtBreak}
                                                onChange={(e) => handleInputChange(index, 'stressAtBreak', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                value={fibre.strainAtBreak}
                                                onChange={(e) => handleInputChange(index, 'strainAtBreak', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                value={fibre.referenceDiameter}
                                                onChange={(e) => handleInputChange(index, 'referenceDiameter', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                value={fibre.humidityValue}
                                                onChange={(e) => handleInputChange(index, 'humidityValue', e.target.value)}
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
                            <CardTitle>Breaking Strain Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="h-96">
                            <Plot
                                data={plotData.weibullDistributionPlot}
                                layout={weibullLayout}
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
                            <div className="flex justify-end pb-3">
                                <Button variant="secondary" size="sm" onClick={exportResults}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export Results to Excel
                                </Button>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-lg">Total Bundle Area: {plotData.summary.totalArea.toFixed(2)} μm²</p>
                                    </div>
                                    <div>
                                        <p className="text-lg">Maximum Load: {plotData.summary.maxLoad.toFixed(4)} μN</p>
                                        <p className="text-lg">Strain at Max Load: {plotData.summary.strainAtMaxLoad.toFixed(4)}</p>
                                    </div>
                                    <div>
                                        <p className="text-lg">Energy to Break: {plotData.summary.energyToBreak.toFixed(6)} μJ</p>
                                    </div>
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
                                                        <p>Diameter: {fibre.diameter.toFixed(2)} μm</p>
                                                        <p>Humidity: {fibre.humidity}% RH</p>
                                                    </div>
                                                    <div>
                                                        <p>Area per Fibre: {fibre.area.toFixed(1)} μm²</p>
                                                        <p>Total Area: {(fibre.numFibres * fibre.area).toFixed(1)} μm²</p>
                                                        <p>Percentage of Bundle: {((fibre.numFibres * fibre.area / plotData.summary.totalArea) * 100).toFixed(2)}%</p>
                                                    </div>
                                                    <div>
                                                        <p>Base Stress at Break: {(fibre.stressAtBreak / (fibre.humidityEffects.stressScaleFactor * fibre.diameterEffect)).toFixed(2)} GPa</p>
                                                        <p>Adjusted Stress: {fibre.stressAtBreak.toFixed(2)} GPa</p>
                                                        <p>Base Strain at Break: {(fibre.strainAtBreak / fibre.humidityEffects.strainScaleFactor).toFixed(4)}</p>
                                                        <p>Adjusted Strain: {fibre.strainAtBreak.toFixed(4)}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-4">
                                                    <h4 className="font-semibold mb-2">Scaling Factors</h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <p>Diameter Effect: {fibre.diameterEffect.toFixed(3)}</p>
                                                        <p>Humidity (Strain): {fibre.humidityEffects.strainScaleFactor.toFixed(3)}</p>
                                                        <p>Humidity (Stress): {fibre.humidityEffects.stressScaleFactor.toFixed(3)}</p>
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