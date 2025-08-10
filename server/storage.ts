import { eq, and, inArray, or, desc, asc, like, not, sql, isNull } from "drizzle-orm";
import { db } from "./db";
import { 
  users, type User, type InsertUser, 
  userRoles, type UserRole,
  schools, type School, type InsertSchool,
  opportunities, type Opportunity, type InsertOpportunity,
  studentInterests, type StudentInterest, type InsertStudentInterest,
  documents, type Document, type InsertDocument,
  newsPosts, type NewsPost, type InsertNewsPost,
  formRequests, type FormRequest, type InsertFormRequest,
  studentPreferences, type StudentPreferences, type InsertStudentPreferences,
  systemSettings, type SystemSetting, type InsertSystemSetting,
  filterOptions, type FilterOption, type InsertFilterOption
} from "@shared/schema";

export interface IStorage {
  // Auth
  createUser(user: InsertUser): Promise<User>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // Schools
  createSchool(school: InsertSchool): Promise<School>;
  getSchoolById(id: number): Promise<School | undefined>;
  getAllSchools(): Promise<School[]>;
  updateSchool(id: number, updates: Partial<School>): Promise<School | undefined>;
  deleteSchool(id: number): Promise<boolean>;
  
  // Users
  getUsersBySchoolId(schoolId: number, role?: string): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  getUserRoles(): Promise<UserRole[]>;
  
  // Opportunities
  createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity>;
  getOpportunityById(id: number): Promise<Opportunity | undefined>;
  updateOpportunity(id: number, updates: Partial<Opportunity>): Promise<Opportunity | undefined>;
  deleteOpportunity(id: number): Promise<boolean>;
  getOpportunitiesBySchoolId(schoolId: number): Promise<Opportunity[]>;
  getOpportunitiesForUser(userId: number): Promise<Opportunity[]>;
  searchOpportunities(query: string, filters: any): Promise<Opportunity[]>;
  
  // Student Interests
  registerInterest(interest: InsertStudentInterest): Promise<StudentInterest>;
  unregisterInterest(studentId: number, opportunityId: number): Promise<boolean>;
  getInterestsByOpportunityId(opportunityId: number): Promise<StudentInterest[]>;
  getInterestsByStudentId(studentId: number): Promise<StudentInterest[]>;
  getInterestedStudentsForOpportunity(opportunityId: number): Promise<User[]>;
  
  // Documents
  addDocument(document: InsertDocument): Promise<Document>;
  getDocumentById(id: number): Promise<Document | undefined>;
  getDocumentsByOpportunityId(opportunityId: number): Promise<Document[]>;
  deleteDocument(id: number): Promise<boolean>;
  
  // News Posts
  createNewsPost(post: InsertNewsPost): Promise<NewsPost>;
  getNewsPostById(id: number): Promise<NewsPost | undefined>;
  getNewsPosts(schoolId?: number, global?: boolean): Promise<NewsPost[]>;
  updateNewsPost(id: number, updates: Partial<NewsPost>): Promise<NewsPost | undefined>;
  deleteNewsPost(id: number): Promise<boolean>;
  
  // Form Requests
  createFormRequest(request: InsertFormRequest): Promise<FormRequest>;
  getFormRequestById(id: number): Promise<FormRequest | undefined>;
  getFormRequestsByStudentId(studentId: number): Promise<FormRequest[]>;
  getFormRequestsByOpportunityId(opportunityId: number): Promise<FormRequest[]>;
  markFormRequestAsEmailSent(id: number): Promise<boolean>;
  
  // Student Preferences
  setStudentPreferences(preferences: InsertStudentPreferences): Promise<StudentPreferences>;
  getStudentPreferencesByUserId(userId: number): Promise<StudentPreferences | undefined>;
  updateStudentPreferences(userId: number, updates: Partial<StudentPreferences>): Promise<StudentPreferences | undefined>;
  
  // System Settings
  setSetting(setting: InsertSystemSetting): Promise<SystemSetting>;
  getSetting(key: string): Promise<SystemSetting | undefined>;
  getAllSettings(): Promise<SystemSetting[]>;
  
  // Filter Options
  createFilterOption(option: InsertFilterOption): Promise<FilterOption>;
  getFilterOptions(category?: string): Promise<FilterOption[]>;
  updateFilterOption(id: number, updates: Partial<FilterOption>): Promise<FilterOption | undefined>;
  deleteFilterOption(id: number): Promise<boolean>;
  
