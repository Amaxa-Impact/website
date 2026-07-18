"use client";
import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqProps {
  title?: string;
  items?: FaqItem[];
}

const defaultItems: FaqItem[] = [
  {
    question: "What are cohorts?",
    answer: "Through our 3-month remote program, you work in a team of peers, guided by a coach, to effect measurable change through one of our 9 partner nonprofits or original initiatives.",
  },
  { question: "Who can join?", answer: "" },
  { question: "Is there a cost?", answer: "" },
  { question: "What's the time commitment?", answer: "" },
];

export function Faq({ title = "Frequently Asked Questions", items = defaultItems }: FaqProps) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="bg-neutral-1-500 w-full px-6 md:px-12 py-24 flex flex-col gap-10">
      <h2 className="font-semibold text-2xl md:text-3xl lg:text-[40px] text-foreground">{title}</h2>
      <div className="flex flex-col w-full">
        {items.map((item, i) => (
          <div
            key={i}
            className="border-b border-border py-7 flex flex-col gap-4"
          >
            <button
              className="flex items-center justify-between w-full text-left"
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
            >
              <span className="font-semibold text-[22px] text-foreground">{item.question}</span>
              <span className="font-medium text-[26px] text-coral-dark-500 select-none">
                {open === i ? "–" : "+"}
              </span>
            </button>
            {open === i && item.answer && (
              <p className="font-normal text-lg text-muted-foreground max-w-[900px] leading-relaxed">
                {item.answer}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
