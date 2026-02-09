"use client";

type DateRange = "7d" | "30d" | "90d";

interface DateRangeFilterProps {
  selectedRange: DateRange;
  onRangeChange: (range: DateRange) => void;
}

const RANGES: { value: DateRange; label: string }[] = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
];

export function DateRangeFilter({
  selectedRange,
  onRangeChange,
}: DateRangeFilterProps) {
  return (
    <div className="flex gap-1">
      {RANGES.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onRangeChange(value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            selectedRange === value
              ? "bg-[#d4af37] text-black"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
