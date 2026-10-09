import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpenText, LayoutDashboard, Presentation, Settings, Sparkles } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { USE_MOCKS } from "@/lib/api";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "My Presentations", url: "/presentations", icon: Presentation },
  { title: "Study Materials", url: "/materials", icon: BookOpenText },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

export function AppSidebar() {
  const { setOpenMobile } = useSidebar();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) => (url === "/" ? path === "/" : path.startsWith(url));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          to="/"
          aria-label="Lectura dashboard"
          onClick={() => setOpenMobile(false)}
          className="flex items-center gap-2 px-2 py-3"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <span className="font-display text-xl font-semibold group-data-[collapsible=icon]:hidden">
            Lectura
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link
                      to={item.url}
                      aria-current={isActive(item.url) ? "page" : undefined}
                      onClick={() => setOpenMobile(false)}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {USE_MOCKS && (
        <SidebarFooter className="group-data-[collapsible=icon]:hidden">
          <div className="rounded-lg border border-dashed bg-highlight/30 p-3 text-xs text-highlight-foreground">
            <strong className="block">Demo mode</strong>
            Sample data only — not connected to the Lectura server.
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
