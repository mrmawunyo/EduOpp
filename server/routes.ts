import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  users,
  userRoles,
  schools,
  opportunities,
  studentInterests,
  newsPosts,
  formRequests,
  studentPreferences,
  systemSettings,
  filterOptions,
  documents,
  insertUserSchema,
  insertSchoolSchema,
  insertOpportunitySchema,
  insertStudentInterestSchema,
  insertNewsPostSchema,
  insertFormRequestSchema,
  insertStudentPreferencesSchema,
  insertSystemSettingSchema,
  insertFilterOptionSchema,
  insertDocumentSchema,
  type User,
  type School,
  type Opportunity,
} from "@shared/schema";
import MemoryStore from "memorystore";
import { db } from "./db";
import { eq, and, or, like, sql, inArray, ne } from "drizzle-orm";
import multer from "multer";
import {
  uploadFileToStorage,
  generatePresignedUrl,
  getFileFromMinio,
  deleteFileFromMinio,
  isStorageAvailable,
} from "./replitOSS";
import {
  uploadFileToLocalStorage,
  deleteFileFromLocalStorage,
  generateLocalDownloadUrl,
} from "./localStorage";
import {
  sendApplicationFormsEmail,
  sendApplicationFormNotification,
} from "./emailService";

// Extend Express types for authenticated user
declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string;
      claims?: any;
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    };
  }
}

// Configure session store
const SessionStore = MemoryStore(session);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedMimes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/png",
      "image/gif",
      "text/plain",
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

// Helper to validate requests
const validateRequest = (schema: z.ZodType<any, any>) => {
  return (req: Request, res: Response, next: Function) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      res.status(400).json({ error: "Invalid request data", details: error });
    }
  };
};

// Helper to check authentication
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  console.log(`🔐 Authentication check for ${req.method} ${req.path}`);
  console.log("Session ID:", req.sessionID);
  console.log("Is authenticated:", req.isAuthenticated());
  console.log("User in session:", req.user ? "YES" : "NO");

  if (req.user) {
    console.log("User object exists:", req.user);
  }

  if (req.isAuthenticated() && req.user) {
    console.log("✅ Authentication successful");
    return next();
  }

  console.log("❌ Authentication failed - returning 401");
  res.status(401).json({ message: "Not authenticated" });
};

