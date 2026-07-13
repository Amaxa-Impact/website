#!/usr/bin/env node
/**
 * Ámaxa CMS Sync
 * Reads Obsidian markdown files → rewrites Astro pages
 *
 * Run manually:  node scripts/sync-cms.mjs
 * Run via watch: node scripts/watch-cms.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const CMS_DIR =
  "/Users/laurenmcmillen/Downloads/manager/amaxa/DOCS/Website/CMS";
const PAGES_DIR = path.join(REPO_ROOT, "apps/landing/src/pages");

// ─── YAML FRONTMATTER PARSER ───────────────────────────────────────────────

function parseFrontmatter(fileContent) {
  const match = fileContent.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  return parseYAML(match[1]);
}

function parseYAML(yaml) {
  const result = {};
  const lines = yaml.split("\n");
  let i = 0;

  const parseVal = (raw) => {
    raw = raw.trim();
    if (
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
    ) {
      return raw.slice(1, -1);
    }
    return raw;
  };

  const nextIsArray = (idx) =>
    idx + 1 < lines.length && /^\s+-/.test(lines[idx + 1]);

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) {
      i++;
      continue;
    }

    const kvMatch = line.match(/^([a-z][a-z_0-9]*):\s*(.*)$/);
    if (!kvMatch) {
      i++;
      continue;
    }

    const [, key, rawVal] = kvMatch;

    if (!rawVal.trim() && nextIsArray(i)) {
      i++;
      const items = [];

      while (i < lines.length) {
        const al = lines[i];
        if (!al.trim() || (!/^\s/.test(al) && !al.startsWith(" "))) break;

        // Start of new object item (two-space indent + dash)
        const objStart = al.match(/^ {2}-\s+([a-z][a-z_0-9]*):\s*(.*)$/);
        // Continuation property of an object item (four-space indent)
        const objProp = al.match(/^ {4}([a-z][a-z_0-9]*):\s*(.*)$/);
        // Simple string item
        const simple = al.match(/^ {2}-\s+(.+)$/);

        if (objStart) {
          const obj = {};
          obj[objStart[1]] = parseVal(objStart[2]);
          items.push(obj);
        } else if (
          objProp &&
          items.length > 0 &&
          typeof items[items.length - 1] === "object"
        ) {
          items[items.length - 1][objProp[1]] = parseVal(objProp[2]);
        } else if (simple && !(simple[1].includes(":"))) {
          items.push(parseVal(simple[1]));
        }
        i++;
      }

      result[key] = items;
    } else {
      result[key] = parseVal(rawVal);
      i++;
    }
  }

  return result;
}

// ─── HELPERS ───────────────────────────────────────────────────────────────

/** Use value if non-empty, else fallback */
const v = (val, fallback = "") =>
  val && String(val).trim() ? String(val) : fallback;

/** Escape for Astro/JSX attribute (inside double-quoted string) */
const a = (val, fallback = "") =>
  v(val, fallback).replace(/\\/g, "\\\\").replace(/"/g, '\\"');

/** Astro array literal from array of objects */
function astroArray(items = [], fields = []) {
  if (!items.length) return "[]";
  const rows = items
    .map((item) => {
      if (typeof item === "string") return `        "${item.replace(/"/g, '\\"')}"`;
      const props = fields
        .map((f) => `          ${f}: "${a(item[f])}"`)
        .join(",\n");
      return `        {\n${props}\n        }`;
    })
    .join(",\n");
  return `[\n${rows}\n      ]`;
}

/** Write file only if content changed */
function writeIfChanged(filePath, content) {
  const existing = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf8")
    : null;
  if (existing === content) {
    console.log(`  unchanged  ${path.relative(REPO_ROOT, filePath)}`);
    return false;
  }
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`  updated    ${path.relative(REPO_ROOT, filePath)}`);
  return true;
}

// ─── PAGE GENERATORS ───────────────────────────────────────────────────────

