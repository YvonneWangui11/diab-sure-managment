import { useState } from "react";
import { Heart, LayoutDashboard, Users, Calendar, Pill, AlertTriangle, MessageSquare, FileText, User, LogOut, Search, BookOpen, Settings, ChevronRight, Bell, Shield, Megaphone, Clock } from "lucide-react";
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
  SidebarSeparator,
  SidebarInput,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ClinicianSidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  onSignOut?: () => void;
  roleSwitcher?: React.ReactNode;
  doctorName?: string;
  specialization?: string;
  stats?: {
    activeAlerts: number;
    unreadMessages: number;
  };
  onPatientSearch?: (query: string) => void;
  showAdminSection?: boolean;
}

const mainNavItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "patients", label: "Patients", icon: Users },
  { id: "triage", label: "Triage Feed", icon: AlertTriangle, badge: "alerts" },
  { id: "appointments", label: "Appointments", icon: Calendar },
  { id: "prescriptions", label: "Prescriptions", icon: Pill },
  { id: "messages", label: "Messages", icon: MessageSquare, badge: "messages" },
];

const secondaryNavItems = [
  { id: "care-plans", label: "Care Plans", icon: FileText },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "education", label: "Education", icon: BookOpen },
  { id: "alerts", label: "Alerts Manager", icon: Bell },
];

const adminNavItems = [
  { id: "admin-users", label: "User Management", icon: Users },
  { id: "admin-audit", label: "Audit Logs", icon: FileText },
  { id: "admin-announcements", label: "Announcements", icon: Megaphone },
  { id: "admin-retention", label: "Data Retention", icon: Clock },
];

export const ClinicianSidebar = ({
  currentPage,
  onPageChange,
  onSignOut,
  roleSwitcher,
  doctorName = "Doctor",
  specialization = "General Practice",
  stats = { activeAlerts: 0, unreadMessages: 0 },
  onPatientSearch,
  showAdminSection = false,
}: ClinicianSidebarProps) => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onPatientSearch?.(e.target.value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      onPageChange("patients");
    }
  };

  const getBadgeCount = (badgeType?: string) => {
    if (badgeType === "alerts") return stats.activeAlerts;
    if (badgeType === "messages") return stats.unreadMessages;
    return 0;
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Header with Logo */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary">
            <Heart className="h-4 w-4 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                DiabeSure
              </span>
              <span className="text-[10px] text-muted-foreground">Clinician Portal</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Patient Search */}
        {!isCollapsed && (
          <SidebarGroup>
            <div className="relative px-2">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <SidebarInput
                placeholder="Search patients..."
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                className="pl-8"
              />
            </div>
          </SidebarGroup>
        )}

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive = currentPage === item.id;
                const badgeCount = getBadgeCount(item.badge);
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onPageChange(item.id)}
                      isActive={isActive}
                      tooltip={item.label}
                      className={`transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted"
                      } ${
                        item.id === "triage" && stats.activeAlerts > 0
                          ? "text-destructive hover:text-destructive"
                          : ""
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      {badgeCount > 0 && !isCollapsed && (
                        <Badge
                          variant={item.id === "triage" ? "destructive" : "default"}
                          className="ml-auto h-5 min-w-5 px-1.5 text-xs"
                        >
                          {badgeCount}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Secondary Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNavItems.map((item) => {
                const isActive = currentPage === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onPageChange(item.id)}
                      isActive={isActive}
                      tooltip={item.label}
                      className={`transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section - only visible if user has admin access */}
        {showAdminSection && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center gap-2">
                <Shield className="h-3 w-3" />
                Administration
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminNavItems.map((item) => {
                    const isActive = currentPage === item.id;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => onPageChange(item.id)}
                          isActive={isActive}
                          tooltip={item.label}
                          className={`transition-colors ${
                            isActive
                              ? "bg-secondary/20 text-secondary-foreground font-medium"
                              : "hover:bg-muted"
                          }`}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Role Switcher */}
        {roleSwitcher && !isCollapsed && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Role</SidebarGroupLabel>
              <div className="px-2">{roleSwitcher}</div>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* Footer with User Profile */}
      <SidebarFooter className="border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 px-2 h-auto py-2 hover:bg-muted"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-xs">
                  {doctorName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span className="text-sm font-medium truncate w-full text-left">
                    Dr. {doctorName}
                  </span>
                  <span className="text-xs text-muted-foreground truncate w-full text-left">
                    {specialization}
                  </span>
                </div>
              )}
              {!isCollapsed && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => onPageChange("profile")}>
              <User className="h-4 w-4 mr-2" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPageChange("settings")}>
              <Settings className="h-4 w-4 mr-2" />
              Preferences
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onSignOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
