import type { APIRoute } from "astro";
import { type } from "arktype";

import { newsletterSchema, subscribeToNewsletter } from "@amaxa/resend";

// The site builds static by default; without this the route ships as a static
// endpoint and POSTs 404 in production instead of running as a function.
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: unknown = await request.json();
    const data = newsletterSchema(body);

    if (data instanceof type.errors) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Please enter a valid email address.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const result = await subscribeToNewsletter({ email: data.email });

    if (!result.success) {
      console.error("Newsletter signup failed:", result.error);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Couldn't subscribe you. Please try again.",
          referenceId: result.referenceId,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Thanks for subscribing!",
        referenceId: result.referenceId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error processing newsletter signup:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Couldn't subscribe you. Please try again.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
