# EduOpps API Documentation

## Overview

The EduOpps API provides RESTful endpoints for managing educational opportunities, user authentication, document uploads, and administrative functions. All endpoints follow standard HTTP conventions and return JSON responses.

## Base URL
```
http://localhost:5000/api
```

## Authentication

Most endpoints require authentication via JWT tokens. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "message": "Success message"
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Endpoints

### Authentication

#### POST /api/auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "student"
    }
  }
}
```

#### POST /api/auth/register
Create new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student",
  "schoolId": 1
}
```

#### GET /api/auth/current-user
Get current authenticated user information.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student",
    "schoolId": 1,
    "permissions": {
      "canViewOpportunities": true,
      "canUploadDocuments": true,
      "canManageUsers": false
    }
  }
}
```

#### POST /api/auth/forgot-password
Send password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

#### POST /api/auth/logout
Logout current user and invalidate token.

**Headers:** `Authorization: Bearer <token>`

### Opportunities

#### GET /api/opportunities/search
Search and filter opportunities.

**Query Parameters:**
- `q` - Search query string
- `industry` - Filter by industry
- `location` - Filter by location
- `category` - Filter by category
- `opportunityType` - Filter by opportunity type
- `ageGroups[]` - Filter by age groups (multiple values)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)

**Example:**
```
GET /api/opportunities/search?q=internship&industry=technology&location=remote&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "opportunities": [
      {
        "id": 1,
        "title": "Software Engineering Internship",
        "organization": "Tech Corp",
        "description": "Learn software development...",
        "industry": "Technology",
        "location": "Remote",
        "category": "Internship",
        "opportunityType": "Paid Internship",
        "targetAgeGroup": "18-25",
        "applicationDeadline": "2024-03-15T00:00:00Z",
        "contactEmail": "recruiter@techcorp.com",
        "contactPhone": "+1-555-0123",
        "organizationWebsite": "https://techcorp.com",
        "requirements": "Basic programming knowledge required",
        "applicationProcess": "Submit resume and cover letter",
        "isRegistered": false,
        "createdAt": "2024-01-15T00:00:00Z",
        "updatedAt": "2024-01-15T00:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalResults": 95,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### POST /api/opportunities/:id/register
Register interest in an opportunity.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Interest registered successfully"
}
```

#### DELETE /api/opportunities/:id/unregister
Remove interest from an opportunity.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Interest removed successfully"
}
```

#### POST /api/opportunities
Create new opportunity (Teachers/Admins only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Summer Research Program",
  "organization": "University Research Lab",
  "description": "Hands-on research experience...",
  "details": "Extended program details...",
  "requirements": "Minimum GPA of 3.0",
  "applicationProcess": "Submit application form and transcripts",
  "industry": "Research",
  "location": "Boston, MA",
  "category": "Research",
  "opportunityType": "Summer Program",
  "targetAgeGroup": "18-22",
  "applicationDeadline": "2024-04-01T00:00:00Z",
  "contactEmail": "research@university.edu",
  "contactPhone": "+1-555-0456",
  "organizationWebsite": "https://university.edu/research"
}
```

#### PUT /api/opportunities/:id
Update existing opportunity (Teachers/Admins only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:** Same as POST /api/opportunities

### Documents

#### POST /api/documents/upload
Upload documents (Students only).

**Headers:** 
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Request Body:**
- `files` - File(s) to upload
- `category` - Document category (optional)
- `description` - Document description (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadedFiles": [
      {
        "id": 1,
        "filename": "resume.pdf",
        "originalName": "John_Doe_Resume.pdf",
        "size": 245760,
        "mimeType": "application/pdf",
        "category": "resume",
        "description": "Updated resume for 2024",
        "uploadedAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

#### GET /api/documents
Get user's uploaded documents.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `category` - Filter by category
- `page` - Page number
- `limit` - Results per page

**Response:**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": 1,
        "filename": "resume.pdf",
        "originalName": "John_Doe_Resume.pdf",
        "size": 245760,
        "mimeType": "application/pdf",
        "category": "resume",
        "description": "Updated resume for 2024",
        "uploadedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalResults": 1
    }
  }
}
```

#### DELETE /api/documents/:id
Delete uploaded document.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

#### GET /api/documents/:id/download
Download document file.

**Headers:** `Authorization: Bearer <token>`

**Response:** File content with appropriate Content-Type headers

### Users

#### GET /api/users
Get list of users (Admins/Superadmins only).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `role` - Filter by user role
- `schoolId` - Filter by school ID
- `page` - Page number
- `limit` - Results per page

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "email": "student@example.com",
        "firstName": "Jane",
        "lastName": "Smith",
        "role": "student",
        "schoolId": 1,
        "isActive": true,
        "createdAt": "2024-01-10T00:00:00Z",
        "lastLoginAt": "2024-01-15T09:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalResults": 45
    }
  }
}
```

#### POST /api/users
Create new user (Admins/Superadmins only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "temporaryPassword123",
  "firstName": "New",
  "lastName": "User",
  "role": "student",
  "schoolId": 1
}
```

