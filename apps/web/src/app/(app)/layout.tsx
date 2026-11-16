"use client";

import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  LayoutDashboard,
  Mail,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getOrganization } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  const { data: orgData } = useQuery({
    queryKey: ["organization"],
    queryFn: getOrganization,
    enabled: !!user,
  });
  const organization = orgData?.data.organization;

  // White-labeling: override the CSS variable shadcn's Button/Badge/etc.
  // already read for their accent color, rather than a separate theming
  // system. Cleared on unmount so leaving the app doesn't leak the color
  // onto public pages that render this org's data (e.g. after logout).
  useEffect(() => {
    if (!organization?.themeColor) return;
    document.documentElement.style.setProperty(
      "--primary",
      organization.themeColor,
    );
    return () => {
      document.documentElement.style.removeProperty("--primary");
    };
  }, [organization?.themeColor]);

  if (isLoading || !user) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center p-16">
        Loading…
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="gap-0.5 px-3 py-3">
          <div className="flex items-center gap-2">
            {organization?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary org-supplied URL, not a static asset
              <img
                src={organization.logoUrl}
                alt=""
                className="size-6 shrink-0 rounded object-contain"
              />
            )}
            <span className="text-sm font-semibold">
              {organization?.name ?? "EdSync"}
            </span>
          </div>
          <span className="text-muted-foreground text-xs">{user.role}</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Overview</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname === "/dashboard"}
                    render={<Link href="/dashboard" />}
                  >
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname.startsWith("/cohorts")}
                    render={<Link href="/cohorts" />}
                  >
                    <GraduationCap />
                    <span>Cohorts</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {user.role === "InstituteAdmin" && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={pathname === "/dashboard/users"}
                        render={<Link href="/dashboard/users" />}
                      >
                        <Users />
                        <span>Users</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={pathname === "/dashboard/invitations"}
                        render={<Link href="/dashboard/invitations" />}
                      >
                        <Mail />
                        <span>Invitations</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={pathname === "/dashboard/settings"}
                        render={<Link href="/dashboard/settings" />}
                      >
                        <Settings />
                        <span>Settings</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="gap-2 px-3 py-3">
          <Separator />
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm">{user.name}</span>
            <Button size="sm" variant="ghost" onClick={() => logout()}>
              Log out
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <div className="flex flex-1 flex-col p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
