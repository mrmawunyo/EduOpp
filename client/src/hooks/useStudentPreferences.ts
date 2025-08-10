import { useQuery } from "@tanstack/react-query";
import { preferencesApi } from "@/lib/api";

export function useStudentPreferences() {
  const { data: preferences, isLoading, error } = useQuery({
    queryKey: ["/api/student-preferences"],
    queryFn: () => preferencesApi.get(),
    retry: false,
  });

  const hasPreferences = preferences && (
    (preferences.ageGroups && preferences.ageGroups.length > 0) ||
    (preferences.industries && preferences.industries.length > 0) ||
    (preferences.opportunityTypes && preferences.opportunityTypes.length > 0)
  );

  return {
    preferences,
    hasPreferences,
    isLoading,
    error,
  };
}