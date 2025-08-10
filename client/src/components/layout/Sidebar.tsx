import { Link, useLocation } from "wouter";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";
import type { UserWithPermissions } from "@shared/schema";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  // Debug user data
  console.log("Sidebar user data:", user);

  // Early return if no user or permissions not loaded yet
  if (!user || !user.permissions) return null;

  // Cast user to UserWithPermissions type
  const userWithPermissions = user as UserWithPermissions;

  // Get role name from user.role property (hardcoded from user_roles.name)
  const getRoleName = () => {
    return userWithPermissions.role;
  };

  return (
    <aside
      className={cn(
        "bg-primary text-white w-64 h-screen flex-shrink-0 overflow-y-auto shadow-lg transition-all duration-300 transform md:translate-x-0 fixed md:relative z-10",
        isOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      {/* Logo Section */}
      <div className="p-4 border-b border-primary-light">
        <div className="flex items-center space-x-2">
          {userWithPermissions.school?.logoUrl ? (
            <img
              src={userWithPermissions.school.logoUrl}
              alt={`${userWithPermissions.school.name} logo`}
              className="w-8 h-8 rounded object-cover"
            />
          ) : (
            <span className="material-icons text-2xl">school</span>
          )}
          <h1 className="text-xl font-medium">EduOpps</h1>
        </div>
        {userWithPermissions.school && (
          <p className="text-sm text-primary-light mt-1">
            {userWithPermissions.school.name}
          </p>
        )}
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-b border-primary-light">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center text-white">
            {userWithPermissions.profilePicture ? (
              <img
                src={userWithPermissions.profilePicture}
                alt={`${userWithPermissions.firstName} ${userWithPermissions.lastName}`}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <span className="material-icons">person</span>
            )}
          </div>
          <div className="ml-3">
            <p className="font-medium">
              {userWithPermissions.firstName} {userWithPermissions.lastName}
            </p>
            <p className="text-xs text-primary-light capitalize">
              {getRoleName()}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-4">
        <h2 className="text-xs uppercase text-primary-light font-medium mb-2">
          Main Menu
        </h2>
        <ul className="space-y-1">
          {/* Common features for all users */}
          <li>
            <Link href="/dashboard">
              <a
                className={cn(
                  "flex items-center p-2 rounded hover:bg-primary-dark",
                  location === "/dashboard" && "bg-primary-dark",
                )}
              >
                <span className="material-icons mr-3 text-sm">dashboard</span>
                <span>Dashboard</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/news-feed">
              <a
                className={cn(
                  "flex items-center p-2 rounded hover:bg-primary-dark",
                  location === "/news-feed" && "bg-primary-dark",
                )}
              >
                <span className="material-icons mr-3 text-sm">feed</span>
                <span>News Feed</span>
              </a>
            </Link>
          </li>

          {/* Show opportunities for users who can view opportunities */}
          {userWithPermissions.permissions?.canViewOpportunities && (
            <li>
              <Link href="/opportunities">
                <a
                  className={cn(
                    "flex items-center p-2 rounded hover:bg-primary-dark",
                    location === "/opportunities" && "bg-primary-dark",
                  )}
                >
                  <span className="material-icons mr-3 text-sm">work</span>
                  <span>Opportunities</span>
                </a>
              </Link>
            </li>
          )}

          {/* Student-only features */}

          {/* Document upload feature */}
          {userWithPermissions.permissions?.canUploadDocuments && (
            <li>
              <Link href="/documents">
                <a
                  className={cn(
                    "flex items-center p-2 rounded hover:bg-primary-dark",
                    location === "/documents" && "bg-primary-dark",
                  )}
                >
                  <span className="material-icons mr-3 text-sm">
                    upload_file
                  </span>
                  <span>Upload Documents</span>
                </a>
              </Link>
            </li>
          )}

          {/* View attendees feature */}
          {userWithPermissions.permissions?.canViewAttendees && (
            <li>
              <Link href="/attendees">
                <a
                  className={cn(
                    "flex items-center p-2 rounded hover:bg-primary-dark",
                    location === "/attendees" && "bg-primary-dark",
                  )}
                >
                  <span className="material-icons mr-3 text-sm">group</span>
                  <span>View Attendees</span>
                </a>
              </Link>
            </li>
          )}

          {/* News management feature */}
          {userWithPermissions.permissions?.canManageNews && (
            <li>
              <Link href="/news-management">
                <a
                  className={cn(
                    "flex items-center p-2 rounded hover:bg-primary-dark",
                    location === "/news-management" && "bg-primary-dark",
                  )}
                >
                  <span className="material-icons mr-3 text-sm">
                    manage_search
                  </span>
                  <span>Manage News Feed</span>
                </a>
              </Link>
            </li>
          )}

          {/* Reports - Show only if user can view reports */}
          {userWithPermissions.permissions?.canViewReports && (
            <li>
              <Link href="/reports">
                <a
                  className={cn(
                    "flex items-center p-2 rounded hover:bg-primary-dark",
                    location === "/reports" && "bg-primary-dark",
                  )}
                >
                  <span className="material-icons mr-3 text-sm">bar_chart</span>
                  <span>Reports</span>
                </a>
              </Link>
            </li>
          )}
        </ul>

        {/* Admin Section - Only visible if user has admin permissions */}
        {(userWithPermissions.permissions?.canManageUsers ||
          userWithPermissions.permissions?.canManageSchools ||
          userWithPermissions.permissions?.canManageSettings) && (
          <div>
            <h2 className="text-xs uppercase text-primary-light font-medium mt-6 mb-2">
              Administration
            </h2>
            <ul className="space-y-1">
              {/* User Management - Show only if user can manage users */}
              {userWithPermissions.permissions?.canManageUsers && (
                <li>
                  <Link href="/user-management">
                    <a
                      className={cn(
                        "flex items-center p-2 rounded hover:bg-primary-dark",
                        location === "/user-management" && "bg-primary-dark",
                      )}
                    >
                      <span className="material-icons mr-3 text-sm">
                        manage_accounts
                      </span>
                      <span>Manage Users</span>
                    </a>
                  </Link>
                </li>
              )}

              {/* School Management - Show only if user can manage schools */}
              {userWithPermissions.permissions?.canManageSchools && (
                <li>
                  <Link href="/school-management">
                    <a
                      className={cn(
                        "flex items-center p-2 rounded hover:bg-primary-dark",
                        location === "/school-management" && "bg-primary-dark",
                      )}
                    >
                      <span className="material-icons mr-3 text-sm">
                        school
                      </span>
                      <span>Manage Schools</span>
                    </a>
                  </Link>
                </li>
              )}
              <li>
                <Link href="/opportunities-management">
                  <a
                    className={cn(
                      "flex items-center p-2 rounded hover:bg-primary-dark",
                      location === "/opportunities-management" &&
                        "bg-primary-dark",
                    )}
                  >
                    <span className="material-icons mr-3 text-sm">
                      work_outline
                    </span>
                    <span>Manage Opportunities</span>
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/register-user">
                  <a
                    className={cn(
                      "flex items-center p-2 rounded hover:bg-primary-dark",
                      location === "/register-user" && "bg-primary-dark",
                    )}
                  >
                    <span className="material-icons mr-3 text-sm">
                      person_add
                    </span>
                    <span>Register User</span>
                  </a>
                </Link>
              </li>
              {/* School Settings - Show only if user can manage settings */}
              {userWithPermissions.permissions?.canManageSettings && (
                <>
                  <li>
                    <Link href="/school-settings">
                      <a
                        className={cn(
                          "flex items-center p-2 rounded hover:bg-primary-dark",
                          location === "/school-settings" && "bg-primary-dark",
                        )}
                      >
                        <span className="material-icons mr-3 text-sm">
                          apartment
                        </span>
                        <span>School Settings</span>
                      </a>
                    </Link>
                  </li>
                  <li>
                    <Link href="/system-settings">
                      <a
                        className={cn(
                          "flex items-center p-2 rounded hover:bg-primary-dark",
                          location === "/system-settings" && "bg-primary-dark",
                        )}
                      >
                        <span className="material-icons mr-3 text-sm">
                          settings
                        </span>
                        <span>System Settings</span>
                      </a>
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        )}
      </nav>

      {/* Bottom Actions */}
      <div className="absolute bottom-0 w-full p-4 border-t border-primary-light">
        <div className="space-y-1">
          <Link href="/settings">
            <a
              className={cn(
                "flex items-center p-2 w-full rounded hover:bg-primary-dark",
                location === "/settings" && "bg-primary-dark",
              )}
            >
              <span className="material-icons mr-3 text-sm">settings</span>
              <span>Settings</span>
            </a>
          </Link>
          <button
            className="flex items-center p-2 w-full rounded hover:bg-primary-dark"
            onClick={() => logout()}
          >
            <span className="material-icons mr-3 text-sm">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
