import { Link, useLocation } from "wouter";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Delete,
  Edit,
  MapPin,
  Users,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { opportunitiesApi, interestsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import briefcaseIcon from "@assets/briefcase-icon-2048x2048_1749131430329.png";

interface OpportunityCardProps {
  opportunity: {
    id: number;
    title: string;
    organization: string;
    description: string;
    startDate: string;
    endDate: string;
    location: string;
    isVirtual: boolean;
    industry: string;
    ageGroup: string;
    opportunityType: string;
    imageUrl?: string;
    createdById: number;
    schoolId: number;
    applicationDeadline?: string;
  };
  isInterested?: boolean;
  interestCount?: number;
  onViewDetails: (id: number) => void;
}

export default function OpportunityCard({
  opportunity,
  isInterested = false,
  interestCount = 0,
  onViewDetails,
}: OpportunityCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Permission logic using permission-based system
  const isCreator = user?.id === opportunity.createdById;
  const isSameSchool = user?.schoolId === opportunity.schoolId;
  const canEdit =
    user?.permissions &&
    (user.permissions.canEditAllOpportunities || // superadmin/admin level
      (user.permissions.canEditSchoolOpportunities && isSameSchool) || // school-level permissions
      (user.permissions.canEditOwnOpportunities && isCreator)); // creator permissions

  // Format dates
  const formattedDateRange = `${format(new Date(opportunity.startDate), "MMM d, yyyy")} - ${format(new Date(opportunity.endDate), "MMM d, yyyy")}`;

  // Check if deadline is approaching (within 7 days)
  const hasDeadlineSoon =
    opportunity.applicationDeadline &&
    new Date(opportunity.applicationDeadline).getTime() - new Date().getTime() <
      7 * 24 * 60 * 60 * 1000 &&
    new Date(opportunity.applicationDeadline).getTime() > new Date().getTime();

  // Toggle interest mutation
  const toggleInterestMutation = useMutation({
    mutationFn: async () => {
      if (isInterested) {
        return await interestsApi.unregisterInterest(opportunity.id);
      } else {
        return await interestsApi.registerInterest(opportunity.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/student-interests/student"],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/student-interests/opportunity/${opportunity.id}`],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/student-interests/counts"],
      });
      toast({
        title: isInterested ? "Interest removed" : "Interest registered",
        description: isInterested
          ? "You are no longer registered for this opportunity"
          : "You have successfully registered interest in this opportunity",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${isInterested ? "remove" : "register"} interest: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Delete opportunity mutation
  const deleteOpportunityMutation = useMutation({
    mutationFn: () => opportunitiesApi.delete(opportunity.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      toast({
        title: "Opportunity deleted",
        description: "The opportunity has been successfully deleted",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete opportunity: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  const handleToggleInterest = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleInterestMutation.mutate();
  };

  const handleEditOpportunity = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate to edit page using wouter
    setLocation(`/opportunities/edit/${opportunity.id}`);
  };

  const handleDeleteOpportunity = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this opportunity?")) {
      deleteOpportunityMutation.mutate();
    }
  };

  return (
    <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      <div className="md:flex">
        {/* Card Image */}
        <div className="md:w-1/4 h-40 md:h-auto bg-primary-light dark:bg-primary-dark relative">
          {opportunity.imageUrl ? (
            <img
              src={opportunity.imageUrl}
              alt={opportunity.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
              <img
                src={briefcaseIcon}
                alt="Briefcase icon"
                className="w-16 h-16 object-contain opacity-60"
              />
            </div>
          )}

          {hasDeadlineSoon && (
            <div className="absolute top-2 right-2 bg-warning text-white text-xs px-2 py-1 rounded">
              Deadline Soon
            </div>
          )}
        </div>

        {/* Card Content */}
        <div className="p-4 md:w-3/4 flex flex-col">
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium text-neutral-400 dark:text-white">
                  {opportunity.title}
                </h3>
                <p className="text-sm text-neutral-300 dark:text-gray-400">
                  {opportunity.organization}
                </p>
              </div>

              {/* Teacher/Admin Actions */}
              {canEdit && (
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-neutral-300 hover:text-primary dark:text-gray-400 dark:hover:text-primary p-1 h-auto"
                    onClick={handleEditOpportunity}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-neutral-300 hover:text-error dark:text-gray-400 dark:hover:text-destructive p-1 h-auto"
                    onClick={handleDeleteOpportunity}
                  >
                    <Delete className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-2 space-y-2">
              <div className="flex items-center text-sm">
                <Calendar className="text-neutral-300 dark:text-gray-400 h-4 w-4 mr-1" />
                <span className="dark:text-gray-300">{formattedDateRange}</span>
              </div>
              <div className="flex items-center text-sm">
                <MapPin className="text-neutral-300 dark:text-gray-400 h-4 w-4 mr-1" />
                <span className="dark:text-gray-300">
                  {opportunity.location} {opportunity.isVirtual && "(Virtual)"}
                </span>
              </div>
              <p className="text-sm mt-2 dark:text-gray-300">
                {opportunity.description.substring(0, 120)}...
              </p>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <Badge
                variant="outline"
                className="bg-neutral-100 dark:bg-gray-700 text-neutral-400 dark:text-gray-300"
              >
                {opportunity.industry}
              </Badge>
              <Badge
                variant="outline"
                className="bg-neutral-100 dark:bg-gray-700 text-neutral-400 dark:text-gray-300"
              >
                {Array.isArray(opportunity.ageGroup)
                  ? opportunity.ageGroup.join(", ")
                  : opportunity.ageGroup}
              </Badge>
              <Badge
                variant="outline"
                className="bg-neutral-100 dark:bg-gray-700 text-neutral-400 dark:text-gray-300"
              >
                {opportunity.opportunityType}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between mt-4 pt-3 border-t border-neutral-100 dark:border-gray-700">
            <div className="flex items-center gap-4 text-sm text-neutral-300 dark:text-gray-400">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                <span>{interestCount} students interested</span>
              </div>
              {opportunity.numberOfSpaces && (
                <div className="flex items-center">
                  <span
                    className={`font-medium ${
                      opportunity.numberOfSpaces - interestCount <= 5
                        ? "text-red-500 dark:text-red-400"
                        : "text-green-600 dark:text-green-400"
                    }`}
                  >
                    {Math.max(0, opportunity.numberOfSpaces - interestCount)}{" "}
                    spaces left
                  </span>
                </div>
              )}
            </div>

            <div className="flex space-x-2 mt-2 sm:mt-0">
              {user?.permissions?.canManagePreferences && (
                <Button
                  variant={isInterested ? "default" : "outline"}
                  className={`${isInterested ? "bg-primary text-white hover:bg-primary-dark" : "border-primary text-primary hover:bg-primary hover:text-white"}`}
                  size="sm"
                  onClick={handleToggleInterest}
                  disabled={toggleInterestMutation.isPending}
                >
                  {isInterested ? "Unregister Interest" : "Register Interest"}
                </Button>
              )}

              <Button
                variant="secondary"
                size="sm"
                className="bg-neutral-100 text-neutral-400 hover:bg-neutral-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 flex items-center"
                onClick={() => onViewDetails(opportunity.id)}
              >
                <span>Details</span>
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