// Permission-based authorization middleware
const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Get user with role information
      const user = await storage.getUserById(parseInt((req.user as any).id));
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get role permissions
      const [roleData] = await db
        .select()
        .from(userRoles)
        .where(eq(userRoles.id, user.roleId));
      if (!roleData) {
        return res.status(403).json({ message: "No role assigned" });
      }

      // Check specific permission
      let hasPermission = false;
      switch (permission) {
        case "createOpportunities":
          hasPermission = Boolean(roleData.canCreateOpportunities);
          break;
        case "editOwnOpportunities":
          hasPermission = Boolean(roleData.canEditOwnOpportunities);
          break;
        case "editSchoolOpportunities":
          hasPermission = Boolean(roleData.canEditSchoolOpportunities);
          break;
        case "editAllOpportunities":
          hasPermission = Boolean(roleData.canEditAllOpportunities);
          break;
        case "viewOpportunities":
          hasPermission = Boolean(roleData.canViewOpportunities);
          break;
        case "manageUsers":
          hasPermission = Boolean(roleData.canManageUsers);
          break;
        case "viewReports":
          hasPermission = Boolean(roleData.canViewReports);
          break;
        case "manageSettings":
          hasPermission = Boolean(roleData.canManageSettings);
          break;
        case "managePreferences":
          hasPermission = Boolean(roleData.canManagePreferences);
          break;
        case "uploadDocuments":
          hasPermission = Boolean(roleData.canUploadDocuments);
          break;
        case "viewAttendees":
          hasPermission = Boolean(roleData.canViewAttendees);
          break;
        case "manageNews":
          hasPermission = Boolean(roleData.canManageNews);
          break;
        case "manageSchools":
          hasPermission = Boolean(roleData.canManageSchools);
          break;
        default:
          hasPermission = false;
      }

      if (!hasPermission) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Add user data with role info to request for use in route handlers
      (req as any).userWithRole = {
        ...user,
        roleName: roleData.name,
        permissions: roleData,
      };

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ message: "Permission check failed" });
    }
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up session management
  // Trust the first proxy (important for secure cookies)
  app.set("trust proxy", 1);

  // Set up session storage
  app.use(
    session({
      cookie: {
        maxAge: 86400000, // 1 day
        httpOnly: true,
        sameSite: "lax",
        secure: false, // We're setting this to false for development to ensure cookies work
      },
      store: new SessionStore({
        checkPeriod: 86400000, // 1 day
      }),
      resave: false,
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET || "eduopps-secret",
    }),
  );

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy for email/password login
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          console.log("Login attempt for email:", email);
          const user = await storage.getUserByEmail(email);

          if (!user) {
            console.log("No user found with email:", email);
            return done(null, false, { message: "Invalid email or password" });
          }

          console.log("User found, validating password");
          // For debugging only, do not log passwords in production
          console.log("Comparing password with stored hash");

          const isValidPassword = await bcrypt.compare(password, user.password);

          if (!isValidPassword) {
            console.log("Password validation failed");
            return done(null, false, { message: "Invalid email or password" });
          }

          console.log("Password validation successful");
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );

  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // ===== API Routes =====

  // Auth routes
  app.post("/api/auth/login", (req, res, next) => {
    console.log("Login request received for user:", req.body.email);

    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }

      if (!user) {
        console.log(
          "Authentication failed:",
          info?.message || "Unknown reason",
        );
        return res
          .status(401)
          .json({ message: info?.message || "Authentication failed" });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Session error:", loginErr);
          return next(loginErr);
        }

        console.log("User successfully logged in:", user.email);

        // Return basic user data - full data will be loaded by current-user endpoint
        res.json({
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          schoolId: user.schoolId,
          isActive: user.isActive,
          profilePicture: user.profilePicture,
          createdAt: user.createdAt,
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/current-user", async (req, res) => {
    console.log(
      "Current user session check:",
      req.isAuthenticated(),
      req.user ? req.user.id : "no user",
    );

    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // Get user from database with role information
      const user = await storage.getUserById(parseInt((req.user as any).id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get role and permissions from roleId
      const [roleData] = await db
        .select()
        .from(userRoles)
        .where(eq(userRoles.id, user.roleId));
      const roleName = roleData?.name || "student";

      // Get school information if user belongs to a school
      let schoolData = null;
      if (user.schoolId) {
        const [school] = await db
          .select()
          .from(schools)
          .where(eq(schools.id, user.schoolId));
        schoolData = school
          ? {
              id: school.id,
              name: school.name,
              logoUrl: school.logoUrl,
              description: school.description,
            }
          : null;
      }

      console.log("Returning authenticated user:", user.email);

      // Return user data with permissions and school info
      res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: roleName,
        schoolId: user.schoolId,
        school: schoolData,
        isActive: user.isActive,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
        permissions: {
          canCreateOpportunities: roleData?.canCreateOpportunities || false,
          canEditOwnOpportunities: roleData?.canEditOwnOpportunities || false,
          canEditSchoolOpportunities:
            roleData?.canEditSchoolOpportunities || false,
          canEditAllOpportunities: roleData?.canEditAllOpportunities || false,
          canViewOpportunities: roleData?.canViewOpportunities || true,
          canManageUsers: roleData?.canManageUsers || false,
          canManageSchools: roleData?.canManageSchools || false,
          canViewReports: roleData?.canViewReports || false,
          canManageSettings: roleData?.canManageSettings || false,
          canManagePreferences: roleData?.canManagePreferences || false,
          canUploadDocuments: roleData?.canUploadDocuments || false,
          canViewAttendees: roleData?.canViewAttendees || false,
          canManageNews: roleData?.canManageNews || false,
        },
      });
    } catch (error) {
      console.error("Error fetching current user:", error);
      res.status(500).json({ message: "Failed to fetch user data" });
    }
  });

  // Teacher self-registration
  app.post(
    "/api/auth/register/teacher",
    validateRequest(
      insertUserSchema
        .extend({
          confirmPassword: z.string(),
          schoolId: z.number(),
        })
        .partial({ role: true }) // Make role optional as we'll set it in the handler
        .refine((data) => data.password === data.confirmPassword, {
          message: "Passwords do not match",
          path: ["confirmPassword"],
        }),
    ),
    async (req, res) => {
      try {
        const { confirmPassword, ...userData } = req.body;

        // Check if email is already registered
        const existingEmail = await storage.getUserByEmail(userData.email);
        if (existingEmail) {
          return res.status(400).json({ message: "Email already in use" });
        }

        // Check if username is already taken
        const existingUsername = await storage.getUserByUsername(
          userData.username,
        );
        if (existingUsername) {
          return res.status(400).json({ message: "Username already taken" });
        }

        // Check if school exists
        const school = await storage.getSchoolById(userData.schoolId);
        if (!school) {
          return res.status(400).json({ message: "School not found" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Create user with teacher role
        const user = await storage.createUser({
          ...userData,
          password: hashedPassword,
          role: "teacher",
        });

        // Remove password before sending response
        const { password, ...userWithoutPassword } = user;

        res.status(201).json(userWithoutPassword);
      } catch (error) {
        res.status(500).json({ message: "Failed to register", error });
      }
    },
  );

  // Admin routes for user management
  app.post(
    "/api/users",
    isAuthenticated,
    requirePermission("manageUsers"),
    validateRequest(
      insertUserSchema
        .extend({
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: "Passwords do not match",
          path: ["confirmPassword"],
        }),
    ),
    async (req, res) => {
      try {
        const { confirmPassword, ...userData } = req.body;

        // Check if email is already registered
        const existingEmail = await storage.getUserByEmail(userData.email);
        if (existingEmail) {
          return res.status(400).json({ message: "Email already in use" });
        }

        // Check if username is already taken
        const existingUsername = await storage.getUserByUsername(
          userData.username,
        );
        if (existingUsername) {
          return res.status(400).json({ message: "Username already taken" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Create user
        const user = await storage.createUser({
          ...userData,
          password: hashedPassword,
        });

        // Remove password before sending response
        const { password, ...userWithoutPassword } = user;

        res.status(201).json(userWithoutPassword);
      } catch (error) {
        res.status(500).json({ message: "Failed to create user", error });
      }
    },
  );

  // Update user endpoint
  app.put(
    "/api/users/:id",
    isAuthenticated,
    requirePermission("manageUsers"),
    validateRequest(
      insertUserSchema
        .omit({ password: true })
        .extend({
          roleId: z.number(),
        })
        .partial(),
    ),
    async (req, res) => {
      try {
        const { id } = req.params;
        const userId = parseInt(id);
        const currentUser = req.user as any;

        // Prevent users from editing their own record
        if (currentUser.id === userId) {
          return res.status(403).json({
            message: "You cannot edit your own user record",
          });
        }

        // Check if user exists
        const existingUser = await storage.getUserById(userId);
        if (!existingUser) {
          return res.status(404).json({ message: "User not found" });
        }

        // If email is being updated, check if it's already in use by another user
        if (req.body.email && req.body.email !== existingUser.email) {
          const existingEmail = await storage.getUserByEmail(req.body.email);
          if (existingEmail && existingEmail.id !== userId) {
            return res.status(400).json({ message: "Email already in use" });
          }
        }

        // If username is being updated, check if it's already taken by another user
        if (req.body.username && req.body.username !== existingUser.username) {
          const existingUsername = await storage.getUserByUsername(
            req.body.username,
          );
          if (existingUsername && existingUsername.id !== userId) {
            return res.status(400).json({ message: "Username already taken" });
          }
        }

        // Update user
        const updatedUser = await storage.updateUser(userId, req.body);

        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }

        // Remove password before sending response
        const { password, ...userWithoutPassword } = updatedUser;

        res.json(userWithoutPassword);
      } catch (error) {
        res.status(500).json({ message: "Failed to update user", error });
      }
    },
  );

  app.get(
    "/api/users/school/:schoolId",
    isAuthenticated,

    async (req, res) => {
      try {
        const { schoolId } = req.params;
        const { role } = req.query;

        const users = await storage.getUsersBySchoolId(
          parseInt(schoolId),
          role ? String(role) : undefined,
        );

        // Remove passwords before sending response
        const usersWithoutPasswords = users.map((user) => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        });

        res.json(usersWithoutPasswords);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch users", error });
      }
    },
  );

  app.get(
    "/api/users/role/:role",
    isAuthenticated,

    async (req, res) => {
      try {
        const { role } = req.params;

        const users = await storage.getUsersByRole(role);

        // Remove passwords before sending response
        const usersWithoutPasswords = users.map((user) => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        });

        res.json(usersWithoutPasswords);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch users", error });
      }
    },
  );

  // School routes
  app.post(
    "/api/schools",
    isAuthenticated,
    requirePermission("manageSchools"),
    validateRequest(insertSchoolSchema),
    async (req, res) => {
      try {
        const school = await storage.createSchool(req.body);
        res.status(201).json(school);
      } catch (error) {
        res.status(500).json({ message: "Failed to create school", error });
      }
    },
  );

  app.get("/api/schools", async (req, res) => {
    try {
      const schools = await storage.getAllSchools();
      res.json(schools);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch schools", error });
    }
  });

  app.put(
    "/api/schools/:id",
    isAuthenticated,
    requirePermission("manageSchools"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const school = await storage.updateSchool(parseInt(id), req.body);
        if (!school) {
          return res.status(404).json({ message: "School not found" });
        }
        res.json(school);
      } catch (error) {
        res.status(500).json({ message: "Failed to update school", error });
      }
    },
  );

  app.delete(
    "/api/schools/:id",
    isAuthenticated,
    requirePermission("manageSchools"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const success = await storage.deleteSchool(parseInt(id));
        if (!success) {
          return res.status(404).json({ message: "School not found" });
        }
        res.json({ message: "School deleted successfully" });
      } catch (error) {
        res.status(500).json({ message: "Failed to delete school", error });
      }
    },
  );

  // User roles endpoint (for admin management)
  app.get(
    "/api/user-roles",
    isAuthenticated,
    requirePermission("manageUsers"),
    async (req, res) => {
      try {
        const roles = await storage.getUserRoles();
        res.json(roles);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch user roles", error });
      }
    },
  );

  // Public user roles endpoint for registration (only teacher role)
  app.get("/api/public/user-roles", async (req, res) => {
    try {
      const roles = await storage.getUserRoles();
      // Filter to only include the teacher role for registration
      const teacherRoles = roles.filter(
        (role) => role.name.toLowerCase() === "teacher",
      );
      res.json(teacherRoles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user roles", error });
    }
  });

  app.get("/api/schools/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const school = await storage.getSchoolById(parseInt(id));

      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }

      res.json(school);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch school", error });
    }
  });

  app.put(
    "/api/schools/:id",
    isAuthenticated,

    async (req, res) => {
      try {
        const { id } = req.params;

        // Only allow superadmins to update any school, admins can only update their own school
        if (req.user.role === "admin" && req.user.schoolId !== parseInt(id)) {
          return res
            .status(403)
            .json({ message: "You can only update your own school" });
        }

        const updatedSchool = await storage.updateSchool(
          parseInt(id),
          req.body,
        );

        if (!updatedSchool) {
          return res.status(404).json({ message: "School not found" });
        }

        res.json(updatedSchool);
      } catch (error) {
        res.status(500).json({ message: "Failed to update school", error });
      }
    },
  );

  // Opportunity routes
  app.post(
    "/api/opportunities",
    isAuthenticated,
    requirePermission("createOpportunities"),
    validateRequest(insertOpportunitySchema),
    async (req, res) => {
      try {
        const userWithRole = (req as any).userWithRole;

        // Set the created by ID to the current user
        const opportunityData = {
          ...req.body,
          createdById: userWithRole.id,
        };

        // If not superadmin, ensure schoolId is set to user's school
        if (
          userWithRole.roleName !== "superadmin" &&
          !opportunityData.schoolId
        ) {
          opportunityData.schoolId = userWithRole.schoolId;
        }

        // Only superadmins can create global opportunities
        if (userWithRole.roleName !== "superadmin") {
          opportunityData.isGlobal = false;
        }

        const opportunity = await storage.createOpportunity(opportunityData);
        res.status(201).json(opportunity);
      } catch (error) {
        res
          .status(500)
          .json({ message: "Failed to create opportunity", error });
      }
    },
  );

  app.get("/api/opportunities", isAuthenticated, async (req, res) => {
    try {
      // Get opportunities based on user role and school
      const userId = (req.user as any).id;
      console.log("Fetching opportunities for user ID:", userId);

      const opportunities = await storage.getOpportunitiesForUser(userId);
      console.log("Found opportunities:", opportunities.length);

      res.json(opportunities);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      res.status(500).json({
        message: "Failed to fetch opportunities",
        error: error.message,
      });
    }
  });

  app.get("/api/opportunities/search", async (req, res) => {
    try {
      const { query, ...filters } = req.query;

      // Parse filter values
      const parsedFilters: any = {};

      if (filters.industry) parsedFilters.industry = filters.industry;
      if (filters.ageGroup) {
        parsedFilters.ageGroup = Array.isArray(filters.ageGroup)
          ? filters.ageGroup
          : [filters.ageGroup];
      }
      if (filters.location) parsedFilters.location = filters.location;
      if (filters.startDate)
        parsedFilters.startDate = new Date(filters.startDate as string);
      if (filters.endDate)
        parsedFilters.endDate = new Date(filters.endDate as string);
      if (filters.ethnicityFocus)
        parsedFilters.ethnicityFocus = filters.ethnicityFocus;
      if (filters.genderFocus) parsedFilters.genderFocus = filters.genderFocus;
      if (filters.isVirtual !== undefined)
        parsedFilters.isVirtual = filters.isVirtual === "true";
      if (filters.createdById)
        parsedFilters.createdById = parseInt(filters.createdById as string);

      // For demo purposes, we're removing authentication requirements
      // In a production app, we would use req.user.schoolId and role here

      const opportunities = await storage.searchOpportunities(
        query ? String(query) : "",
        parsedFilters,
      );

      res.json(opportunities);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to search opportunities", error });
    }
  });

  // Get opportunities that have at least one registered student
  app.get(
    "/api/opportunities/with-registered-students",
    isAuthenticated,
    async (req, res) => {
      try {
        const opportunities =
          await storage.getOpportunitiesWithRegisteredStudents();
        res.json(opportunities);
      } catch (error) {
        res.status(500).json({
          message: "Failed to fetch opportunities with registered students",
          error,
        });
      }
    },
  );

  app.get("/api/opportunities/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(
        `Fetching opportunity with ID: ${id}, Auth status: ${req.isAuthenticated()}`,
      );

      // Validate that ID is a valid number
      if (!id || id === "undefined" || isNaN(parseInt(id))) {
        return res.status(400).json({ message: "Invalid opportunity ID" });
      }

      const opportunity = await storage.getOpportunityById(parseInt(id));

      if (!opportunity) {
        return res.status(404).json({ message: "Opportunity not found" });
      }

      // In development mode, allow unrestricted access to opportunities
      // In production, you would want to uncomment this code for proper access control
      /*
      if (req.isAuthenticated()) {
        const userSchoolId = req.user.schoolId;
        const canAccess = 
          req.user.role === 'superadmin' || 
          opportunity.schoolId === userSchoolId || 
          opportunity.isGlobal || 
          (opportunity.visibleToSchools && opportunity.visibleToSchools.includes(userSchoolId));
        
        if (!canAccess) {
          return res.status(403).json({ message: "You do not have access to this opportunity" });
        }
      } else {
        return res.status(401).json({ message: "Authentication required" });
      }
      */

      res.json(opportunity);
    } catch (error) {
      console.error("Error fetching opportunity:", error);
      res.status(500).json({ message: "Failed to fetch opportunity", error });
    }
  });

  app.put(
    "/api/opportunities/:id",
    isAuthenticated,

    async (req, res) => {
      try {
        const { id } = req.params;
        console.log(`Updating opportunity ${id} with data:`, req.body);

        const opportunity = await storage.getOpportunityById(parseInt(id));

        if (!opportunity) {
          return res.status(404).json({ message: "Opportunity not found" });
        }

        // Check if user has permission to update this opportunity
        // Role IDs: 1=student, 2=teacher, 3=moderator, 4=admin, 5=superadmin
        console.log("Permission check debug:");
        console.log("User:", {
          id: req.user.id,
          roleId: req.user.roleId,
          schoolId: req.user.schoolId,
        });
        console.log("Opportunity:", {
          id: opportunity.id,
          createdById: opportunity.createdById,
          schoolId: opportunity.schoolId,
        });

        const hasPermission =
          req.user.roleId === 5 || // superadmin
          req.user.roleId === 4 || // admin
          (req.user.roleId === 3 &&
            req.user.schoolId === opportunity.schoolId) || // moderator from same school
          (req.user.roleId === 2 &&
            req.user.schoolId === opportunity.schoolId) || // teacher from same school
          req.user.id === opportunity.createdById; // creator

        console.log("Permission result:", hasPermission);

        if (!hasPermission) {
          return res.status(403).json({
            message: "You do not have permission to update this opportunity",
          });
        }

        // Clean up the update data
        const updateData = { ...req.body };

        // Only superadmins can update global status
        if (req.user.roleId !== 5 && updateData.isGlobal !== undefined) {
          delete updateData.isGlobal;
        }

        // Ensure dates are properly formatted
        if (updateData.startDate) {
          updateData.startDate = new Date(updateData.startDate);
        }
        if (updateData.endDate) {
          updateData.endDate = new Date(updateData.endDate);
        }
        if (updateData.applicationDeadline) {
          updateData.applicationDeadline = new Date(
            updateData.applicationDeadline,
          );
        }

        // Handle empty strings for optional fields
        if (updateData.ethnicityFocus === "") updateData.ethnicityFocus = null;
        if (updateData.genderFocus === "") updateData.genderFocus = null;
        if (updateData.contactPerson === "") updateData.contactPerson = null;
        if (updateData.contactEmail === "") updateData.contactEmail = null;
        if (updateData.externalUrl === "") updateData.externalUrl = null;
        if (updateData.imageUrl === "") updateData.imageUrl = null;
        if (updateData.details === "") updateData.details = null;
        if (updateData.requirements === "") updateData.requirements = null;
        if (updateData.applicationProcess === "")
          updateData.applicationProcess = null;
        if (updateData.compensation === "") updateData.compensation = null;

        console.log(`Cleaned update data:`, updateData);

        const updatedOpportunity = await storage.updateOpportunity(
          parseInt(id),
          updateData,
        );
        console.log(`Update result:`, updatedOpportunity);

        if (!updatedOpportunity) {
          return res.status(500).json({
            message: "Failed to update opportunity - no data returned",
          });
        }

        console.log(`Successfully updated opportunity ${id}`);
        res.json(updatedOpportunity);
      } catch (error: any) {
        console.error(`Error updating opportunity ${id}:`, error);
        res.status(500).json({
          message: "Failed to update opportunity",
          error: error.message,
        });
      }
    },
  );

  app.delete(
    "/api/opportunities/:id",
    isAuthenticated,

    async (req, res) => {
      try {
        const { id } = req.params;
        const opportunity = await storage.getOpportunityById(parseInt(id));

        if (!opportunity) {
          return res.status(404).json({ message: "Opportunity not found" });
        }

        // Check if user has permission to delete this opportunity
        const hasPermission =
          req.user.role === "superadmin" ||
          req.user.role === "admin" ||
          (req.user.role === "moderator" &&
            req.user.schoolId === opportunity.schoolId) ||
          req.user.id === opportunity.createdById;

        if (!hasPermission) {
          return res.status(403).json({
            message: "You do not have permission to delete this opportunity",
          });
        }

        await storage.deleteOpportunity(parseInt(id));
        res.json({ message: "Opportunity deleted successfully" });
      } catch (error) {
        res
          .status(500)
          .json({ message: "Failed to delete opportunity", error });
      }
    },
  );

  // Student interest routes
  app.post(
    "/api/student-interests",
    isAuthenticated,

    async (req, res) => {
      try {
        // Validate that we have an opportunityId
        if (!req.body.opportunityId) {
          return res
            .status(400)
            .json({ message: "Opportunity ID is required" });
        }

        // Ensure student can only register themselves
        const interestData = {
          opportunityId: parseInt(req.body.opportunityId),
          studentId: parseInt((req.user as any).id),
        };

        // Check if opportunity exists and is accessible
        const opportunity = await storage.getOpportunityById(
          interestData.opportunityId,
        );

        if (!opportunity) {
          return res.status(404).json({ message: "Opportunity not found" });
        }

        // Get full user data to check access
        const currentUser = await storage.getUserById(
          parseInt((req.user as any).id),
        );
        if (!currentUser) {
          return res.status(401).json({ message: "User not found" });
        }

        // Check if student has access to this opportunity
        const userSchoolId = currentUser.schoolId;
        const canAccess =
          opportunity.schoolId === userSchoolId ||
          opportunity.isGlobal ||
          (opportunity.visibleToSchools &&
            userSchoolId &&
            opportunity.visibleToSchools.includes(userSchoolId));

        if (!canAccess) {
          return res
            .status(403)
            .json({ message: "You do not have access to this opportunity" });
        }

        const interest = await storage.registerInterest(interestData);
        res.status(201).json(interest);
      } catch (error) {
        res.status(500).json({ message: "Failed to register interest", error });
      }
    },
  );

  app.delete(
    "/api/student-interests/:opportunityId",
    isAuthenticated,

    async (req, res) => {
      try {
        const { opportunityId } = req.params;
        const studentId = parseInt((req.user as any).id);

        await storage.unregisterInterest(studentId, parseInt(opportunityId));
        res.json({ message: "Interest unregistered successfully" });
      } catch (error) {
        res
          .status(500)
          .json({ message: "Failed to unregister interest", error });
      }
    },
  );

  app.get(
    "/api/student-interests/student",
    isAuthenticated,
    async (req, res) => {
      try {
        // Get current user to check permissions
        const currentUser = await storage.getUserById(
          parseInt((req.user as any).id),
        );
        if (!currentUser) {
          return res.status(401).json({ message: "User not found" });
        }

        // Students can only see their own interests
        const studentId = parseInt((req.user as any).id);

        const interests = await storage.getInterestsByStudentId(studentId);
        res.json(interests);
      } catch (error) {
        console.error("Error in student interests endpoint:", error);
        res.status(500).json({
          message: "Failed to fetch student interests",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  app.get(
    "/api/student-interests/opportunity/:opportunityId",
    isAuthenticated,

    async (req, res) => {
      try {
        const { opportunityId } = req.params;

        // Check if opportunity exists and user has access
        const opportunity = await storage.getOpportunityById(
          parseInt(opportunityId),
        );

        if (!opportunity) {
          return res.status(404).json({ message: "Opportunity not found" });
        }

        // Check if user has permission to view interests for this opportunity
        const user = await storage.getUserById(parseInt((req.user as any).id));
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Get user role to check permissions
        const userRoles = await storage.getUserRoles();
        const roleData = userRoles.find((role) => role.id === user.roleId);

        if (!roleData) {
          return res.status(403).json({ message: "Role not found" });
        }

        const hasPermission =
          roleData.canEditAllOpportunities ||
          (roleData.canViewAttendees &&
            user.schoolId === opportunity.schoolId) ||
          user.id === opportunity.createdById;

        if (!hasPermission) {
          return res.status(403).json({
            message:
              "You do not have permission to view interests for this opportunity",
          });
        }

        const interestedStudents =
          await storage.getInterestedStudentsForOpportunity(
            parseInt(opportunityId),
          );

        // Remove passwords before sending response
        const studentsWithoutPasswords = interestedStudents.map((student) => {
          const { password, ...studentWithoutPassword } = student;
          return studentWithoutPassword;
        });

        res.json(studentsWithoutPasswords);
      } catch (error) {
        res
          .status(500)
          .json({ message: "Failed to fetch interested students", error });
      }
    },
  );

  // Get interest counts for all opportunities
  app.get("/api/student-interests/counts", async (req, res) => {
    try {
      const counts = await storage.getStudentInterestStats();
      res.json(counts);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to fetch interest counts", error });
    }
  });

  // CSV Download for attendees
  app.get(
    "/api/student-interests/opportunity/:opportunityId/csv",
    isAuthenticated,
    async (req, res) => {
      try {
        const { opportunityId } = req.params;

        // Check if opportunity exists and user has access
        const opportunity = await storage.getOpportunityById(
          parseInt(opportunityId),
        );

        if (!opportunity) {
          return res.status(404).json({ message: "Opportunity not found" });
        }

        // Get user with permissions
        const user = await storage.getUserById(parseInt((req.user as any).id));
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        // Get user role to check permissions
        const userRoles = await storage.getUserRoles();
        const roleData = userRoles.find((role) => role.id === user.roleId);

        if (!roleData) {
          return res.status(403).json({ message: "Role not found" });
        }

        // Check if user has permission to download CSV for this opportunity
        const hasPermission =
          roleData.canEditAllOpportunities ||
          (roleData.canViewAttendees &&
            user.schoolId === opportunity.schoolId) ||
          user.id === opportunity.createdById;

        if (!hasPermission) {
          return res.status(403).json({
            message:
              "You do not have permission to download attendees for this opportunity",
          });
        }

        const interestedStudents =
          await storage.getInterestedStudentsForOpportunity(
            parseInt(opportunityId),
          );

        // Create CSV content
        const headers = [
          "Name",
          "Email",
          "Username",
          "School",
          "Registration Date",
        ];
        const csvRows = [headers.join(",")];

        for (const student of interestedStudents) {
          const row = [
            `"${student.firstName} ${student.lastName}"`,
            `"${student.email}"`,
            `"${student.username}"`,
            `"${student.school?.name || "N/A"}"`,
            `"${new Date(student.registrationDate || new Date()).toLocaleDateString()}"`,
          ];
          csvRows.push(row.join(","));
        }

        const csvContent = csvRows.join("\n");

        // Set headers for CSV download
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="attendees-for-${opportunity.title.replace(/[^a-zA-Z0-9]/g, "_")}.csv"`,
        );

        res.send(csvContent);
      } catch (error) {
        res.status(500).json({ message: "Failed to generate CSV", error });
      }
    },
  );

  // Document upload with Replit Object storage
  app.post(
    "/api/documents/upload",
    isAuthenticated,
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const { opportunityId, title, description, type } = req.body;

        if (!opportunityId) {
          return res
            .status(400)
            .json({ message: "Opportunity ID is required" });
        }

        // Check if opportunity exists and user has access
        const opportunity = await storage.getOpportunityById(
          parseInt(opportunityId),
        );

        if (!opportunity) {
          return res.status(404).json({ message: "Opportunity not found" });
        }

        // Get current user with permissions
        const currentUser = await storage.getUserById(parseInt(req.user!.id));
        if (!currentUser) {
          return res.status(401).json({ message: "User not found" });
        }

        // Get user role to check permissions
        const userRoles = await storage.getUserRoles();
        const roleData = userRoles.find(
          (role) => role.id === currentUser.roleId,
        );

        if (!roleData) {
          return res.status(403).json({ message: "Role not found" });
        }

        // Check if user has permission to add documents to this opportunity
        const hasPermission =
          roleData.canEditAllOpportunities ||
          (roleData.canUploadDocuments &&
            currentUser.schoolId === opportunity.schoolId) ||
          (roleData.canUploadDocuments &&
            currentUser.id === opportunity.createdById);

        if (!hasPermission) {
          return res.status(403).json({
            message:
              "You do not have permission to add documents to this opportunity",
          });
        }

        // Upload file to Replit Object Storage
        let objectName: string;
        let storageMode = "cloud";

        try {
          if (isStorageAvailable()) {
            objectName = await uploadFileToStorage(
              req.file.buffer,
              req.file.originalname,
              req.file.mimetype,
            );
          } else {
            throw new Error("Object Storage not available");
          }
        } catch (error) {
          // Fallback: store file metadata only
          objectName = `fallback_${Date.now()}_${req.file.originalname}`;
          storageMode = "metadata";
          console.log("Using fallback storage mode - metadata only");
        }

        // Save document metadata to database
        const documentData = {
          name: title || req.file.originalname,
          opportunityId: parseInt(opportunityId),
          filePath: objectName,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
          objectName,
          uploadedById: currentUser.id,
        };

        const document = await storage.addDocument(documentData);

        res.status(201).json({
          ...document,
          message:
            storageMode === "metadata"
              ? "Document uploaded successfully (metadata mode)"
              : "Document uploaded successfully",
          storageMode,
        });
      } catch (error) {
        console.error("Document upload error:", error);
        res.status(500).json({
          message: "Failed to upload document",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // Get document download URL
  app.get("/api/documents/:id/download", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const document = await storage.getDocumentById(parseInt(id));

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Check if opportunity exists and user has access
      const opportunity = await storage.getOpportunityById(
        document.opportunityId,
      );

      if (!opportunity) {
        return res.status(404).json({ message: "Opportunity not found" });
      }

      // Get current user
      const currentUser = await storage.getUserById(parseInt(req.user!.id));
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get user role to check permissions
      const userRoles = await storage.getUserRoles();
      const roleData = userRoles.find((role) => role.id === currentUser.roleId);

      if (!roleData) {
        return res.status(403).json({ message: "Role not found" });
      }

      // Check if user has access to this opportunity
      const canAccess =
        roleData.canViewOpportunities &&
        (opportunity.isGlobal ||
          currentUser.schoolId === opportunity.schoolId ||
          (opportunity.visibleToSchools &&
            opportunity.visibleToSchools.includes(currentUser.schoolId!)));

      if (!canAccess) {
        return res
          .status(403)
          .json({ message: "You do not have access to this document" });
      }

      // Generate pre-signed URL for download
      if (isStorageAvailable() && document.objectName) {
        try {
          const downloadUrl = await generatePresignedUrl(
            document.objectName,
            3600,
          ); // 1 hour expiry

          res.json({
            downloadUrl,
            fileName: document.name,
            mimeType: document.fileType,
          });
        } catch (error) {
          console.error("Document download error:", error);
          // Fallback when storage is configured but not accessible
          res.status(503).json({
            message:
              "Document storage temporarily unavailable. The file exists but cannot be accessed at this time.",
            fileName: document.name,
            mimeType: document.fileType,
          });
        }
      } else {
        res.status(503).json({
          message: "File storage not available",
          fileName: document.name,
          mimeType: document.fileType,
        });
      }
    } catch (error) {
      console.error("Document download error:", error);
      res.status(500).json({
        message: "Failed to generate download URL",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Serve local storage files
  app.get(
    "/api/documents/local/:objectPath(*)",
    isAuthenticated,
    async (req, res) => {
      try {
        const { objectPath } = req.params;
        const { getFileFromLocalStorage } = await import("./localStorage");

        const fileBuffer = await getFileFromLocalStorage(
          decodeURIComponent(objectPath),
        );

        // Set appropriate headers
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${objectPath.split("/").pop()}"`,
        );

        res.send(fileBuffer);
      } catch (error) {
        console.error("Local file serving error:", error);
        res.status(404).json({ message: "File not found" });
      }
    },
  );

  app.get(
    "/api/documents/opportunity/:opportunityId",
    isAuthenticated,
    async (req, res) => {
      try {
        const { opportunityId } = req.params;

        // Get current user from database
        const currentUser = await storage.getUserById(parseInt(req.user!.id));
        if (!currentUser) {
          return res.status(401).json({ message: "User not found" });
        }

        // Get user role to check permissions
        const userRoles = await storage.getUserRoles();
        const roleData = userRoles.find(
          (role) => role.id === currentUser.roleId,
        );

        if (!roleData) {
          return res.status(403).json({ message: "Role not found" });
        }

        // Check if opportunity exists and user has access
        const opportunity = await storage.getOpportunityById(
          parseInt(opportunityId),
        );

        if (!opportunity) {
          return res.status(404).json({ message: "Opportunity not found" });
        }

        // Check if user has access to this opportunity based on role permissions
        const canAccess =
          roleData.name === "superadmin" ||
          opportunity.schoolId === currentUser.schoolId ||
          opportunity.isGlobal ||
          (opportunity.visibleToSchools &&
            currentUser.schoolId &&
            opportunity.visibleToSchools.includes(currentUser.schoolId));

        if (!canAccess) {
          return res
            .status(403)
            .json({ message: "You do not have access to this opportunity" });
        }

        const documents = await storage.getDocumentsByOpportunityId(
          parseInt(opportunityId),
        );
        res.json(documents);
      } catch (error) {
        console.error("Document fetch error:", error);
        res.status(500).json({
          message: "Failed to fetch documents",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  app.delete("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const document = await storage.getDocumentById(parseInt(id));

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Get current user with permissions
      const currentUser = await storage.getUserById(parseInt(req.user!.id));
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get user role to check permissions
      const userRoles = await storage.getUserRoles();
      const roleData = userRoles.find((role) => role.id === currentUser.roleId);

      if (!roleData) {
        return res.status(403).json({ message: "Role not found" });
      }

      // Check if user has permission to delete this document
      const opportunity = await storage.getOpportunityById(
        document.opportunityId,
      );
      if (!opportunity) {
        return res.status(404).json({ message: "Opportunity not found" });
      }

      const hasPermission =
        roleData.canEditAllOpportunities ||
        (roleData.canEditSchoolOpportunities &&
          currentUser.schoolId === opportunity.schoolId) ||
        (roleData.canEditOwnOpportunities &&
          currentUser.id === opportunity.createdById) ||
        currentUser.id === document.uploadedById; // Document uploader can delete their own documents

      if (!hasPermission) {
        return res.status(403).json({
          message: "You do not have permission to delete this document",
        });
      }

      // Delete file from storage (MinIO or local)
      if (document.objectName) {
        try {
          if (isStorageAvailable()) {
            await deleteFileFromMinio(document.objectName);
          } else {
            // Delete from local storage
            await deleteFileFromLocalStorage(document.objectName);
          }
        } catch (error) {
          console.error("Failed to delete file from storage:", error);
          // Continue with database deletion even if file deletion fails
        }
      }

      await storage.deleteDocument(parseInt(id));
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Document deletion error:", error);
      res.status(500).json({
        message: "Failed to delete document",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Application form request routes
  app.post(
    "/api/form-requests",
    isAuthenticated,
    validateRequest(insertFormRequestSchema),
    async (req, res) => {
      try {
        const { opportunityId, message } = req.body;

        // Get current user
        const currentUser = await storage.getUserById(parseInt(req.user!.id));
        if (!currentUser) {
          return res.status(401).json({ message: "User not found" });
        }

        // Only students can request forms
        if (!currentUser.permissions?.canViewOpportunities) {
          return res
            .status(403)
            .json({ message: "Only students can request application forms" });
        }

        // Check if opportunity exists and user has access
        const opportunity = await storage.getOpportunityById(opportunityId);
        if (!opportunity) {
          return res.status(404).json({ message: "Opportunity not found" });
        }

        // Check if user has access to this opportunity
        const canAccess =
          opportunity.isGlobal ||
          currentUser.schoolId === opportunity.schoolId ||
          (opportunity.visibleToSchools &&
            opportunity.visibleToSchools.includes(currentUser.schoolId!));

        if (!canAccess) {
          return res
            .status(403)
            .json({ message: "You do not have access to this opportunity" });
        }

        // Check if user already requested forms for this opportunity
        const existingRequests = await storage.getFormRequestsByStudentId(
          currentUser.id,
        );
        const existingRequest = existingRequests.find(
          (req) => req.opportunityId === opportunityId,
        );

        if (existingRequest) {
          return res.status(400).json({
            message:
              "You have already requested application forms for this opportunity",
          });
        }

        // Create form request
        const formRequestData = {
          studentId: currentUser.id,
          opportunityId,
          message: message || "",
          status: "pending" as const,
        };

        const formRequest = await storage.createFormRequest(formRequestData);

        // Get opportunity documents (application forms)
        const documents =
          await storage.getDocumentsByOpportunityId(opportunityId);
        const applicationForms = documents.filter(
          (doc) =>
            doc.name.toLowerCase().includes("application") ||
            doc.name.toLowerCase().includes("form"),
        );

        // Send email notification to student with application forms
        if (applicationForms.length > 0) {
          try {
            const emailData = {
              studentEmail: currentUser.email,
              studentName: `${currentUser.firstName} ${currentUser.lastName}`,
              opportunityTitle: opportunity.title,
              documents: applicationForms.map((doc) => ({
                fileName: doc.name,
                objectName: doc.objectName || doc.filePath,
              })),
            };

            const emailSent = await sendApplicationFormsEmail(emailData);

            if (emailSent) {
              await storage.markFormRequestAsEmailSent(formRequest.id);

              // Send notification to opportunity creator
              const creator = await storage.getUserById(
                opportunity.createdById,
              );
              if (creator) {
                await sendApplicationFormNotification(
                  creator.email,
                  creator.firstName,
                  currentUser.email,
                  `${currentUser.firstName} ${currentUser.lastName}`,
                  opportunity.title,
                );
              }
            }
          } catch (emailError) {
            console.error("Email sending failed:", emailError);
            // Don't fail the request if email fails
          }
        }

        res.status(201).json({
          ...formRequest,
          documentsFound: applicationForms.length,
          message:
            applicationForms.length > 0
              ? "Application forms have been sent to your email address"
              : "Form request created successfully, but no application forms are currently available",
        });
      } catch (error) {
        console.error("Form request error:", error);
        res.status(500).json({
          message: "Failed to create form request",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // Get form requests for current user (student)
  app.get(
    "/api/form-requests/my-requests",
    isAuthenticated,
    async (req, res) => {
      try {
        const currentUser = await storage.getUserById(parseInt(req.user!.id));
        if (!currentUser) {
          return res.status(401).json({ message: "User not found" });
        }

        const requests = await storage.getFormRequestsByStudentId(
          currentUser.id,
        );
        res.json(requests);
      } catch (error) {
        console.error("Get form requests error:", error);
        res.status(500).json({
          message: "Failed to fetch form requests",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // Get form requests for an opportunity (teacher/admin view)
  app.get(
    "/api/form-requests/opportunity/:opportunityId",
    isAuthenticated,
    async (req, res) => {
      try {
        const { opportunityId } = req.params;
        const currentUser = await storage.getUserById(parseInt(req.user!.id));
        if (!currentUser) {
          return res.status(401).json({ message: "User not found" });
        }

        // Check if opportunity exists and user has access
        const opportunity = await storage.getOpportunityById(
          parseInt(opportunityId),
        );
        if (!opportunity) {
          return res.status(404).json({ message: "Opportunity not found" });
        }

        // Check if user has permission to view form requests for this opportunity
        const hasPermission =
          currentUser.permissions?.canEditAllOpportunities ||
          (currentUser.permissions?.canEditSchoolOpportunities &&
            currentUser.schoolId === opportunity.schoolId) ||
          (currentUser.permissions?.canEditOwnOpportunities &&
            currentUser.id === opportunity.createdById);

        if (!hasPermission) {
          return res.status(403).json({
            message:
              "You do not have permission to view form requests for this opportunity",
          });
        }

        const requests = await storage.getFormRequestsByOpportunityId(
          parseInt(opportunityId),
        );
        res.json(requests);
      } catch (error) {
        console.error("Get opportunity form requests error:", error);
        res.status(500).json({
          message: "Failed to fetch form requests",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // News feed routes
  app.post(
    "/api/news",
    isAuthenticated,

    validateRequest(insertNewsPostSchema),
    async (req, res) => {
      try {
        // Set the author ID to the current user
        const postData = {
          ...req.body,
          authorId: req.user.id,
        };

        // If not superadmin, ensure schoolId is set to user's school
        if (req.user.role !== "superadmin" && !postData.schoolId) {
          postData.schoolId = req.user.schoolId;
        }

        // Only superadmins can create global news posts
        if (req.user.role !== "superadmin") {
          postData.isGlobal = false;
        }

        const post = await storage.createNewsPost(postData);
        res.status(201).json(post);
      } catch (error) {
        res.status(500).json({ message: "Failed to create news post", error });
      }
    },
  );

  app.get("/api/news", async (req, res) => {
    try {
      // For demo purposes, we're removing authentication requirements
      // In a production app, we would filter based on user role and school
      const posts = await storage.getNewsPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch news posts", error });
    }
  });

  app.get("/api/news/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const post = await storage.getNewsPostById(parseInt(id));

      if (!post) {
        return res.status(404).json({ message: "News post not found" });
      }

      // Check if user has access to this post
      const userSchoolId = req.user.schoolId;
      const canAccess =
        req.user.role === "superadmin" ||
        post.schoolId === userSchoolId ||
        post.isGlobal;

      if (!canAccess) {
        return res
          .status(403)
          .json({ message: "You do not have access to this news post" });
      }

      res.json(post);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch news post", error });
    }
  });

  app.put(
    "/api/news/:id",
    isAuthenticated,

    async (req, res) => {
      try {
        const { id } = req.params;
        const post = await storage.getNewsPostById(parseInt(id));

        if (!post) {
          return res.status(404).json({ message: "News post not found" });
        }

        // Check if user has permission to update this post
        const hasPermission =
          req.user.role === "superadmin" ||
          (req.user.role === "admin" && req.user.schoolId === post.schoolId) ||
          req.user.id === post.authorId;

        if (!hasPermission) {
          return res.status(403).json({
            message: "You do not have permission to update this news post",
          });
        }

        // Only superadmins can update global status
        if (req.user.role !== "superadmin" && req.body.isGlobal !== undefined) {
          delete req.body.isGlobal;
        }

        const updatedPost = await storage.updateNewsPost(
          parseInt(id),
          req.body,
        );
        res.json(updatedPost);
      } catch (error) {
        res.status(500).json({ message: "Failed to update news post", error });
      }
    },
  );

  app.delete(
    "/api/news/:id",
    isAuthenticated,

    async (req, res) => {
      try {
        const { id } = req.params;
        const post = await storage.getNewsPostById(parseInt(id));

        if (!post) {
          return res.status(404).json({ message: "News post not found" });
        }

        // Check if user has permission to delete this post
        const hasPermission =
          req.user.role === "superadmin" ||
          (req.user.role === "admin" && req.user.schoolId === post.schoolId) ||
          req.user.id === post.authorId;

        if (!hasPermission) {
          return res.status(403).json({
            message: "You do not have permission to delete this news post",
          });
        }

        await storage.deleteNewsPost(parseInt(id));
        res.json({ message: "News post deleted successfully" });
      } catch (error) {
        res.status(500).json({ message: "Failed to delete news post", error });
      }
    },
  );

  // Form request routes
  app.post(
    "/api/form-requests",
    isAuthenticated,

    validateRequest(insertFormRequestSchema),
    async (req, res) => {
      try {
        // Ensure student can only request forms for themselves
        const requestData = {
          ...req.body,
          studentId: req.user.id,
        };

        // Check if opportunity exists and is accessible
        const opportunity = await storage.getOpportunityById(
          requestData.opportunityId,
        );

        if (!opportunity) {
          return res.status(404).json({ message: "Opportunity not found" });
        }

        // Check if student has access to this opportunity
        const userSchoolId = req.user.schoolId;
        const canAccess =
          opportunity.schoolId === userSchoolId ||
          opportunity.isGlobal ||
          (opportunity.visibleToSchools &&
            opportunity.visibleToSchools.includes(userSchoolId));

        if (!canAccess) {
          return res
            .status(403)
            .json({ message: "You do not have access to this opportunity" });
        }

        const formRequest = await storage.createFormRequest(requestData);
        res.status(201).json(formRequest);
      } catch (error) {
        res.status(500).json({ message: "Failed to request form", error });
      }
    },
  );

  app.get("/api/form-requests/student", isAuthenticated, async (req, res) => {
    try {
      // Students can only see their own form requests
      const studentId =
        req.user.role === "student"
          ? req.user.id
          : parseInt(req.query.studentId as string);

      // Admins and teachers can view form requests for students in their school
      if (req.user.role !== "student" && req.user.role !== "superadmin") {
        const student = await storage.getUserById(studentId);

        if (!student || student.schoolId !== req.user.schoolId) {
          return res
            .status(403)
            .json({ message: "You can only view students from your school" });
        }
      }

      const formRequests = await storage.getFormRequestsByStudentId(studentId);
      res.json(formRequests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch form requests", error });
    }
  });

  app.get(
    "/api/form-requests/opportunity/:opportunityId",
    isAuthenticated,

    async (req, res) => {
      try {
        const { opportunityId } = req.params;

        // Check if opportunity exists and user has access
        const opportunity = await storage.getOpportunityById(
          parseInt(opportunityId),
        );

        if (!opportunity) {
          return res.status(404).json({ message: "Opportunity not found" });
        }

        // Check if user has permission to view form requests for this opportunity
        const hasPermission =
          req.user.role === "superadmin" ||
          (req.user.role === "admin" &&
            req.user.schoolId === opportunity.schoolId) ||
          req.user.id === opportunity.createdById;

        if (!hasPermission) {
          return res.status(403).json({
            message:
              "You do not have permission to view form requests for this opportunity",
          });
        }

        const formRequests = await storage.getFormRequestsByOpportunityId(
          parseInt(opportunityId),
        );
        res.json(formRequests);
      } catch (error) {
        res
          .status(500)
          .json({ message: "Failed to fetch form requests", error });
      }
    },
  );

  app.put(
    "/api/form-requests/:id/mark-sent",
    isAuthenticated,

    async (req, res) => {
      try {
        const { id } = req.params;

        await storage.markFormRequestAsEmailSent(parseInt(id));
        res.json({ message: "Form request marked as sent" });
      } catch (error) {
        res
          .status(500)
          .json({ message: "Failed to update form request", error });
      }
    },
  );

  // Student preferences routes
  app.post("/api/student-preferences", isAuthenticated, async (req, res) => {
    try {
      // Ensure student can only set preferences for themselves
      const preferencesData = {
        ...req.body,
        userId: parseInt((req.user as any).id),
      };

      console.log(
        "Setting preferences for user:",
        req.user.id,
        "Data:",
        preferencesData,
      );

      const preferences = await storage.setStudentPreferences(preferencesData);
      res.status(201).json(preferences);
    } catch (error) {
      console.error("Error setting preferences:", error);
      res
        .status(500)
        .json({ message: "Failed to set preferences", error: error.message });
    }
  });

  app.get("/api/student-preferences", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt((req.user as any).id);
      console.log("Fetching preferences for user:", userId);

      const preferences = await storage.getStudentPreferencesByUserId(userId);
      console.log("Found preferences:", preferences);

      res.json(
        preferences || {
          userId,
          industries: [],
          ageGroups: [],
          opportunityTypes: [],
          locations: [],
        },
      );
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch preferences", error: error.message });
    }
  });

  app.put(
    "/api/student-preferences",
    isAuthenticated,

    async (req, res) => {
      try {
        const userId = req.user.id;

        const preferences = await storage.updateStudentPreferences(
          userId,
          req.body,
        );
        res.json(preferences);
      } catch (error) {
        res
          .status(500)
          .json({ message: "Failed to update preferences", error });
      }
    },
  );

  // System settings routes
  app.post(
    "/api/settings",
    isAuthenticated,

    validateRequest(insertSystemSettingSchema),
    async (req, res) => {
      try {
        // Set the updated by ID to the current user
        const settingData = {
          ...req.body,
          updatedById: req.user.id,
        };

        const setting = await storage.setSetting(settingData);
        res.status(201).json(setting);
      } catch (error) {
        res.status(500).json({ message: "Failed to set setting", error });
      }
    },
  );

  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getAllSettings();

      // Convert to key-value object
      const settingsObject = settings.reduce(
        (acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        },
        {} as Record<string, string>,
      );

      res.json(settingsObject);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings", error });
    }
  });

  // Filter options routes
  app.post(
    "/api/filter-options",
    isAuthenticated,

    validateRequest(insertFilterOptionSchema),
    async (req, res) => {
      try {
        // Set the created by ID to the current user
        const optionData = {
          ...req.body,
          createdById: req.user.id,
        };

        const option = await storage.createFilterOption(optionData);
        res.status(201).json(option);
      } catch (error) {
        res
          .status(500)
          .json({ message: "Failed to create filter option", error });
      }
    },
  );

  app.get("/api/filter-options", async (req, res) => {
    try {
      const { category } = req.query;

      const options = await storage.getFilterOptions(
        category ? String(category) : undefined,
      );
      res.json(options);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to fetch filter options", error });
    }
  });

  app.put(
    "/api/filter-options/:id",
    isAuthenticated,

    async (req, res) => {
      try {
        const { id } = req.params;

        const updatedOption = await storage.updateFilterOption(
          parseInt(id),
          req.body,
        );

        if (!updatedOption) {
          return res.status(404).json({ message: "Filter option not found" });
        }

        res.json(updatedOption);
      } catch (error) {
        res
          .status(500)
          .json({ message: "Failed to update filter option", error });
      }
    },
  );

  app.delete(
    "/api/filter-options/:id",
    isAuthenticated,

    async (req, res) => {
      try {
        const { id } = req.params;

        await storage.deleteFilterOption(parseInt(id));
        res.json({ message: "Filter option deleted successfully" });
      } catch (error) {
        res
          .status(500)
          .json({ message: "Failed to delete filter option", error });
      }
    },
  );

  // Report routes
  app.get(
    "/api/reports/opportunities",
    isAuthenticated,

    async (req, res) => {
      try {
        const stats = await storage.getOpportunityStats();
        res.json(stats);
      } catch (error) {
        res
          .status(500)
          .json({ message: "Failed to fetch opportunity statistics", error });
      }
    },
  );

  app.get(
    "/api/reports/interests",
    isAuthenticated,

    async (req, res) => {
      try {
        const stats = await storage.getStudentInterestStats();
        res.json(stats);
      } catch (error) {
        res
          .status(500)
          .json({ message: "Failed to fetch interest statistics", error });
      }
    },
  );

  app.get(
    "/api/reports/teacher-activity",
    isAuthenticated,

    async (req, res) => {
      try {
        const { period } = req.query;

        const stats = await storage.getTeacherActivityStats(
          period ? String(period) : undefined,
        );
        res.json(stats);
      } catch (error) {
        res.status(500).json({
          message: "Failed to fetch teacher activity statistics",
          error,
        });
      }
    },
  );

  const httpServer = createServer(app);

  return httpServer;
}