  // Reports
  getOpportunityStats(): Promise<any>;
  getStudentInterestStats(): Promise<any>;
  getTeacherActivityStats(period?: string): Promise<any>;
  
  // Filtered Opportunities
  getOpportunitiesWithRegisteredStudents(): Promise<Opportunity[]>;
}

export class DatabaseStorage implements IStorage {
  // Auth
  async createUser(user: InsertUser): Promise<User> {
    const [createdUser] = await db.insert(users).values(user).returning();
    return createdUser;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Schools
  async createSchool(school: InsertSchool): Promise<School> {
    const [createdSchool] = await db.insert(schools).values(school).returning();
    return createdSchool;
  }

  async getSchoolById(id: number): Promise<School | undefined> {
    const [school] = await db.select().from(schools).where(eq(schools.id, id));
    return school;
  }

  async getAllSchools(): Promise<School[]> {
    return await db.select().from(schools).orderBy(schools.name);
  }

  async updateSchool(id: number, updates: Partial<School>): Promise<School | undefined> {
    const [updatedSchool] = await db
      .update(schools)
      .set(updates)
      .where(eq(schools.id, id))
      .returning();
    return updatedSchool;
  }

  async deleteSchool(id: number): Promise<boolean> {
    await db.delete(schools).where(eq(schools.id, id));
    return true;
  }

  // Users
  async getUsersBySchoolId(schoolId: number, role?: string): Promise<any[]> {
    const query = db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        roleId: users.roleId,
        schoolId: users.schoolId,
        isActive: users.isActive,
        profilePicture: users.profilePicture,
        createdAt: users.createdAt,
        roleName: userRoles.name,
        roleDescription: userRoles.description,
      })
      .from(users)
      .innerJoin(userRoles, eq(users.roleId, userRoles.id))
      .where(eq(users.schoolId, schoolId));

    if (role && role !== 'all') {
      query.where(and(eq(users.schoolId, schoolId), eq(userRoles.name, role)));
    }

