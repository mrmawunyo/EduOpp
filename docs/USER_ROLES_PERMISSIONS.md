# EduOpps User Roles and Permissions System

## Overview

EduOpps implements a comprehensive role-based access control (RBAC) system with four distinct user roles, each with specific permissions and capabilities. The system ensures data security and appropriate access levels based on user responsibilities.

## User Roles

### 1. Student
**Primary Purpose:** Access educational opportunities and manage personal documents

**Core Responsibilities:**
- Browse and search for educational opportunities
- Register interest in opportunities
- Upload and manage personal documents
- View their own profile and activity
- Receive notifications about deadlines and updates

**Access Level:** Limited to personal data and public opportunities

### 2. Teacher
**Primary Purpose:** Support students and manage educational content

**Core Responsibilities:**
- All student capabilities
- Create and manage educational opportunities
- Review student documents and applications
- Monitor student progress and engagement
- Assist with student guidance and counseling

**Access Level:** Student data within their scope + content creation

### 3. Admin
**Primary Purpose:** Manage school operations and users

**Core Responsibilities:**
- All teacher capabilities
- Manage users within their school
- Configure school settings and preferences
- Generate reports and analytics
- Manage school-specific content and announcements

**Access Level:** Full school management within their institution

### 4. Superadmin
**Primary Purpose:** System-wide administration and management

**Core Responsibilities:**
- All admin capabilities across all schools
- Manage schools and school relationships
- Configure system-wide settings
- Monitor platform health and performance
- Manage global content and policies

**Access Level:** Complete system access and control

## Detailed Permissions Matrix

| Permission | Student | Teacher | Admin | Superadmin |
|------------|---------|---------|-------|-------------|
| **Authentication & Profile** |
| Login to system | ✅ | ✅ | ✅ | ✅ |
| View own profile | ✅ | ✅ | ✅ | ✅ |
| Edit own profile | ✅ | ✅ | ✅ | ✅ |
| Change own password | ✅ | ✅ | ✅ | ✅ |
| **Opportunities** |
| View opportunities | ✅ | ✅ | ✅ | ✅ |
| Search/filter opportunities | ✅ | ✅ | ✅ | ✅ |
| Register interest | ✅ | ✅ | ✅ | ✅ |
| Create opportunities | ❌ | ✅ | ✅ | ✅ |
| Edit opportunities | ❌ | ✅* | ✅* | ✅ |
| Delete opportunities | ❌ | ✅* | ✅* | ✅ |
| **Documents** |
| Upload documents | ✅ | ✅ | ✅ | ✅ |
| View own documents | ✅ | ✅ | ✅ | ✅ |
| Delete own documents | ✅ | ✅ | ✅ | ✅ |
| View student documents | ❌ | ✅* | ✅* | ✅ |
| **User Management** |
| View user list | ❌ | ❌ | ✅* | ✅ |
| Create users | ❌ | ❌ | ✅* | ✅ |
| Edit users | ❌ | ❌ | ✅* | ✅ |
| Deactivate users | ❌ | ❌ | ✅* | ✅ |
| Assign roles | ❌ | ❌ | ✅* | ✅ |
| **School Management** |
| View school info | ✅* | ✅* | ✅* | ✅ |
| Edit school settings | ❌ | ❌ | ✅* | ✅ |
| Create schools | ❌ | ❌ | ❌ | ✅ |
| Delete schools | ❌ | ❌ | ❌ | ✅ |
| **Reports & Analytics** |
| View personal stats | ✅ | ✅ | ✅ | ✅ |
| View student reports | ❌ | ✅* | ✅* | ✅ |
| View school reports | ❌ | ❌ | ✅* | ✅ |
| View system reports | ❌ | ❌ | ❌ | ✅ |
| **System Settings** |
| View system settings | ❌ | ❌ | ❌ | ✅ |
| Edit system settings | ❌ | ❌ | ❌ | ✅ |
| Manage integrations | ❌ | ❌ | ❌ | ✅ |

**Legend:**
- ✅ = Full access
- ❌ = No access  
- ✅* = Limited access (see scope restrictions below)

## Scope Restrictions

### Teacher Scope Limitations
- **Opportunities:** Can only edit/delete opportunities they created
- **Student Documents:** Can only view documents from students in their classes/school
- **Student Reports:** Limited to students they teach or supervise

### Admin Scope Limitations  
- **User Management:** Can only manage users within their school
- **School Settings:** Can only modify settings for their own school
- **Opportunities:** Can edit/delete opportunities within their school
- **Reports:** Limited to their school's data and users

### Data Access Boundaries

#### Students
- **Own Data:** Full access to personal profile, documents, and activity
- **Opportunities:** View all public opportunities regardless of school
- **Users:** Can only see basic info of teachers and admins in their school

#### Teachers
- **Student Data:** Access to students in their classes or school
- **Peer Data:** Basic contact information for other teachers
- **School Data:** General school information and public settings

#### Admins
- **School Users:** Full access to all users within their school
- **School Data:** Complete access to school settings and configurations
- **Cross-School:** No access to other schools' data

