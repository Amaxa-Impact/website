const col1 = [
  { label: "Meet Ámaxa", href: "/about-us" },
  { label: "Our Stories", href: "/project-stories" },
  { label: "Our Blog", href: "/blog" },
];
const col2 = [
  { label: "Discover Projects", href: "/project" },
  { label: "Contact Us", href: "/contact-us" },
  { label: "Careers", href: "/careers" },
];
const col3 = [
  { label: "Explore Pathways", href: "/pathways" },
  { label: "Support Us", href: "/contact-us" },
  { label: "Privacy Policy", href: "/privacy-policy" },
];

const socials = [
  { label: "Instagram", href: "https://www.instagram.com/amaxaimpact/", icon: "IG" },
  { label: "Facebook", href: "#", icon: "f" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/amaxaimpact/", icon: "in" },
  { label: "TikTok", href: "#", icon: "TT" },
  { label: "Website", href: "https://www.amaxaimpact.org", icon: "🌐" },
];

export function SiteFooter() {
  return (
    <footer className="bg-foreground w-full py-18 px-10">
      <div className="max-w-[1120px] mx-auto flex flex-col gap-10">
        {/* Top row */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-10">
          {/* Brand */}
          <div className="flex flex-col gap-4 items-center">
            <span className="font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-background leading-none">ámaxa</span>
            <p className="font-normal text-base text-background text-center w-80">
              Empowering the next generation of changemakers
            </p>
          </div>

          {/* Nav columns */}
          <div className="flex gap-14 font-medium text-base text-background whitespace-nowrap">
            <div className="flex flex-col gap-5">
              {col1.map((l) => (
                <a key={l.href} href={l.href} className="hover:text-coral-light-400 transition-colors">
                  {l.label}
                </a>
              ))}
            </div>
            <div className="flex flex-col gap-5">
              {col2.map((l) => (
                <a key={l.href} href={l.href} className="hover:text-coral-light-400 transition-colors">
                  {l.label}
                </a>
              ))}
            </div>
            <div className="flex flex-col gap-5">
              {col3.map((l) => (
                <a key={l.href} href={l.href} className="hover:text-coral-light-400 transition-colors">
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Email */}
        <div className="flex gap-3 items-center justify-center">
          <span className="text-background text-lg">✉</span>
          <a
            href="mailto:lauren@amaxaimpact.org"
            className="font-semibold text-base text-background hover:underline"
          >
            lauren@amaxaimpact.org
          </a>
        </div>

        {/* Socials */}
        <div className="flex gap-3 items-center justify-center">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              className="size-10 rounded-full bg-white/10 flex items-center justify-center text-background text-sm hover:bg-white/20 transition-colors"
            >
              {s.icon}
            </a>
          ))}
        </div>

        {/* Divider + copyright */}
        <div className="border-t border-background/20 pt-6 flex justify-center">
          <p className="font-normal text-sm text-background">
            © 2026 Ámaxa. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
