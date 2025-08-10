import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { opportunitiesApi, interestsApi } from "@/lib/api";
import PageHeader from "@/components/shared/PageHeader";
import OpportunityCard from "@/components/opportunities/OpportunityCard";
import OpportunityDetailModal from "@/components/opportunities/OpportunityDetailModal";
import FilterSidebar from "@/components/opportunities/FilterSidebar";
import OpportunityForm from "@/components/opportunities/OpportunityForm";
import { FirstTimePreferencesModal } from "@/components/preferences/FirstTimePreferencesModal";
import { useStudentPreferences } from "@/hooks/useStudentPreferences";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Plus, Search, ListFilter, Grid } from "lucide-react";

export default function Opportunities({
  createMode,
  editMode,
  opportunityId,
}: {
  createMode?: boolean;
  editMode?: boolean;
  opportunityId?: number;
}) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<
    number | null
  >(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filters, setFilters] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);

  // Check student preferences for first-time users
  const {
    preferences,
    hasPreferences,
    isLoading: preferencesLoading,
  } = useStudentPreferences();
  const isStudent = user?.permissions?.canManagePreferences;

  // Show preferences modal for first-time students
  useEffect(() => {
    if (user && isStudent && !preferencesLoading && !hasPreferences) {
      setShowPreferencesModal(true);
    }
  }, [user, isStudent, preferencesLoading, hasPreferences]);

  // Set initial filters from student preferences
  useEffect(() => {
    if (isStudent && hasPreferences && preferences) {
      setFilters({
        industries: preferences.industries || [],
        ageGroups: preferences.ageGroups || [],
        locations: preferences.locations || [],
        opportunityTypes: preferences.opportunityTypes || [],
      });
    }
  }, [isStudent, hasPreferences, preferences]);

  // Fetch opportunities using main endpoint for better error visibility
  const {
    data: opportunities,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["/api/opportunities"],
    queryFn: () =>
      fetch("/api/opportunities").then((res) => {
        if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
        return res.json();
      }),
  });

  // Filter opportunities client-side with automatic student preferences
  const filteredOpportunities =
    opportunities?.filter((opp: any) => {
      // Search filter
      if (
        searchQuery &&
        !opp.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !opp.organization.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // My Posts filter
      if (
        filters.createdById !== undefined &&
        opp.createdById !== filters.createdById
      ) {
        return false;
      }

      // Apply student preferences automatically if user is a student and has preferences
      if (isStudent && preferences && hasPreferences) {
        // Industry preference filter (case-insensitive)
        if (preferences.industries && preferences.industries.length > 0) {
          const matchesIndustry = preferences.industries.some(
            (prefIndustry: string) =>
              prefIndustry.toLowerCase() === opp.industry?.toLowerCase(),
          );
          if (!matchesIndustry) {
            return false;
          }
        }

        // Opportunity type preference filter (case-insensitive)
        if (
          preferences.opportunityTypes &&
          preferences.opportunityTypes.length > 0
        ) {
          const matchesType = preferences.opportunityTypes.some(
            (prefType: string) =>
              prefType.toLowerCase() === opp.opportunityType?.toLowerCase(),
          );
          if (!matchesType) {
            return false;
          }
        }

        // Age group preference filter
        if (preferences.ageGroups && preferences.ageGroups.length > 0) {
          const opportunityAgeGroups = Array.isArray(opp.ageGroup)
            ? opp.ageGroup
            : [];
          const hasMatchingAgeGroup = preferences.ageGroups.some(
            (prefAge: string) => opportunityAgeGroups.includes(prefAge),
          );
          if (!hasMatchingAgeGroup) {
            return false;
          }
        }
      }

      // Manual filter overrides (from FilterSidebar)
      // Industry filter
      if (
        filters.industry &&
        filters.industry !== "all" &&
        opp.industry !== filters.industry
      ) {
        return false;
      }

      // Opportunity type filter
      if (
        filters.opportunityType &&
        filters.opportunityType !== "all" &&
        opp.opportunityType !== filters.opportunityType
      ) {
        return false;
      }

      // Age group filter
      if (filters.ageGroups && filters.ageGroups.length > 0) {
        const opportunityAgeGroups = Array.isArray(opp.ageGroup)
          ? opp.ageGroup
          : [];
        const hasMatchingAgeGroup = filters.ageGroups.some(
          (filterAge: string) => opportunityAgeGroups.includes(filterAge),
        );
        if (!hasMatchingAgeGroup) {
          return false;
        }
      }

      // Location filter
      if (
        filters.location &&
        !opp.location?.toLowerCase().includes(filters.location.toLowerCase())
      ) {
        return false;
      }

      // Date range filter
      if (filters.startDate && filters.endDate) {
        const oppStartDate = new Date(opp.startDate);
        const filterStartDate = new Date(filters.startDate);
        const filterEndDate = new Date(filters.endDate);

        if (oppStartDate < filterStartDate || oppStartDate > filterEndDate) {
          return false;
        }
      }

      return true;
    }) || [];

  // Fetch interests for users who can manage preferences
  const { data: interests } = useQuery({
    queryKey: ["/api/student-interests/student"],
    queryFn: () => interestsApi.getForStudent(),
    enabled: user?.permissions?.canManagePreferences,
  });

  // Fetch all interest counts for opportunities
  const { data: interestCounts = {} } = useQuery({
    queryKey: ["/api/student-interests/counts"],
    queryFn: async () => {
      const response = await fetch("/api/student-interests/counts", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch interest counts");
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  const handleCreateOpportunity = () => {
    setLocation("/opportunities/create");
  };

  const handleViewDetails = (id: number) => {
    setSelectedOpportunityId(id);
    setShowDetailModal(true);
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
  };

  // Check if a student is interested in an opportunity
  const isInterestedIn = (opportunityId: number): boolean => {
    if (!interests) return false;
    return interests.some(
      (interest: any) => interest.opportunityId === opportunityId,
    );
  };

  // Count interests per opportunity
  const getInterestCount = (opportunityId: number): number => {
    return interestCounts[opportunityId] || 0;
  };

  // Sort opportunities
  const sortOpportunities = (opportunities: any[]) => {
    if (!opportunities) return [];

    switch (sortOption) {
      case "newest":
        return [...opportunities].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      case "oldest":
        return [...opportunities].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      case "deadline":
        return [...opportunities].sort((a, b) => {
          if (!a.applicationDeadline) return 1;
          if (!b.applicationDeadline) return -1;
          return (
            new Date(a.applicationDeadline).getTime() -
            new Date(b.applicationDeadline).getTime()
          );
        });
      case "popularity":
        return [...opportunities].sort(
          (a, b) => getInterestCount(b.id) - getInterestCount(a.id),
        );
      default:
        return opportunities;
    }
  };

  // Paginate opportunities
  const paginateOpportunities = (opportunities: any[]) => {
    if (!opportunities) return [];

    const startIndex = (currentPage - 1) * itemsPerPage;
    return opportunities.slice(startIndex, startIndex + itemsPerPage);
  };

  const sortedOpportunities = sortOpportunities(filteredOpportunities || []);
  const paginatedOpportunities = paginateOpportunities(sortedOpportunities);
  const totalPages = Math.ceil(
    (sortedOpportunities?.length || 0) / itemsPerPage,
  );

  const canCreateOpportunities = user?.permissions?.canCreateOpportunities;

  // Fetch opportunity for editing
  const { data: opportunityToEdit, isLoading: isLoadingOpportunity } = useQuery(
    {
      queryKey: [`/api/opportunities/${opportunityId}`],
      queryFn: () => opportunitiesApi.getById(opportunityId as number),
      enabled: editMode && !!opportunityId && !isNaN(Number(opportunityId)),
    },
  );

  // Handle form submission for creating an opportunity
  const handleCreateSubmit = async (formData: any) => {
    try {
      await opportunitiesApi.create(formData);
      toast({
        title: "Success",
        description: "Opportunity created successfully!",
      });
      // Navigate back to opportunities list after successful creation
      setLocation("/opportunities");
    } catch (error: any) {
      console.error("Error creating opportunity:", error);

      // Extract meaningful error message
      let errorMessage = "Failed to create opportunity. Please try again.";

      if (error?.response?.status === 403) {
        errorMessage =
          "You don't have permission to create opportunities. Please contact your administrator.";
      } else if (error?.response?.status === 401) {
        errorMessage = "Your session has expired. Please log in again.";
      } else if (error?.response?.status === 400) {
        errorMessage =
          error?.response?.data?.message ||
          "Invalid opportunity data. Please check your inputs.";
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Handle form submission for editing an opportunity
  const handleEditSubmit = async (formData: any) => {
    try {
      if (opportunityId) {
        await opportunitiesApi.update(opportunityId, formData);
        queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
        queryClient.invalidateQueries({
          queryKey: [`/api/opportunities/${opportunityId}`],
        });
        toast({
          title: "Success",
          description: "Opportunity updated successfully!",
        });
        // Navigate back to opportunities list after successful update
        setLocation("/opportunities");
      }
    } catch (error: any) {
      console.error("Error updating opportunity:", error);

      // Extract meaningful error message
      let errorMessage = "Failed to update opportunity. Please try again.";

      if (error?.response?.status === 403) {
        errorMessage = "You don't have permission to edit this opportunity.";
      } else if (error?.response?.status === 401) {
        errorMessage = "Your session has expired. Please log in again.";
      } else if (error?.response?.status === 404) {
        errorMessage = "Opportunity not found.";
      } else if (error?.response?.status === 400) {
        errorMessage =
          error?.response?.data?.message ||
          "Invalid opportunity data. Please check your inputs.";
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (createMode) {
    return (
      <div className="p-4 md:p-6">
        <PageHeader
          title="Create Opportunity"
          description="Add a new opportunity for students"
          action={{
            label: "Back to Opportunities",
            onClick: () => setLocation("/opportunities"),
          }}
        />
        <div className="mt-6">
          <OpportunityForm
            customSubmit={handleCreateSubmit}
            isCreating={true}
          />
        </div>
      </div>
    );
  }

  if (editMode) {
    // Show loading state while fetching the opportunity
    if (isLoadingOpportunity) {
      return (
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="mt-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 md:p-6">
        <PageHeader
          title="Edit Opportunity"
          description="Update opportunity details"
          action={{
            label: "Back to Opportunities",
            onClick: () => setLocation("/opportunities"),
          }}
        />
        <div className="mt-6">
          {opportunityToEdit && (
            <OpportunityForm
              customSubmit={handleEditSubmit}
              opportunityId={opportunityId}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* First-time preferences modal for students without preferences */}
      {isStudent && !preferencesLoading && !hasPreferences && (
        <FirstTimePreferencesModal
          open={true}
          onComplete={() => {
            setShowPreferencesModal(false);
            // Refetch preferences after modal closes
            queryClient.invalidateQueries({
              queryKey: ["/api/student-preferences"],
            });
          }}
        />
      )}

      <PageHeader
        title="Career Opportunities"
        description="Browse and manage available opportunities for students"
        action={
          canCreateOpportunities
            ? {
                label: "Create Opportunity",
                icon: <Plus className="h-4 w-4" />,
                onClick: handleCreateOpportunity,
              }
            : undefined
        }
      />

      {/* Creator View Tabs - Only visible to users who can create opportunities */}
      {user?.permissions?.canCreateOpportunities && (
        <div className="mb-4 border-b border-gray-200">
          <div className="flex space-x-4">
            <button
              className={`py-2 px-4 ${!filters.createdById ? "text-primary border-b-2 border-primary font-medium" : "text-gray-500"}`}
              onClick={() =>
                handleFilterChange({ ...filters, createdById: undefined })
              }
            >
              All Opportunities
            </button>
            <button
              className={`py-2 px-4 ${filters.createdById === user.id ? "text-primary border-b-2 border-primary font-medium" : "text-gray-500"}`}
              onClick={() =>
                handleFilterChange({ ...filters, createdById: user.id })
              }
            >
              My Posts
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area with Filters and Opportunities */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Filter Sidebar */}
        <div className="md:w-1/4">
          <FilterSidebar
            onFilterChange={handleFilterChange}
            initialFilters={filters}
            opportunities={opportunities || []}
          />
        </div>

        {/* Opportunities List */}
        <div className="md:w-3/4">
          {/* Sorting and View Options */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3">
            <form
              onSubmit={handleSearch}
              className="flex items-center w-full sm:w-auto mb-3 sm:mb-0"
            >
              <Input
                placeholder="Search opportunities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mr-2"
              />
              <Button type="submit" variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </form>

            <div className="flex items-center justify-between w-full sm:w-auto">
              <div className="flex items-center mr-4">
                <label className="text-sm mr-2 dark:text-gray-300">
                  Sort by:
                </label>
                <Select value={sortOption} onValueChange={setSortOption}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="deadline">Upcoming Deadline</SelectItem>
                    <SelectItem value="popularity">Most Popular</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center">
                <span className="text-sm text-neutral-300 dark:text-gray-400 mr-2">
                  {opportunities?.length || 0} opportunities
                </span>
                <div className="flex space-x-1">
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("list")}
                    className="h-8 w-8"
                  >
                    <ListFilter className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("grid")}
                    className="h-8 w-8"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Opportunities Cards */}
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-40 md:h-32 w-full" />
              <Skeleton className="h-40 md:h-32 w-full" />
              <Skeleton className="h-40 md:h-32 w-full" />
            </div>
          ) : error ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
              <p className="text-destructive dark:text-red-400">
                Error loading opportunities
              </p>
              <Button onClick={() => refetch()} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : filteredOpportunities && filteredOpportunities.length > 0 ? (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
                  : "space-y-4"
              }
            >
              {paginatedOpportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  isInterested={isInterestedIn(opportunity.id)}
                  interestCount={getInterestCount(opportunity.id)}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
              <p className="text-neutral-400 dark:text-gray-300">
                No opportunities found
              </p>
              {canCreateOpportunities && (
                <Button
                  onClick={handleCreateOpportunity}
                  className="mt-4 bg-primary text-white"
                >
                  Create your first opportunity
                </Button>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="mr-2"
              >
                Previous
              </Button>

              <div className="flex items-center mx-2">
                <span className="text-sm text-neutral-400 dark:text-gray-300">
                  Page {currentPage} of {totalPages}
                </span>
              </div>

              <Button
                variant="outline"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="ml-2"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Opportunity Detail Modal */}
      <OpportunityDetailModal
        opportunityId={selectedOpportunityId}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />

      {/* First-time Student Preferences Modal */}
      {isStudent && (
        <FirstTimePreferencesModal
          open={showPreferencesModal}
          onComplete={() => {
            setShowPreferencesModal(false);
            // Refresh opportunities to apply new preferences
            refetch();
          }}
        />
      )}
    </div>
  );
}
