import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const MapboxScatterPlot = ({ samplesData }) => {
  const [plotData, setPlotData] = useState([]);
  const [layout, setLayout] = useState({});
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    // Group samples by location
    const groupedSamples = samplesData.reduce((acc, sample) => {
      const key = `${sample.lat},${sample.lon}`;
      if (!acc[key]) {
        acc[key] = { ...sample, count: 1 };
      } else {
        acc[key].count += 1;
      }
      return acc;
    }, {});

    const locations = Object.values(groupedSamples);

    // Prepare the data for plotting
    const data = [{
      type: 'scattermapbox',
      lat: locations.map(loc => loc.lat),
      lon: locations.map(loc => loc.lon),
      text: locations.map(loc => `Samples: ${loc.count}<br>Location: ${loc.location}`),
      hoverinfo: 'text',
      marker: {
        // Size based on count, max size 50, min size 10
        size: locations.map(loc => Math.max(10, Math.min(50, Math.floor(loc.count/3)))),
        color: locations.map(loc => loc.count),
        colorscale: 'Jet',
        /* colorbar: {
          title: 'Number of Samples',
          thickness: 20,
        }, */
        opacity: 0.7,
      }
    }];

    setPlotData(data);

    // Define the layout
    const newLayout = {
      mapbox: {
        style: "open-street-map", // Free, doesn't require a token
        center: {
          lat: locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length,
          lon: locations.reduce((sum, loc) => sum + loc.lon, 0) / locations.length
        },
        zoom: 1
      },
      margin: { r: 0, t: 40, b: 0, l: 0, pad: 0 },
      autosize: true,
    };

    setLayout(newLayout);
  }, [samplesData]);

  if (!isClient) return <div>Loading...</div>;

  return (
    <Plot
      data={plotData}
      layout={layout}
      config={{
        responsive: true,
      }}
      style={{ width: "100%", height: "100%" }}
      useResizeHandler={true}
    />
  );
};

export default MapboxScatterPlot;