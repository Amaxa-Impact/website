"use client";
import { useState } from "react";

interface NewsletterCtaProps {
  heading?: string;
}

export function NewsletterCta({
  heading = "Join our community and stay connected with stories of change.",
}: NewsletterCtaProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  }

  return (
    <section className="bg-background w-full py-24 flex flex-col gap-10 items-center">
      <h2 className="font-medium text-5xl text-foreground text-center leading-[1.16] max-w-[1000px]">
        {heading}
      </h2>
      {submitted ? (
        <p className="text-base text-muted-foreground">Thanks for subscribing!</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-4 items-center">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-[52px] w-[620px] max-w-full rounded-full border border-border bg-background px-6 text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-purple-dark-400 transition-colors"
            required
          />
          <button
            type="submit"
            className="inline-flex items-center gap-2 bg-coral-dark-500 hover:bg-coral-dark-600 text-white rounded-full px-6 py-4 text-base font-semibold transition-colors whitespace-nowrap"
          >
            Subscribe →
          </button>
        </form>
      )}
    </section>
  );
}
