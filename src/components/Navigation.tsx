import { useState } from "react";
import { Menu, X, Heart, Activity, Calendar, BookOpen, User, LogOut, TrendingUp, Apple, Dumbbell, Droplet, Pill, MessageSquare, BarChart3, Shield, FileText, Utensils, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  onSignOut?: () => void;
  roleSwitcher?: React.ReactNode;
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: Activity },
  { id: "glucose", label: "Glucose", icon: Droplet },
  { id: "medications", label: "Meds", icon: Pill },
  { id: "nutrition", label: "Nutrition", icon: Apple },
  { id: "exercise", label: "Exercise", icon: Dumbbell },
  { id: "glucose-trends", label: "Insights", icon: BarChart3 },
  { id: "weekly-report", label: "Report", icon: FileText },
  { id: "appointments", label: "Appts", icon: Calendar },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "profile", label: "Profile", icon: User },
];

// Bottom tab bar items (most used, max 5 for mobile)
const bottomTabs = [
  { id: "dashboard", label: "Home", icon: Activity },
  { id: "glucose", label: "Glucose", icon: Droplet },
  { id: "medications", label: "Meds", icon: Pill },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "profile", label: "Profile", icon: User },
];

export const Navigation = ({ currentPage, onPageChange, onSignOut, roleSwitcher }: NavigationProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="bg-card shadow-card border-b border-border" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <button 
              onClick={() => onPageChange('dashboard')}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity min-h-[44px]"
              aria-label="Go to Dashboard"
            >
              <Heart className="h-8 w-8 text-primary" aria-hidden="true" />
              <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                DiabeSure
              </span>
            </button>

            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center space-x-1">
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onPageChange(item.id)}
                    className={cn("flex items-center space-x-1.5 min-h-[44px]", isActive && "font-semibold")}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <IconComponent className="h-4 w-4" aria-hidden="true" />
                    <span>{item.label}</span>
                  </Button>
                );
              })}
              {roleSwitcher && (
                <div className="ml-2 border-l border-border pl-2">
                  {roleSwitcher}
                </div>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-4 text-destructive min-h-[44px]"
                onClick={onSignOut}
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                Logout
              </Button>
            </div>

            {/* Tablet Menu (md but not lg) */}
            <div className="hidden md:flex lg:hidden items-center space-x-1">
              {roleSwitcher}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="min-h-[44px] min-w-[44px]"
                aria-expanded={isMenuOpen}
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>

            {/* Mobile - only show hamburger for "more" items, bottom tabs handle primary nav */}
            <div className="md:hidden flex items-center gap-1">
              {roleSwitcher}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="min-h-[44px] min-w-[44px]"
                aria-expanded={isMenuOpen}
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {/* Dropdown menu for tablet/mobile */}
          {isMenuOpen && (
            <div className="lg:hidden py-4 border-t border-border animate-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col space-y-1">
                {menuItems.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <Button
                      key={item.id}
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      onClick={() => {
                        onPageChange(item.id);
                        setIsMenuOpen(false);
                      }}
                      className={cn("justify-start min-h-[48px]", isActive && "font-semibold")}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <IconComponent className="h-5 w-5 mr-3" aria-hidden="true" />
                      {item.label}
                    </Button>
                  );
                })}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="justify-start text-destructive min-h-[48px]"
                  onClick={onSignOut}
                  aria-label="Sign out"
                >
                  <LogOut className="h-5 w-5 mr-3" aria-hidden="true" />
                  Logout
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg safe-area-bottom" role="tablist" aria-label="Quick navigation">
        <div className="flex justify-around items-center h-16 px-1">
          {bottomTabs.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[56px] min-h-[48px] rounded-lg transition-colors px-2 py-1",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                role="tab"
                aria-selected={isActive}
                aria-label={item.label}
              >
                <IconComponent className={cn("h-5 w-5", isActive && "text-primary")} aria-hidden="true" />
                <span className={cn("text-[10px] mt-0.5 font-medium", isActive && "text-primary")}>{item.label}</span>
                {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
