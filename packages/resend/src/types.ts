import { type } from "arktype";

export const newsletterSchema = type({
  email: "string.email",
});

export type NewsletterData = typeof newsletterSchema.infer;

export const contactFormSchema = type({
  name: "string",
  email: "string.email",
  message: "string",
  formType: type.enumerated("internship", "high-school", "general", "demo"),
  organization: "string",
  // Optional keys, not "string | undefined": JSON.stringify drops undefined
  // values, so the client never sends these keys at all.
  "phone?": "string",
  "preferredDate?": "string",
  "preferredTime?": "string",
  "timezone?": "string",
});

export type ContactFormData = typeof contactFormSchema.infer;

export type FormType = ContactFormData["formType"];

export const formTypeLabels: Record<FormType, string> = {
  internship: "Internship Inquiry",
  "high-school": "High School Program Inquiry",
  general: "General Inquiry",
  demo: "Demo/Intro Call Request",
};
