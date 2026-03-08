import { useState } from "react";
import { Menu, X, Heart, Activity, Calendar, BookOpen, User, LogOut, TrendingUp, Apple, Dumbbell, Droplet, Pill, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  onSignOut?: () => void;
  roleSwitcher?: React.ReactNode;
}

export const Navigation = ({ currentPage, onPageChange, onSignOut, roleSwitcher }: NavigationProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Activity },
    { id: "glucose", label: "Glucose", icon: Droplet },
    { id: "medications", label: "Medications", icon: Pill },
    { id: "nutrition", label: "Nutrition", icon: Apple },
    { id: "exercise", label: "Exercise", icon: Dumbbell },
    { id: "appointments", label: "Appointments", icon: Calendar },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "progress", label: "Progress", icon: TrendingUp },
    { id: "education", label: "Education", icon: BookOpen },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="bg-card shadow-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <button 
            onClick={() => onPageChange('dashboard')}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <Heart className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              DiabeSure
            </span>
          </button>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-1">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={currentPage === item.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onPageChange(item.id)}
                  className="flex items-center space-x-2"
                >
                  <IconComponent className="h-4 w-4" />
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
              className="ml-4 text-destructive"
              onClick={onSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-2">
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant={currentPage === item.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      onPageChange(item.id);
                      setIsMenuOpen(false);
                    }}
                    className="justify-start"
                  >
                    <IconComponent className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                );
              })}
              <Button 
                variant="ghost" 
                size="sm" 
                className="justify-start text-destructive"
                onClick={onSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};