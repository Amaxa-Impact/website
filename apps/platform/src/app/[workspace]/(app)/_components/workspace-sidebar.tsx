"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavUser } from "@/components/dashboard/sidebar/nav-user";
import { useWorkspace } from "@/components/workspace/context";
import { useQuery } from "convex/react";
import {
  FolderKanban,
  Home,
  LayoutTemplate,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

import { api } from "@amaxa/backend/_generated/api";
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
  SidebarSeparator,
} from "@amaxa/ui/sidebar";

import { useAuthContext } from "~/lib/auth/auth-context";

export function WorkspaceSidebar() {
  const { workspace, userRole } = useWorkspace();
  const { isAdmin: isSiteAdmin } = useAuthContext();
  const pathname = usePathname();

  const isWorkspaceAdmin =
    userRole === "admin" || userRole === "owner" || isSiteAdmin;

  // listForUser returns projects across every workspace the user belongs to;
  // only show the ones in this workspace so links resolve under baseUrl.
  const allProjects = useQuery(api.projects.listForUser, {});
  const projects = allProjects?.filter(
    (project) => project.workspaceId === workspace.id,
  );

  const baseUrl = `/${workspace.slug}`;
  const adminUrl = `${baseUrl}/admin`;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link className="flex items-center gap-2" href="/">
              <SidebarMenuButton tooltip="All workspaces">
                <Home />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{workspace.name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    All workspaces
                  </span>
                </div>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link className="flex items-center gap-2" href={baseUrl}>
                <SidebarMenuButton
                  isActive={pathname === baseUrl}
                  tooltip="Home"
                >
                  <Home />
                  <span>Home</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarMenu>
            {projects === undefined ? (
              <SidebarMenuItem>
                <SidebarMenuButton disabled>
                  <FolderKanban />
                  <span className="text-muted-foreground">Loading…</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ) : projects.length === 0 ? (
              <SidebarMenuItem>
                <SidebarMenuButton disabled>
                  <FolderKanban />
                  <span className="text-muted-foreground">No projects</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ) : (
              projects.map((project) => {
                const url = `${baseUrl}/project/${project._id}`;
                return (
                  <SidebarMenuItem key={project._id}>
                    <Link className="flex items-center gap-2" href={url}>
                      <SidebarMenuButton
                        isActive={pathname.startsWith(url)}
                        tooltip={project.name}
                      >
                        <FolderKanban />
                        <span>{project.name}</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                );
              })
            )}
          </SidebarMenu>
        </SidebarGroup>

        {isWorkspaceAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Admin</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <Link
                    className="flex items-center gap-2"
                    href={`${adminUrl}/projects`}
                  >
                    <SidebarMenuButton
                      isActive={pathname.startsWith(`${adminUrl}/projects`)}
                      tooltip="Projects"
                    >
                      <FolderKanban />
                      <span>Projects</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link
                    className="flex items-center gap-2"
                    href={`${adminUrl}/users`}
                  >
                    <SidebarMenuButton
                      isActive={pathname.startsWith(`${adminUrl}/users`)}
                      tooltip="Team"
                    >
                      <Users />
                      <span>Team</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link
                    className="flex items-center gap-2"
                    href={`${adminUrl}/templates`}
                  >
                    <SidebarMenuButton
                      isActive={pathname.startsWith(`${adminUrl}/templates`)}
                      tooltip="Templates"
                    >
                      <LayoutTemplate />
                      <span>Templates</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link
                    className="flex items-center gap-2"
                    href={`${adminUrl}/settings`}
                  >
                    <SidebarMenuButton
                      isActive={pathname.startsWith(`${adminUrl}/settings`)}
                      tooltip="Settings"
                    >
                      <Settings />
                      <span>Settings</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </>
        )}

        {isSiteAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Admin</SidebarGroupLabel>
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
                  <Link
                    className="flex items-center gap-2"
                    href="/applications"
                  >
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
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
