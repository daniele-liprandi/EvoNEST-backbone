"use client"

import { useTheme } from "next-themes"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export function CardSamples({ data }: { data: any[] }) {
  const { theme } = useTheme()

  const generateLast12Months = () => {
    const months = [];
    const today = new Date();
    const startDate = new Date(today.getFullYear() - 1, today.getMonth() + 1, 1); // Start from next month last year
    
    for (let i = 0; i < 12; i++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      months.push(d.toLocaleString('default', { month: 'short' }));
    }
    return months;
  };

  const months = generateLast12Months();

  const currentDate = new Date();
  const monthyearCurrent = `${currentDate.toLocaleString('default', { month: 'short' })} ${currentDate.getFullYear()}`;
  
  // Calculate last year's date correctly (one year ago from current date)
  const monthyearLastyear = new Date(currentDate.getFullYear() - 1, currentDate.getMonth() + 1, 1);
  const monthyearLastyearFormatted = `${monthyearLastyear.toLocaleString('default', { month: 'short' })} ${monthyearLastyear.getFullYear()}`;

  // Filter samples within our date range
  let samplescollectedlastyear = data.filter((sample: any) => {
    const sampleDate = new Date(sample.date);
    return sampleDate >= monthyearLastyear && sampleDate <= currentDate;
  });

  // Process data for the chart
  const countsPerMonth = samplescollectedlastyear.reduce((acc: any, sample: any) => {
    const month = new Date(sample.date).toLocaleString('default', { month: 'short' });
    if (!acc[sample.type]) acc[sample.type] = {};
    acc[sample.type][month] = (acc[sample.type][month] || 0) + 1;
    return acc;
  }, {});

  const chartData = months.map((month) => {
    const dataPoint: any = { month };
    Object.keys(countsPerMonth).forEach((type) => {
      dataPoint[type] = countsPerMonth[type][month] || 0;
    });
    return dataPoint;
  });

  // Create cumulative sum
  Object.keys(countsPerMonth).forEach((type) => {
    let sum = 0;
    chartData.forEach((dataPoint) => {
      sum += dataPoint[type];
      dataPoint[type] = sum;
    });
  });

  // create color list
  const colors = [
    "hsl(var(--orange))",
    "hsl(var(--blue))",
    "hsl(var(--green))",
    "hsl(var(--red))",
  ]

  const chartConfig: ChartConfig = Object.keys(countsPerMonth).reduce((acc: any, type, index) => {
    acc[type] = {
      label: type,
      color: colors[index],
    }
    return acc
  }, {})

  return (
    <Card className="w-full h-full max-w-2xl">
      <CardHeader>
        <CardTitle>Samples Over Time</CardTitle>
        <CardDescription>{`${monthyearLastyearFormatted} - ${monthyearCurrent}`}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 10,
              left: 10,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
            />
            {Object.keys(countsPerMonth).map((type, index) => (
              <Line
                key={type}
                type="monotone"
                dataKey={type}
                strokeWidth={3}
                stroke={colors[index]}
                dot={false}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {samplescollectedlastyear.length} samples
        </div>
      </CardFooter>
    </Card>
  )
}