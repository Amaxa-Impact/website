import { ArrowUpRight } from "lucide-react";

interface ArticleCard2Props {
  /** Person/profile photo URL — variable per card */
  imageSrc: string;
  /** Background color of the card/profile/image section — variable per card */
  bgColor: string;
  /** Card headline */
  title: string;
  /** "Read more" button destination */
  href: string;
  imageAlt?: string;
  className?: string;
}

/**
 * ArticleCard2 — matches Figma component `components/card/article/2`
 *
 * The top `card/profile/image` section is intentionally variable:
 * pass a different `imageSrc` and `bgColor` for each card instance.
 */
export function ArticleCard2({
  imageSrc,
  bgColor,
  title,
  href,
  imageAlt = "",
  className,
}: ArticleCard2Props) {
  return (
    <article
      className={`bg-white w-full overflow-hidden rounded-[32px] sm:rounded-[48px] lg:rounded-[56px]${className ? ` ${className}` : ""}`}
    >
      {/* ── card/profile/image ── variable: bgColor + imageSrc ── */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          backgroundColor: bgColor,
          aspectRatio: "636 / 523",
        }}
      >
        <img
          src={imageSrc}
          alt={imageAlt}
          className="absolute bottom-0 h-[96%] w-auto object-contain object-bottom"
          style={{ left: "26%" }}
        />
      </div>

      {/* ── text content ── */}
      <div className="flex flex-col gap-5 px-6 py-8 sm:gap-6 sm:px-10 sm:py-10 lg:gap-7 lg:px-[54px] lg:pt-11 lg:pb-14">
        <h2 className="text-xl font-semibold leading-snug text-black sm:text-3xl lg:text-[42px] lg:leading-tight">
          {title}
        </h2>

        <a
          href={href}
          className="inline-flex items-center gap-2 self-start rounded-full bg-[#e26b3c] px-5 py-2.5 text-sm font-normal text-white transition-colors hover:bg-[#c95c30] sm:px-6 sm:py-3 sm:text-base lg:gap-2.5 lg:px-7 lg:py-3 lg:text-2xl"
        >
          Read more
          <ArrowUpRight
            className="size-4 sm:size-5 lg:size-6"
            aria-hidden="true"
          />
        </a>
      </div>
    </article>
  );
}
