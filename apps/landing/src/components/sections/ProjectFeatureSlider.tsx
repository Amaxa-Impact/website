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
    track.scrollBy({ left: dir === "right" ? 688 : -688, behavior: "smooth" });
  }

  return (
    <section className="bg-purple-dark-500 w-full px-12 py-20 flex flex-col gap-12 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-8">
        <h2 className="font-semibold text-[40px] text-white">{heading}</h2>
      </div>

      {/* Slider track */}
      <div
        ref={trackRef}
        className="flex gap-8 overflow-x-auto scrollbar-hidden snap-x snap-mandatory"
      >
        {slides.map((slide, i) => (
          <div key={i} className="flex flex-col gap-6 shrink-0 w-[656px] snap-start">
            <div className="bg-neutral-2-500 border-[5px] border-white rounded-[56px] h-[440px] w-full overflow-hidden">
              {slide.imageSrc && (
                <img src={slide.imageSrc} alt={slide.title} className="w-full h-full object-cover" />
              )}
            </div>
            <p className="font-semibold text-[30px] text-white leading-tight">{slide.title}</p>
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
