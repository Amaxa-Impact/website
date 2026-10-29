"use client";

import { IconBulb } from "@tabler/icons-react";

import { Button } from "@amaxa/ui/button";

/** The short tip at the top of each step. */
export function StepTip({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-muted/60 text-muted-foreground flex gap-2 rounded-md border p-3 text-sm"
      role="note"
    >
      <IconBulb aria-hidden className="text-primary mt-0.5 size-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

export function StepFooter({
  onBack,
  onNext,
  nextLabel = "Next",
  nextDisabled = false,
  busy = false,
  error,
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  busy?: boolean;
  error?: string | null;
}) {
  return (
    <div className="space-y-2 border-t pt-4">
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-between gap-2">
        {onBack ? (
          <Button onClick={onBack} type="button" variant="ghost">
            Back
          </Button>
        ) : (
          <span />
        )}
        {onNext && (
          <Button
            disabled={busy || nextDisabled}
            onClick={onNext}
            type="button"
          >
            {nextLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
