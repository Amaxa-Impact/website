"use client";

import { useState } from "react";

interface FeatureItem {
  id: string;
  title: string;
  subtitle?: string;
  imageSrc?: string;
  href?: string;
}

interface Props {
  heading?: string;
  subhead?: string;
  items: FeatureItem[];
  perPage?: number;
}

export function FeatureSlider2({ heading = "Our Projects", subhead, items, perPage = 2 }: Props) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(items.length / perPage);
  const visible = items.slice(page * perPage, page * perPage + perPage);

  return (
    <div className="bg-purple-dark-500 w-full px-12 py-[100px] overflow-hidden">
      <div className="flex flex-col gap-10">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <h2 className="text-[40px] font-semibold text-white leading-tight">{heading}</h2>
          {subhead && <p className="text-xl text-white/80 max-w-[1056px] leading-relaxed">{subhead}</p>}
        </div>

        {/* Cards — 2 filling the width */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {visible.map((item) => (
            <a
              key={item.id}
              href={item.href ?? "#"}
              className="group flex flex-col gap-5 min-w-0"
            >
              {/* Image */}
              <div className="w-full h-[440px] rounded-[56px] bg-neutral-2-500 border-[5px] border-white overflow-hidden">
                {item.imageSrc && (
                  <img
                    src={item.imageSrc}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
              </div>

              {/* Info */}
              <div className="flex flex-col gap-2">
                <p className="text-[26px] font-semibold text-white leading-snug">{item.title}</p>
                {item.subtitle && (
                  <p className="text-base text-white/70 leading-relaxed">{item.subtitle}</p>
                )}
              </div>

              {/* Arrow button */}
              <div className="bg-white text-purple-dark-500 w-14 h-9 rounded-full flex items-center justify-center text-base font-semibold group-hover:bg-neutral-1-500 transition-colors">
                ↗
              </div>
            </a>
          ))}
        </div>

        {/* Controls */}
        {totalPages > 1 && (
          <div className="flex gap-4 justify-end">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="w-12 h-12 rounded-[24px] border border-border flex items-center justify-center text-xl text-white disabled:opacity-40"
              aria-label="Previous"
            >
              ←
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="w-12 h-12 rounded-[24px] border border-border flex items-center justify-center text-xl text-white disabled:opacity-40"
              aria-label="Next"
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
