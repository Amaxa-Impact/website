import { createResendClient } from "./client";
import { RESEND_FROM_EMAIL } from "./constants";
import { generateReferenceId } from "./utils/reference-id";

export interface SubscribeOptions {
  email: string;
  /** Where the signup came from, used for tagging. */
  source?: string;
  /** Fallback inbox notified when no audience is configured. */
  notifyEmail?: string;
}

export interface SubscribeResult {
  success: boolean;
  error?: string;
  referenceId: string;
  /** "audience" when added to the Resend audience, "notify" when emailed instead. */
  method?: "audience" | "notify";
}

/**
 * Add an email to the newsletter list.
 *
 * Prefers the Resend audience when RESEND_AUDIENCE_ID is set. Without it there is
 * no list to write to, so the address is emailed through instead of being dropped.
 */
export async function subscribeToNewsletter(
  options: SubscribeOptions,
): Promise<SubscribeResult> {
  const {
    email,
    source = "website",
    notifyEmail = "lauren@amaxaimpact.org",
  } = options;

  const referenceId = generateReferenceId();
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  try {
    const resend = createResendClient();

    if (audienceId) {
      const { error } = await resend.contacts.create({
        email,
        audienceId,
        unsubscribed: false,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
          referenceId,
          method: "audience",
        };
      }

      return { success: true, referenceId, method: "audience" };
    }

    const { error } = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: notifyEmail,
      subject: `Newsletter signup - ${email}`,
      text: [
        `New newsletter signup.`,
        ``,
        `Email:  ${email}`,
        `Source: ${source}`,
        `Ref:    ${referenceId}`,
        ``,
        `Set RESEND_AUDIENCE_ID to add signups straight to a Resend audience.`,
      ].join("\n"),
      replyTo: email,
      tags: [{ name: "type", value: "newsletter_signup" }],
    });

    if (error) {
      return {
        success: false,
        error: error.message,
        referenceId,
        method: "notify",
      };
    }

    return { success: true, referenceId, method: "notify" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      referenceId,
    };
  }
}
