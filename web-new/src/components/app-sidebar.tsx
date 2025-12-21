import { LayoutDashboard, Users, FileText, Activity } from 'lucide-react';
import { Button } from "@/components/ui/button"
import { useLocation } from 'wouter';
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
  SidebarTrigger,
  useSidebar,
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
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex flex-row items-center justify-between md:justify-center py-4 px-4">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary group-data-[collapsible=icon]:hidden">ระบบผู้ดูแล</span>
          <span className="text-xl font-bold text-primary hidden group-data-[collapsible=icon]:block">รด</span>
        </div>
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={() => setOpenMobile(false)}>
            <SidebarTrigger className="-ml-1" />
          </Button>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>เมนู</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url} tooltip={item.title}>
                    <a
                      href={item.url}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
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