#### PUT /api/users/:id
Update user information (Admins/Superadmins only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "firstName": "Updated",
  "lastName": "Name",
  "role": "teacher",
  "isActive": true
}
```

#### DELETE /api/users/:id
Deactivate user account (Admins/Superadmins only).

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "User deactivated successfully"
}
```

### Schools

#### GET /api/schools
Get list of schools.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "schools": [
      {
        "id": 1,
        "name": "Central High School",
        "address": "123 Main St, Anytown, USA",
        "contactEmail": "info@centralhigh.edu",
        "contactPhone": "+1-555-0789",
        "website": "https://centralhigh.edu",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

#### POST /api/schools
Create new school (Superadmins only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "New School",
  "address": "456 School Ave, Education City, USA",
  "contactEmail": "admin@newschool.edu",
  "contactPhone": "+1-555-0999",
  "website": "https://newschool.edu"
}
```

#### PUT /api/schools/:id
Update school information (Superadmins only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:** Same as POST /api/schools

#### GET /api/schools/:id/users
Get users in a specific school (Admins/Superadmins only).

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "email": "student@school.edu",
        "firstName": "Student",
        "lastName": "Name",
        "role": "student",
        "isActive": true
      }
    ]
  }
}
```

### News

#### GET /api/news
Get news articles.

**Query Parameters:**
- `category` - Filter by category
- `page` - Page number
- `limit` - Results per page

**Response:**
```json
{
  "success": true,
  "data": {
    "articles": [
      {
        "id": 1,
        "title": "New STEM Program Launched",
        "content": "Article content here...",
        "category": "Education",
        "author": "Admin User",
        "publishedAt": "2024-01-15T00:00:00Z",
        "imageUrl": "https://example.com/image.jpg"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalResults": 15
    }
  }
}
```

### Filter Options

#### GET /api/filter-options
Get available filter options for opportunities.

**Response:**
```json
{
  "success": true,
  "data": {
    "industries": [
      "Technology",
      "Healthcare",
      "Education",
      "Finance"
    ],
    "locations": [
      "Remote",
      "New York, NY",
      "Los Angeles, CA",
      "Chicago, IL"
    ],
    "categories": [
      "Internship",
      "Job",
      "Volunteer",
      "Research"
    ],
    "opportunityTypes": [
      "Paid Internship",
      "Unpaid Internship",
      "Full-time Job",
      "Part-time Job"
    ],
    "ageGroups": [
      "16-18",
      "18-22",
      "22-25",
      "25+"
    ]
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| AUTH_REQUIRED | Authentication required |
| INVALID_TOKEN | Invalid or expired JWT token |
| FORBIDDEN | Insufficient permissions |
| NOT_FOUND | Resource not found |
| VALIDATION_ERROR | Request validation failed |
| DUPLICATE_EMAIL | Email already exists |
| FILE_TOO_LARGE | Uploaded file exceeds size limit |
| INVALID_FILE_TYPE | Unsupported file type |
| SERVER_ERROR | Internal server error |

## Rate Limiting

API endpoints are rate limited to prevent abuse:
- Authentication endpoints: 5 requests per minute
- File upload endpoints: 10 requests per minute
- General endpoints: 100 requests per minute

## File Upload Limits

- Maximum file size: 10MB per file
- Maximum files per request: 5
- Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG, GIF

## Pagination

List endpoints support pagination with these parameters:
- `page` - Page number (starts from 1)
- `limit` - Items per page (max 100)

Responses include pagination metadata:
```json
{
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalResults": 95,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Webhook Support

The API supports webhooks for real-time notifications:

### Available Events
- `opportunity.created` - New opportunity created
- `opportunity.updated` - Opportunity updated
- `user.registered` - New user registration
- `document.uploaded` - Document uploaded

### Webhook Configuration
Configure webhooks through the admin panel or API:

```json
{
  "url": "https://your-app.com/webhooks",
  "events": ["opportunity.created", "user.registered"],
  "secret": "webhook-secret-key"
}
```

## SDK and Libraries

Official SDKs available:
- JavaScript/TypeScript SDK
- Python SDK (planned)
- PHP SDK (planned)

Example usage with JavaScript:
```javascript
import { EduOppsAPI } from 'eduopps-sdk';

const api = new EduOppsAPI({
  baseURL: 'http://localhost:5000/api',
  token: 'your-jwt-token'
});

const opportunities = await api.opportunities.search({
  query: 'internship',
  industry: 'technology'
});
```

## Testing

Use the included Postman collection for API testing:
- Import the collection from `/docs/api-collection.json`
- Set up environment variables for base URL and token

## Support

For API support and questions:
- Check the documentation first
- Review error messages and codes
- Contact the development team for assistance