"use client";
import { useState } from "react";

interface NewsletterCtaProps {
  heading?: string;
}

type Status = "idle" | "loading" | "success" | "error";

export function NewsletterCta({
  heading = "Join our community and stay connected with stories of change.",
}: NewsletterCtaProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status === "loading") return;

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const result = (await res.json()) as {
        success: boolean;
        message?: string;
      };

      if (result.success) {
        setEmail("");
        setStatus("success");
        setMessage(result.message ?? "Thanks for subscribing!");
      } else {
        setStatus("error");
        setMessage(result.message ?? "Couldn't subscribe you. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Couldn't subscribe you. Please try again.");
    }
  }

  return (
    <section className="bg-background flex w-full flex-col items-center gap-6 px-6 py-16 md:gap-10 md:px-12 md:py-24">
      <h2 className="text-foreground max-w-[1000px] text-center text-2xl leading-[1.16] font-medium sm:text-3xl md:text-4xl lg:text-5xl">
        {heading}
      </h2>
      {status === "success" ? (
        <p className="text-muted-foreground text-base">{message}</p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-[620px] flex-col items-center gap-3 sm:flex-row sm:gap-4"
        >
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email address"
            className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-purple-dark-400 h-[52px] w-full min-w-0 rounded-full border px-6 text-base transition-colors outline-none sm:flex-1"
            required
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="bg-coral-dark-500 hover:bg-coral-dark-600 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-base font-semibold whitespace-nowrap text-white transition-colors disabled:opacity-60 sm:w-auto"
          >
            {status === "loading" ? "Subscribing…" : "Subscribe →"}
          </button>
        </form>
      )}
      {status === "error" && (
        <p className="text-coral-dark-600 text-center text-base" role="alert">
          {message}
        </p>
      )}
    </section>
  );
}
