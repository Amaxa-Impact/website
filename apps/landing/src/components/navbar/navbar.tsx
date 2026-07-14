"use client";
import { MobileMenu } from "./mobile";

// Program sub-pages shown in the "Our Programs" dropdown (desktop) and
// nested under "Our Programs" in the mobile menu.
const programItems = [
  { href: "/programs/cohorts", label: "Cohorts" },
  { href: "/project/cross-border-access", label: "Cross-Border Access" },
  { href: "/programs/research", label: "Research" },
  { href: "/programs/partnerships", label: "Partnerships" },
];

const mobileNavItems = [
  { href: "/about-us", label: "About Us" },
  { href: "/programs", label: "Our Programs", children: programItems },
  { href: "/project", label: "Discover Projects" },
  { href: "/join-us", label: "Get Involved" },
  { href: "https://collect.crowded.me/collection/8d1ba838-a38e-4803-b155-d102b7b131e4", label: "Support Us" },
  { href: "/blog", label: "Blog" },
];

export function Navbar() {
  return (
    <>
      {/* Application banner */}
      <a
        href="https://airtable.com/appPR9mkslbn3U8YZ/shrHHUtRzK4DqKt3F"
        className="block bg-[#abc468] px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-black"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-center md:gap-1">
          <span>Application to an Ámaxa Pathway.</span>
          <span className="font-semibold underline">Apply here now!</span>
        </div>
      </a>

      {/* Desktop Nav — components/nav/dark-logo */}
      <nav
        className="hidden md:flex bg-[#100b1d] h-[80px] w-full items-center justify-between px-[40px] relative"
        style={{ zIndex: 50 }}
      >
        {/* Logo */}
        <a href="/" className="shrink-0">
          <img src="/images/logo/amaxa-logo.png" alt="ámaxa" className="h-[32px] w-auto" />
        </a>

        {/* Nav links */}
        <div className="flex gap-[36px] items-center text-white text-[16px] font-medium">
          <a href="/about-us" className="hover:text-white/70 transition-colors whitespace-nowrap">
            About Us
          </a>

          {/* Our Programs — dropdown (CSS hover, no JS needed) */}
          <div className="group relative">
            <a
              href="/programs"
              className="flex items-center gap-[6px] hover:text-white/70 transition-colors whitespace-nowrap"
              aria-haspopup="true"
            >
              Our Programs
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="transition-transform duration-200 group-hover:rotate-180"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </a>

            {/* Dropdown panel — shown on hover/focus via CSS */}
            <div
              className="invisible absolute left-0 top-full pt-3 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
              style={{ zIndex: 60 }}
            >
              <div className="min-w-[248px] rounded-2xl border border-white/10 bg-[#100b1d] py-2 shadow-2xl">
                {programItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="block px-5 py-2.5 text-[15px] font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <a href="/project" className="hover:text-white/70 transition-colors whitespace-nowrap">
            Discover Projects
          </a>

          <a href="/join-us" className="hover:text-white/70 transition-colors whitespace-nowrap">
            Get Involved
          </a>

          <a
            href="https://collect.crowded.me/collection/8d1ba838-a38e-4803-b155-d102b7b131e4"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white/70 transition-colors whitespace-nowrap"
          >
            Support Us
          </a>
          <a href="/blog" className="hover:text-white/70 transition-colors whitespace-nowrap">
            Blog
          </a>
        </div>

        {/* Apply now button — button/apply-now */}
        <a
          href="https://airtable.com/appPR9mkslbn3U8YZ/shrHHUtRzK4DqKt3F"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-[8px] px-[24px] py-[12px] rounded-[56px] font-semibold text-[16px] transition-opacity hover:opacity-90 whitespace-nowrap"
          style={{ background: "#ffd0c5", color: "#100b1d" }}
        >
          Apply now
        </a>
      </nav>

      {/* Mobile Nav */}
      <header className="flex h-[70px] items-center justify-between px-6 md:hidden bg-[#100b1d]">
        <a href="/">
          <img src="/images/logo/amaxa-logo.png" alt="ámaxa" className="h-[28px] w-auto" />
        </a>
        <MobileMenu navItems={mobileNavItems} />
      </header>
    </>
  );
}