function generateAboutUs(cms) {
  const steps = (cms.how_it_works_steps || []).slice(0, 4);
  while (steps.length < 4)
    steps.push({ number: `STEP 0${steps.length + 1}`, heading: "", description: "" });

  const barriers = (cms.barriers || []).slice(0, 6);
  while (barriers.length < 6)
    barriers.push({ question: "", answer: "" });

  const members = (cms.team_members || []).slice(0, 6);

  const stepsLiteral = steps
    .map(
      (s) =>
        `        { number: "${a(s.number)}", heading: "${a(s.heading)}", description: "${a(s.description)}" }`
    )
    .join(",\n");

  const barriersLiteral = barriers
    .map(
      (b) =>
        `        {\n          question: "${a(b.question)}",\n          answer: "${a(b.answer)}",\n        }`
    )
    .join(",\n");

  const membersLiteral = members.length
    ? members
        .map(
          (m) =>
            `        { name: "${a(m.name)}", role: "${a(m.role)}", imageSrc: "${a(m.image_src)}", linkedinHref: "${a(m.linkedin_href)}", tone: "coral" }`
        )
        .join(",\n")
    : `        { name: "Team Member", role: "Co-founder", tone: "coral" },
        { name: "Team Member", role: "Program Manager", tone: "lavender" },
        { name: "Team Member", role: "Community Coach", tone: "coral" }`;

  return `---
import AppLayout from "@/layouts/app-layout.astro";
import IntroMedia from "@/components/sections/IntroMedia.astro";
import StatementBar from "@/components/sections/StatementBar.astro";
import { Faq } from "@/components/sections/Faq";
import HowItWorks from "@/components/sections/HowItWorks.astro";
import TeamGrid from "@/components/sections/TeamGrid.astro";
import ImpactStats from "@/components/sections/ImpactStats.astro";
import SplitMedia from "@/components/sections/SplitMedia.astro";
import StatementDark from "@/components/sections/StatementDark.astro";
import PartnerLogos from "@/components/sections/PartnerLogos.astro";
import { NewsletterCta } from "@/components/sections/NewsletterCta";
import ContactForm from "@/components/sections/ContactForm.astro";
---

<AppLayout
  seo={{
    title: "${a(cms.intro_heading, "About Ámaxa — Our Mission")}",
    description: "${a(cms.intro_subhead, "Ámaxa is a student-led international virtual exchange program.")}",
    image: "https://b47pkz22xs.ufs.sh/f/OxFTTzjZGToOexh9L5yvrS3NH5LD0fGBOXwFydpiVbYzJMa1",
    type: "website",
    canonicalURL: "https://www.amaxaimpact.org/who-we-are",
    keywords: ["amaxa", "about", "mission", "impact"],
    noIndex: false,
  }}
>
  <main>

    <IntroMedia
      heading="${a(cms.intro_heading, "Ámaxa's Mission")}"
      subhead="${a(cms.intro_subhead, "A student-led international virtual exchange program, bringing extracurricular learning to students without access around the globe.")}"
    />

    <StatementBar
      eyebrow="${a(cms.statement_eyebrow, "WHAT WE DO")}"
      statement="${a(cms.statement_text, "We connect people to grassroots organizations and initiatives doing community-based work in human rights, education, equity, and more — and help them contribute meaningfully through fully remote programs.")}"
    />

    <Faq
      client:load
      title="${a(cms.barriers_title, "What's stopping you from making an impact?")}"
      items={[
${barriersLiteral}
      ]}
    />

    <HowItWorks
      title="${a(cms.how_it_works_title, "How Ámaxa Works")}"
      steps={[
${stepsLiteral}
      ]}
    />

    <!-- Pathways -->
    <section class="bg-neutral-1-500 w-full px-12 py-20 flex flex-col gap-12">
      <h2 class="font-semibold text-[40px] text-purple-dark-500">Our Pathways</h2>
      <div class="flex gap-8">
        <div class="flex-1 rounded-[56px] bg-coral-light-500 border-[5px] border-white p-10 flex flex-col gap-6 min-h-[420px]">
          <p class="text-sm font-semibold tracking-[1.12px] text-coral-dark-500">${a(cms.pathway_1_eyebrow, "FOR HIGH SCHOOL STUDENTS")}</p>
          <h3 class="font-semibold text-[34px] text-purple-dark-500 leading-tight">${a(cms.pathway_1_title, "Ámaxa Cohorts")}</h3>
          <p class="text-lg text-purple-dark-500/80 leading-relaxed flex-1">${a(cms.pathway_1_body, "Join a 3-month remote program. Work in a team, get coached, and deliver real impact for a partner nonprofit.")}</p>
          <a href="${a(cms.pathway_1_cta_href, "/pathways/cohorts")}" class="inline-flex items-center gap-2 bg-purple-dark-500 hover:bg-purple-dark-600 text-white rounded-full px-6 py-3 text-base font-semibold transition-colors w-fit">
            ${a(cms.pathway_1_cta_label, "Learn more")} →
          </a>
        </div>
        <div class="flex-1 rounded-[56px] bg-neutral-2-500 border-[5px] border-white p-10 flex flex-col gap-6 min-h-[420px]">
          <p class="text-sm font-semibold tracking-[1.12px] text-purple-light-500">${a(cms.pathway_2_eyebrow, "FOR UNIVERSITY STUDENTS · LAUNCHING 2026")}</p>
          <h3 class="font-semibold text-[34px] text-purple-dark-500 leading-tight">${a(cms.pathway_2_title, "Ámaxa Research")}</h3>
          <p class="text-lg text-purple-dark-500/80 leading-relaxed flex-1">${a(cms.pathway_2_body, "Lead original research for grassroots nonprofits and bring rigorous academic thinking to real-world challenges.")}</p>
          <a href="${a(cms.pathway_2_cta_href, "/pathways/research")}" class="inline-flex items-center gap-2 border-[1.5px] border-purple-dark-500 hover:bg-purple-dark-500 hover:text-white text-purple-dark-500 rounded-full px-6 py-3 text-base font-semibold transition-colors w-fit">
            ${a(cms.pathway_2_cta_label, "Learn more")} →
          </a>
        </div>
        <div class="flex-1 rounded-[56px] bg-neutral-2-500 border-[5px] border-white p-10 flex flex-col gap-6 min-h-[420px]">
          <p class="text-sm font-semibold tracking-[1.12px] text-purple-light-500">${a(cms.pathway_3_eyebrow, "FOR PROFESSIONALS · LAUNCHING 2026")}</p>
          <h3 class="font-semibold text-[34px] text-purple-dark-500 leading-tight">${a(cms.pathway_3_title, "Ámaxa Partnerships")}</h3>
          <p class="text-lg text-purple-dark-500/80 leading-relaxed flex-1">${a(cms.pathway_3_body, "Leverage your professional expertise to support grassroots organizations.")}</p>
          <a href="${a(cms.pathway_3_cta_href, "/pathways/partnerships")}" class="inline-flex items-center gap-2 border-[1.5px] border-purple-dark-500 hover:bg-purple-dark-500 hover:text-white text-purple-dark-500 rounded-full px-6 py-3 text-base font-semibold transition-colors w-fit">
            ${a(cms.pathway_3_cta_label, "Learn more")} →
          </a>
        </div>
      </div>
    </section>

    <TeamGrid
      heading="${a(cms.team_heading, "Our Team")}"
      subhead="${a(cms.team_subhead, "Meet the people behind Ámaxa's work.")}"
      members={[
${membersLiteral}
      ]}
    />

    <StatementBar
      eyebrow="${a(cms.partners_eyebrow, "OUR PARTNERS")}"
      statement="${a(cms.partners_statement, "Nine nonprofit partners and original Ámaxa initiatives. Our partners in the West Bank, Uganda, and Liberia expand access to education; in Gaza and Ukraine they deliver humanitarian aid.")}"
    />

    <ImpactStats
      title="${a(cms.stats_title, "What we've done")}"
      stats={[
        { number: "${a(cms.stat_1_number, "300+")}", label: "${a(cms.stat_1_label, "applications received")}" },
        { number: "${a(cms.stat_2_number, "52+")}", label: "${a(cms.stat_2_label, "countries represented")}" },
        { number: "${a(cms.stat_3_number, "120+")}", label: "${a(cms.stat_3_label, "students completed programs")}" },
        { number: "${a(cms.stat_4_number, "9")}", label: "${a(cms.stat_4_label, "nonprofit partners")}" },
      ]}
      ctaLabel="${a(cms.stats_cta_label, "See our projects")}"
      ctaHref="${a(cms.stats_cta_href, "/project")}"
    />

    <SplitMedia
      heading="${a(cms.stories_heading, "Platforming refugee stories")}"
      subhead="${a(cms.stories_subhead, "Ámaxa students worked with displaced filmmakers to create 'Won't Be Displaced' — a documentary series amplifying voices from conflict zones.")}"
      ctaLabel="${a(cms.stories_cta_label, "Watch the film")}"
      ctaHref="${a(cms.stories_cta_href, "/project")}"
      panelSide="right"
      large={true}
    />

    <StatementDark
      statement="${a(cms.statement_dark_heading, "In 2026, how can we plant more seeds?")}"
      body="${a(cms.statement_dark_body, "We're expanding Ámaxa's pathways to reach more students, support more nonprofits, and build a generation of changemakers.")}"
    />

    <PartnerLogos caption="${a(cms.partners_eyebrow, "Partner nonprofits in Palestine, Uganda, Liberia & beyond")}" />

    <NewsletterCta client:load />

    <ContactForm
      address="Ámaxa Impact"
      addressLine2="amaxaimpact.org"
      hours="Questions? Reach out anytime."
      hoursLine2="We respond within 48 hours."
      email="${a(cms.contact_email, "hello@amaxaimpact.org")}"
    />

  </main>
</AppLayout>
`;
}

