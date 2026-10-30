"use client";

import type { LucideIcon } from "lucide-react";
import { memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@amaxa/ui/sidebar";

export const NavProjects = memo(
  ({
    projects,
  }: {
    projects: { name: string; url: string; icon: LucideIcon }[];
  }) => {
    const pathname = usePathname();
    // The first link is the project's home, which every other page sits under.
    const isActive = (url: string, index: number) =>
      index === 0 ? pathname === url : pathname.startsWith(url);
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Project</SidebarGroupLabel>
        <SidebarMenu>
          {projects.map((item, index) => (
            <SidebarMenuItem key={item.name}>
              <Link className="flex items-center gap-2" href={item.url}>
                <SidebarMenuButton isActive={isActive(item.url, index)}>
                  <item.icon />
                  <span>{item.name}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    );
  },
);
