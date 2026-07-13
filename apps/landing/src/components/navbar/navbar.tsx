"use client";
import { MobileMenu } from "./mobile";

const mobileNavItems = [
  { href: "/who-we-are", label: "About Us" },
  { href: "/programs", label: "Our Programs" },
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
          <a href="/who-we-are" className="hover:text-white/70 transition-colors whitespace-nowrap">
            About Us
          </a>
          <a href="/programs" className="hover:text-white/70 transition-colors whitespace-nowrap">
            Our Programs
          </a>

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
