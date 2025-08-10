import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { opportunitiesApi, filterOptionsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Opportunity, User } from "@shared/schema";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, FileSpreadsheet, Users } from "lucide-react";

export default function AttendeesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedOpportunity, setSelectedOpportunity] = useState<
    string | undefined
  >();

  // Fetch opportunities that have registered students
  const { data: opportunities, isLoading: isLoadingOpportunities } = useQuery({
    queryKey: ["/api/opportunities/with-registered-students"],
    queryFn: () => opportunitiesApi.getOpportunitiesWithRegisteredStudents(),
    enabled: user?.permissions?.canViewAttendees,
  });

  // Filter only opportunities created by this teacher
  const teacherOpportunities = opportunities?.filter(
    (opp: Opportunity) =>
      opp.createdById === user?.id ||
      user?.schoolId === opp.schoolId ||
      user?.permissions?.canEditAllOpportunities,
  );

  // Fetch attendees for selected opportunity
  const { data: attendees, isLoading: isLoadingAttendees } = useQuery({
    queryKey: ["/api/student-interests/opportunity", selectedOpportunity],
    queryFn: () =>
      opportunitiesApi.getInterestedStudents(parseInt(selectedOpportunity!)),
    enabled: !!selectedOpportunity,
  });

  // Function to download attendee list as CSV
  const downloadAttendeeList = () => {
    if (!attendees || attendees.length === 0) {
      toast({
        title: "No attendees to download",
        description: "There are no registered students for this opportunity.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate CSV data
      const selectedOpp = teacherOpportunities?.find(
        (o: Opportunity) => o.id.toString() === selectedOpportunity,
      );
      const headers = [
        "Student ID",
        "First Name",
        "Last Name",
        "Email",
        "Registration Date",
      ];
      const csvContent = [
        headers.join(","),
        ...attendees.map((student: User & { registrationDate?: string }) =>
          [
            student.id,
            student.firstName,
            student.lastName,
            student.email,
            new Date(
              student.registrationDate || Date.now(),
            ).toLocaleDateString(),
          ].join(","),
        ),
      ].join("\\n");

      // Create and download the file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `attendees_${selectedOpp?.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download started",
        description: "Attendee list is being downloaded as a CSV file.",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "There was a problem downloading the attendee list.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">View Attendees</h1>
          <p className="text-muted-foreground">
            Download list of students who registered interest in your
            opportunities
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select an Opportunity</CardTitle>
          <CardDescription>
            Choose an opportunity to view its registered students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Your Opportunities
                </label>
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
            </div>

            {selectedOpportunity && (
              <div className="pt-4">
                <Separator className="my-4" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Registered Students</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadAttendeeList}
                      disabled={isLoadingAttendees || !attendees?.length}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      <span>Download CSV</span>
                    </Button>
                  </div>

                  {isLoadingAttendees ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin mr-2" />
                      <span>Loading attendees...</span>
                    </div>
                  ) : !attendees?.length ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                      <Users className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">
                        No registered students
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        No students have registered interest in this opportunity
                        yet.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <div className="grid grid-cols-12 bg-muted p-3 font-medium">
                        <div className="col-span-1">#</div>
                        <div className="col-span-3">Name</div>
                        <div className="col-span-3">Email</div>
                        <div className="col-span-3">Registration Date</div>
                        <div className="col-span-2">Status</div>
                      </div>

                      <div className="divide-y">
                        {attendees.map(
                          (
                            student: User & { registrationDate?: string },
                            index: number,
                          ) => (
                            <div
                              key={student.id}
                              className="grid grid-cols-12 p-3 hover:bg-muted/50"
                            >
                              <div className="col-span-1 font-mono">
                                {index + 1}
                              </div>
                              <div className="col-span-3">
                                {student.firstName} {student.lastName}
                              </div>
                              <div className="col-span-3 truncate">
                                {student.email}
                              </div>
                              <div className="col-span-3">
                                {student.registrationDate
                                  ? new Date(
                                      student.registrationDate,
                                    ).toLocaleDateString()
                                  : "Unknown"}
                              </div>
                              <div className="col-span-2">
                                <Badge
                                  variant="outline"
                                  className="bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700"
                                >
                                  Registered
                                </Badge>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  {attendees?.length > 0 && (
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <div>
                        <span>Total registered: </span>
                        <span className="font-medium">
                          {attendees.length} students
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadAttendeeList}
                      >
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        <span>Export to CSV</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
