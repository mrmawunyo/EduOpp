import React from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/providers/ThemeProvider";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import Dashboard from "@/pages/dashboard";
import Opportunities from "@/pages/opportunities";
import NewsFeed from "@/pages/news-feed";
import Students from "@/pages/students";
import Reports from "@/pages/reports";
import UserManagement from "@/pages/user-management";
import SchoolManagement from "@/pages/school-management";
import SchoolSettings from "@/pages/school-settings";
import SystemSettings from "@/pages/system-settings";
import Attendees from "@/pages/attendees";
import Documents from "@/pages/documents";
import Settings from "@/pages/settings";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import MainLayout from "@/components/layout/MainLayout";

// Protected route component
function ProtectedRoute({
  component: Component,
  permission,
  roles,
  ...rest
}: any) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // Use useEffect for navigation to avoid state updates during render
  React.useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [isLoading, user, navigate]);

  // Check if still loading auth state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // If user is not logged in, show loading while the redirect happens
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        Redirecting to login...
      </div>
    );
  }

  // Check permission-based access if permission is specified
  if (permission && user.permissions) {
    const hasPermission =
      user.permissions[permission as keyof typeof user.permissions];
    if (!hasPermission) {
      // Redirect to dashboard for unauthorized access
      return <Redirect to="/dashboard" />;
    }
  }

  // Legacy role check removed - using permission-based access only

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login">{(params) => <Login />}</Route>
      <Route path="/register">{(params) => <Register />}</Route>
      <Route path="/forgot-password">{(params) => <ForgotPassword />}</Route>

      {/* Protected routes with MainLayout */}
      <Route path="/">
        {() => (
          <MainLayout>
            <ProtectedRoute component={Dashboard} />
          </MainLayout>
        )}
      </Route>

      <Route path="/dashboard">
        {() => (
          <MainLayout>
            <ProtectedRoute component={Dashboard} />
          </MainLayout>
        )}
      </Route>

      <Route path="/opportunities">
        {() => (
          <MainLayout>
            <ProtectedRoute
              component={Opportunities}
              permission="canViewOpportunities"
            />
          </MainLayout>
        )}
      </Route>

      <Route path="/opportunities/create">
        {() => (
          <MainLayout>
            <ProtectedRoute
              component={Opportunities}
              permission="canCreateOpportunities"
              createMode={true}
            />
          </MainLayout>
        )}
      </Route>

      <Route path="/opportunities/edit/:id">
        {(params) => (
          <MainLayout>
            <ProtectedRoute
              component={Opportunities}
              permission="canEditOwnOpportunities"
              editMode={true}
              opportunityId={parseInt(params.id)}
            />
          </MainLayout>
        )}
      </Route>

      <Route path="/news-feed">
        {() => (
          <MainLayout>
            <ProtectedRoute component={NewsFeed} />
          </MainLayout>
        )}
      </Route>

      <Route path="/students">
        {() => (
          <MainLayout>
            <ProtectedRoute
              component={Students}
              roles={["teacher", "admin", "superadmin"]}
            />
          </MainLayout>
        )}
      </Route>

      <Route path="/reports">
        {() => (
          <MainLayout>
            <ProtectedRoute component={Reports} permission="canViewReports" />
          </MainLayout>
        )}
      </Route>

      {/* Teacher-specific routes */}
      <Route path="/attendees">
        {() => (
          <MainLayout>
            <ProtectedRoute
              component={Attendees}
              roles={["teacher", "admin", "superadmin"]}
            />
          </MainLayout>
        )}
      </Route>

      <Route path="/documents">
        {() => (
          <MainLayout>
            <ProtectedRoute
              component={Documents}
              roles={["teacher", "admin", "superadmin"]}
            />
          </MainLayout>
        )}
      </Route>

      {/* Student-specific routes */}

      {/* Admin routes */}
      <Route path="/user-management">
        {() => (
          <MainLayout>
            <ProtectedRoute
              component={UserManagement}
              permission="canManageUsers"
            />
          </MainLayout>
        )}
      </Route>

      <Route path="/school-management">
        {() => (
          <MainLayout>
            <ProtectedRoute
              component={SchoolManagement}
              permission="canManageSchools"
            />
          </MainLayout>
        )}
      </Route>

      <Route path="/news-management">
        {() => (
          <MainLayout>
            <ProtectedRoute
              component={() => (
                <div className="container p-6">
                  <h1 className="text-3xl font-bold">Manage News Feed</h1>
                  <p className="text-muted-foreground mt-2">
                    Create, edit, and manage news posts
                  </p>
                </div>
              )}
              roles={["admin", "superadmin"]}
            />
          </MainLayout>
        )}
      </Route>

      <Route path="/register-user">
        {() => (
          <MainLayout>
            <ProtectedRoute
              component={() => (
                <div className="container p-6">
                  <h1 className="text-3xl font-bold">Register New User</h1>
                  <p className="text-muted-foreground mt-2">
                    Add new teachers and students to the system
                  </p>
                </div>
              )}
              roles={["admin", "superadmin"]}
            />
          </MainLayout>
        )}
      </Route>

      <Route path="/opportunities-management">
        {() => (
          <MainLayout>
            <ProtectedRoute
              component={() => (
                <div className="container p-6">
                  <h1 className="text-3xl font-bold">Manage Opportunities</h1>
                  <p className="text-muted-foreground mt-2">
                    Review and manage all opportunities in the system
                  </p>
                </div>
              )}
              roles={["admin", "superadmin"]}
            />
          </MainLayout>
        )}
      </Route>

      <Route path="/settings">
        {() => (
          <MainLayout>
            <ProtectedRoute component={Settings} />
          </MainLayout>
        )}
      </Route>

      <Route path="/school-settings">
        {() => (
          <MainLayout>
            <ProtectedRoute
              component={SchoolSettings}
              permission="canManageSettings"
            />
          </MainLayout>
        )}
      </Route>

      <Route path="/system-settings">
        {() => (
          <MainLayout>
            <ProtectedRoute
              component={SystemSettings}
              roles={["admin", "superadmin"]}
            />
          </MainLayout>
        )}
      </Route>

      {/* Fallback route */}
      <Route path="/not-found" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="eduopps-theme">
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
