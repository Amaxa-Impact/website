"use client";
import { useState } from "react";

interface FilterChipsProps {
  chips: string[];
  onChange?: (active: string) => void;
}

export function FilterChips({ chips = ["All", "Accessible Education", "Humanitarian Aid", "Mental Health", "Women and Girls", "Platforming Diverse Voices", "Climate Change"], onChange }: FilterChipsProps) {
  const [active, setActive] = useState(chips[0] ?? "All");

  function select(chip: string) {
    setActive(chip);
    onChange?.(chip);
  }

  return (
    <div className="flex flex-wrap gap-3">
      {chips.map((chip) => (
        <button
          key={chip}
          onClick={() => select(chip)}
          className={
            "px-5 py-2.5 rounded-full text-base font-medium transition-colors " +
            (chip === active
              ? "bg-coral-dark-500 text-white"
              : "border border-border text-foreground hover:border-coral-dark-400 hover:text-coral-dark-500")
          }
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