    return await query.orderBy(desc(users.createdAt));
  }

  async getUsersByRole(role: string): Promise<any[]> {
    return await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        roleId: users.roleId,
        schoolId: users.schoolId,
        isActive: users.isActive,
        profilePicture: users.profilePicture,
        createdAt: users.createdAt,
        roleName: userRoles.name,
        roleDescription: userRoles.description,
      })
      .from(users)
      .innerJoin(userRoles, eq(users.roleId, userRoles.id))
      .where(eq(userRoles.name, role))
      .orderBy(users.lastName, users.firstName);
  }

  async getUserRoles(): Promise<UserRole[]> {
    return await db.select().from(userRoles).orderBy(userRoles.name);
  }

  // Opportunities
  async createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity> {
    const [createdOpportunity] = await db.insert(opportunities).values(opportunity).returning();
    return createdOpportunity;
  }

  async getOpportunityById(id: number): Promise<Opportunity | undefined> {
    const [opportunity] = await db.select().from(opportunities).where(eq(opportunities.id, id));
    return opportunity;
  }

  async updateOpportunity(id: number, updates: Partial<Opportunity>): Promise<Opportunity | undefined> {
    const [updatedOpportunity] = await db
      .update(opportunities)
      .set(updates)
      .where(eq(opportunities.id, id))
      .returning();
    return updatedOpportunity;
  }

  async deleteOpportunity(id: number): Promise<boolean> {
    const result = await db.delete(opportunities).where(eq(opportunities.id, id));
    return true;
  }

  async getOpportunitiesBySchoolId(schoolId: number): Promise<Opportunity[]> {
    return await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.schoolId, schoolId))
      .orderBy(desc(opportunities.createdAt));
  }

  async getOpportunitiesForUser(userId: number): Promise<Opportunity[]> {
    // Get user to determine role and school
    const user = await this.getUserById(userId);
    if (!user) return [];
    
    // Get user role permissions
    const [roleData] = await db.select().from(userRoles).where(eq(userRoles.id, user.roleId));
    
    if (roleData?.canEditAllOpportunities) {
      // Users with global editing permissions can see all opportunities
      return await db
        .select()
        .from(opportunities)
        .orderBy(desc(opportunities.createdAt));
    } else if (roleData?.canEditSchoolOpportunities || roleData?.canCreateOpportunities) {
      // Admin and teachers see their school's opportunities and global ones
      const conditions = [
        eq(opportunities.schoolId, user.schoolId!),
        eq(opportunities.isGlobal, true)
      ];
      
      // Add visible to schools condition if user has a school
      if (user.schoolId) {
        conditions.push(sql`${user.schoolId} = ANY(${opportunities.visibleToSchools})`);
      }
      
      return await db
        .select()
        .from(opportunities)
        .where(or(...conditions))
        .orderBy(desc(opportunities.createdAt));
    } else {
      // Students see their school's opportunities, global ones, and those shared with their school
      const conditions = [
        eq(opportunities.schoolId, user.schoolId!),
        eq(opportunities.isGlobal, true)
      ];
      
      // Add visible to schools condition if user has a school
      if (user.schoolId) {
        conditions.push(sql`${user.schoolId} = ANY(${opportunities.visibleToSchools})`);
      }
      
      let baseQuery = db
        .select()
        .from(opportunities)
        .where(or(...conditions));
      
      // Apply student preferences if they exist
      const studentPreferences = await this.getStudentPreferencesByUserId(userId);
      console.log('Student preferences for filtering:', studentPreferences);
      
      if (studentPreferences) {
        const categoryConditions = [];
        
        // Filter by industries - OR within industry preferences
        if (studentPreferences.industries && studentPreferences.industries.length > 0) {
          const industryConditions = studentPreferences.industries.map(industry => 
            eq(opportunities.industry, industry)
          );
          categoryConditions.push(or(...industryConditions));
        }
        
        // Filter by opportunity types - OR within type preferences
        if (studentPreferences.opportunityTypes && studentPreferences.opportunityTypes.length > 0) {
          const typeConditions = studentPreferences.opportunityTypes.map(oppType => 
            eq(opportunities.opportunityType, oppType)
          );
          categoryConditions.push(or(...typeConditions));
        }
        
        // Filter by age groups - OR within age group preferences
        if (studentPreferences.ageGroups && studentPreferences.ageGroups.length > 0) {
          const ageConditions = studentPreferences.ageGroups.map(ageGroup => 
            sql`${ageGroup} = ANY(${opportunities.ageGroup})`
          );
          categoryConditions.push(or(...ageConditions));
        }
        
        // Apply preference filters with OR logic between all categories
        if (categoryConditions.length > 0) {
          const combinedConditions = and(or(...conditions), or(...categoryConditions));
          return await db
            .select()
            .from(opportunities)
            .where(combinedConditions)
            .orderBy(desc(opportunities.createdAt));
        }
      }
      
      return await baseQuery.orderBy(desc(opportunities.createdAt));
    }
  }

  async searchOpportunities(query: string, filters: any): Promise<Opportunity[]> {
    let baseQuery = db.select().from(opportunities);
    
    // Apply text search if provided
    if (query) {
      baseQuery = baseQuery.where(
        or(
          like(opportunities.title, `%${query}%`),
          like(opportunities.description, `%${query}%`),
          like(opportunities.organization, `%${query}%`)
        )
      );
    }
    
    // Apply filters
    if (filters) {
      if (filters.industry) {
        baseQuery = baseQuery.where(eq(opportunities.industry, filters.industry));
      }
      
      if (filters.ageGroup && filters.ageGroup.length) {
        baseQuery = baseQuery.where(inArray(opportunities.ageGroup, filters.ageGroup));
      }
      
      if (filters.location) {
        baseQuery = baseQuery.where(like(opportunities.location, `%${filters.location}%`));
      }
      
      if (filters.startDate) {
        baseQuery = baseQuery.where(sql`${opportunities.startDate} >= ${filters.startDate}`);
      }
      
      if (filters.endDate) {
        baseQuery = baseQuery.where(sql`${opportunities.endDate} <= ${filters.endDate}`);
      }
      
      if (filters.ethnicityFocus) {
        baseQuery = baseQuery.where(eq(opportunities.ethnicityFocus, filters.ethnicityFocus));
      }
      
      if (filters.genderFocus) {
        baseQuery = baseQuery.where(eq(opportunities.genderFocus, filters.genderFocus));
      }
      
      if (filters.isVirtual !== undefined) {
        baseQuery = baseQuery.where(eq(opportunities.isVirtual, filters.isVirtual));
      }
      
      if (filters.schoolId) {
        baseQuery = baseQuery.where(
          or(
            eq(opportunities.schoolId, filters.schoolId),
            eq(opportunities.isGlobal, true),
            inArray(filters.schoolId, opportunities.visibleToSchools)
          )
        );
      }
      
      // Filter by creator ID for "My Posts" view
      if (filters.createdById) {
        baseQuery = baseQuery.where(eq(opportunities.createdById, filters.createdById));
      }
    }
    
    // Order by created date
    baseQuery = baseQuery.orderBy(desc(opportunities.createdAt));
    
    return await baseQuery;
  }

  // Student Interests
  async registerInterest(interest: InsertStudentInterest): Promise<StudentInterest> {
    // Check if already registered
    const [existing] = await db
      .select()
      .from(studentInterests)
      .where(
        and(
          eq(studentInterests.studentId, interest.studentId),
          eq(studentInterests.opportunityId, interest.opportunityId)
        )
      );
    
    if (existing) {
      return existing;
    }

    // Check if opportunity has space limits
    const opportunity = await this.getOpportunityById(interest.opportunityId);
    if (opportunity && opportunity.numberOfSpaces) {
      // Count current registrations
      const [currentCount] = await db
        .select({ count: sql`count(*)`.mapWith(Number) })
        .from(studentInterests)
        .where(eq(studentInterests.opportunityId, interest.opportunityId));
      
      if (currentCount.count >= opportunity.numberOfSpaces) {
        throw new Error('No spaces left for this opportunity');
      }
    }
    
    const [createdInterest] = await db.insert(studentInterests).values(interest).returning();
    return createdInterest;
  }

  async unregisterInterest(studentId: number, opportunityId: number): Promise<boolean> {
    await db
      .delete(studentInterests)
      .where(
        and(
          eq(studentInterests.studentId, studentId),
          eq(studentInterests.opportunityId, opportunityId)
        )
      );
    return true;
  }

  async getInterestsByOpportunityId(opportunityId: number): Promise<StudentInterest[]> {
    return await db
      .select()
      .from(studentInterests)
      .where(eq(studentInterests.opportunityId, opportunityId))
      .orderBy(desc(studentInterests.registrationDate));
  }

  async getInterestsByStudentId(studentId: number): Promise<StudentInterest[]> {
    return await db
      .select()
      .from(studentInterests)
      .where(eq(studentInterests.studentId, studentId))
      .orderBy(desc(studentInterests.registrationDate));
  }

  async getInterestedStudentsForOpportunity(opportunityId: number): Promise<User[]> {
    const interests = await db
      .select({
        user: users,
        registrationDate: studentInterests.registrationDate,
        school: schools
      })
      .from(studentInterests)
      .innerJoin(users, eq(studentInterests.studentId, users.id))
      .leftJoin(schools, eq(users.schoolId, schools.id))
      .where(eq(studentInterests.opportunityId, opportunityId))
      .orderBy(desc(studentInterests.registrationDate));
    
    return interests.map(interest => ({
      ...interest.user,
      registrationDate: interest.registrationDate,
      school: interest.school
    } as any));
  }

  // Documents
  async addDocument(document: InsertDocument): Promise<Document> {
    const [createdDocument] = await db.insert(documents).values(document).returning();
    return createdDocument;
  }

  async getDocumentsByOpportunityId(opportunityId: number): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.opportunityId, opportunityId))
      .orderBy(documents.name);
  }

  async getDocumentById(id: number): Promise<Document | undefined> {
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));
    return document;
  }

  async deleteDocument(id: number): Promise<boolean> {
    await db.delete(documents).where(eq(documents.id, id));
    return true;
  }

  // News Posts
  async createNewsPost(post: InsertNewsPost): Promise<NewsPost> {
    const [createdPost] = await db.insert(newsPosts).values(post).returning();
    return createdPost;
  }

  async getNewsPostById(id: number): Promise<NewsPost | undefined> {
    const [post] = await db.select().from(newsPosts).where(eq(newsPosts.id, id));
    return post;
  }

  async getNewsPosts(schoolId?: number, global?: boolean): Promise<NewsPost[]> {
    let query = db.select().from(newsPosts);
    
    if (schoolId && global) {
      query = query.where(
        or(eq(newsPosts.schoolId, schoolId), eq(newsPosts.isGlobal, true))
      );
    } else if (schoolId) {
      query = query.where(eq(newsPosts.schoolId, schoolId));
    } else if (global) {
      query = query.where(eq(newsPosts.isGlobal, true));
    }
    
    return await query.orderBy(desc(newsPosts.createdAt));
  }

  async updateNewsPost(id: number, updates: Partial<NewsPost>): Promise<NewsPost | undefined> {
    const [updatedPost] = await db
      .update(newsPosts)
      .set(updates)
      .where(eq(newsPosts.id, id))
      .returning();
    return updatedPost;
  }

  async deleteNewsPost(id: number): Promise<boolean> {
    await db.delete(newsPosts).where(eq(newsPosts.id, id));
    return true;
  }

  // Form Requests
  async createFormRequest(request: InsertFormRequest): Promise<FormRequest> {
    const [createdRequest] = await db.insert(formRequests).values(request).returning();
    return createdRequest;
  }

  async getFormRequestById(id: number): Promise<FormRequest | undefined> {
    const [request] = await db.select().from(formRequests).where(eq(formRequests.id, id));
    return request;
  }

  async getFormRequestsByStudentId(studentId: number): Promise<FormRequest[]> {
    return await db
      .select()
      .from(formRequests)
      .where(eq(formRequests.studentId, studentId))
      .orderBy(desc(formRequests.requestDate));
  }

  async getFormRequestsByOpportunityId(opportunityId: number): Promise<FormRequest[]> {
    return await db
      .select()
      .from(formRequests)
      .where(eq(formRequests.opportunityId, opportunityId))
      .orderBy(desc(formRequests.requestDate));
  }

  async markFormRequestAsEmailSent(id: number): Promise<boolean> {
    await db
      .update(formRequests)
      .set({ 
        emailSent: true,
        emailSentDate: new Date()
      })
      .where(eq(formRequests.id, id));
    return true;
  }

  // Student Preferences
  async setStudentPreferences(preferences: InsertStudentPreferences): Promise<StudentPreferences> {
    console.log('setStudentPreferences called with:', preferences);
    
    // Check if preferences already exist
    const existing = await this.getStudentPreferencesByUserId(preferences.userId);
    console.log('Existing preferences:', existing);
    
    if (existing) {
      // Update existing preferences
      console.log('Updating existing preferences');
      const [updatedPreferences] = await db
        .update(studentPreferences)
        .set({
          ...preferences,
          updatedAt: new Date()
        })
        .where(eq(studentPreferences.userId, preferences.userId))
        .returning();
      console.log('Updated preferences:', updatedPreferences);
      return updatedPreferences;
    }
    
    // Create new preferences
    console.log('Creating new preferences');
    const [createdPreferences] = await db.insert(studentPreferences).values(preferences).returning();
    console.log('Created preferences:', createdPreferences);
    return createdPreferences;
  }

  async getStudentPreferencesByUserId(userId: number): Promise<StudentPreferences | undefined> {
    const [preferences] = await db
      .select()
      .from(studentPreferences)
      .where(eq(studentPreferences.userId, userId));
    return preferences;
  }

  async updateStudentPreferences(userId: number, updates: Partial<StudentPreferences>): Promise<StudentPreferences | undefined> {
    const [updatedPreferences] = await db
      .update(studentPreferences)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(studentPreferences.userId, userId))
      .returning();
    return updatedPreferences;
  }

  // System Settings
  async setSetting(setting: InsertSystemSetting): Promise<SystemSetting> {
    // Check if setting exists
    const existingSetting = await this.getSetting(setting.key);
    
    if (existingSetting) {
      // Update existing setting
      const [updatedSetting] = await db
        .update(systemSettings)
        .set({
          value: setting.value,
          description: setting.description,
          updatedById: setting.updatedById,
          updatedAt: new Date()
        })
        .where(eq(systemSettings.key, setting.key))
        .returning();
      return updatedSetting;
    }
    
    // Create new setting
    const [createdSetting] = await db.insert(systemSettings).values(setting).returning();
    return createdSetting;
  }

  async getSetting(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key));
    return setting;
  }

  async getAllSettings(): Promise<SystemSetting[]> {
    return await db.select().from(systemSettings).orderBy(systemSettings.key);
  }

  // Filter Options
  async createFilterOption(option: InsertFilterOption): Promise<FilterOption> {
    const [createdOption] = await db.insert(filterOptions).values(option).returning();
    return createdOption;
  }

  async getFilterOptions(category?: string): Promise<FilterOption[]> {
    if (category) {
      return await db
        .select()
        .from(filterOptions)
        .where(and(eq(filterOptions.category, category), eq(filterOptions.isActive, true)))
        .orderBy(filterOptions.label);
    }
    
    return await db
      .select()
      .from(filterOptions)
      .where(eq(filterOptions.isActive, true))
      .orderBy(filterOptions.category, filterOptions.label);
  }

  async updateFilterOption(id: number, updates: Partial<FilterOption>): Promise<FilterOption | undefined> {
    const [updatedOption] = await db
      .update(filterOptions)
      .set(updates)
      .where(eq(filterOptions.id, id))
      .returning();
    return updatedOption;
  }

  async deleteFilterOption(id: number): Promise<boolean> {
    // Soft delete by setting isActive to false
    await db
      .update(filterOptions)
      .set({ isActive: false })
      .where(eq(filterOptions.id, id));
    return true;
  }

  // Reports
  async getOpportunityStats(): Promise<any> {
    // Count opportunities by industry
    const industryCounts = await db
      .select({
        industry: opportunities.industry,
        count: sql`count(*)`.mapWith(Number)
      })
      .from(opportunities)
      .groupBy(opportunities.industry)
      .orderBy(desc(sql`count(*)`));
    
    // Count opportunities by age group
    const ageGroupCounts = await db
      .select({
        ageGroup: opportunities.ageGroup,
        count: sql`count(*)`.mapWith(Number)
      })
      .from(opportunities)
      .groupBy(opportunities.ageGroup)
      .orderBy(desc(sql`count(*)`));
    
    // Count active vs. expired opportunities
    const now = new Date();
    const activeCount = await db
      .select({
        count: sql`count(*)`.mapWith(Number)
      })
      .from(opportunities)
      .where(sql`${opportunities.endDate} >= ${now}`);
    
    const expiredCount = await db
      .select({
        count: sql`count(*)`.mapWith(Number)
      })
      .from(opportunities)
      .where(sql`${opportunities.endDate} < ${now}`);
    
    return {
      totalOpportunities: industryCounts.reduce((sum, item) => sum + item.count, 0),
      byIndustry: industryCounts,
      byAgeGroup: ageGroupCounts,
      activeOpportunities: activeCount[0]?.count || 0,
      expiredOpportunities: expiredCount[0]?.count || 0
    };
  }

  async getStudentInterestStats(): Promise<any> {
    // Count interests by opportunity for simple mapping
    const interestCounts = await db
      .select({
        opportunityId: studentInterests.opportunityId,
        count: sql`count(*)`.mapWith(Number)
      })
      .from(studentInterests)
      .groupBy(studentInterests.opportunityId);
    
    // Convert to simple object mapping opportunityId -> count
    const countsMap: Record<number, number> = {};
    interestCounts.forEach(item => {
      countsMap[item.opportunityId] = item.count;
    });
    
    return countsMap;
  }

  async getTeacherActivityStats(period?: string): Promise<any> {
    let timeFilter;
    const now = new Date();
    
    if (period === 'week') {
      // Last 7 days
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);
      timeFilter = sql`${opportunities.createdAt} >= ${lastWeek}`;
    } else if (period === 'month') {
      // Last 30 days
      const lastMonth = new Date(now);
      lastMonth.setDate(lastMonth.getDate() - 30);
      timeFilter = sql`${opportunities.createdAt} >= ${lastMonth}`;
    } else {
      // All time
      timeFilter = sql`1 = 1`;
    }
    
    // Get count of opportunities created by each teacher
    const teacherActivity = await db
      .select({
        teacherId: opportunities.createdById,
        teacherFirstName: users.firstName,
        teacherLastName: users.lastName,
        count: sql`count(*)`.mapWith(Number)
      })
      .from(opportunities)
      .innerJoin(users, eq(opportunities.createdById, users.id))
      .where(and(eq(users.role, 'teacher'), timeFilter))
      .groupBy(opportunities.createdById, users.firstName, users.lastName)
      .orderBy(desc(sql`count(*)`));
    
    // Get total count of active teachers
    const activeTeachersCount = await db
      .select({
        count: sql`count(distinct ${opportunities.createdById})`.mapWith(Number)
      })
      .from(opportunities)
      .where(timeFilter);
    
    return {
      activeTeachers: activeTeachersCount[0]?.count || 0,
      teacherActivity
    };
  }

  async getOpportunitiesWithRegisteredStudents(): Promise<Opportunity[]> {
    const result = await db
      .selectDistinct()
      .from(opportunities)
      .innerJoin(studentInterests, eq(opportunities.id, studentInterests.opportunityId))
      .orderBy(desc(opportunities.createdAt));
    
    return result.map(row => row.opportunities);
  }
}

export const storage = new DatabaseStorage();
