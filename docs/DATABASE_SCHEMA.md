# EduOpps Database Schema Documentation

## Overview

The EduOpps platform uses PostgreSQL as its primary database with Drizzle ORM for type-safe database operations. The schema is designed to support role-based access control, educational opportunity management, document storage, and comprehensive user management.

## Database Tables

### Core User Management

#### `users` Table
Stores all user accounts with role-based access control.

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  school_id INTEGER REFERENCES schools(id),
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_school_id ON users(school_id);
CREATE INDEX idx_users_active ON users(is_active);
```

**Fields:**
- `id`: Primary key, auto-incrementing
- `email`: Unique email address for authentication
- `password_hash`: Bcrypt hashed password
- `first_name`, `last_name`: User's full name
- `role`: Enum value (student, teacher, admin, superadmin)
- `school_id`: Foreign key to schools table
- `is_active`: Soft delete flag
- `email_verified`: Email verification status
- `last_login_at`: Timestamp of last successful login
- `created_at`, `updated_at`: Audit timestamps

#### `schools` Table
Manages educational institutions and organizations.

```sql
CREATE TABLE schools (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  website VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_schools_name ON schools(name);
CREATE INDEX idx_schools_active ON schools(is_active);
```

**Fields:**
- `id`: Primary key
- `name`: School/organization name
- `address`: Physical address
- `contact_email`: Primary contact email
- `contact_phone`: Primary contact phone
- `website`: School website URL
- `is_active`: Active status flag
- `created_at`, `updated_at`: Audit timestamps

### Opportunity Management

#### `opportunities` Table
Stores all educational and career opportunities.

```sql
CREATE TABLE opportunities (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  organization VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  details TEXT,
  requirements TEXT,
  application_process TEXT,
  image_url VARCHAR(500),
  industry VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  opportunity_type VARCHAR(100) NOT NULL,
  target_age_group VARCHAR(50) NOT NULL,
  application_deadline TIMESTAMP NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  organization_website VARCHAR(255),
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  school_id INTEGER REFERENCES schools(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_opportunities_title ON opportunities(title);
CREATE INDEX idx_opportunities_industry ON opportunities(industry);
CREATE INDEX idx_opportunities_location ON opportunities(location);
CREATE INDEX idx_opportunities_category ON opportunities(category);
CREATE INDEX idx_opportunities_deadline ON opportunities(application_deadline);
CREATE INDEX idx_opportunities_created_by ON opportunities(created_by);
CREATE INDEX idx_opportunities_active ON opportunities(is_active);
CREATE INDEX idx_opportunities_featured ON opportunities(is_featured);

-- Full-text search index
CREATE INDEX idx_opportunities_search ON opportunities 
USING gin(to_tsvector('english', title || ' ' || description || ' ' || organization));
```

**Fields:**
- `id`: Primary key
- `title`: Opportunity title
- `organization`: Organization offering the opportunity
- `description`: Brief description
- `details`: Extended details and information
- `requirements`: Eligibility requirements
- `application_process`: How to apply
- `image_url`: Optional opportunity image
- `industry`: Industry category
- `location`: Geographic location
- `category`: Opportunity category (internship, job, etc.)
- `opportunity_type`: Specific type within category
- `target_age_group`: Target demographic
- `application_deadline`: Application cutoff date
- `contact_email`: Primary contact for applications
- `contact_phone`: Optional contact phone
- `organization_website`: Organization's website
- `is_featured`: Featured opportunity flag
- `is_active`: Active status
- `created_by`: User who created the opportunity
- `school_id`: Associated school (if any)
- `created_at`, `updated_at`: Audit timestamps

#### `opportunity_interests` Table
Tracks student interest in opportunities.

```sql
CREATE TABLE opportunity_interests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, opportunity_id)
);

-- Indexes
CREATE INDEX idx_opportunity_interests_user ON opportunity_interests(user_id);
CREATE INDEX idx_opportunity_interests_opportunity ON opportunity_interests(opportunity_id);
```

**Fields:**
- `id`: Primary key
- `user_id`: Student who registered interest
- `opportunity_id`: Opportunity of interest
- `created_at`: Registration timestamp
- Unique constraint prevents duplicate interests

### Document Management

#### `documents` Table
Manages uploaded student documents.

```sql
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_uploaded_at ON documents(uploaded_at);
```

**Fields:**
- `id`: Primary key
- `user_id`: Document owner
- `filename`: Stored filename (usually UUID-based)
- `original_name`: Original uploaded filename
- `mime_type`: File MIME type
- `file_size`: File size in bytes
- `file_path`: Storage path
- `category`: Document category
- `description`: Optional description
- `is_public`: Public visibility flag
- `uploaded_at`: Upload timestamp

### Content Management

#### `news_posts` Table  
Manages news articles and announcements.

```sql
CREATE TABLE news_posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  category VARCHAR(100),
  image_url VARCHAR(500),
  author_id INTEGER REFERENCES users(id),
  school_id INTEGER REFERENCES schools(id),
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_news_posts_category ON news_posts(category);
CREATE INDEX idx_news_posts_author ON news_posts(author_id);
CREATE INDEX idx_news_posts_school ON news_posts(school_id);
CREATE INDEX idx_news_posts_published ON news_posts(is_published);
CREATE INDEX idx_news_posts_published_at ON news_posts(published_at);
```

**Fields:**
- `id`: Primary key
- `title`: Article title
- `content`: Full article content
- `excerpt`: Brief summary
- `category`: Article category
- `image_url`: Featured image
- `author_id`: Article author
- `school_id`: Associated school (null for global)
- `is_published`: Publication status
- `is_featured`: Featured article flag
- `published_at`: Publication timestamp
- `created_at`, `updated_at`: Audit timestamps

#### `filter_options` Table
Stores available filter options for opportunity searches.

```sql
CREATE TABLE filter_options (
  id SERIAL PRIMARY KEY,
  type filter_type NOT NULL,
  value VARCHAR(255) NOT NULL,
  label VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_filter_options_type ON filter_options(type);
CREATE INDEX idx_filter_options_active ON filter_options(is_active);
CREATE INDEX idx_filter_options_sort ON filter_options(sort_order);
```

**Fields:**
- `id`: Primary key
- `type`: Filter category (industry, location, etc.)
- `value`: Filter value used in queries
- `label`: Human-readable display label
- `is_active`: Active status
- `sort_order`: Display order
- `created_at`: Creation timestamp

### System Tables

#### `user_sessions` Table
Manages active user sessions for security tracking.

```sql
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
```

#### `audit_logs` Table
Comprehensive audit logging for security and compliance.

```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

## Custom Types and Enums

### User Role Enum
```sql
CREATE TYPE user_role AS ENUM (
  'student',
  'teacher', 
  'admin',
  'superadmin'
);
```

### Filter Type Enum
```sql
CREATE TYPE filter_type AS ENUM (
  'industry',
  'location',
  'category',
  'opportunity_type',
  'age_group'
);
```

## Relationships and Constraints

### Primary Relationships
- **Users → Schools**: Many-to-one (users belong to schools)
- **Opportunities → Users**: Many-to-one (opportunities created by users)
- **Opportunities → Schools**: Many-to-one (opportunities can be school-specific)
- **Documents → Users**: Many-to-one (documents owned by users)
- **Opportunity Interests → Users/Opportunities**: Many-to-many junction table
- **News Posts → Users**: Many-to-one (articles authored by users)
- **News Posts → Schools**: Many-to-one (articles can be school-specific)

### Referential Integrity
- **CASCADE DELETE**: User deletion cascades to documents and interests
- **RESTRICT DELETE**: School deletion restricted if users exist
- **NULL ON DELETE**: Opportunity creator can be nullified if user deleted

### Data Constraints
- **Email Uniqueness**: Enforced at database level
- **Required Fields**: NOT NULL constraints on essential fields
- **Check Constraints**: File size limits, date validations
- **Index Constraints**: Optimized queries with strategic indexing

## Performance Optimizations

### Query Optimization
```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_opportunities_search_filters ON opportunities(
  industry, location, category, application_deadline
) WHERE is_active = true;

-- Partial indexes for active records
CREATE INDEX idx_active_users ON users(role, school_id) WHERE is_active = true;

-- GIN indexes for full-text search
CREATE INDEX idx_opportunities_fulltext ON opportunities 
USING gin(to_tsvector('english', title || ' ' || description));
```

### Database Functions
```sql
-- Function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_id INTEGER)
RETURNS TABLE(
  can_view_opportunities BOOLEAN,
  can_create_opportunities BOOLEAN,
  can_manage_users BOOLEAN,
  can_manage_schools BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true,  -- All users can view opportunities
    role IN ('teacher', 'admin', 'superadmin'),
    role IN ('admin', 'superadmin'),
    role = 'superadmin'
  FROM users 
  WHERE id = user_id AND is_active = true;
END;
$$ LANGUAGE plpgsql;
```

### Views for Common Queries
```sql
-- View for active opportunities with interest counts
CREATE VIEW opportunity_summary AS
SELECT 
  o.*,
  COUNT(oi.id) as interest_count,
  (o.application_deadline > CURRENT_TIMESTAMP) as is_open
FROM opportunities o
LEFT JOIN opportunity_interests oi ON o.id = oi.opportunity_id
WHERE o.is_active = true
GROUP BY o.id;

-- View for user statistics
CREATE VIEW user_stats AS
SELECT 
  u.id,
  u.first_name,
  u.last_name,
  u.role,
  COUNT(DISTINCT oi.opportunity_id) as opportunities_interested,
  COUNT(DISTINCT d.id) as documents_uploaded
FROM users u
LEFT JOIN opportunity_interests oi ON u.id = oi.user_id
LEFT JOIN documents d ON u.id = d.user_id
WHERE u.is_active = true
GROUP BY u.id, u.first_name, u.last_name, u.role;
```

## Data Migration Strategy

### Version Control
- **Schema Versioning**: Each migration numbered and tracked
- **Rollback Scripts**: Every migration has corresponding rollback
- **Environment Parity**: Same schema across dev/staging/production

### Migration Examples
```sql
-- Migration 001: Add email verification
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
UPDATE users SET email_verified = true WHERE created_at < '2024-01-01';

-- Migration 002: Add opportunity images
ALTER TABLE opportunities ADD COLUMN image_url VARCHAR(500);
CREATE INDEX idx_opportunities_image ON opportunities(image_url);

-- Migration 003: Add audit logging
CREATE TABLE audit_logs (...);
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

## Backup and Recovery

### Backup Strategy
- **Full Backups**: Daily complete database dumps
- **Incremental Backups**: Hourly transaction log backups
- **Point-in-Time Recovery**: WAL-based recovery capability
- **Cross-Region Replication**: Disaster recovery replicas

### Data Retention
- **Audit Logs**: 7 years retention for compliance
- **User Sessions**: 30 days, auto-cleanup
- **Deleted Records**: Soft deletes with 1 year retention
- **Document Files**: Permanent storage with versioning

## Security Measures

### Row-Level Security
```sql
-- Enable RLS on sensitive tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy for document access
CREATE POLICY document_access ON documents
  USING (
    user_id = current_setting('app.current_user_id')::INTEGER
    OR current_setting('app.current_user_role') IN ('admin', 'superadmin')
  );
```

### Encryption
- **At Rest**: Database-level encryption for sensitive fields
- **In Transit**: SSL/TLS for all connections
- **Application Level**: Additional encryption for PII data

### Access Control
- **Database Users**: Separate DB users for different services
- **Connection Limits**: Prevent connection exhaustion
- **Query Timeout**: Prevent long-running query abuse
- **IP Restrictions**: Database access limited to application servers

This schema provides a robust foundation for the EduOpps platform, supporting scalability, security, and comprehensive feature requirements while maintaining data integrity and performance.