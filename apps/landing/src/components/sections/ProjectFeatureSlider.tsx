"use client";
import { useRef } from "react";

interface FeatureSlide {
  title: string;
  ctaLabel?: string;
  ctaHref?: string;
  imageSrc?: string;
}

interface ProjectFeatureSliderProps {
  heading?: string;
  slides?: FeatureSlide[];
}

const defaultSlides: FeatureSlide[] = [
  { title: "The case for investing in climate resilience", ctaLabel: "Read the interactive report", ctaHref: "#" },
  { title: "Cocoa Disrupted: New blueprints for a sustainable industry", ctaLabel: "Read the report", ctaHref: "#" },
  { title: "Investing in Education: Innovations for the sector", ctaLabel: "Read the report", ctaHref: "#" },
  { title: "Drivers of Income: How enterprises impact earning", ctaLabel: "Read the report", ctaHref: "#" },
];

export function ProjectFeatureSlider({
  heading = "Past projects with this partner",
  slides = defaultSlides,
}: ProjectFeatureSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scroll(dir: "left" | "right") {
    const track = trackRef.current;
    if (!track) return;
    // Cards resize across breakpoints, so measure rather than assume a width.
    const card = track.firstElementChild;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const step = card ? card.getBoundingClientRect().width + gap : track.clientWidth;
    track.scrollBy({ left: dir === "right" ? step : -step, behavior: "smooth" });
  }

  return (
    <section className="bg-purple-dark-500 w-full px-6 py-14 flex flex-col gap-8 overflow-hidden md:px-12 md:py-20 md:gap-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-8">
        <h2 className="font-semibold text-2xl text-white md:text-[40px]">{heading}</h2>
      </div>

      {/* Slider track */}
      <div
        ref={trackRef}
        className="flex gap-6 overflow-x-auto scrollbar-hidden snap-x snap-mandatory md:gap-8"
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            className="flex flex-col gap-4 shrink-0 w-[calc(100vw-3rem)] max-w-[656px] snap-start md:w-[656px] md:gap-6"
          >
            <div className="bg-neutral-2-500 border-2 border-white rounded-3xl h-[240px] w-full overflow-hidden sm:h-[320px] md:border-[5px] md:rounded-[56px] md:h-[440px]">
              {slide.imageSrc && (
                <img src={slide.imageSrc} alt={slide.title} className="w-full h-full object-cover" />
              )}
            </div>
            <p className="font-semibold text-xl text-white leading-tight md:text-[30px]">{slide.title}</p>
            <a
              href={slide.ctaHref ?? "#"}
              className="inline-flex items-center gap-2 border-[1.5px] border-white rounded-full px-6 py-3 text-base font-semibold text-white hover:bg-white hover:text-purple-dark-500 transition-colors w-fit"
            >
              {slide.ctaLabel} →
            </a>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-4 items-center justify-end">
        <button
          onClick={() => scroll("left")}
          aria-label="Previous"
          className="size-12 rounded-[24px] border border-border flex items-center justify-center text-white text-xl hover:bg-white/10 transition-colors"
        >
          ←
        </button>
        <button
          onClick={() => scroll("right")}
          aria-label="Next"
          className="size-12 rounded-[24px] border border-border flex items-center justify-center text-white text-xl hover:bg-white/10 transition-colors"
        >
          →
        </button>
      </div>
    </section>
  );
}
