// Shared types adapted from the web app
export interface Opportunity {
  id: number;
  title: string;
  description: string;
  requirements: string;
  benefits: string;
  location: string;
  applicationDeadline: string;
  maxParticipants: number | null;
  contactEmail: string;
  contactPhone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  schoolId: number;
  category: string;
  targetAgeGroup: string;
  duration: string;
  applicationProcess: string;
  organizationName: string;
  organizationWebsite: string | null;
  applicationFormUrl: string | null;
  tags: string[];
  industry: string;
  opportunityType: string;
  salaryRange: string | null;
  workArrangement: string | null;
  skillsRequired: string[];
  educationLevel: string | null;
  experienceLevel: string | null;
  applicationCount?: number;
  isRegistered?: boolean;
  documents?: Document[];
}

export interface Document {
  id: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: number;
  opportunityId: number;
  objectName: string;
}

export interface FilterOptions {
  industries: string[];
  ageGroups: string[];
  locations: string[];
  categories: string[];
  opportunityTypes: string[];
  workArrangements: string[];
  experienceLevels: string[];
  educationLevels: string[];
}

export interface SearchFilters {
  industry?: string;
  ageGroups?: string[];
  location?: string;
  category?: string;
  opportunityType?: string;
  workArrangement?: string;
  experienceLevel?: string;
  educationLevel?: string;
}