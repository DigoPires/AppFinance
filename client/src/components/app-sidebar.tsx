import { LayoutDashboard, Receipt, LogOut, User, HelpCircle, Instagram, Copyright, TrendingUp } from "lucide-react";
import logo from "@/assets/img/Logo_AppFinance.png";
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
          <div className="flex h-10 w-10 items-center justify-center">
            <img src={logo} alt="AppFinance Logo" className="h-10 w-10" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold" data-testid="text-app-name">
              AppFinance
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

      <SidebarFooter className="p-3">
        <div className="flex flex-col gap-3">
          {/* Footer Info */}
          <div className="flex flex-col gap-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <Copyright className="h-3 w-3" />
              <span className="truncate">Rodrigo P. Figueiredo | 2025</span>
            </div>
            <a
              href="https://instagram.com/_pires.r"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 hover:text-foreground transition-colors"
            >
              <Instagram className="h-3 w-3" />
              <span className="truncate">@_pires.r</span>
            </a>
          </div>
          {/* User Info */}
          <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent p-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              {user ? getInitials(user.name) : <User className="h-4 w-4" />}
            </div>
            <div className="flex flex-1 flex-col overflow-hidden min-w-0">
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
              className="h-8 w-8"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
