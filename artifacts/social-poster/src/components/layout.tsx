import { useAuth } from "@/components/auth-provider";
import { useLocation, Link } from "wouter";
import { useEffect } from "react";
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
  SidebarProvider,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  Megaphone, 
  Share2, 
  ListOrdered, 
  Terminal, 
  Settings, 
  LogOut,
  Orbit
} from "lucide-react";
import { useLogout } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Campaigns", url: "/campaigns", icon: Megaphone },
  { title: "Platforms", url: "/platforms", icon: Share2 },
  { title: "Posts", url: "/posts", icon: ListOrdered },
  { title: "Logs", url: "/logs", icon: Terminal },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, username } = useAuth();
  const [location, setLocation] = useLocation();
  const logoutMutation = useLogout();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Loading mission control...</div>;
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/login";
      },
      onError: () => {
        toast({ title: "Failed to logout", variant: "destructive" });
      }
    });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden">
        <Sidebar variant="inset" className="border-r border-sidebar-border bg-sidebar">
          <SidebarHeader className="p-4 flex flex-row items-center gap-2">
            <div className="bg-primary/20 p-2 rounded-md">
              <Orbit className="h-6 w-6 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm text-sidebar-foreground uppercase tracking-wider">Universal</span>
              <span className="text-xs text-sidebar-foreground/70">Auto-Poster</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const isActive = location === item.url || location.startsWith(item.url + "/");
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                          <Link href={item.url} className="flex items-center gap-2" data-testid={`nav-${item.title.toLowerCase()}`}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/settings"} tooltip="Settings">
                  <Link href="/settings" className="flex items-center gap-2" data-testid="nav-settings">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} className="text-muted-foreground hover:text-destructive transition-colors" data-testid="nav-logout">
                  <LogOut className="h-4 w-4" />
                  <span>Logout {username ? `(${username})` : ""}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        
        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center px-4 border-b shrink-0 md:hidden bg-background">
            <SidebarTrigger />
            <span className="ml-4 font-bold text-sm tracking-wider">UNIVERSAL AUTO-POSTER</span>
          </header>
          <div className="flex-1 overflow-auto p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}