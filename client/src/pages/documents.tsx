import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { opportunitiesApi, documentsApi } from "@/lib/api";
import { Opportunity, Document } from "@shared/schema";

import PageHeader from "@/components/shared/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  FileText,
  Upload,
  Trash2,
  Download,
  Loader2,
  File,
  Info as InfoIcon,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Documents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOpportunity, setSelectedOpportunity] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(
    null,
  );

  // Fetch teacher's opportunities
  const { data: opportunities, isLoading: isLoadingOpportunities } = useQuery({
    queryKey: ["/api/opportunities"],
    queryFn: () => opportunitiesApi.getAll(),
    enabled: user?.permissions?.canUploadDocuments,
  });

  // Filter only opportunities created by this teacher
  const teacherOpportunities = opportunities?.filter(
    (opp: Opportunity) =>
      opp.createdById === user?.id ||
      opp.schoolId === user?.schoolId ||
      user?.permissions?.canEditAllOpportunities,
  );

  // Fetch documents for selected opportunity
  const { data: documents, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ["/api/documents/opportunity", selectedOpportunity],
    queryFn: () => documentsApi.getByOpportunity(parseInt(selectedOpportunity)),
    enabled: !!selectedOpportunity,
  });

  // Delete document mutation
  const { mutate: deleteDocument, isPending: isDeleting } = useMutation({
    mutationFn: (id: number) => documentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/documents/opportunity", selectedOpportunity],
      });
      toast({
        title: "Document Deleted",
        description: "The document has been successfully deleted.",
      });
      setDocumentToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle file upload
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!event.target.files || !selectedOpportunity) return;

    try {
      setIsUploading(true);

      const file = event.target.files[0];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("opportunityId", selectedOpportunity);

      // Upload the file (this endpoint already creates the document record)
      const uploadResult = await documentsApi.upload(formData);

      queryClient.invalidateQueries({
        queryKey: ["/api/documents/opportunity", selectedOpportunity],
      });
      
      // Show appropriate success message based on storage mode
      const successMessage = uploadResult.storageMode === "metadata" 
        ? "Document uploaded successfully (metadata mode)"
        : "Document uploaded successfully";
        
      toast({
        title: "Document Uploaded",
        description: successMessage,
      });

      // Reset file input
      event.target.value = "";
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle document download
  const handleDownload = async (documentId: number, fileName: string) => {
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

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Get file icon based on file type
  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf"))
      return <FileText className="h-8 w-8 text-red-500" />;
    if (fileType.includes("word") || fileType.includes("document"))
      return <FileText className="h-8 w-8 text-blue-500" />;
    if (fileType.includes("excel") || fileType.includes("spreadsheet"))
      return <FileText className="h-8 w-8 text-green-500" />;
    if (fileType.includes("image"))
      return <FileText className="h-8 w-8 text-purple-500" />;
    return <File className="h-8 w-8 text-gray-500" />;
  };

  return (
    <div className="container p-6">
      <PageHeader
        title="Document Management"
        description="Upload and manage documents for your opportunities"
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
          <CardDescription>
            Select an opportunity and upload documents that students can access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Storage Mode Information Banner */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <InfoIcon className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-green-900 dark:text-green-100 mb-1">
                    Document Storage Active
                  </p>
                  <p className="text-green-700 dark:text-green-200">
                    Document storage is working properly. You can upload files and download them later. 
                    Files are stored securely and can be accessed by authorized users.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="opportunity">Select Opportunity</Label>
                <Select
                  value={selectedOpportunity}
                  onValueChange={setSelectedOpportunity}
                  disabled={isLoadingOpportunities}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an opportunity" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingOpportunities ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span>Loading...</span>
                      </div>
                    ) : teacherOpportunities?.length ? (
                      teacherOpportunities.map((opportunity: Opportunity) => (
                        <SelectItem
                          key={opportunity.id}
                          value={opportunity.id.toString()}
                        >
                          {opportunity.title}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-center text-muted-foreground">
                        No opportunities found
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="file">Upload File</Label>
                <div className="flex items-end gap-4 mt-2">
                  <Input
                    id="file"
                    type="file"
                    disabled={!selectedOpportunity || isUploading}
                    onChange={handleFileUpload}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Accepted file types: PDF, Word, Excel, PowerPoint, Images (max
                  10MB)
                </p>
              </div>
            </div>

            {isUploading && (
              <div className="flex items-center justify-center p-4 border rounded-md bg-muted/50">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Uploading document...</span>
              </div>
            )}

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-4">Document List</h3>

              {!selectedOpportunity ? (
                <div className="flex flex-col items-center justify-center p-8 text-center border rounded-md bg-muted/50">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                  <p>Please select an opportunity to view its documents</p>
                </div>
              ) : isLoadingDocuments ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin mr-2" />
                  <span>Loading documents...</span>
                </div>
              ) : documents?.length ? (
                <div className="grid gap-4">
                  {documents.map((document: Document) => (
                    <div
                      key={document.id}
                      className="flex items-center justify-between p-4 border rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getFileIcon(document.fileType)}
                        <div>
                          <p className="font-medium">{document.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{formatFileSize(document.fileSize)}</span>
                            <span>•</span>
                            <span>
                              {new Date(
                                document.createdAt,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownload(document.id, document.name)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDocumentToDelete(document)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center border rounded-md bg-muted/50">
                  <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                  <p>No documents uploaded for this opportunity</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload documents using the form above
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!documentToDelete}
        onOpenChange={(open) => !open && setDocumentToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                documentToDelete && deleteDocument(documentToDelete.id)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
