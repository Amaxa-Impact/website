import { AppSidebar } from "@/components/navbar/app-sidebar";
import { TopNavbar } from "@/components/navbar/top-navbar";

import { SidebarInset, SidebarProvider } from "@amaxa/ui/sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
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
