"use client";

import { useState } from "react";

interface ArticleItem {
  id: string;
  title: string;
  imageSrc?: string;
  href?: string;
}

interface Props {
  heading?: string;
  tagline?: string;
  items: ArticleItem[];
}

export function ArticleSlider({ heading = "Latest Stories", tagline = "Insights & stories from our community", items }: Props) {
  const [offset, setOffset] = useState(0);
  const cardWidth = 636 + 32; // card width + gap
  const visible = 2;
  const maxOffset = Math.max(0, items.length - visible);

  return (
    <div className="bg-neutral-1-500 w-full px-12 py-20 flex flex-col gap-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[40px] font-semibold text-purple-dark-500">{heading}</h2>
        <p className="text-[18px] text-purple-dark-500/70">{tagline}</p>
      </div>

      {/* Viewport */}
      <div className="overflow-hidden">
        <div
          className="flex gap-8 transition-transform duration-500"
          style={{ transform: `translateX(-${offset * cardWidth}px)` }}
        >
          {items.map((item) => (
            <a
              key={item.id}
              href={item.href ?? "#"}
              className="group shrink-0 w-[636px] h-[815px] bg-white rounded-[56px] overflow-hidden flex flex-col"
            >
              {/* Image */}
              <div className="relative h-[523px] bg-coral-light-500 overflow-hidden shrink-0">
                {item.imageSrc && (
                  <img
                    src={item.imageSrc}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex flex-col gap-7 px-14 pt-10 pb-8 flex-1">
                <h3 className="text-[42px] font-semibold text-purple-dark-500 leading-[1.1]">
                  {item.title}
                </h3>
                <div className="bg-coral-dark-500 flex items-center gap-2 px-6 py-2.5 rounded-full w-fit">
                  <span className="text-white font-normal text-base">Read more</span>
                  <span className="text-white text-sm">↗</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-end gap-4">
        <button
          onClick={() => setOffset((o) => Math.max(0, o - 1))}
          disabled={offset === 0}
          className="w-14 h-14 rounded-[28px] bg-white border border-border flex items-center justify-center text-[22px] text-purple-dark-500 disabled:opacity-40 hover:border-coral-dark-500 transition-colors"
        >
          ←
        </button>
        <button
          onClick={() => setOffset((o) => Math.min(maxOffset, o + 1))}
          disabled={offset >= maxOffset}
          className="w-14 h-14 rounded-[28px] bg-coral-dark-500 flex items-center justify-center text-[22px] text-white disabled:opacity-40 hover:bg-coral-dark-600 transition-colors"
        >
          →
        </button>
      </div>
    </div>
  );
}