function generateCohorts(cms) {
  const steps = (cms.how_it_works_steps || []).slice(0, 4);
  while (steps.length < 4)
    steps.push({ number: `STEP 0${steps.length + 1}`, heading: "", description: "" });

  const testimonials = (cms.testimonials || []).slice(0, 3);
  while (testimonials.length < 3)
    testimonials.push({ quote: "", name: "", cohort_info: "" });

  const faqs = (cms.faq_items || []).slice(0, 6);
  const threeUp = (cms.three_up_items || []).slice(0, 3);
  while (threeUp.length < 3)
    threeUp.push({ title: "", body: "", link_label: "", link_href: "" });

  const stepsLiteral = steps
    .map(
      (s) =>
        `        { number: "${a(s.number)}", heading: "${a(s.heading)}", description: "${a(s.description)}" }`
    )
    .join(",\n");

  const testimonialsLiteral = testimonials
    .map(
      (t) =>
        `        {\n          quote: "${a(t.quote)}",\n          name: "${a(t.name)}",\n          cohortInfo: "${a(t.cohort_info)}",\n        }`
    )
    .join(",\n");

  const faqLiteral = faqs
    .map(
      (f) =>
        `        {\n          question: "${a(f.question)}",\n          answer: "${a(f.answer)}",\n        }`
    )
    .join(",\n");

  const threeUpLiteral = threeUp
    .map(
      (item) =>
        `        {\n          title: "${a(item.title)}",\n          body: "${a(item.body)}",\n          linkLabel: "${a(item.link_label)}",\n          linkHref: "${a(item.link_href)}",\n        }`
    )
    .join(",\n");

  return `---
import AppLayout from "@/layouts/app-layout.astro";
import IntroMedia from "@/components/sections/IntroMedia.astro";
import ImpactStats from "@/components/sections/ImpactStats.astro";
import HowItWorks from "@/components/sections/HowItWorks.astro";
import Testimonials from "@/components/sections/Testimonials.astro";
import PartnerLogos from "@/components/sections/PartnerLogos.astro";
import { ProjectFeatureSlider } from "@/components/sections/ProjectFeatureSlider";
import { Faq } from "@/components/sections/Faq";
import ThreeUp from "@/components/sections/ThreeUp.astro";
import { NewsletterCta } from "@/components/sections/NewsletterCta";
import ContactForm from "@/components/sections/ContactForm.astro";
---

<AppLayout
  seo={{
    title: "${a(cms.intro_heading, "Ámaxa Cohorts — Apply Today")}",
    description: "${a(cms.intro_subhead, "Join Ámaxa Cohorts — a 100% remote 3-month program for high school students.")}",
    image: "https://b47pkz22xs.ufs.sh/f/OxFTTzjZGToOLTq5DHnAaWi0jLFr2BdSClosPxeIvEGUbwKy",
    type: "website",
    canonicalURL: "https://www.amaxaimpact.org/pathways/cohorts",
    keywords: ["amaxa", "cohorts", "high school", "remote program"],
    noIndex: false,
  }}
>
  <main>

    <div class="w-full bg-coral-light-500 px-12 py-5 flex items-center justify-between">
      <p class="font-semibold text-base text-purple-dark-500">${a(cms.banner_text, "Application to an Ámaxa Pathway")}</p>
      <a href="${a(cms.banner_cta_href, "https://airtable.com/appPR9mkslbn3U8YZ/shrHHUtRzK4DqKt3F")}" target="_blank" rel="noopener noreferrer" class="font-semibold text-base text-coral-dark-500 hover:text-coral-dark-600 transition-colors">
        ${a(cms.banner_cta_label, "Apply here now!")} →
      </a>
    </div>

    <IntroMedia
      heading="${a(cms.intro_heading, "Ámaxa Cohorts")}"
      subhead="${a(cms.intro_subhead, "A student-led international virtual exchange program, bringing extracurricular learning to students without access around the globe.")}"
    />

    <ImpactStats
      title="${a(cms.stats_title, "Cohorts by the numbers")}"
      stats={[
        { number: "${a(cms.stat_1_number, "100%")}", label: "${a(cms.stat_1_label, "remote — join from anywhere")}" },
        { number: "${a(cms.stat_2_number, "48+")}", label: "${a(cms.stat_2_label, "countries represented")}" },
        { number: "${a(cms.stat_3_number, "240+")}", label: "${a(cms.stat_3_label, "students completed cohorts")}" },
        { number: "${a(cms.stat_4_number, "9")}", label: "${a(cms.stat_4_label, "partner nonprofits")}" },
      ]}
      ctaLabel="${a(cms.stats_cta_label, "Apply Today")}"
      ctaHref="${a(cms.stats_cta_href, "https://airtable.com/appPR9mkslbn3U8YZ/shrHHUtRzK4DqKt3F")}"
    />

    <HowItWorks
      title="${a(cms.how_it_works_title, "How Cohorts Work")}"
      steps={[
${stepsLiteral}
      ]}
    />

    <Testimonials
      heading="${a(cms.testimonials_heading, "Voices from our cohorts")}"
      testimonials={[
${testimonialsLiteral}
      ]}
    />

    <PartnerLogos caption="${a(cms.partner_logos_caption, "Partner nonprofits in Palestine, Uganda, Liberia & beyond")}" />

    <ProjectFeatureSlider client:load heading="Projects from our cohorts" subhead="Every project is driven by student passion and real community need." />

    <Faq
      client:load
      title="${a(cms.faq_title, "Frequently Asked Questions")}"
      items={[
${faqLiteral}
      ]}
    />

    <ThreeUp
      heading="${a(cms.three_up_heading, "Interested in Partnering with Ámaxa?")}"
      items={[
${threeUpLiteral}
      ]}
    />

    <section class="bg-purple-dark-500 w-full px-12 py-24 flex flex-col gap-7 items-center text-center">
      <h2 class="font-semibold text-[40px] text-white max-w-[820px] leading-[1.2]">
        ${a(cms.cta_heading, "Ready to make an impact?")}
      </h2>
      <a href="${a(cms.cta_button_href, "https://airtable.com/appPR9mkslbn3U8YZ/shrHHUtRzK4DqKt3F")}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 bg-coral-dark-500 hover:bg-coral-dark-600 text-white text-base font-semibold px-6 py-3 rounded-full transition-colors">
        ${a(cms.cta_button_label, "Apply Now")} ↗
      </a>
    </section>

    <NewsletterCta client:load />

    <ContactForm
      address="Ámaxa Impact"
      addressLine2="amaxaimpact.org"
      hours="Questions? Reach out anytime."
      hoursLine2="We respond within 48 hours."
      email="${a(cms.contact_email, "hello@amaxaimpact.org")}"
    />

  </main>
</AppLayout>
`;
}

