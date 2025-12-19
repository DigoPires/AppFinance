import { LayoutDashboard, Receipt, LogOut, User, HelpCircle, Instagram, Copyright, TrendingUp } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Despesas",
    url: "/expenses",
    icon: Receipt,
  },
  {
    title: "Receitas",
    url: "/earnings",
    icon: TrendingUp,
  },
  {
    title: "Perfil",
    url: "/profile",
    icon: User,
  },
  {
    title: "Suporte",
    url: "/support",
    icon: HelpCircle,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Receipt className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold" data-testid="text-app-name">
              FinControl
            </span>
            <span className="text-xs text-muted-foreground">
              Controle Financeiro
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-sidebar-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.url} onClick={handleMenuClick}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="mb-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Copyright className="h-3 w-3" />
          <span>Desenvolvido por Rodrigo Pires Figueiredo | 2025</span>
          <a
            href="https://instagram.com/_pires.r"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center hover:text-primary"
          >
            <Instagram className="h-3 w-3" />
          </a>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            {user ? getInitials(user.name) : <User className="h-4 w-4" />}
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-sm font-medium" data-testid="text-user-name">
              {user?.name || "Usuário"}
            </span>
            <span className="truncate text-xs text-muted-foreground" data-testid="text-user-email">
              {user?.email || ""}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            data-testid="button-logout"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
