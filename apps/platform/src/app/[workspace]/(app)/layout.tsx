import type React from "react";

import { SidebarInset, SidebarProvider } from "@amaxa/ui/sidebar";

import { WorkspaceNavbar } from "./_components/workspace-navbar";
import { WorkspaceSidebar } from "./_components/workspace-sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <WorkspaceSidebar />
      <SidebarInset>
        <WorkspaceNavbar />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
