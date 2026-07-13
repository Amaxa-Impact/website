"use client";

const navLinks = [
  { label: "About Us", href: "/who-we-are" },
  { label: "Our Program", href: "/pathways/cohorts" },
  { label: "Discover Projects", href: "/project" },
  {
    label: "Support Us",
    href: "https://collect.crowded.me/collection/8d1ba838-a38e-4803-b155-d102b7b131e4",
    external: true,
  },
  { label: "Blog", href: "/blog" },
];

const socials = [
  {
    label: "Ámaxa on Instagram",
    href: "https://www.instagram.com/amaxaimpact/?hl=en",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-[18px]" aria-hidden="true">
        <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 3.5a6.34 6.34 0 1 0 0 12.68 6.34 6.34 0 0 0 0-12.68Zm0 10.46a4.12 4.12 0 1 1 0-8.24 4.12 4.12 0 0 1 0 8.24Zm6.6-10.7a1.48 1.48 0 1 1-2.96 0 1.48 1.48 0 0 1 2.96 0Z" />
      </svg>
    ),
  },
  {
    label: "Ámaxa on Facebook",
    href: "https://www.facebook.com/amaxaimpact/",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-[18px]" aria-hidden="true">
        <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
      </svg>
    ),
  },
  {
    label: "Ámaxa on LinkedIn",
    href: "https://www.linkedin.com/company/amaxaimpact/posts/?feedView=all",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-[17px]" aria-hidden="true">
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.8 0 0 .78 0 1.74v20.52C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.74V1.74C24 .78 23.2 0 22.22 0Z" />
      </svg>
    ),
  },
  {
    label: "Ámaxa on TikTok",
    href: "https://www.tiktok.com/@amaxaimpact",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-[17px]" aria-hidden="true">
        <path d="M19.32 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.2v13.67a2.9 2.9 0 0 1-5.2 1.74 2.9 2.9 0 0 1 3.8-4.18v-3.3a6.2 6.2 0 1 0 4.6 5.98V8.69a8.03 8.03 0 0 0 4.65 1.49V6.98a4.83 4.83 0 0 1-.88-.29Z" />
      </svg>
    ),
  },
];

export const Footer = () => {
  return (
    <footer className="w-full bg-purple-dark-900">
      <div className="mx-auto max-w-[1120px] px-6 py-16 md:py-20">
        {/* Top row: logo + nav + apply */}
        <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:justify-between">
          <a href="/" className="shrink-0 transition-opacity hover:opacity-80">
            <img src="/images/logo/amaxa-logo.png" alt="ámaxa" className="h-[52px] w-auto" />
          </a>

          <div className="flex flex-col items-center gap-6 md:flex-row md:gap-8">
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  className="text-[15px] font-medium whitespace-nowrap text-white transition-colors hover:text-white/70"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <a
              href="https://airtable.com/appPR9mkslbn3U8YZ/shrHHUtRzK4DqKt3F"
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold whitespace-nowrap transition-opacity hover:opacity-90"
              style={{ background: "#ffd0c5", color: "#100b1d" }}
            >
              Apply now ↗
            </a>
          </div>
        </div>

        {/* Email */}
        <div className="mt-14 flex items-center justify-center gap-3 md:justify-start">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-[22px] text-white"
            aria-hidden="true"
          >
            <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
            <path d="m3 6 9 6.5L21 6" />
          </svg>
          <a
            href="mailto:hello@amaxaimpact.org"
            className="text-[15px] font-medium text-white transition hover:text-white/70"
          >
            hello@amaxaimpact.org
          </a>
        </div>

        {/* Socials */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:justify-start">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              aria-label={s.label}
              className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              {s.icon}
            </a>
          ))}
        </div>

        {/* Divider */}
        <div className="mt-12 h-px w-full bg-white/20" />

        {/* Copyright */}
        <p className="mt-8 text-center text-sm text-white/80">
          © {new Date().getFullYear()} Ámaxa. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
