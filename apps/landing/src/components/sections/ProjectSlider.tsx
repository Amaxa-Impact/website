"use client";

import { useState } from "react";

interface ProjectItem {
  id: string;
  title: string;
  partner: string;
  imageSrc?: string;
  href?: string;
}

interface Props {
  heading?: string;
  items: ProjectItem[];
  perPage?: number;
}

export function ProjectSlider({ heading = "Our Projects", items, perPage = 3 }: Props) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(items.length / perPage);
  const visible = items.slice(page * perPage, page * perPage + perPage);

  return (
    <div className="bg-neutral-1-500 w-full px-12 py-10 flex flex-col gap-7">
      <h2 className="text-[36px] font-semibold text-purple-dark-500">{heading}</h2>

      <div className="grid grid-cols-3 gap-8">
        {visible.map((item) => (
          <a
            key={item.id}
            href={item.href ?? "#"}
            className="group relative flex flex-col justify-end items-end overflow-hidden rounded-[56px] bg-neutral-2-500 border-[5px] border-white h-[540px] p-7 transition-transform hover:-translate-y-1"
          >
            {item.imageSrc && (
              <img
                src={item.imageSrc}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="relative z-10 flex flex-col items-end gap-4 w-full">
              <div className="text-white w-full flex flex-col gap-3">
                <p className="text-[30px] font-bold leading-[1.18]">{item.title}</p>
                {item.partner && (
                  <p className="text-[18px] font-semibold tracking-[0.06em]">{item.partner}</p>
                )}
              </div>
              <div className="bg-coral-dark-500 flex items-center gap-2 px-6 py-3 rounded-full shrink-0">
                <p className="text-base font-semibold text-white uppercase tracking-wide">Projects</p>
                <span className="text-white text-sm">↗</span>
              </div>
            </div>
          </a>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-end gap-3 mt-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="w-14 h-14 rounded-[28px] border border-border flex items-center justify-center text-[22px] text-purple-dark-500 disabled:opacity-40 hover:border-coral-dark-500 transition-colors"
          >
            ←
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="w-14 h-14 rounded-[28px] bg-coral-dark-500 flex items-center justify-center text-[22px] text-white disabled:opacity-40 hover:bg-coral-dark-600 transition-colors"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
