import { apiRequest } from "./queryClient";

// Opportunities
export const opportunitiesApi = {
  getAll: async () => {
    const response = await fetch("/api/opportunities", {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch opportunities");
    return response.json();
  },

  getById: async (id: number) => {
    const response = await fetch(`/api/opportunities/${id}`, {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch opportunity");
    return response.json();
  },

  getBySchool: async (schoolId: number) => {
    const response = await fetch(`/api/opportunities/school/${schoolId}`, {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch opportunities");
    return response.json();
  },

  getForUser: async () => {
    const response = await fetch("/api/opportunities/for-user", {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch opportunities");
    return response.json();
  },

  search: async (query: string, filters?: any) => {
    const searchParams = new URLSearchParams({ q: query });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, v));
        } else if (value) {
          searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(
      `/api/opportunities/search?${searchParams.toString()}`,
      {
        credentials: "include",
      },
    );

    if (!response.ok) throw new Error("Failed to search opportunities");
    return response.json();
  },

  create: async (data: any) => {
    const response = await apiRequest("POST", "/api/opportunities", data);
    return response.json();
  },

  update: async (id: number, data: any) => {
    const response = await apiRequest("PUT", `/api/opportunities/${id}`, data);
    return response.json();
  },

  delete: async (id: number) => {
    const response = await apiRequest("DELETE", `/api/opportunities/${id}`);
    return response.json();
  },

  getInterestedStudents: async (opportunityId: number) => {
    const response = await fetch(
      `/api/student-interests/opportunity/${opportunityId}`,
      {
        credentials: "include",
      },
    );

    if (!response.ok) throw new Error("Failed to fetch interested students");
    return response.json();
  },

  getOpportunitiesWithRegisteredStudents: async () => {
    const response = await fetch("/api/opportunities/with-registered-students", {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch opportunities with registered students");
    return response.json();
  },
};

// Student Interests
export const interestsApi = {
  registerInterest: async (opportunityId: number) => {
    const response = await apiRequest("POST", "/api/student-interests", {
      opportunityId,
    });
    return response.json();
  },

  unregisterInterest: async (opportunityId: number) => {
    const response = await apiRequest(
      "DELETE",
      `/api/student-interests/${opportunityId}`,
    );
    return response.json();
  },

  getForStudent: async () => {
    const response = await fetch("/api/student-interests/student", {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch interests");
    return response.json();
  },

  getForOpportunity: async (opportunityId: number) => {
    const response = await fetch(
      `/api/student-interests/opportunity/${opportunityId}`,
      {
        credentials: "include",
      },
    );

    if (!response.ok) throw new Error("Failed to fetch attendees");
    return response.json();
  },

  downloadAttendeesCSV: async (opportunityId: number) => {
    const response = await fetch(
      `/api/student-interests/opportunity/${opportunityId}/csv`,
      {
        credentials: "include",
      },
    );

    if (!response.ok) throw new Error("Failed to download attendees CSV");

    // Create blob and download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = `attendees-opportunity-${opportunityId}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};

// News Posts
export const newsApi = {
  getAll: async (schoolId?: number, global?: boolean) => {
    let url = "/api/news";

    const params = new URLSearchParams();
    if (schoolId) params.set("schoolId", schoolId.toString());
    if (global) params.set("global", "true");
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url, {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch news posts");
    return response.json();
  },

  getById: async (id: number) => {
    const response = await fetch(`/api/news/${id}`, {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch news post");
    return response.json();
  },

  create: async (data: any) => {
    const response = await apiRequest("POST", "/api/news", data);
    return response.json();
  },

  update: async (id: number, data: any) => {
    const response = await apiRequest("PUT", `/api/news/${id}`, data);
    return response.json();
  },

  delete: async (id: number) => {
    const response = await apiRequest("DELETE", `/api/news/${id}`);
    return response.json();
  },
};

// Schools
export const schoolsApi = {
  getAll: async () => {
    const response = await fetch("/api/schools", {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch schools");
    return response.json();
  },

  getById: async (id: number) => {
    const response = await fetch(`/api/schools/${id}`, {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch school");
    return response.json();
  },

  create: async (data: any) => {
    const response = await apiRequest("POST", "/api/schools", data);
    return response.json();
  },

  update: async (id: number, data: any) => {
    const response = await apiRequest("PUT", `/api/schools/${id}`, data);
    return response.json();
  },
};

// Users
export const usersApi = {
  create: async (data: any) => {
    const response = await apiRequest("POST", "/api/users", data);
    return response.json();
  },

  getBySchool: async (schoolId: number, role?: string) => {
    const url = role
      ? `/api/users/school/${schoolId}?role=${role}`
      : `/api/users/school/${schoolId}`;

    const response = await fetch(url, {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch users");
    return response.json();
  },

  getByRole: async (role: string) => {
    const response = await fetch(`/api/users/role/${role}`, {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch users");
    return response.json();
  },

  update: async (id: number, data: any) => {
    const response = await apiRequest("PUT", `/api/users/${id}`, data);
    return response.json();
  },

  getRoles: async () => {
    const response = await fetch("/api/user-roles", {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch user roles");
    return response.json();
  },
};

// Student Preferences
export const preferencesApi = {
  get: async (userId?: number) => {
    const url = userId
      ? `/api/student-preferences?userId=${userId}`
      : "/api/student-preferences";

    const response = await fetch(url, {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch preferences");
    return response.json();
  },

  set: async (data: any) => {
    const response = await apiRequest("POST", "/api/student-preferences", data);
    return response.json();
  },

  update: async (data: any) => {
    const response = await apiRequest("PUT", "/api/student-preferences", data);
    return response.json();
  },
};

// Form Requests
export const formRequestsApi = {
  create: async (opportunityId: number) => {
    const response = await apiRequest("POST", "/api/form-requests", {
      opportunityId,
    });
    return response.json();
  },

  request: async (opportunityId: number) => {
    const response = await apiRequest("POST", "/api/form-requests", {
      opportunityId,
    });
    return response.json();
  },

  getForStudent: async () => {
    const response = await fetch("/api/form-requests/student", {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch form requests");
    return response.json();
  },

  getForOpportunity: async (opportunityId: number) => {
    const response = await fetch(
      `/api/form-requests/opportunity/${opportunityId}`,
      {
        credentials: "include",
      },
    );

    if (!response.ok) throw new Error("Failed to fetch form requests");
    return response.json();
  },

  markAsSent: async (requestId: number) => {
    const response = await apiRequest(
      "PUT",
      `/api/form-requests/${requestId}/mark-sent`,
    );
    return response.json();
  },
};

// Filter Options
export const filterOptionsApi = {
  getAll: async (category?: string) => {
    const url = category
      ? `/api/filter-options?category=${category}`
      : "/api/filter-options";

    const response = await fetch(url, {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch filter options");
    return response.json();
  },

  getByCategory: async (category: string) => {
    const response = await fetch(`/api/filter-options?category=${category}`, {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch filter options");
    return response.json();
  },

  create: async (data: any) => {
    const response = await apiRequest("POST", "/api/filter-options", data);
    return response.json();
  },

  update: async (id: number, data: any) => {
    const response = await apiRequest("PUT", `/api/filter-options/${id}`, data);
    return response.json();
  },

  delete: async (id: number) => {
    const response = await apiRequest("DELETE", `/api/filter-options/${id}`);
    return response.json();
  },
};

// Documents
export const documentsApi = {
  upload: async (data: FormData) => {
    const response = await fetch("/api/documents/upload", {
      method: "POST",
      credentials: "include",
      body: data,
    });

    if (!response.ok) throw new Error("Failed to upload document");
    return response.json();
  },

  create: async (data: any) => {
    const response = await apiRequest("POST", "/api/documents", data);
    return response.json();
  },

  getByOpportunity: async (opportunityId: number) => {
    const response = await fetch(
      `/api/documents/opportunity/${opportunityId}`,
      {
        credentials: "include",
      },
    );

    if (!response.ok) throw new Error("Failed to fetch documents");
    return response.json();
  },

  delete: async (id: number) => {
    const response = await apiRequest("DELETE", `/api/documents/${id}`);
    return response.json();
  },

  download: async (id: number) => {
    const response = await fetch(`/api/documents/${id}/download`, {
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 503) {
        throw new Error(data.message || "Document storage temporarily unavailable");
      } else if (response.status === 404) {
        throw new Error(data.message || "Document not found");
      } else if (response.status === 403) {
        throw new Error(data.message || "Access denied");
      } else {
        throw new Error(data.message || "Failed to download document");
      }
    }
    
    // If we have a download URL (cloud storage), redirect to it
    if (data.downloadUrl) {
      window.open(data.downloadUrl, '_blank');
    } else {
      // For fallback mode, show message that file is not available
      throw new Error("File storage not available - document metadata only");
    }
  },
};

// Reports
export const reportsApi = {
  getOpportunityStats: async () => {
    const response = await fetch("/api/reports/opportunities", {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch opportunity stats");
    return response.json();
  },

  getStudentInterestStats: async () => {
    const response = await fetch("/api/reports/student-interests", {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch student interest stats");
    return response.json();
  },

  getTeacherActivityStats: async (period?: string) => {
    const url = period
      ? `/api/reports/teacher-activity?period=${period}`
      : "/api/reports/teacher-activity";

    const response = await fetch(url, {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch teacher activity stats");
    return response.json();
  },
};
