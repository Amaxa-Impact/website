// Vite inlines the file contents as a string at build time (works in dev + SSR build).
// @ts-ignore - `?raw` is a Vite import suffix
import csv from "./testimonials.csv?raw";

export interface Testimonial {
  quote: string;
  name: string;
  age?: string;
  country?: string;
}

/** Minimal RFC-4180 CSV parser — handles quoted fields with commas, newlines, and "" escapes. */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const rows = parseCSV(csv).filter((r) => r.some((c) => c.trim() !== ""));
const [header = [], ...dataRows] = rows;
const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);
const qi = col("quote");
const ni = col("name");
const ai = col("age");
const ci = col("country");

export const testimonials: Testimonial[] = dataRows
  .map((r) => ({
    quote: (r[qi] ?? "").trim(),
    name: (r[ni] ?? "").trim(),
    age: (r[ai] ?? "").trim() || undefined,
    country: (r[ci] ?? "").trim() || undefined,
  }))
  .filter((t) => t.quote !== "");
