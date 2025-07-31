import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface DobPickerProps {
  value?: Date;
  onChange: (date?: Date) => void;
  className?: string;
}

const months = [
  { value: 0, label: 'January' }, { value: 1, label: 'February' }, { value: 2, label: 'March' },
  { value: 3, label: 'April' }, { value: 4, label: 'May' }, { value: 5, label: 'June' },
  { value: 6, label: 'July' }, { value: 7, label: 'August' }, { value: 8, label: 'September' },
  { value: 9, label: 'October' }, { value: 10, label: 'November' }, { value: 11, label: 'December' }
];

const endYear = new Date().getFullYear();
const startYear = 1900;
const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => endYear - i);

export function DobPicker({ value, onChange, className }: DobPickerProps) {
  const [day, setDay] = useState<number | undefined>(value?.getDate());
  const [month, setMonth] = useState<number | undefined>(value?.getMonth());
  const [year, setYear] = useState<number | undefined>(value?.getFullYear());

  const daysInMonth = (y?: number, m?: number) => {
    if (y === undefined || m === undefined) return 31;
    return new Date(y, m + 1, 0).getDate();
  };

  const dayOptions = Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1);

  useEffect(() => {
    if (day !== undefined && month !== undefined && year !== undefined) {
      const newDate = new Date(year, month, day);
      onChange(newDate);
    } else {
      onChange(undefined);
    }
  }, [day, month, year, onChange]);
  
  useEffect(() => {
    if (day && day > daysInMonth(year, month)) {
        setDay(undefined);
    }
  }, [month, year, day]);

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      <Select
        value={month?.toString()}
        onValueChange={(val) => setMonth(parseInt(val))}
      >
        <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
        <SelectContent>
          {months.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select
        value={day?.toString()}
        onValueChange={(val) => setDay(parseInt(val))}
        disabled={month === undefined || year === undefined}
      >
        <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
        <SelectContent>
          {dayOptions.map(d => <SelectItem key={d} value={d.toString()}>{d}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select
        value={year?.toString()}
        onValueChange={(val) => setYear(parseInt(val))}
      >
        <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
        <SelectContent>
          {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}