function generateCrossBorderAccess(cms) {
  const steps = (cms.how_it_works_steps || []).slice(0, 4);
  while (steps.length < 4)
    steps.push({ number: `STEP 0${steps.length + 1}`, heading: "", description: "" });

  const projects = (cms.projects || []).slice(0, 6);

  const stepsLiteral = steps
    .map(
      (s) =>
        `        { number: "${a(s.number)}", heading: "${a(s.heading)}", description: "${a(s.description)}" }`
    )
    .join(",\n");

  const slidesLiteral = projects.length
    ? projects
        .map(
          (p) =>
            `        { title: "${a(p.title)}", ctaLabel: "${a(p.cta_label, "Explore project")}", ctaHref: "${a(p.cta_href, "/project")}" }`
        )
        .join(",\n")
    : `        { title: "Feeding Gaza", ctaLabel: "Explore project", ctaHref: "/project/gaza" },
        { title: "Giving Light", ctaLabel: "Explore project", ctaHref: "/project" },
        { title: "Frontline Support", ctaLabel: "Explore project", ctaHref: "/project" },
        { title: "Cross-Cultural Art Group", ctaLabel: "Explore project", ctaHref: "/project" },
        { title: "Flora and Fauna Documentary", ctaLabel: "Explore project", ctaHref: "/project" },
        { title: "Sharing Fashion", ctaLabel: "Explore project", ctaHref: "/project" }`;

  return `---
import AppLayout from "@/layouts/app-layout.astro";
import IntroMedia from "@/components/sections/IntroMedia.astro";
import StatementBar from "@/components/sections/StatementBar.astro";
import HowItWorks from "@/components/sections/HowItWorks.astro";
import PhotoBanner from "@/components/sections/PhotoBanner.astro";
import { ProjectFeatureSlider } from "@/components/sections/ProjectFeatureSlider";
import { NewsletterCta } from "@/components/sections/NewsletterCta";
import ContactForm from "@/components/sections/ContactForm.astro";
---

<AppLayout
  seo={{
    title: "${a(cms.intro_heading, "Cross-Border Access — Ámaxa")}",
    description: "${a(cms.statement_text, "Ámaxa students design and implement a custom cross-cultural international virtual exchange program.")}",
    image: "https://b47pkz22xs.ufs.sh/f/OxFTTzjZGToOexh9L5yvrS3NH5LD0fGBOXwFydpiVbYzJMa1",
    type: "website",
    canonicalURL: "https://www.amaxaimpact.org/project/cross-border-access",
    keywords: ["amaxa", "cross-border access", "virtual exchange"],
    noIndex: false,
  }}
>
  <main>

    <IntroMedia
      heading="${a(cms.intro_heading, "Cross-Border Access")}"
      subhead="${a(cms.intro_subhead, "A student-led international virtual exchange program, bringing extracurricular learning to students without access around the globe.")}"
    />

    <StatementBar
      eyebrow="${a(cms.statement_eyebrow, "ABOUT")}"
      statement="${a(cms.statement_text, "Ámaxa students design and implement a custom cross-cultural, international virtual exchange program with a community partner.")}"
    />

    <HowItWorks
      title="${a(cms.how_it_works_title, "How Cross-Border Access Works")}"
      steps={[
${stepsLiteral}
      ]}
    />

    <PhotoBanner
      eyebrow="${a(cms.banner_eyebrow, "FEATURED PROJECT")}"
      heading="${a(cms.banner_heading, "Model UN X Liberia: How Raima used her passion for Model UN to empower Liberian students")}"
      body="${a(cms.banner_body, "A Cross-Border Access student brought her Model UN skills to classrooms in Liberia, co-creating a program that built confidence, debate skills, and global awareness.")}"
      buttonLabel="${a(cms.banner_button_label, "Explore the project")}"
      buttonHref="${a(cms.banner_button_href, "/project/cross-border-access")}"
    />

    <ProjectFeatureSlider
      client:load
      heading="${a(cms.slider_heading, "Cross-Border Access Program Portfolio")}"
      subhead="${a(cms.slider_subhead, "Six unique cross-cultural exchange programs designed and run by Ámaxa students around the world.")}"
      slides={[
${slidesLiteral}
      ]}
    />

    <NewsletterCta client:load />

    <ContactForm
      address="Ámaxa Impact"
      addressLine2="amaxaimpact.org"
      hours="${a(cms.contact_heading, "Ready to partner with us?")}"
      hoursLine2="We'd love to hear from you."
      email="${a(cms.contact_email, "hello@amaxaimpact.org")}"
    />

  </main>
</AppLayout>
`;
}

