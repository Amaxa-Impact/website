"use client";

import { useState } from "react";

interface PartnerItem {
  id: string;
  name: string;
  location?: string;
  imageSrc?: string;
  href?: string;
}

interface Props {
  heading?: string;
  items: PartnerItem[];
  perPage?: number;
}

export function PartnerFeatureSlider({ heading = "Ámaxa Community Partners", items, perPage = 4 }: Props) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(items.length / perPage);
  const visible = items.slice(page * perPage, page * perPage + perPage);

  return (
    <div className="bg-purple-dark-500 w-full px-12 py-[100px] overflow-hidden">
      <div className="flex flex-col gap-12">
        <h2 className="text-[40px] font-semibold text-white">{heading}</h2>

        <div className="flex gap-8">
          {visible.map((item) => (
            <a
              key={item.id}
              href={item.href ?? "#"}
              className="group flex flex-col gap-6 flex-1 min-w-0"
            >
              {/* Image placeholder */}
              <div className="w-full h-[440px] rounded-[56px] bg-neutral-2-500 border-[5px] border-white overflow-hidden">
                {item.imageSrc && (
                  <img
                    src={item.imageSrc}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
              </div>

              {/* Info */}
              <div className="flex flex-col gap-1">
                <p className="text-[30px] font-semibold text-white leading-normal">{item.name}</p>
                {item.location && (
                  <p className="text-2xl text-white tracking-[-0.02em]">{item.location}</p>
                )}
              </div>

              {/* Arrow button */}
              <div className="bg-white text-purple-dark-500 w-14 h-9 rounded-full flex items-center justify-center text-base font-semibold hover:bg-neutral-1-500 transition-colors">
                ↗
              </div>
            </a>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex gap-4 justify-end">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="w-12 h-12 rounded-[24px] border border-border flex items-center justify-center text-xl text-white disabled:opacity-40"
            >
              ←
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="w-12 h-12 rounded-[24px] border border-border flex items-center justify-center text-xl text-white disabled:opacity-40"
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
