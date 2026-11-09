import type { Metadata } from "next";
import { env } from "@/env";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import "@xyflow/react/dist/style.css";
import "./globals.css";

import { ConvexClientProvider } from "@/components/convex-client-provider";
import { ThemeProvider } from "@/components/theme-provider";

import { AlertDialogProvider } from "@amaxa/ui/alert-dialog-simple";
import { ConfirmDialogProvider } from "@amaxa/ui/confirm-dialog";
import { Toaster } from "@amaxa/ui/sonner";

export const metadata: Metadata = {
  title: {
    default: "Amaxa Platform",
    template: "%s | Amaxa Platform",
  },
  description:
    "Amaxa Platform - Project management and application form system",
  keywords: [
    "amaxa",
    "platform",
    "project management",
    "applications",
    "tasks",
  ],
  authors: [{ name: "Amaxa" }],
  creator: "Amaxa",
  publisher: "Amaxa",
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Amaxa Platform",
    title: "Amaxa Platform",
    description:
      "Amaxa Platform - Project management and application form system",
  },
  twitter: {
    card: "summary_large_image",
    title: "Amaxa Platform",
    description:
      "Amaxa Platform - Project management and application form system",
  },
  icons: {
    icon: "/convex.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background h-screen antialiased">
        <ThemeProvider attribute={"class"} forcedTheme="light">
          <ConvexClientProvider>
            <ConfirmDialogProvider />
            <AlertDialogProvider />
            <NuqsAdapter>{children}</NuqsAdapter>
            <Toaster theme="light" />
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