function generateProjects(cms) {
  const partners = (cms.community_partners || []).slice(0, 8);
  const initiatives = (cms.initiatives || []).slice(0, 6);
  const faqs = (cms.faq_items || []).slice(0, 6);

  const partnersDefault = `        { id: "1", name: "Cross-Border Access", location: "Palestine & Lebanon", href: "/project/cross-border-access" },
        { id: "2", name: "Nyaka AIDS Orphans Project", location: "Uganda", href: "/project/nyaka" },
        { id: "3", name: "Karina's Library", location: "Guatemala", href: "/project/karinas-library" },
        { id: "4", name: "Global Forest Generation", location: "Global", href: "/project/global-forest" },
        { id: "5", name: "ISNAD", location: "Palestine", href: "/project/isnad" },
        { id: "6", name: "Educhildren", location: "Uganda", href: "/project/educhildren" }`;

  const initiativesDefault = `        { id: "1", name: "Mental Health First Aid", location: "Global Initiative", href: "/project/mental-health" },
        { id: "2", name: "LGBTQ+ Representation", location: "Global Initiative", href: "/project/lgbtq" },
        { id: "3", name: "Feminist Media Project", location: "Global Initiative", href: "/project/feminist-media" },
        { id: "4", name: "Climate Action Collective", location: "Global Initiative", href: "/project/climate" }`;

  const partnersLiteral = partners.length
    ? partners.map((p, i) => `        { id: "${i + 1}", name: "${a(p.name)}", location: "${a(p.location)}", href: "${a(p.href)}" }`).join(",\n")
    : partnersDefault;

  const initiativesLiteral = initiatives.length
    ? initiatives.map((p, i) => `        { id: "${i + 1}", name: "${a(p.name)}", location: "${a(p.location)}", href: "${a(p.href)}" }`).join(",\n")
    : initiativesDefault;

  const faqLiteral = faqs.length
    ? faqs.map((f) => `        {\n          question: "${a(f.question)}",\n          answer: "${a(f.answer)}",\n        }`).join(",\n")
    : `        { question: "How are projects selected?", answer: "We vet every partner nonprofit through rigorous due diligence." },
        { question: "Can I work on more than one project?", answer: "Each cohort focuses on one project for the full three months." },
        { question: "Are the projects remote or in-person?", answer: "All Ámaxa cohorts are fully remote." },
        { question: "What kinds of work will I do?", answer: "Students take on real deliverables — research reports, fundraising campaigns, communications strategies, and more." },
        { question: "How do I know which project is right for me?", answer: "During the application process, you'll share your passions and skills." }`;

  return `---
import AppLayout from "@/layouts/app-layout.astro";
import IntroMedia from "@/components/sections/IntroMedia.astro";
import StatementBar from "@/components/sections/StatementBar.astro";
import ImpactStats from "@/components/sections/ImpactStats.astro";
import PhotoBanner from "@/components/sections/PhotoBanner.astro";
import { PartnerFeatureSlider } from "@/components/sections/PartnerFeatureSlider";
import SplitMedia from "@/components/sections/SplitMedia.astro";
import StatementMedia from "@/components/sections/StatementMedia.astro";
import { Faq } from "@/components/sections/Faq";
import { NewsletterCta } from "@/components/sections/NewsletterCta";
import ContactForm from "@/components/sections/ContactForm.astro";
---

<AppLayout
  seo={{
    title: "${a(cms.intro_heading, "Our Projects — Ámaxa")}",
    description: "${a(cms.statement_text, "Explore Ámaxa's high-impact projects.")}",
    image: "https://b47pkz22xs.ufs.sh/f/OxFTTzjZGToOexh9L5yvrS3NH5LD0fGBOXwFydpiVbYzJMa1",
    type: "website",
    canonicalURL: "https://www.amaxaimpact.org/project",
    keywords: ["amaxa", "projects", "nonprofits"],
    noIndex: false,
  }}
>
  <main>

    <IntroMedia
      heading="${a(cms.intro_heading, "Discover Our Projects")}"
      subhead="${a(cms.intro_subhead, "Our projects are high-impact, innovative, and community-driven.")}"
    />

    <StatementBar
      eyebrow="${a(cms.statement_eyebrow, "OUR WORK")}"
      statement="${a(cms.statement_text, "We believe every young person has the power to create lasting change. Through rigorous research, deep community partnerships, and a commitment to equity, we connect students with nonprofits tackling the world's most pressing challenges.")}"
    />

    <ImpactStats
      title="${a(cms.stats_title, "Success equals impact")}"
      stats={[
        { number: "${a(cms.stat_1_number, "9")}", label: "${a(cms.stat_1_label, "partner nonprofits across 4 continents")}" },
        { number: "${a(cms.stat_2_number, "500+")}", label: "${a(cms.stat_2_label, "students have made a difference")}" },
        { number: "${a(cms.stat_3_number, "3K+")}", label: "${a(cms.stat_3_label, "community members impacted")}" },
        { number: "${a(cms.stat_4_number, "6")}", label: "${a(cms.stat_4_label, "Ámaxa-original initiatives launched")}" },
      ]}
      ctaLabel="${a(cms.stats_cta_label, "Learn more about our impact")}"
      ctaHref="${a(cms.stats_cta_href, "/who-we-are")}"
    />

    <PhotoBanner
      eyebrow="${a(cms.banner_eyebrow, "FEATURED PROJECT")}"
      heading="${a(cms.banner_heading, "Brilliant solutions start from small seeds.")}"
      body="${a(cms.banner_body, "Entrepreneurs need help getting businesses off the ground, especially when they're implementing bold ideas in hard to reach communities.")}"
      buttonLabel="${a(cms.banner_button_label, "Explore the project")}"
      buttonHref="${a(cms.banner_button_href, "/project/cross-border-access")}"
    />

    <PartnerFeatureSlider
      client:load
      heading="${a(cms.partners_slider_heading, "Ámaxa Community Partners")}"
      items={[
${partnersLiteral}
      ]}
    />

    <PartnerFeatureSlider
      client:load
      heading="${a(cms.initiatives_slider_heading, "Ámaxa Original Initiatives")}"
      items={[
${initiativesLiteral}
      ]}
    />

    <SplitMedia
      heading="${a(cms.split_heading, "Locally rooted, globally connected")}"
      subhead="${a(cms.split_subhead, "Our regional teams guide our work, shape our strategies, and lead us to solutions to the world's most pressing challenges.")}"
      ctaLabel="${a(cms.split_cta_label, "Explore the map")}"
      ctaHref="${a(cms.split_cta_href, "/project")}"
      panelSide="right"
    />

    <StatementMedia
      statement="${a(cms.statement_media_statement, "Ámaxa's work informs innovations, programs, and communities to broaden and improve the ways in which young people can create lasting change.")}"
      body="${a(cms.statement_media_body, "Projects include running student-led research initiatives, partnerships with grassroots nonprofits, and original campaigns on topics including mental health, climate, and representation.")}"
      learnMoreHref="${a(cms.statement_media_cta_href, "/who-we-are")}"
    />

    <Faq
      client:load
      title="${a(cms.faq_title, "Common questions about our projects")}"
      items={[
${faqLiteral}
      ]}
    />

    <section class="bg-purple-dark-500 w-full px-12 py-24 flex flex-col gap-7 items-center text-center">
      <h2 class="font-semibold text-[40px] text-white max-w-[820px] leading-[1.2]">
        ${a(cms.cta_heading, "Join us to transform your passion into impact.")}
      </h2>
      <a href="${a(cms.cta_button_href, "https://airtable.com/appPR9mkslbn3U8YZ/shrHHUtRzK4DqKt3F")}" class="inline-flex items-center gap-2 bg-coral-dark-500 hover:bg-coral-dark-600 text-white text-base font-semibold px-6 py-3 rounded-full transition-colors">
        ${a(cms.cta_button_label, "Apply Today")} ↗
      </a>
    </section>

    <NewsletterCta client:load />

    <ContactForm
      address="Ámaxa Impact"
      addressLine2="amaxaimpact.org"
      hours="Questions? Reach out anytime."
      hoursLine2="We respond within 48 hours."
      email="${a(cms.contact_email, "hello@amaxaimpact.org")}"
    />

  </main>
</AppLayout>
`;
}

