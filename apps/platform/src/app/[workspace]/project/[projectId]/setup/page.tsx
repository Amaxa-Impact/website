import type { Metadata } from "next";
import { Suspense } from "react";
import { GuidedSetup } from "@/components/dashboard/setup/guided-setup";

export const metadata: Metadata = {
  title: "Guided setup",
  description: "Build the critical chain step by step",
};

export default function RouteComponent() {
  // GuidedSetup reads the current step from the URL.
  return (
    <Suspense>
      <GuidedSetup />
    </Suspense>
  );
}
