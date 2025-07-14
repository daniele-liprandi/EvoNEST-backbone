import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Cross2Icon } from '@radix-ui/react-icons';
import { format } from 'date-fns';

const LogbookCard = ({ logbook = [] }) => {
  const [selectedDate, setSelectedDate] = useState(null);

  // Process logbook entries to get unique dates for calendar
  const dateSet = useMemo(() => {
    return new Set(logbook.map(entry => {
      const date = new Date(entry[0]);
      return format(date, 'yyyy-MM-dd');
    }));
  }, [logbook]);

  // Filter and sort entries
  const displayedEntries = useMemo(() => {
    let entries = [...logbook]; // Create a copy to sort
    
    // Filter by selected date if any
    if (selectedDate) {
      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      entries = entries.filter(entry => {
        const entryDate = format(new Date(entry[0]), 'yyyy-MM-dd');
        return entryDate === selectedDateStr;
      });
    }

    // Sort in reverse chronological order
    return entries.sort((a, b) => new Date(b[0]) - new Date(a[0]));
  }, [logbook, selectedDate]);

  const clearDateFilter = () => {
    setSelectedDate(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Logbook</CardTitle>
        <div className="flex items-center gap-2">
          {selectedDate && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={clearDateFilter}
            >
              <Cross2Icon className="h-4 w-4" />
            </Button>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {selectedDate ? format(selectedDate, 'PPP') : 'Pick date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{
                  hasEvent: (date) => dateSet.has(format(date, 'yyyy-MM-dd'))
                }}
                modifiersStyles={{
                  hasEvent: { 
                    fontWeight: 'bold',
                    backgroundColor: 'hsl(var(--primary) / 0.1)' 
                  }
                }}
                disabled={(date) => !dateSet.has(format(date, 'yyyy-MM-dd'))}
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="flex flex-col gap-3">
            {displayedEntries.map((entry, index) => (
              <div
                key={index}
                className="rounded-lg border bg-card p-3 text-card-foreground shadow-sm"
              >
                <div className="text-xs text-muted-foreground mb-1 opacity-70">
                  {format(new Date(entry[0]), 'PPP p')}
                </div>
                <div className="text-sm">
                  {entry[1]}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LogbookCard;