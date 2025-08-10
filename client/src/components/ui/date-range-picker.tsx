import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Pick a date range",
  className,
  disabled = false,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectingStart, setSelectingStart] = React.useState(true);
  const [tempRange, setTempRange] = React.useState<DateRange>({
    from: value?.from,
    to: value?.to,
  });

  React.useEffect(() => {
    setTempRange({
      from: value?.from,
      to: value?.to,
    });
  }, [value]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    if (selectingStart) {
      // First click - select start date
      const newRange = { from: date, to: undefined };
      setTempRange(newRange);
      setSelectingStart(false);
    } else {
      // Second click - select end date
      const startDate = tempRange.from;
      if (!startDate) return;

      // Ensure end date is not before start date
      const endDate = date < startDate ? startDate : date;
      const finalRange = { from: startDate, to: endDate };
      
      setTempRange(finalRange);
      onChange?.(finalRange);
      setIsOpen(false);
      setSelectingStart(true);
    }
  };

  const formatDisplayText = () => {
    if (!value?.from) return placeholder;
    
    if (!value.to) {
      return `${format(value.from, "MMM dd, yyyy")} - Select end date`;
    }
    
    return `${format(value.from, "MMM dd, yyyy")} - ${format(value.to, "MMM dd, yyyy")}`;
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset to original values if incomplete selection
      setTempRange({
        from: value?.from,
        to: value?.to,
      });
      setSelectingStart(true);
    }
  };

  const getDayClassName = (day: Date) => {
    const isFromSelected = tempRange.from && format(day, "yyyy-MM-dd") === format(tempRange.from, "yyyy-MM-dd");
    const isToSelected = tempRange.to && format(day, "yyyy-MM-dd") === format(tempRange.to, "yyyy-MM-dd");
    const isInRange = tempRange.from && tempRange.to && day >= tempRange.from && day <= tempRange.to;
    
    if (isFromSelected || isToSelected) {
      return "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground";
    }
    
    if (isInRange) {
      return "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground";
    }
    
    return "";
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value?.from && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDisplayText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          <div className="text-sm text-muted-foreground mb-2">
            {selectingStart ? "Select start date" : "Select end date"}
          </div>
          <Calendar
            mode="single"
            selected={selectingStart ? tempRange.from : tempRange.to}
            onSelect={handleDateSelect}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            initialFocus
            modifiers={{
              range_start: tempRange.from ? [tempRange.from] : [],
              range_end: tempRange.to ? [tempRange.to] : [],
              range_middle: tempRange.from && tempRange.to ? 
                Array.from({ length: Math.max(0, Math.ceil((tempRange.to.getTime() - tempRange.from.getTime()) / (1000 * 60 * 60 * 24))) }, (_, i) => {
                  const date = new Date(tempRange.from!);
                  date.setDate(date.getDate() + i + 1);
                  return date;
                }).filter(date => date < tempRange.to!) : []
            }}
            modifiersClassNames={{
              range_start: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              range_end: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              range_middle: "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground"
            }}
          />
          {tempRange.from && !selectingStart && (
            <div className="mt-2 p-2 bg-muted rounded text-sm">
              Start: {format(tempRange.from, "MMM dd, yyyy")}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}