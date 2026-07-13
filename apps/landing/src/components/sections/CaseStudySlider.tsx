"use client";

import { useState } from "react";

interface CaseStudy {
  id: string;
  eyebrow?: string;
  title: string;
  category?: string;
  location?: string;
  year?: string;
  summary?: string;
  stats?: [{ value: string; label: string }, { value: string; label: string }];
  ctaLabel?: string;
  ctaHref?: string;
  imageSrc?: string;
}

interface Props {
  items: CaseStudy[];
}

export function CaseStudySlider({ items }: Props) {
  const [index, setIndex] = useState(0);
  const item = items[index];

  return (
    <div className="bg-neutral-1-500 w-full px-6 py-20 flex flex-col gap-9">
      {/* Slider row */}
      <div className="flex items-center gap-6 justify-center">
        {/* Prev */}
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="w-12 h-12 rounded-[24px] border border-border flex items-center justify-center text-xl text-purple-dark-500 disabled:opacity-40 shrink-0 hover:border-coral-dark-500 transition-colors"
        >
          ←
        </button>

        {/* Card */}
        <div className="relative flex-1 max-w-[1320px] rounded-[56px] overflow-hidden bg-purple-light-500 min-h-[600px]">
          {item.imageSrc && (
            <img
              src={item.imageSrc}
              alt={item.title}
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
          )}
          <div className="relative z-10 p-16 flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <span className="text-white">✦</span>
              <p className="text-base font-semibold text-white">{item.eyebrow ?? "Featured Project"}</p>
            </div>
            <h2 className="text-[48px] font-semibold text-white">{item.title}</h2>
            <div className="h-px bg-white/25 w-full" />
            {(item.category || item.location || item.year) && (
              <div className="flex items-center gap-6 flex-wrap">
                {item.category && <p className="text-base text-white/95">{item.category}</p>}
                {item.location && <p className="text-base text-white/95">{item.location}</p>}
                {item.year && <p className="text-base text-white/95">{item.year}</p>}
              </div>
            )}
            {item.summary && (
              <p className="text-[30px] text-white leading-[1.22]">{item.summary}</p>
            )}
            <div className="h-px bg-white/25 w-full" />
            {item.stats && (
              <div className="flex gap-8">
                {item.stats.map((stat, i) => (
                  <div key={i} className="flex flex-col gap-1.5 flex-1">
                    <p className="text-[36px] font-semibold text-white">{stat.value}</p>
                    <p className="text-sm text-white/85 leading-[1.35]">{stat.label}</p>
                  </div>
                ))}
              </div>
            )}
            <a
              href={item.ctaHref ?? "#"}
              className="inline-flex items-center border-[1.5px] border-white text-white text-base font-semibold px-6 py-3 rounded-full hover:bg-white hover:text-purple-light-500 transition-colors w-fit"
            >
              {item.ctaLabel ?? "Read case study"}
            </a>
          </div>
        </div>

        {/* Next */}
        <button
          onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))}
          disabled={index === items.length - 1}
          className="w-12 h-12 rounded-[24px] border border-border flex items-center justify-center text-xl text-purple-dark-500 disabled:opacity-40 shrink-0 hover:border-coral-dark-500 transition-colors"
        >
          →
        </button>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-3">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={[
              "w-2.5 h-2.5 rounded-full transition-colors",
              i === index ? "bg-coral-dark-500" : "bg-border",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}
