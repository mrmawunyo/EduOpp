import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import briefcaseIcon from "@assets/briefcase-icon-2048x2048_1749131430329.png";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { opportunitiesApi, interestsApi, documentsApi } from "@/lib/api";

import { format } from "date-fns";
import {
  Download,
  ExternalLink,
  FileText,
  Star,
  Users,
  Edit,
  Trash2,
  Loader2,
  Upload,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface OpportunityDetailModalProps {
  opportunityId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function OpportunityDetailModal({
  opportunityId,
  isOpen,
  onClose,
}: OpportunityDetailModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInterested, setIsInterested] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch opportunity details
  const {
    data: opportunity,
    isLoading,
    error,
  } = useQuery({
    queryKey: opportunityId ? [`/api/opportunities/${opportunityId}`] : [],
    queryFn: () => opportunitiesApi.getById(opportunityId!),
    enabled: !!opportunityId && isOpen,
  });

  // Fetch interested students (for teachers/admins)
  const { data: interestedStudents, isLoading: isLoadingStudents } = useQuery({
    queryKey: opportunityId
      ? [`/api/student-interests/opportunity/${opportunityId}`]
      : [],
    enabled:
      !!opportunityId &&
      isOpen &&
      user?.permissions &&
      (user.permissions.canViewOpportunities ||
        user.permissions.canEditAllOpportunities ||
        user.permissions.canEditSchoolOpportunities),
  });

  // Fetch attendees for space calculation (teachers/admins only)
  const { data: attendees = [] } = useQuery({
    queryKey: [`/api/student-interests/opportunity/${opportunityId}`],
    queryFn: () => interestsApi.getForOpportunity(opportunityId!),
    enabled:
      !!opportunityId &&
      !!(
        user?.permissions?.canEditOwnOpportunities ||
        user?.permissions?.canEditSchoolOpportunities ||
        user?.permissions?.canEditAllOpportunities
      ),
    retry: false,
  });

  // Fetch interest counts for all opportunities (public data for availability calculation)
  const { data: interestCounts = {} } = useQuery({
    queryKey: ["/api/student-interests/counts"],
    queryFn: () => {
      return fetch("/api/student-interests/counts", {
        credentials: "include",
      }).then(res => res.json());
    },
    retry: false,
  });

  // Fetch student interests to check registration status
  const { data: studentInterests = [] } = useQuery({
    queryKey: ["/api/student-interests/student"],
    queryFn: () => interestsApi.getForStudent(),
    enabled: !!user?.permissions?.canViewOpportunities,
    retry: false,
  });

  // Fetch documents for the opportunity
  const { data: documents = [] } = useQuery({
    queryKey: [`/api/documents/opportunity/${opportunityId}`],
    queryFn: () => documentsApi.getByOpportunity(opportunityId!),
    enabled: !!opportunityId && isOpen,
    retry: false,
  });

  // Check if current student is interested
  useEffect(() => {
    if (opportunityId && studentInterests.length >= 0) {
      const isRegistered = studentInterests.some(
        (interest: any) => interest.opportunityId === opportunityId,
      );
      setIsInterested(isRegistered);
    }
  }, [opportunityId, studentInterests]);

  // Calculate space availability with proper dependencies
  const spaceInfo = useMemo(() => {
    if (!opportunity)
      return { hasSpaces: true, spacesLeft: null, totalSpaces: null, registeredCount: 0 };

    const totalSpaces = opportunity.numberOfSpaces;
    if (!totalSpaces)
      return { hasSpaces: true, spacesLeft: null, totalSpaces: null, registeredCount: 0 };

    // Use attendees array for teachers/admins, interest counts for students
    const registeredCount = attendees.length > 0 
      ? attendees.length 
      : (interestCounts[opportunity.id] || 0);
    const spacesLeft = totalSpaces - registeredCount;

    return {
      hasSpaces: spacesLeft > 0,
      spacesLeft,
      totalSpaces,
      registeredCount,
    };
  }, [opportunity, attendees, interestCounts]);

  // Toggle interest mutation
  const toggleInterestMutation = useMutation({
    mutationFn: async () => {
      if (!opportunityId) return;

      if (isInterested) {
        return await interestsApi.unregisterInterest(opportunityId);
      } else {
        return await interestsApi.registerInterest(opportunityId);
      }
    },
    onSuccess: () => {
      setIsInterested(!isInterested);
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      queryClient.invalidateQueries({
        queryKey: [`/api/student-interests/opportunity/${opportunityId}`],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/student-interests/student"],
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

  // Download CSV mutation
  const downloadCSVMutation = useMutation({
    mutationFn: async () => {
      if (!opportunityId) return;
      return await interestsApi.downloadAttendeesCSV(opportunityId);
    },
    onSuccess: () => {
      toast({
        title: "Download started",
        description: "Attendees list is being downloaded as CSV",
      });
    },
    onError: (error) => {
      toast({
        title: "Download failed",
        description: `Failed to download attendees list: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      return await documentsApi.delete(documentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/documents/opportunity/${opportunityId}`],
      });
      toast({
        title: "Document deleted",
        description: "The document has been successfully removed",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: `Failed to delete document: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return await documentsApi.upload(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/documents/opportunity/${opportunityId}`],
      });
      setIsUploading(false);
      toast({
        title: "Document uploaded",
        description: "The document has been successfully uploaded",
      });
    },
    onError: (error) => {
      setIsUploading(false);
      toast({
        title: "Upload failed",
        description: `Failed to upload document: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !opportunityId) return;

    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("opportunityId", opportunityId.toString());

    uploadDocumentMutation.mutate(formData);

    // Reset the input
    event.target.value = "";
  };

  // Download interested students list
  const handleDownloadInterestedStudents = () => {
    const studentsArray = Array.isArray(interestedStudents)
      ? interestedStudents
      : [];
    if (studentsArray.length === 0) {
      toast({
        title: "No students",
        description: "There are no students interested in this opportunity",
      });
      return;
    }

    // Create CSV content
    const headers = ["ID", "First Name", "Last Name", "Email", "Username"];
    const csvContent = [
      headers.join(","),
      ...studentsArray.map((student: any) =>
        [
          student.id,
          student.firstName,
          student.lastName,
          student.email,
          student.username,
        ].join(","),
      ),
    ].join("\n");

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `interested-students-${opportunityId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle document download
  const handleDocumentDownload = async (documentId: number, fileName: string) => {
    try {
      await documentsApi.download(documentId);
      toast({
        title: "Download Started",
        description: `${fileName} is being downloaded.`,
      });
    } catch (error) {
      toast({
        title: "Download Failed", 
        description: error instanceof Error ? error.message : "Failed to download document",
        variant: "destructive",
      });
    }
  };

  // Get file icon based on file type
  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf"))
      return <FileText className="h-4 w-4 text-red-500" />;
    if (fileType.includes("word") || fileType.includes("document"))
      return <FileText className="h-4 w-4 text-blue-500" />;
    if (fileType.includes("excel") || fileType.includes("spreadsheet"))
      return <FileText className="h-4 w-4 text-green-500" />;
    if (fileType.includes("image"))
      return <FileText className="h-4 w-4 text-purple-500" />;
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-64 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-24 w-full" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-destructive">
              Error loading opportunity details
            </p>
            <Button onClick={onClose} className="mt-4">
              Close
            </Button>
          </div>
        ) : opportunity ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-medium text-neutral-400 dark:text-white">
                {opportunity.title}
              </DialogTitle>
              <DialogDescription className="text-neutral-300 dark:text-gray-400">
                {opportunity.organization}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
              {/* Left Column - Details */}
              <div className="md:col-span-2 space-y-4">
                {opportunity.imageUrl ? (
                  <img
                    src={opportunity.imageUrl}
                    alt={opportunity.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <img
                      src={briefcaseIcon}
                      alt="Briefcase icon"
                      className="w-24 h-24 object-contain opacity-60"
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium dark:text-white">
                      About the Opportunity
                    </h3>
                    <p className="text-sm mt-1 dark:text-gray-300">
                      {opportunity.description}
                    </p>
                  </div>

                  {opportunity.details && (
                    <div>
                      <h3 className="text-lg font-medium dark:text-white">
                        What You'll Learn
                      </h3>
                      <div className="text-sm mt-1 dark:text-gray-300 whitespace-pre-line">
                        {opportunity.details}
                      </div>
                    </div>
                  )}

                  {opportunity.requirements && (
                    <div>
                      <h3 className="text-lg font-medium dark:text-white">
                        Requirements
                      </h3>
                      <div className="text-sm mt-1 dark:text-gray-300 whitespace-pre-line">
                        {opportunity.requirements}
                      </div>
                    </div>
                  )}

                  {opportunity.applicationProcess && (
                    <div>
                      <h3 className="text-lg font-medium dark:text-white">
                        Application Process
                      </h3>
                      <div className="text-sm mt-1 dark:text-gray-300 whitespace-pre-line">
                        {opportunity.applicationProcess}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Summary & Actions */}
              <div className="space-y-4">
                <div className="bg-neutral-100 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-3 dark:text-white">
                    Opportunity Details
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium dark:text-gray-200">
                        Organization
                      </p>
                      <p className="text-sm dark:text-gray-300">
                        {opportunity.organization}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium dark:text-gray-200">
                        Dates
                      </p>
                      <p className="text-sm dark:text-gray-300">
                        {format(new Date(opportunity.startDate), "MMM d, yyyy")}{" "}
                        - {format(new Date(opportunity.endDate), "MMM d, yyyy")}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium dark:text-gray-200">
                        Location
                      </p>
                      <p className="text-sm dark:text-gray-300">
                        {opportunity.location}{" "}
                        {opportunity.isVirtual && "(Virtual)"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium dark:text-gray-200">
                        Opportunity Type
                      </p>
                      <p className="text-sm dark:text-gray-300">
                        {opportunity.opportunityType}
                      </p>
                    </div>

                    {opportunity.compensation && (
                      <div>
                        <p className="text-sm font-medium dark:text-gray-200">
                          Compensation
                        </p>
                        <p className="text-sm dark:text-gray-300">
                          {opportunity.compensation}
                        </p>
                      </div>
                    )}

                    {opportunity.applicationDeadline && (
                      <div>
                        <p className="text-sm font-medium dark:text-gray-200">
                          Application Deadline
                        </p>
                        <p
                          className={`text-sm font-medium ${
                            new Date(
                              opportunity.applicationDeadline,
                            ).getTime() -
                              new Date().getTime() <
                            7 * 24 * 60 * 60 * 1000
                              ? "text-error dark:text-red-400"
                              : "dark:text-gray-300"
                          }`}
                        >
                          {format(
                            new Date(opportunity.applicationDeadline),
                            "MMM d, yyyy",
                          )}
                          {new Date(opportunity.applicationDeadline).getTime() -
                            new Date().getTime() <
                            7 * 24 * 60 * 60 * 1000 &&
                            new Date(
                              opportunity.applicationDeadline,
                            ).getTime() > new Date().getTime() &&
                            ` (${Math.ceil((new Date(opportunity.applicationDeadline).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))} days left)`}
                        </p>
                      </div>
                    )}

                    {opportunity.numberOfSpaces && (
                      <div>
                        <p className="text-sm font-medium dark:text-gray-200">
                          Availability
                        </p>
                        <p className="text-sm dark:text-gray-300">
                          {!spaceInfo.totalSpaces
                            ? "Unlimited spaces"
                            : `${spaceInfo.registeredCount}/${spaceInfo.totalSpaces} registered`}
                        </p>
                        {spaceInfo.spacesLeft !== null &&
                          spaceInfo.spacesLeft <= 5 &&
                          spaceInfo.spacesLeft > 0 && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                              Only {spaceInfo.spacesLeft} spaces left!
                            </p>
                          )}
                        {spaceInfo.spacesLeft === 0 && (
                          <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                            No spaces left
                          </p>
                        )}
                      </div>
                    )}

                    {(opportunity.contactPerson ||
                      opportunity.contactEmail) && (
                      <div>
                        <p className="text-sm font-medium dark:text-gray-200">
                          Contact Person
                        </p>
                        {opportunity.contactPerson && (
                          <p className="text-sm dark:text-gray-300">
                            {opportunity.contactPerson}
                          </p>
                        )}
                        {opportunity.contactEmail && (
                          <p className="text-sm dark:text-gray-300">
                            {opportunity.contactEmail}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>



                {/* Actions */}
                <div className="space-y-3">
                  {/*user?.permissions?.canViewOpportunities && (
                    <Button
                      className={`w-full ${isInterested ? "bg-primary" : "border border-primary text-primary hover:bg-primary hover:text-white"}`}
                      variant={isInterested ? "default" : "outline"}
                      onClick={() => toggleInterestMutation.mutate()}
                      disabled={toggleInterestMutation.isPending}
                    >
                      <Star className="mr-2 h-4 w-4" />
                      {isInterested ? "Registered" : "Register Interest"}
                    </Button>--!>
                  )*/}

                  {opportunity.externalUrl && (
                    <Button variant="secondary" className="w-full" asChild>
                      <a
                        href={opportunity.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Visit Website
                      </a>
                    </Button>
                  )}

                  {/* Student Registration Actions */}
                  {user?.permissions?.canManagePreferences && (
                    <div className="border-t border-neutral-200 dark:border-gray-700 pt-3 mt-3">
                      <div className="space-y-2">
                        {(() => {
                          const canRegister =
                            !isInterested &&
                            (spaceInfo.hasSpaces ||
                              spaceInfo.totalSpaces === null);

                          return (
                            <Button
                              className={`w-full ${
                                isInterested
                                  ? "bg-red-600 hover:bg-red-700 text-white"
                                  : canRegister
                                    ? "bg-green-600 hover:bg-green-700 text-white"
                                    : "bg-gray-400 text-gray-700 cursor-not-allowed"
                              }`}
                              onClick={() => toggleInterestMutation.mutate()}
                              disabled={
                                toggleInterestMutation.isPending ||
                                (!canRegister && !isInterested)
                              }
                            >
                              <Star className="mr-2 h-4 w-4" />
                              {toggleInterestMutation.isPending
                                ? isInterested
                                  ? "Removing..."
                                  : "Registering..."
                                : isInterested
                                  ? "Remove Interest"
                                  : canRegister
                                    ? "Register Interest"
                                    : `No spaces left (${spaceInfo.spacesLeft === 0 ? "0" : spaceInfo.spacesLeft} spaces left)`}
                            </Button>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Teacher/Admin Actions */}
                  {user?.permissions &&
                    (user.permissions.canEditOwnOpportunities ||
                      user.permissions.canEditAllOpportunities ||
                      user.permissions.canEditSchoolOpportunities) && (
                      <div className="border-t border-neutral-200 dark:border-gray-700 pt-3 mt-3">
                        <p className="text-sm font-medium mb-2 dark:text-white">
                          Teacher Actions
                        </p>
                        <div className="space-y-2">
                          {/* Only show download button if user has canViewAttendees permission and there are attendees */}
                          {user?.permissions?.canViewAttendees &&
                            attendees.length > 0 && (
                              <Button
                                variant="outline"
                                className="w-full border-info text-info hover:bg-info hover:text-white"
                                onClick={() => downloadCSVMutation.mutate()}
                                disabled={downloadCSVMutation.isPending}
                              >
                                <Users className="mr-2 h-4 w-4" />
                                {downloadCSVMutation.isPending
                                  ? "Downloading..."
                                  : "Download Attendees CSV"}
                              </Button>
                            )}

                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {attendees.length} students registered
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>

            {/* Forms/Documents Section */}
            {(documents && documents.length > 0) || 
             (user?.permissions?.canEditAllOpportunities ||
              (user?.permissions?.canEditSchoolOpportunities && 
               user?.schoolId === opportunity?.schoolId) ||
              (user?.permissions?.canEditOwnOpportunities && 
               user?.id === opportunity?.createdById)) ? (
              <div className="mt-6 border-t border-neutral-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-medium dark:text-white mb-3">
                  Forms/Documents
                </h3>
                
                {/* Document List */}
                {documents && documents.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {documents.map((document: any) => (
                      <div
                        key={document.id}
                        className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {getFileIcon(document.fileType)}
                          <div>
                            <p className="font-medium text-sm">{document.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(document.fileSize)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDocumentDownload(document.id, document.name)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          {/* Show delete button for users with proper permissions */}
                          {(user?.permissions?.canEditAllOpportunities ||
                            (user?.permissions?.canEditSchoolOpportunities && 
                             user?.schoolId === opportunity?.schoolId) ||
                            (user?.permissions?.canEditOwnOpportunities && 
                             user?.id === opportunity?.createdById) ||
                            user?.id === document.uploadedById) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteDocumentMutation.mutate(document.id)}
                              disabled={deleteDocumentMutation.isPending}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {deleteDocumentMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Document Button for authorized users */}
                {(user?.permissions?.canEditAllOpportunities ||
                  (user?.permissions?.canEditSchoolOpportunities && 
                   user?.schoolId === opportunity?.schoolId) ||
                  (user?.permissions?.canEditOwnOpportunities && 
                   user?.id === opportunity?.createdById)) && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-center">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={isUploading || uploadDocumentMutation.isPending}
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                        />
                        <Button
                          variant="outline"
                          className="w-full border-dashed border-2 hover:border-primary hover:bg-primary/5"
                          disabled={isUploading || uploadDocumentMutation.isPending}
                          asChild
                        >
                          <span>
                            {isUploading || uploadDocumentMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Document
                              </>
                            )}
                          </span>
                        </Button>
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            <DialogFooter className="mt-6">
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
