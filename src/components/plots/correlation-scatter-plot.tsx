'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Interface for our data format
interface CorrelationScatterData {
  x: number;
  y: number;
  xUnit: string;
  yUnit: string;
  names: string;
  color?: string | number | null;
  colorUnit?: string | null;
}

interface CorrelationScatterPlotProps {
  data: CorrelationScatterData[];
  xAxisName: string;
  yAxisName: string;
  xAxisUnit: string;
  yAxisUnit: string;
  linearFit?: { slope: number; intercept: number; rValue: number } | null;
  colorAxisName: string | null;
  colorAxisUnit?: string | null;
}

export const getLabelFromName = (value: string, options: { value: string, label: string }[]) => {
  const option = options.find(opt => opt.value === value);
  return option ? option.label : value;
};


export const CorrelationScatterPlot: React.FC<CorrelationScatterPlotProps> = ({
  data,
  xAxisName,
  yAxisName,
  xAxisUnit,
  yAxisUnit,
  linearFit,
  colorAxisName,
  colorAxisUnit
}) => {
  const [plotConfig, setPlotConfig] = useState<any>(null);

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    // Extract data for plotting
    const xValues = data.map(point => point.x);
    const yValues = data.map(point => point.y);
    const textLabels = data.map(point => point.names);
    
    // Create the main scatter plot trace
    const scatterTrace: any = {
      type: 'scatter',
      mode: 'markers',
      x: xValues,
      y: yValues,
      text: textLabels,
      hoverinfo: 'text',
      hovertext: data.map(point => 
        `${xAxisName}: ${point.x} ${xAxisUnit}<br>` +
        `${yAxisName}: ${point.y} ${yAxisUnit}<br>` +
        `Name: ${point.names}<br>`
      ),
      marker: {
        size: 8,
        line: {
          width: 1,
          color: 'black'
        }
      }
    };

    // Handle color mapping if colorAxisName is provided
    if (colorAxisName && data.some(d => d.color !== undefined && d.color !== null)) {
      // Prepare color values, ensuring undefined/null values are replaced with 0
      const colorValues = data.map(point => 
        point.color !== undefined && point.color !== null ? point.color : 0
      );
      
      // Check if all color values are numeric
      const isNumericColor = colorValues.every(
        color => !isNaN(Number(color))
      );
      
      if (isNumericColor) {
        // Continuous color scale for numeric values
        scatterTrace.marker.color = colorValues.map(val => Number(val)); // Ensure all values are numbers
        scatterTrace.marker.colorscale = 'Viridis';
        scatterTrace.marker.colorbar = {
          title: `${colorAxisName} ${colorAxisUnit || ''}`,
          thickness: 20
        };
        scatterTrace.marker.showscale = true;
        
        // Add color info to hover template with special handling for zeros (which might be originally undefined)
        scatterTrace.hovertemplate = data.map((point, idx) => {
          const baseTemplate = 
            `${xAxisName}: ${point.x} ${xAxisUnit}<br>` +
            `${yAxisName}: ${point.y} ${yAxisUnit}<br>`;
          
          let colorInfo = '';
          if (point.color !== undefined && point.color !== null) {
            colorInfo = `${colorAxisName}: ${point.color} ${colorAxisUnit || ''}<br>`;
          } else {
            colorInfo = `${colorAxisName}: (no data)<br>`;
          }
          
          return baseTemplate + colorInfo + `Name: ${point.names}<br><extra></extra>`;
        });
      } else {
        // Categorical colors for non-numeric values
        // Group the data by color categories
        const colorCategories = Array.from(new Set(colorValues.filter(Boolean)));
        
        // Replace the single trace with multiple traces, one per category
        const traces = colorCategories.map(category => {
          const filteredData = data.filter(point => point.color === category);
          
          return {
            type: 'scatter',
            mode: 'markers',
            x: filteredData.map(point => point.x),
            y: filteredData.map(point => point.y),
            text: filteredData.map(point => point.names),
            name: String(category),
            hovertemplate: 
              `${xAxisName}: %{x} ${xAxisUnit}<br>` +
              `${yAxisName}: %{y} ${yAxisUnit}<br>` +
              `${colorAxisName}: ${category}<br>` +
              `Name: %{text}<br>` +
              `<extra></extra>`,
            marker: {
              size: 12,
              line: {
                width: 1,
                color: 'black'
              }
            }
          };
        });
        
        // Add a trace for points without a color category if any exist
        const pointsWithoutColor = data.filter(point => point.color === null || point.color === undefined);
        if (pointsWithoutColor.length > 0) {
          traces.push({
            type: 'scatter',
            mode: 'markers',
            x: pointsWithoutColor.map(point => point.x),
            y: pointsWithoutColor.map(point => point.y),
            text: pointsWithoutColor.map(point => point.names),
            name: 'Uncategorized',
            hovertemplate: 
              `${xAxisName}: %{x} ${xAxisUnit}<br>` +
              `${yAxisName}: %{y} ${yAxisUnit}<br>` +
              `Name: %{text}<br>` +
              `<extra></extra>`,
            marker: {
              size: 8,
              line: {
                width: 1,
                color: 'black'
              }
            }
          });
        }
        
        // Set the full traces array
        setPlotConfig({
          data: traces,
          layout: createLayout(xAxisName, yAxisName, xAxisUnit, yAxisUnit, linearFit)
        });
        
        // Return early since we've handled this case specially
        return;
      }
    }

    // Add regression line if linearFit is provided
    const traces = [scatterTrace];
    
    if (linearFit) {
      const xMin = Math.min(...xValues);
      const xMax = Math.max(...xValues);
      const xRange = [xMin, xMax];
      const yRange = xRange.map(x => linearFit.slope * x + linearFit.intercept);
      
      const regressionTrace = {
        type: 'scatter',
        mode: 'lines',
        x: xRange,
        y: yRange,
        name: `y = ${linearFit.slope.toFixed(2)}x + ${linearFit.intercept.toFixed(2)}, R² = ${(linearFit.rValue * linearFit.rValue).toFixed(2)}`,
        line: {
          color: 'red',
          width: 2
        }
      };
      
      traces.push(regressionTrace);
    }

    // Create the full plot configuration
    setPlotConfig({
      data: traces,
      layout: createLayout(xAxisName, yAxisName, xAxisUnit, yAxisUnit, linearFit)
    });
  }, [data, xAxisName, yAxisName, xAxisUnit, yAxisUnit, linearFit, colorAxisName, colorAxisUnit]);

  // Helper function to create the layout
  const createLayout = (
    xAxisName: string, 
    yAxisName: string, 
    xAxisUnit: string, 
    yAxisUnit: string,
    linearFit: { slope: number; intercept: number; rValue: number } | null | undefined
  ) => {
    return {
      title: `${yAxisName} vs ${xAxisName}`,
      xaxis: {
        title: `${xAxisName} (${xAxisUnit})`,
        zeroline: true
      },
      yaxis: {
        title: `${yAxisName} (${yAxisUnit})`,
        zeroline: true
      },
      hovermode: 'closest',
      legend: {
        x: 0,
        y: 1,
        traceorder: 'normal',
        orientation: 'h'
      },
      margin: {
        l: 70,
        r: 40,
        b: 60,
        t: 60,
        pad: 10
      },
      // Add annotation for regression equation if linearFit is provided
      annotations: linearFit ? [
        {
          xref: 'paper',
          yref: 'paper',
          x: 0.5,
          y: 1.05,
          text: `y = ${linearFit.slope.toFixed(2)}x + ${linearFit.intercept.toFixed(2)}, R² = ${(linearFit.rValue * linearFit.rValue).toFixed(2)}`,
          showarrow: false,
          font: {
            size: 12
          }
        }
      ] : []
    };
  };

  // Show loading message if plot configuration isn't ready yet
  if (!plotConfig) {
    return <div>Loading plot...</div>;
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Plot
        data={plotConfig.data}
        layout={plotConfig.layout}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler={true}
        config={{
          responsive: true,
          displaylogo: false,
          modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'select2d']
        }}
      />
    </div>
  );
};