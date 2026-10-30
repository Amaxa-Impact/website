"use client";

import { useState, useSyncExternalStore } from "react";

import { Button } from "@amaxa/ui/button";

const STORAGE_KEY = "ccpm:estimate-tip-seen";

// Storage isn't watched for changes; reading it once per render is enough.
const noSubscription = () => () => undefined;

function hasSeenTip(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markEstimateTipSeen(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Private mode or blocked storage: the tip just shows again next time.
  }
}

/** Explains why we ask for two numbers; shown until dismissed or an estimate is saved. */
export function EstimateTip() {
  // The server renders it hidden so hydration matches; the client then reads storage.
  const seen = useSyncExternalStore(noSubscription, hasSeenTip, () => true);
  const [dismissed, setDismissed] = useState(false);

  if (seen || dismissed) {
    return null;
  }

  return (
    <div
      className="bg-muted/60 text-muted-foreground rounded-md border p-2 text-xs leading-relaxed"
      role="note"
    >
      <p className="text-foreground mb-1 font-medium">Why two numbers?</p>
      <p>
        Your <strong>best case</strong> is how long it takes if things go well:
        a fair 50/50 guess. The second is how long you&apos;d need to be{" "}
        <strong>sure</strong>. The gap goes into one shared buffer for the whole
        project, so nobody has to pad their own estimate.
      </p>
      <Button
        className="mt-1.5 h-6 px-2 text-xs"
        onClick={(e) => {
          e.stopPropagation();
          markEstimateTipSeen();
          setDismissed(true);
        }}
        size="sm"
        type="button"
        variant="outline"
      >
        Got it
      </Button>
    </div>
  );
}
