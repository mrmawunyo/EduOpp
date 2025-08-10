import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  foreignKey,
  varchar,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Schools table
export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSchoolSchema = createInsertSchema(schools).omit({
  id: true,
  createdAt: true,
});
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schools.$inferSelect;

// User roles table with permissions
export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  canCreateOpportunities: boolean("can_create_opportunities").default(false),
  canEditOwnOpportunities: boolean("can_edit_own_opportunities").default(false),
  canEditSchoolOpportunities: boolean("can_edit_school_opportunities").default(
    false,
  ),
  canEditAllOpportunities: boolean("can_edit_all_opportunities").default(false),
  canViewOpportunities: boolean("can_view_opportunities").default(true),
  canManageUsers: boolean("can_manage_users").default(false),
  canManageSchools: boolean("can_manage_schools").default(false),
  canViewReports: boolean("can_view_reports").default(false),
  canManageSettings: boolean("can_manage_settings").default(false),
  canManagePreferences: boolean("can_manage_preferences").default(false),
  canUploadDocuments: boolean("can_upload_documents").default(false),
  canViewAttendees: boolean("can_view_attendees").default(false),
  canManageNews: boolean("can_manage_news").default(false),
  requiresSchool: boolean("requires_school").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  createdAt: true,
});
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRole = typeof userRoles.$inferSelect;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  roleId: integer("role_id")
    .references(() => userRoles.id, { onDelete: "restrict" })
    .notNull(),
  schoolId: integer("school_id").references(() => schools.id, {
    onDelete: "cascade",
  }), // Optional for admins/superadmins
  isActive: boolean("is_active").default(true).notNull(),
  profilePicture: text("profile_picture"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  isActive: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Extended User type with API-added properties
export type UserWithPermissions = User & {
  role: string;
  permissions: {
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
  };
  school?: {
    id: number;
    name: string;
    logoUrl?: string;
    description?: string;
  };
};

// Define user preferences
export const studentPreferences = pgTable("student_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  industries: text("industries").array(),
  ageGroups: text("age_groups").array(),
  opportunityTypes: text("opportunity_types").array(),
  locations: text("locations").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStudentPreferencesSchema = createInsertSchema(
  studentPreferences,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStudentPreferences = z.infer<
  typeof insertStudentPreferencesSchema
>;
export type StudentPreferences = typeof studentPreferences.$inferSelect;

// Opportunities table
export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  organization: text("organization").notNull(),
  description: text("description").notNull(),
  details: text("details"),
  requirements: text("requirements"),
  applicationProcess: text("application_process"),
  imageUrl: text("image_url"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  applicationDeadline: timestamp("application_deadline").notNull(),
  location: text("location").notNull(),
  isVirtual: boolean("is_virtual").default(false),
  opportunityType: text("opportunity_type").notNull(), // Internship, Volunteer, Workshop, etc.
  compensation: text("compensation"),
  industry: text("industry").notNull(),
  ageGroup: text("age_group").array().notNull(),
  ethnicityFocus: text("ethnicity_focus"),
  genderFocus: text("gender_focus"),
  contactPerson: text("contact_person"),
  contactEmail: text("contact_email"),
  externalUrl: text("external_url"),
  numberOfSpaces: integer("number_of_spaces"),
  createdById: integer("created_by_id").references(() => users.id),
  schoolId: integer("school_id").references(() => schools.id, {
    onDelete: "cascade",
  }),
  isGlobal: boolean("is_global").default(false), // For opportunities visible to all schools (superadmin)
  visibleToSchools: integer("visible_to_schools").array(), // Array of school IDs for multi-school visibility
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOpportunitySchema = createInsertSchema(opportunities)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    // Override date fields to accept strings from frontend
    startDate: z.string().transform((str) => new Date(str)),
    endDate: z.string().transform((str) => new Date(str)),
    applicationDeadline: z.string().transform((str) => new Date(str)),
  });

export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;
export type Opportunity = typeof opportunities.$inferSelect;

// Documents related to opportunities
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id")
    .references(() => opportunities.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  filePath: text("file_path").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  objectName: text("object_name"), // MinIO object name for file storage
  uploadedById: integer("uploaded_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Student interest in opportunities
export const studentInterests = pgTable("student_interests", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  opportunityId: integer("opportunity_id")
    .references(() => opportunities.id, { onDelete: "cascade" })
    .notNull(),
  registrationDate: timestamp("registration_date").defaultNow().notNull(),
  status: text("status").default("registered").notNull(), // registered, attended, completed, etc.
  notes: text("notes"),
});

export const insertStudentInterestSchema = createInsertSchema(
  studentInterests,
).omit({
  id: true,
  registrationDate: true,
});

export type InsertStudentInterest = z.infer<typeof insertStudentInterestSchema>;
export type StudentInterest = typeof studentInterests.$inferSelect;

// News feed for announcements
export const newsPosts = pgTable("news_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: integer("author_id").references(() => users.id),
  schoolId: integer("school_id").references(() => schools.id, {
    onDelete: "cascade",
  }),
  isGlobal: boolean("is_global").default(false), // For news visible to all schools
  imageUrl: text("image_url"),
  likes: integer("likes").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNewsPostSchema = createInsertSchema(newsPosts).omit({
  id: true,
  likes: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNewsPost = z.infer<typeof insertNewsPostSchema>;
export type NewsPost = typeof newsPosts.$inferSelect;

// Form requests by students
export const formRequests = pgTable("form_requests", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  opportunityId: integer("opportunity_id")
    .references(() => opportunities.id, { onDelete: "cascade" })
    .notNull(),
  requestDate: timestamp("request_date").defaultNow().notNull(),
  fulfilled: boolean("fulfilled").default(false),
  emailSent: boolean("email_sent").default(false),
  emailSentDate: timestamp("email_sent_date"),
});

export const insertFormRequestSchema = createInsertSchema(formRequests).omit({
  id: true,
  requestDate: true,
  fulfilled: true,
  emailSent: true,
  emailSentDate: true,
});

export type InsertFormRequest = z.infer<typeof insertFormRequestSchema>;
export type FormRequest = typeof formRequests.$inferSelect;

// System settings for admin configuration
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedById: integer("updated_by_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSystemSettingSchema = createInsertSchema(
  systemSettings,
).omit({
  id: true,
  updatedAt: true,
});

export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;

// Filter options
export const filterOptions = pgTable("filter_options", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(), // industry, ageGroup, ethnicity, gender, etc.
  value: text("value").notNull(),
  label: text("label").notNull(),
  isActive: boolean("is_active").default(true),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFilterOptionSchema = createInsertSchema(filterOptions).omit({
  id: true,
  isActive: true,
  createdAt: true,
});

export type InsertFilterOption = z.infer<typeof insertFilterOptionSchema>;
export type FilterOption = typeof filterOptions.$inferSelect;

// Define relations
export const userRolesRelations = relations(userRoles, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(userRoles, {
    fields: [users.roleId],
    references: [userRoles.id],
  }),
  school: one(schools, {
    fields: [users.schoolId],
    references: [schools.id],
  }),
  createdOpportunities: many(opportunities),
  uploadedDocuments: many(documents),
  studentInterests: many(studentInterests),
  authoredNewsPosts: many(newsPosts),
  preferences: one(studentPreferences),
  formRequests: many(formRequests),
}));

export const opportunitiesRelations = relations(
  opportunities,
  ({ one, many }) => ({
    createdBy: one(users, {
      fields: [opportunities.createdById],
      references: [users.id],
    }),
    school: one(schools, {
      fields: [opportunities.schoolId],
      references: [schools.id],
    }),
    documents: many(documents),
    studentInterests: many(studentInterests),
    formRequests: many(formRequests),
  }),
);

export const studentInterestsRelations = relations(
  studentInterests,
  ({ one }) => ({
    student: one(users, {
      fields: [studentInterests.studentId],
      references: [users.id],
    }),
    opportunity: one(opportunities, {
      fields: [studentInterests.opportunityId],
      references: [opportunities.id],
    }),
  }),
);

export const newsPostsRelations = relations(newsPosts, ({ one }) => ({
  author: one(users, {
    fields: [newsPosts.authorId],
    references: [users.id],
  }),
  school: one(schools, {
    fields: [newsPosts.schoolId],
    references: [schools.id],
  }),
}));

export const formRequestsRelations = relations(formRequests, ({ one }) => ({
  student: one(users, {
    fields: [formRequests.studentId],
    references: [users.id],
  }),
  opportunity: one(opportunities, {
    fields: [formRequests.opportunityId],
    references: [opportunities.id],
  }),
}));
