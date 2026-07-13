"use client";

import { useState, useMemo } from "react";
import type { ProjectCard } from "@/lib/project-cards";
import { PROJECT_ISSUES } from "@/lib/project-cards";

interface Props {
  cards: ProjectCard[];
}

export function ProjectsGrid({ cards }: Props) {
  const [active, setActive] = useState<string | null>(null);

  const filtered = useMemo(
    () => (active ? cards.filter((c) => c.issues.includes(active)) : cards),
    [active, cards],
  );

  return (
    <div className="flex flex-col gap-10">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-3">
        {PROJECT_ISSUES.map((issue) => {
          const isActive = active === issue;
          return (
            <button
              key={issue}
              onClick={() => setActive(isActive ? null : issue)}
              className={[
                "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-coral-dark-500 text-white"
                  : "border border-border text-foreground hover:border-coral-dark-500 hover:text-coral-dark-500",
              ].join(" ")}
            >
              {issue}
            </button>
          );
        })}
        {active && (
          <button
            onClick={() => setActive(null)}
            className="rounded-full border border-dashed border-neutral-2-600 px-5 py-2 text-sm text-muted-foreground transition-colors hover:border-coral-dark-500 hover:text-coral-dark-500"
          >
            Clear ×
          </button>
        )}
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((card) => (
          <a
            key={card.id}
            href={card.link}
            className="group relative flex flex-col overflow-hidden rounded-[40px] transition-transform hover:-translate-y-1"
          >
            {/* Image */}
            <div className="relative h-[360px] overflow-hidden bg-neutral-2-500">
              {card.src && (
                <img
                  src={card.src}
                  alt={card.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col gap-3 bg-neutral-2-500 px-7 pb-8 pt-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-purple-dark-400">
                {card.category}
              </p>
              <h3 className="text-xl font-semibold leading-snug text-purple-dark-500">
                {card.title}
              </h3>
              <div className="mt-auto flex flex-wrap gap-2 pt-3">
                {card.issues.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-purple-dark-200 px-3 py-1 text-xs text-purple-dark-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </a>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-16 text-center text-muted-foreground">
          No projects match that filter.
        </p>
      )}
    </div>
  );
}
