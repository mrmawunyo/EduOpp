// Shared utilities for mobile app that reuse web app logic

import { Opportunity, SearchFilters } from './schema';

/**
 * Format deadline for mobile display - reused from web app logic
 */
export function formatDeadlineForMobile(deadline: string): { text: string; color: string; isUrgent: boolean } {
  const date = new Date(deadline);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { text: 'Expired', color: '#dc2626', isUrgent: true };
  }
  
  if (diffDays === 0) {
    return { text: 'Today', color: '#dc2626', isUrgent: true };
  }
  
  if (diffDays === 1) {
    return { text: 'Tomorrow', color: '#f59e0b', isUrgent: true };
  }
  
  if (diffDays <= 7) {
    return { text: `${diffDays} days left`, color: '#f59e0b', isUrgent: true };
  }
  
  return { text: `${diffDays} days left`, color: '#10b981', isUrgent: false };
}

/**
 * Build search query parameters - reused from web app
 */
export function buildSearchParams(query: string, filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  
  if (query.trim()) {
    params.append('q', query.trim());
  }
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => {
          if (v && v.trim()) {
            params.append(key, v.trim());
          }
        });
      } else if (typeof value === 'string' && value.trim()) {
        params.append(key, value.trim());
      }
    }
  });
  
  return params;
}

/**
 * Validate opportunity data - shared validation logic
 */
export function validateOpportunity(opportunity: Partial<Opportunity>): string[] {
  const errors: string[] = [];
  
  if (!opportunity.title?.trim()) {
    errors.push('Title is required');
  }
  
  if (!opportunity.description?.trim()) {
    errors.push('Description is required');
  }
  
  if (!opportunity.applicationDeadline) {
    errors.push('Application deadline is required');
  } else {
    const deadline = new Date(opportunity.applicationDeadline);
    const now = new Date();
    if (deadline < now) {
      errors.push('Application deadline must be in the future');
    }
  }
  
  if (!opportunity.contactEmail?.trim()) {
    errors.push('Contact email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(opportunity.contactEmail)) {
    errors.push('Valid contact email is required');
  }
  
  return errors;
}

/**
 * Format opportunity tags for display
 */
export function formatTags(tags: string[], maxDisplay: number = 2): { displayTags: string[], remainingCount: number } {
  const displayTags = tags.slice(0, maxDisplay);
  const remainingCount = Math.max(0, tags.length - maxDisplay);
  
  return { displayTags, remainingCount };
}

/**
 * Calculate application stats for opportunities
 */
export function calculateOpportunityStats(opportunities: Opportunity[]) {
  const now = new Date();
  
  const stats = {
    total: opportunities.length,
    active: 0,
    expired: 0,
    registered: 0,
    closing_soon: 0, // within 7 days
  };
  
  opportunities.forEach(opp => {
    const deadline = new Date(opp.applicationDeadline);
    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) {
      stats.expired++;
    } else {
      stats.active++;
      
      if (daysLeft <= 7) {
        stats.closing_soon++;
      }
    }
    
    if (opp.isRegistered) {
      stats.registered++;
    }
  });
  
  return stats;
}

/**
 * Filter opportunities by various criteria - shared logic
 */
export function filterOpportunities(
  opportunities: Opportunity[],
  filters: SearchFilters & { showExpired?: boolean; onlyRegistered?: boolean }
): Opportunity[] {
  let filtered = [...opportunities];
  
  // Filter by expiry
  if (!filters.showExpired) {
    const now = new Date();
    filtered = filtered.filter(opp => new Date(opp.applicationDeadline) >= now);
  }
  
  // Filter by registration status
  if (filters.onlyRegistered) {
    filtered = filtered.filter(opp => opp.isRegistered);
  }
  
  // Filter by industry
  if (filters.industry) {
    filtered = filtered.filter(opp => 
      opp.industry.toLowerCase().includes(filters.industry!.toLowerCase())
    );
  }
  
  // Filter by location
  if (filters.location) {
    filtered = filtered.filter(opp => 
      opp.location.toLowerCase().includes(filters.location!.toLowerCase())
    );
  }
  
  // Filter by category
  if (filters.category) {
    filtered = filtered.filter(opp => 
      opp.category.toLowerCase().includes(filters.category!.toLowerCase())
    );
  }
  
  // Filter by opportunity type
  if (filters.opportunityType) {
    filtered = filtered.filter(opp => 
      opp.opportunityType.toLowerCase().includes(filters.opportunityType!.toLowerCase())
    );
  }
  
  // Filter by age groups
  if (filters.ageGroups && filters.ageGroups.length > 0) {
    filtered = filtered.filter(opp => 
      filters.ageGroups!.some(age => 
        opp.targetAgeGroup.toLowerCase().includes(age.toLowerCase())
      )
    );
  }
  
  return filtered;
}

/**
 * Sort opportunities by various criteria
 */
export function sortOpportunities(
  opportunities: Opportunity[],
  sortBy: 'deadline' | 'title' | 'created' | 'updated' = 'deadline',
  sortOrder: 'asc' | 'desc' = 'asc'
): Opportunity[] {
  const sorted = [...opportunities].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'deadline':
        comparison = new Date(a.applicationDeadline).getTime() - new Date(b.applicationDeadline).getTime();
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'created':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'updated':
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
    }
    
    return sortOrder === 'desc' ? -comparison : comparison;
  });
  
  return sorted;
}

/**
 * Generate shareable content for opportunities
 */
export function generateShareContent(opportunity: Opportunity): { title: string; message: string; url?: string } {
  const deadline = formatDeadlineForMobile(opportunity.applicationDeadline);
  
  return {
    title: opportunity.title,
    message: `Check out this opportunity: ${opportunity.title} at ${opportunity.organizationName}. ${deadline.text}. Contact: ${opportunity.contactEmail}`,
    url: opportunity.organizationWebsite || undefined
  };
}

/**
 * Mobile-specific utility functions
 */
export const mobileUtils = {
  /**
   * Check if app is running on tablet
   */
  isTablet: (screenWidth: number): boolean => screenWidth >= 768,
  
  /**
   * Get optimal number of columns for grid layout
   */
  getGridColumns: (screenWidth: number): number => {
    if (screenWidth >= 1024) return 3;
    if (screenWidth >= 768) return 2;
    return 1;
  },
  
  /**
   * Format file size for mobile display
   */
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },
  
  /**
   * Truncate text for mobile display
   */
  truncateText: (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  },
  
  /**
   * Validate email format
   */
  isValidEmail: (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
  
  /**
   * Validate phone number format
   */
  isValidPhone: (phone: string): boolean => {
    return /^\+?[\d\s\-\(\)]+$/.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }
};