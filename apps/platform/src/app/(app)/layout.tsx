import type { ReactNode } from "react";
import { AppSidebar } from "@/components/navbar/app-sidebar";

import { SidebarInset, SidebarProvider } from "@amaxa/ui/sidebar";

import { TopNavbar } from "@/components/navbar/top-navbar";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TopNavbar />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
