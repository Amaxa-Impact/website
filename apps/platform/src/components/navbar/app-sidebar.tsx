"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavUser } from "@/components/dashboard/sidebar/nav-user";
import { LayoutTemplate, ShieldCheck } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@amaxa/ui/sidebar";

import { useAuthContext } from "~/lib/auth/auth-context";

export function AppSidebar() {
  const { isAdmin: isSiteAdmin } = useAuthContext();
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link className="flex items-center gap-2" href="/">
              <SidebarMenuButton tooltip="Àmaxa">
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Àmaxa</span>
                </div>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Home</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link className="flex items-center gap-2" href="/">
                <SidebarMenuButton isActive={pathname === "/"} tooltip="Home">
                  <ShieldCheck />
                  <span>Your Workspaces</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {isSiteAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Àmaxa Admin</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link className="flex items-center gap-2" href="/workspaces">
                  <SidebarMenuButton
                    isActive={pathname.startsWith("/workspaces")}
                    tooltip="All workspaces"
                  >
                    <ShieldCheck />
                    <span>All Workspaces</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link className="flex items-center gap-2" href="/applications">
                  <SidebarMenuButton
                    isActive={pathname.startsWith("/applications")}
                    tooltip="Applications"
                  >
                    <LayoutTemplate />
                    <span>Applications</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
