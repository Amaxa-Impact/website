"use client";
import { useState } from "react";

const links = [
  { label: "Projects", href: "/project" },
  { label: "Pathways", href: "/pathways" },
  { label: "Stories", href: "/project-stories" },
  { label: "Contact", href: "/contact-us" },
];

export function NavLight() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-background flex h-20 items-center justify-between px-10 w-full">
      <a
        href="/"
        className="font-semibold text-xl text-foreground leading-none"
      >
        ámaxa
      </a>

      {/* Desktop */}
      <div className="hidden md:flex gap-10 items-center">
        <div className="flex gap-9 items-center font-medium text-base text-foreground">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-coral-dark-500 transition-colors">
              {l.label}
            </a>
          ))}
        </div>
        <a
          href="/programs/cohorts"
          className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-semibold bg-coral-dark-500 text-white hover:bg-coral-dark-600 transition-colors"
        >
          Apply now
        </a>
      </div>

      {/* Mobile toggle */}
      <button
        className="md:hidden text-foreground"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        <span className="text-2xl">{open ? "✕" : "☰"}</span>
      </button>

      {/* Mobile menu */}
      {open && (
        <div className="absolute top-20 left-0 right-0 bg-background border-t border-border flex flex-col gap-4 px-8 py-6 z-50 md:hidden">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="font-medium text-base text-foreground hover:text-coral-dark-500">
              {l.label}
            </a>
          ))}
          <a
            href="/programs/cohorts"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-semibold bg-coral-dark-500 text-white hover:bg-coral-dark-600 transition-colors w-fit"
          >
            Apply now
          </a>
        </div>
      )}
    </nav>
  );
}