#### Superadmins
- **Global Access:** Complete access to all schools, users, and system data
- **System Control:** Can modify system-wide settings and configurations

## Permission Implementation

### Database Level Permissions
```sql
-- Users table with role-based access
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  role user_role NOT NULL,
  school_id INTEGER REFERENCES schools(id),
  is_active BOOLEAN DEFAULT true
);

-- Role-based views for data access
CREATE VIEW student_opportunities AS 
SELECT * FROM opportunities WHERE is_active = true;

CREATE VIEW admin_school_users AS
SELECT u.* FROM users u 
WHERE u.school_id = current_user_school_id();
```

### API Level Authorization
```typescript
// Middleware for role-based access control
export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// School-based data filtering
export function filterByUserScope(query: any, user: User) {
  switch (user.role) {
    case 'student':
      return { ...query, createdBy: user.id };
    case 'admin':
      return { ...query, schoolId: user.schoolId };
    case 'superadmin':
      return query; // No filtering
  }
}
```

### Frontend Permission Checks
```typescript
// Permission hooks and utilities
export function usePermissions() {
  const { user } = useAuth();
  
  return {
    canViewOpportunities: ['student', 'teacher', 'admin', 'superadmin'].includes(user.role),
    canCreateOpportunities: ['teacher', 'admin', 'superadmin'].includes(user.role),
    canManageUsers: ['admin', 'superadmin'].includes(user.role),
    canManageSchools: user.role === 'superadmin'
  };
}

// Component-level permission guards
export function ProtectedComponent({ requiredRoles, children }) {
  const { user } = useAuth();
  
  if (!requiredRoles.includes(user.role)) {
    return <AccessDenied />;
  }
  
  return children;
}
```

## Permission Escalation Process

### Role Upgrade Requests
1. **Student → Teacher:** Contact school admin with credentials
2. **Teacher → Admin:** School admin approval + verification
3. **Admin → Superadmin:** System admin approval required

### Temporary Permissions
- Emergency access can be granted by superadmins
- Time-limited permissions with automatic expiration
- Full audit trail of permission changes

### Permission Delegation
- Admins can delegate specific permissions to teachers
- Teachers can be granted temporary admin privileges
- All delegations require approval and have expiration dates

## Security Measures

### Authentication Security
- **Multi-Factor Authentication:** Optional for all roles, required for admins
- **Session Management:** Automatic timeout after inactivity
- **Password Policies:** Strong password requirements based on role
- **Login Monitoring:** Failed login attempt tracking and blocking

### Authorization Security
- **JWT Tokens:** Secure token-based authentication with role claims
- **Permission Caching:** Efficient permission checking with cache invalidation
- **Audit Logging:** Complete log of all permission-based actions
- **Regular Reviews:** Periodic permission audits and cleanup

### Data Protection
- **Encryption:** All sensitive data encrypted at rest and in transit
- **Access Logging:** Detailed logs of data access and modifications
- **Data Minimization:** Users only see data relevant to their role
- **Automatic Cleanup:** Unused accounts and data automatically archived

## Common Permission Scenarios

### Scenario 1: Student Document Upload
```
User: Student (ID: 123)
Action: Upload resume document
Check: user.role === 'student' && document.userId === user.id
Result: ✅ Allowed - Students can upload their own documents
```

### Scenario 2: Teacher Viewing Student Profile
```
User: Teacher (ID: 456, School: ABC High)
Action: View student profile (Student ID: 789, School: ABC High)
Check: user.role === 'teacher' && student.schoolId === user.schoolId
Result: ✅ Allowed - Teacher can view students in same school
```

### Scenario 3: Admin Creating User
```
User: Admin (ID: 101, School: XYZ Academy)
Action: Create new student (School: ABC High)
Check: user.role === 'admin' && newUser.schoolId === user.schoolId
Result: ❌ Denied - Admin can only create users in their own school
```

### Scenario 4: Cross-School Data Access
```
User: Admin (ID: 202, School: DEF College)
Action: View opportunity from GHI University
Check: opportunity.isPublic === true || opportunity.schoolId === user.schoolId
Result: ✅ Allowed - Public opportunities visible to all schools
```

## Best Practices

### For Developers
1. **Always validate permissions** on both frontend and backend
2. **Use the principle of least privilege** - grant minimum required access
3. **Implement defense in depth** - multiple layers of security checks
4. **Log all permission-based actions** for audit and debugging
5. **Test edge cases** thoroughly, especially permission boundaries

### For Administrators
1. **Regular permission audits** to ensure appropriate access levels
2. **Prompt role updates** when users change responsibilities
3. **Monitor for suspicious activity** and permission misuse
4. **Educate users** about their permissions and responsibilities
5. **Maintain documentation** of custom permission configurations

### For Users
1. **Understand your role limitations** and respect data boundaries
2. **Report suspicious access** or permission issues immediately
3. **Keep credentials secure** and don't share accounts
4. **Use appropriate channels** for permission upgrade requests
5. **Follow data handling policies** based on your access level

This comprehensive permissions system ensures that EduOpps maintains appropriate security while enabling efficient workflows for all user types.