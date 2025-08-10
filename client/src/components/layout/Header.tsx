import { useState } from 'react';
import { useTheme } from '@/providers/ThemeProvider';
import { useLocation } from 'wouter';
import { Bell, Menu, Moon, Search, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  onMenuToggle: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();
  const [notifications, setNotifications] = useState(3); // Mock notifications count

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.split('/')[1];
    
    if (!path) return 'Dashboard';
    
    // Convert path with hyphens to title case
    return path
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm h-16 flex items-center px-4 sticky top-0 z-10">
      <button 
        onClick={onMenuToggle}
        className="md:hidden mr-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <Menu className="h-5 w-5" />
      </button>
      
      <div className="flex-1">
        <h1 className="text-xl font-medium text-neutral-400 dark:text-white">{getPageTitle()}</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Search Input */}
        <div className="relative hidden md:block">
          <Input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 rounded-full"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-300" />
        </div>
        
        {/* Dark Mode Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="rounded-full"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
        
        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full relative"
        >
          <Bell className="h-5 w-5" />
          {notifications > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-secondary text-white"
              variant="secondary"
            >
              {notifications}
            </Badge>
          )}
        </Button>
      </div>
    </header>
  );
}
