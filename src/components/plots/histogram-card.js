import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';


export const HistogramWithBins = ({ data }) => {
  const [nbins, setNbins] = useState(10);

  const histogramData = useMemo(() => { //useMemo stores data in the memory, useEffect stores 
    if (data.length === 0) {
      return [];
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const binWidth = (max - min) / nbins;

    const bins = Array.from({ length: nbins }, (_, i) => ({
      x0: min + i * binWidth,
      x1: min + (i + 1) * binWidth,
      count: 0,
    }));

    data.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), nbins - 1);
      bins[binIndex].count += 1;
    });

    return bins.map(bin => ({
      bin: `${bin.x0.toFixed(2)} - ${bin.x1.toFixed(2)}`,
      count: bin.count,
    }));
  }, [data, nbins]);

  return (
    <div>
      <Input
        type="number"
        value={nbins}
        onChange={e => setNbins(Number(e.target.value))}
        style={{ marginLeft: 20 }}
        min={1}
        max={100}
        className='w-1/2'
      />
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={histogramData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="bin" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const HistogramCardWithColumnsFilter = ({ data, datacolumns }) => {
  const [selectedColumn, setSelectedColumn] = useState(datacolumns[0].value);

  const filteredData = data.filter(d => d.type === selectedColumn).map(d => d.measurement);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histogram</CardTitle>
      </CardHeader>
      <CardContent>
        <Select value={selectedColumn} onValueChange={setSelectedColumn}>
          <SelectTrigger>
            <SelectValue placeholder="Select column">{selectedColumn}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {datacolumns.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {HistogramWithBins({ data: filteredData })}
      </CardContent>
    </Card>
  );
};