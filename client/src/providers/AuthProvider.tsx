import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { auth } from '@/lib/auth';

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: number;
  schoolId: number | null;
  school?: {
    id: number;
    name: string;
    logoUrl: string | null;
    description: string | null;
  } | null;
  profilePicture?: string;
  permissions?: {
    canCreateOpportunities: boolean;
    canEditOwnOpportunities: boolean;
    canEditSchoolOpportunities: boolean;
    canEditAllOpportunities: boolean;
    canViewOpportunities: boolean;
    canManageUsers: boolean;
    canManageSchools: boolean;
    canViewReports: boolean;
    canManageSettings: boolean;
    canManagePreferences: boolean;
    canUploadDocuments: boolean;
    canViewAttendees: boolean;
    canManageNews: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (userData: any) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Check if user is already logged in
  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const res = await fetch('/api/auth/current-user', {
          credentials: 'include',
        });

        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          console.log('Current user loaded:', userData);
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCurrentUser();
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await apiRequest('POST', '/api/auth/login', { email, password });
      const userData = await res.json();
      
      // After login, fetch complete user data with permissions
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure session is set
      
      const currentUserRes = await fetch('/api/auth/current-user', {
        credentials: 'include',
      });
      
      if (currentUserRes.ok) {
        const completeUserData = await currentUserRes.json();
        setUser(completeUserData);
        console.log('Complete user data loaded after login:', completeUserData);
      } else {
        // Fallback to login response data
        setUser(userData);
      }
      
      toast({
        title: 'Login successful',
        description: `Welcome back, ${userData.firstName || 'User'}!`,
      });
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Login failed',
        description: error instanceof Error ? error.message : 'Invalid email or password',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      await apiRequest('POST', '/api/auth/logout', {});
      setUser(null);
      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully',
      });
      setLocation('/login');
    } catch (error) {
      toast({
        title: 'Logout failed',
        description: error instanceof Error ? error.message : 'An error occurred during logout',
        variant: 'destructive',
      });
    }
  };

  // Register function
  const register = async (userData: any): Promise<boolean> => {
    try {
      const result = await auth.register(userData);
      console.log('Registration successful:', result);
      toast({
        title: 'Registration successful',
        description: 'Your account has been created. Please log in.',
      });
      return true;
    } catch (error) {
      console.error('AuthProvider registration error:', error);
      toast({
        title: 'Registration failed',
        description: error instanceof Error ? error.message : 'Could not create account',
        variant: 'destructive',
      });
      return false;
    }
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