// ─── SYNC RUNNERS ──────────────────────────────────────────────────────────

const PAGES = [
  {
    cms: path.join(CMS_DIR, "pages/about-us.md"),
    out: path.join(PAGES_DIR, "who-we-are.astro"),
    gen: generateAboutUs,
  },
  {
    cms: path.join(CMS_DIR, "pages/cohorts.md"),
    out: path.join(PAGES_DIR, "pathways/cohorts.astro"),
    gen: generateCohorts,
  },
  {
    cms: path.join(CMS_DIR, "pages/cross-border-access.md"),
    out: path.join(PAGES_DIR, "project/cross-border-access.astro"),
    gen: generateCrossOrderAccess,
  },
  {
    cms: path.join(CMS_DIR, "pages/projects.md"),
    out: path.join(PAGES_DIR, "project/index.astro"),
    gen: generateProjects,
  },
];

function generateCrossOrderAccess(cms) { return generateCrossBorderAccess(cms); }

export function syncAll() {
  let changed = 0;
  console.log(`\n[sync-cms] ${new Date().toLocaleTimeString()} — syncing…`);

  for (const page of PAGES) {
    if (!fs.existsSync(page.cms)) {
      console.log(`  missing    ${page.cms}`);
      continue;
    }
    const content = fs.readFileSync(page.cms, "utf8");
    const cms = parseFrontmatter(content);
    const astro = page.gen(cms);
    if (writeIfChanged(page.out, astro)) changed++;
  }

  console.log(`[sync-cms] done — ${changed} file(s) updated\n`);
  return changed;
}

// Run directly
syncAll();
