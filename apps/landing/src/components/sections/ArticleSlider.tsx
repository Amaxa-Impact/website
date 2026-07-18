"use client";

import { useEffect, useRef, useState } from "react";

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
  const trackRef = useRef<HTMLDivElement>(null);
  // Cards resize across breakpoints, so measure the real step and how many
  // cards fit instead of assuming the desktop 636px + 32px gap / 2 visible.
  const [step, setStep] = useState(636 + 32);
  const [visible, setVisible] = useState(2);

  useEffect(() => {
    function measure() {
      const track = trackRef.current;
      const card = track?.firstElementChild as HTMLElement | null;
      if (!track || !card) return;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      const cardWidth = card.getBoundingClientRect().width;
      setStep(cardWidth + gap);
      setVisible(Math.max(1, Math.floor((track.clientWidth + gap) / (cardWidth + gap))));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [items.length]);

  const maxOffset = Math.max(0, items.length - visible);
  // Keep the offset valid when the visible count grows on resize.
  useEffect(() => {
    setOffset((o) => Math.min(o, maxOffset));
  }, [maxOffset]);

  return (
    <div className="bg-neutral-1-500 w-full px-6 md:px-12 py-20 flex flex-col gap-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl lg:text-[40px] font-semibold text-purple-dark-500">{heading}</h2>
        <p className="text-[18px] text-purple-dark-500/70">{tagline}</p>
      </div>

      {/* Viewport */}
      <div className="overflow-hidden">
        <div
          ref={trackRef}
          className="flex gap-8 transition-transform duration-500"
          style={{ transform: `translateX(-${offset * step}px)` }}
        >
          {items.map((item) => (
            <a
              key={item.id}
              href={item.href ?? "#"}
              className="group shrink-0 w-[calc(100vw-3rem)] max-w-[636px] md:w-[636px] bg-white rounded-3xl md:rounded-[56px] overflow-hidden flex flex-col"
            >
              {/* Image */}
              <div className="relative aspect-[636/523] bg-coral-light-500 overflow-hidden shrink-0">
                {item.imageSrc && (
                  <img
                    src={item.imageSrc}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex flex-col gap-5 px-6 pt-6 pb-6 flex-1 md:gap-7 md:px-14 md:pt-10 md:pb-8">
                <h3 className="text-2xl md:text-3xl lg:text-[42px] font-semibold text-purple-dark-500 leading-[1.1]">
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
