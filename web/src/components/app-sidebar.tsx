import { LayoutDashboard, Users, FileText, Activity } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// Menu items.
const items = [
  {
    title: "แดชบอร์ด",
    url: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "จัดการลูกค้า",
    url: "/admin/clients",
    icon: Users,
  },
  {
    title: "สัญญาเงินกู้",
    url: "/admin/loans",
    icon: FileText,
  },
  {
    title: "รายการทำรายการ",
    url: "/admin/transactions",
    icon: Activity,
  },
]

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex items-center justify-center py-4">
        <span className="text-xl font-bold text-primary group-data-[collapsible=icon]:hidden">ระบบผู้ดูแล</span>
        <span className="text-xl font-bold text-primary hidden group-data-[collapsible=icon]:block">รด</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>เมนู</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url} tooltip={item.title}>
                    <Link href={item.url}>
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
    </Sidebar>
  )
}
