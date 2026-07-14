# Young Delegates — hero photo gallery

Drop the photos for the **Cross-Border Access / Young Delegates** hero gallery
in this folder. They power the full-width scrolling gallery at the top of the
page (`src/components/sections/PhotoGallery.astro`).

## How to add photos

1. Drop image files here (`.jpg` / `.png` / `.webp`). Landscape works best —
   they display full-screen-width and are cropped with `object-fit: cover`.
   Name them in display order, e.g. `01.jpg`, `02.jpg`, `03.jpg` …
2. Copy them into the site's public folder:
   `apps/landing/public/images/programs/young-delegates/`
3. List them in the `images` prop of `<PhotoGallery … />` on
   `apps/landing/src/pages/project/cross-border-access.astro`, e.g.:

   ```astro
   <PhotoGallery
     images={[
       { src: "/images/programs/young-delegates/01.jpg", alt: "Young Delegates conference" },
       { src: "/images/programs/young-delegates/02.jpg", alt: "Students presenting" },
       { src: "/images/programs/young-delegates/03.jpg", alt: "Group photo" },
     ]}
   />
   ```

Until real photos are listed, the gallery renders branded placeholders so the
scroll animation is visible in the preview.
