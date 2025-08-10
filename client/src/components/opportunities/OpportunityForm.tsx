import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { opportunitiesApi, filterOptionsApi, schoolsApi } from "@/lib/api";
import { useLocation } from "wouter";
import { School, FilterOption } from "@shared/schema";
import {
  DateRangePicker,
  type DateRange,
} from "@/components/ui/date-range-picker";

// Use FilterOption directly from shared schema - no need for additional interface

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";

// Define form schema
const opportunityFormSchema = z
  .object({
    title: z.string().min(1, { message: "Title is required" }),
    organization: z.string().min(1, { message: "Organization is required" }),
    description: z.string().min(1, { message: "Description is required" }),
    details: z.string().optional(),
    requirements: z.string().optional(),
    applicationProcess: z.string().optional(),
    imageUrl: z.string().optional(),
    dateRange: z
      .object({
        from: z.date({ required_error: "Start date is required" }),
        to: z.date({ required_error: "End date is required" }),
      })
      .refine((data) => data.to >= data.from, {
        message: "End date must be after start date",
        path: ["to"],
      }),
    applicationDeadline: z.date({
      required_error: "Application deadline date is required",
    }),
    location: z.string().optional(),
    isVirtual: z.boolean().default(false),
    opportunityType: z
      .string()
      .min(1, { message: "Opportunity type is required" }),
    compensation: z.string().optional(),
    industry: z.string().min(1, { message: "Industry is required" }),
    ageGroup: z
      .array(z.string())
      .min(1, { message: "At least one age group is required" }),
    ethnicityFocus: z.string().optional(),
    genderFocus: z.string().optional(),
    contactPerson: z.string().optional(),
    contactEmail: z
      .string()
      .email({ message: "Invalid email" })
      .optional()
      .or(z.literal("")),
    externalUrl: z
      .string()
      .url({ message: "Invalid URL" })
      .optional()
      .or(z.literal("")),
    isGlobal: z.boolean().default(false),
    schoolId: z.number().optional(),
    visibleToSchools: z.array(z.number()).optional(),
  })
  .refine(
    (data) => {
      // Require location if not virtual
      if (!data.isVirtual && (!data.location || data.location.trim() === "")) {
        return false;
      }
      return true;
    },
    {
      message: "Location is required for non-virtual opportunities",
      path: ["location"],
    },
  );

type OpportunityFormValues = z.infer<typeof opportunityFormSchema>;

interface OpportunityFormProps {
  opportunityId?: number;
  onSuccess?: () => void;
  isCreating?: boolean;
  customSubmit?: (data: any) => Promise<void>;
}

export default function OpportunityForm({
  opportunityId,
  onSuccess,
  isCreating = false,
  customSubmit,
}: OpportunityFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isEditMode] = useState(!!opportunityId);
  const [formChanged, setFormChanged] = useState(false);
  const [selectedSchools, setSelectedSchools] = useState<number[]>([]);

  // Get filter options
  const {
    data: industries,
    isLoading: industriesLoading,
    error: industriesError,
  } = useQuery({
    queryKey: ["/api/filter-options", "industry"],
    queryFn: () => filterOptionsApi.getAll("industry"),
  });

  // Debug logging
  console.log("Industries data:", industries);
  console.log("Industries loading:", industriesLoading);
  console.log("Industries error:", industriesError);

  const { data: ageGroups } = useQuery({
    queryKey: ["/api/filter-options", "ageGroup"],
    queryFn: () => filterOptionsApi.getAll("ageGroup"),
  });

  const { data: ethnicities } = useQuery({
    queryKey: ["/api/filter-options", "ethnicity"],
    queryFn: () => filterOptionsApi.getAll("ethnicity"),
  });

  const { data: genders } = useQuery({
    queryKey: ["/api/filter-options", "gender"],
    queryFn: () => filterOptionsApi.getAll("gender"),
  });

  const { data: opportunityTypes, isLoading: opportunityTypesLoading, error: opportunityTypesError } = useQuery({
    queryKey: ["/api/filter-options", "opportunityType"],
    queryFn: () => filterOptionsApi.getAll("opportunityType"),
  });

  // Debug logging for opportunity types
  console.log("Opportunity types data:", opportunityTypes);
  console.log("Opportunity types loading:", opportunityTypesLoading);
  console.log("Opportunity types error:", opportunityTypesError);

  // Get schools for users who can manage all users
  const { data: schools } = useQuery({
    queryKey: ["/api/schools"],
    queryFn: () => schoolsApi.getAll(),
    enabled: user?.permissions?.canManageUsers,
  });

  // Form definition
  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunityFormSchema),
    defaultValues: {
      title: "",
      organization: "",
      description: "",
      details: "",
      requirements: "",
      applicationProcess: "",
      imageUrl: "",
      dateRange: {
        from: undefined,
        to: undefined,
      },
      applicationDeadline: undefined,
      location: "",
      isVirtual: false,
      opportunityType: "",
      compensation: "",
      industry: "",
      ageGroup: [],
      ethnicityFocus: "",
      genderFocus: "",
      contactPerson: "",
      contactEmail: "",
      externalUrl: "",
      isGlobal: false,
      schoolId: user?.schoolId ?? undefined,
      visibleToSchools: [],
    },
  });

  // If editing, fetch opportunity data
  const { data: opportunityData, isLoading: isLoadingOpportunity } = useQuery({
    queryKey: [`/api/opportunities/${opportunityId}`],
    queryFn: () => opportunitiesApi.getById(opportunityId!),
    enabled: !!opportunityId,
  });

  // For edit mode, always allow updates
  useEffect(() => {
    // Simplify the state tracking - always allow updates in edit mode
    if (isEditMode) {
      setFormChanged(true);
    }

    // For debugging purposes
    const subscription = form.watch((formData, { name }) => {
      if (name && isEditMode) {
        console.log(`Field changed: ${name}, new value:`, form.getValues(name));
      }
    });

    return () => subscription.unsubscribe();
  }, [form, isEditMode]);

  // Set form values when editing - only run once when data is first loaded
  useEffect(() => {
    if (opportunityData && isEditMode && !form.formState.isDirty) {
      // Parse dates
      const startDate = new Date(opportunityData.startDate);
      const endDate = new Date(opportunityData.endDate);
      const applicationDeadline = new Date(opportunityData.applicationDeadline);

      // Set selected schools
      if (opportunityData.visibleToSchools) {
        setSelectedSchools(opportunityData.visibleToSchools);
      }

      // Ensure empty string values are properly handled
      const formattedData = {
        ...opportunityData,
        dateRange: {
          from: startDate,
          to: endDate,
        },
        applicationDeadline,
        // Ensure optional text fields have empty strings instead of null/undefined
        ethnicityFocus: opportunityData.ethnicityFocus || "",
        genderFocus: opportunityData.genderFocus || "",
        contactPerson: opportunityData.contactPerson || "",
        contactEmail: opportunityData.contactEmail || "",
        externalUrl: opportunityData.externalUrl || "",
        imageUrl: opportunityData.imageUrl || "",
        details: opportunityData.details || "",
        requirements: opportunityData.requirements || "",
        applicationProcess: opportunityData.applicationProcess || "",
        compensation: opportunityData.compensation || "",
        // Handle age group array format
        ageGroup: Array.isArray(opportunityData.ageGroup)
          ? opportunityData.ageGroup
          : [opportunityData.ageGroup].filter(Boolean),
        location: opportunityData.location || "",
        // Ensure single-choice dropdowns are properly set
        opportunityType: opportunityData.opportunityType || "",
        industry: opportunityData.industry || "",
      };
      console.log(`Setting form data - Industry: ${opportunityData.industry}, OpportunityType: ${opportunityData.opportunityType}`);

      // Use setValue instead of reset to avoid clearing form state
      Object.entries(formattedData).forEach(([key, value]) => {
        form.setValue(key as any, value);
      });

      console.log("Form values set individually to preserve selections");
    }
  }, [opportunityData, isEditMode, form]);

  // Additional effect to ensure dropdown values stick when filter data loads
  useEffect(() => {
    if (opportunityData && isEditMode && (industries || opportunityTypes)) {
      // Re-set dropdown values when filter options become available
      if (opportunityData.industry && industries) {
        form.setValue("industry", opportunityData.industry);
        console.log(`Re-setting industry to: ${opportunityData.industry}`);
      }
      if (opportunityData.opportunityType && opportunityTypes) {
        form.setValue("opportunityType", opportunityData.opportunityType);
        console.log(`Re-setting opportunityType to: ${opportunityData.opportunityType}`);
      }
    }
  }, [industries, opportunityTypes, opportunityData, isEditMode, form]);

  // Create/Update mutation with enhanced error handling
  const mutation = useMutation({
    mutationFn: (values: OpportunityFormValues) => {
      // Transform date range back to individual dates for API
      const formattedValues = {
        ...values,
        startDate: values.dateRange.from,
        endDate: values.dateRange.to,
        applicationDeadline: values.applicationDeadline,
        // Remove dateRange from the final payload as API expects individual dates
        dateRange: undefined,
      };

      // Add visibleToSchools from state
      const data = {
        ...formattedValues,
        visibleToSchools: selectedSchools,
      };

      console.log("Submitting data:", data);

      if (isEditMode && opportunityId) {
        return opportunitiesApi.update(opportunityId, data);
      } else {
        return opportunitiesApi.create(data);
      }
    },
    onSuccess: () => {
      // Immediately invalidate the opportunities list to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });

      // Log successful update
      console.log(
        `✅ Opportunity ${isEditMode ? "updated" : "created"} successfully at ${new Date().toISOString()}`,
      );

      // Show success notification popup in bottom right corner
      toast({
        title: isEditMode
          ? "🎉 Opportunity Updated Successfully!"
          : "🎉 Opportunity Created Successfully!",
        description: isEditMode
          ? "Your opportunity has been updated and is now live for students to view."
          : "Your opportunity has been created and is now live for students to view.",
        variant: "default",
        duration: 4000,
        className:
          "fixed bottom-4 right-4 w-96 bg-green-50 border-green-200 text-green-800",
      });

      // Handle custom success callback or redirect
      if (onSuccess) {
        onSuccess();
      } else {
        // Add a small delay before redirect to ensure the toast is visible
        setTimeout(() => {
          setLocation("/opportunities");
        }, 2000);
      }
    },
    onError: (error: any) => {
      console.error("Error with opportunity:", error);

      // Enhanced error handling with specific messages
      let errorMessage = "Please check your information and try again.";
      let errorTitle = `❌ ${isEditMode ? "Update" : "Creation"} Failed`;

      if (
        error?.message?.includes("403") ||
        error?.message?.includes("permission")
      ) {
        errorTitle = "🚫 Permission Denied";
        errorMessage =
          "You can only edit opportunities that you created yourself. If this is your opportunity, please try logging in again.";
      } else if (error?.message?.includes("401")) {
        errorTitle = "🔐 Authentication Required";
        errorMessage = "Please log in again to continue.";
      } else if (
        error?.message?.includes("validation") ||
        error?.message?.includes("400")
      ) {
        // Parse validation errors for user-friendly messages
        if (
          error?.message?.includes("startDate") ||
          error?.message?.includes("endDate")
        ) {
          errorMessage =
            "Please select both start and end dates for the opportunity.";
        } else if (error?.message?.includes("ageGroup")) {
          errorMessage = "Please select at least one age group.";
        } else if (error?.message?.includes("applicationDeadline")) {
          errorMessage = "Please select an application deadline.";
        } else {
          errorMessage = "Please fill in all required fields correctly.";
        }
      } else if (error?.message?.includes("network")) {
        errorMessage =
          "Network error. Please check your connection and try again.";
      }

      // Show error notification popup
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 6000,
      });
    },
  });

  // Enhanced form submission with validation feedback
  const handleSubmit = async (values: OpportunityFormValues) => {
    console.log("🚀 CREATE OPPORTUNITY BUTTON CLICKED!");
    console.log("Form submission started at:", new Date().toISOString());
    console.log("Form values received:", values);
    console.log("Form state:", {
      isValid: form.formState.isValid,
      isDirty: form.formState.isDirty,
      isSubmitting: form.formState.isSubmitting,
      errors: form.formState.errors,
    });
    console.log("Selected schools:", selectedSchools);
    console.log("Is edit mode:", isEditMode);
    console.log("Opportunity ID:", opportunityId);

    try {
      // Check for form validation errors
      const formErrors = form.formState.errors;

      if (Object.keys(formErrors).length > 0) {
        console.log("❌ FORM VALIDATION ERRORS DETECTED:", formErrors);

        // Find the first field with an error and scroll to it
        const firstErrorField = Object.keys(formErrors)[0];
        const errorElement = document.querySelector(
          `[name="${firstErrorField}"]`,
        );

        if (errorElement) {
          errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
          // Add visual emphasis to the error field
          errorElement.classList.add("ring-2", "ring-red-500", "animate-pulse");
          setTimeout(() => {
            errorElement.classList.remove(
              "ring-2",
              "ring-red-500",
              "animate-pulse",
            );
          }, 3000);
        }

        // Show validation error notification
        toast({
          title: "⚠️ Missing Required Fields",
          description: `Please fill in all required fields marked with an asterisk (*). ${Object.keys(formErrors).length} field(s) need attention.`,
          variant: "destructive",
          duration: 5000,
        });

        return;
      }

      // Validate date range
      if (!values.dateRange?.from || !values.dateRange?.to) {
        toast({
          title: "⚠️ Missing Date Range",
          description:
            "Please select both start and end dates for the opportunity.",
          variant: "destructive",
          duration: 5000,
        });
        return;
      }

      const { dateRange, ...restValues } = values;
      const submissionData = {
        ...restValues,
        // Transform dateRange to startDate and endDate for backend compatibility
        startDate: values.dateRange.from.toISOString().split('T')[0],
        endDate: values.dateRange.to.toISOString().split('T')[0],
        // Transform applicationDeadline to ISO date string
        applicationDeadline: values.applicationDeadline.toISOString().split('T')[0],
        visibleToSchools: selectedSchools,
      };

      // Log for debugging
      console.log(
        "Submitting opportunity data:",
        isEditMode ? "UPDATE" : "CREATE",
        submissionData,
      );

      if (customSubmit) {
        // Use the custom submit handler from props
        await customSubmit(submissionData);
      } else {
        // Use the default mutation
        console.log("📤 Calling mutation.mutate with data:", submissionData);
        console.log("Mutation state before calling:", {
          isPending: mutation.isPending,
          isError: mutation.isError,
          error: mutation.error,
        });
        mutation.mutate(submissionData);
        console.log("✅ Mutation.mutate called successfully");
      }
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: "❌ Submission Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  // Handle school selection
  const handleSchoolSelection = (schoolId: number) => {
    setSelectedSchools((prev) =>
      prev.includes(schoolId)
        ? prev.filter((id) => id !== schoolId)
        : [...prev, schoolId],
    );
  };

  if (isLoadingOpportunity) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading opportunity data...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditMode ? "Edit Opportunity" : "Create New Opportunity"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-8"
          >
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title*</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Summer Tech Internship Program"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="organization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization*</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. TechCorp, Inc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="mt-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description*</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief description of the opportunity"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="mt-4">
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="URL for opportunity image"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter a URL for an image that represents this
                        opportunity
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Dates and Location */}
            <div>
              <h3 className="text-lg font-medium mb-4">Dates and Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="dateRange"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Opportunity Date Range*</FormLabel>
                      <FormControl>
                        <DateRangePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select start and end dates"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="applicationDeadline"
                  render={({ field }) => {
                    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
                    const dateRange = form.watch("dateRange");

                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Application Deadline*</FormLabel>
                        <Popover
                          open={isCalendarOpen}
                          onOpenChange={setIsCalendarOpen}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                                setIsCalendarOpen(false); // Auto-close after selection
                              }}
                              defaultMonth={field.value || new Date()}
                              disabled={(date) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);

                                // Disable dates before today
                                if (date < today) return true;

                                // If date range is set, disable dates after start date
                                if (dateRange?.from && date > dateRange.from) {
                                  return true;
                                }

                                return false;
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <FormField
                  control={form.control}
                  name="isVirtual"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Virtual Opportunity
                        </FormLabel>
                        <FormDescription>
                          Is this a virtual/remote opportunity?
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Location{!form.watch("isVirtual") ? "*" : ""}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={
                            form.watch("isVirtual")
                              ? "Virtual opportunity - location not required"
                              : "e.g. San Francisco, CA"
                          }
                          disabled={form.watch("isVirtual")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Categories and Classification */}
            <div>
              <h3 className="text-lg font-medium mb-4">
                Categories and Classification
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry*</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {industriesLoading ? (
                            <div className="p-2 text-sm text-gray-500">Loading industries...</div>
                          ) : industriesError ? (
                            <div className="p-2 text-sm text-red-500">Error loading industries</div>
                          ) : !industries || industries.length === 0 ? (
                            <div className="p-2 text-sm text-gray-500">No industries available</div>
                          ) : (
                            industries.map((option: FilterOption) => (
                              <SelectItem key={option.id} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ageGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age Group*</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between",
                                !field.value?.length && "text-muted-foreground",
                              )}
                            >
                              {field.value?.length
                                ? `${field.value.length} age group${field.value.length > 1 ? "s" : ""} selected`
                                : "Select age groups"}
                              <CalendarIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <div className="max-h-60 overflow-auto">
                            {ageGroups?.map((option: FilterOption) => (
                              <div
                                key={option.id}
                                className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer"
                                onClick={() => {
                                  const currentValues = field.value || [];
                                  const isSelected = currentValues.includes(
                                    option.value,
                                  );

                                  if (isSelected) {
                                    field.onChange(
                                      currentValues.filter(
                                        (v) => v !== option.value,
                                      ),
                                    );
                                  } else {
                                    field.onChange([
                                      ...currentValues,
                                      option.value,
                                    ]);
                                  }
                                }}
                              >
                                <Checkbox
                                  checked={
                                    field.value?.includes(option.value) || false
                                  }
                                />
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                  {option.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="opportunityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opportunity Type*</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select opportunity type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {opportunityTypesLoading ? (
                            <div className="p-2 text-sm text-gray-500">Loading opportunity types...</div>
                          ) : opportunityTypesError ? (
                            <div className="p-2 text-sm text-red-500">Error loading opportunity types</div>
                          ) : !opportunityTypes || opportunityTypes.length === 0 ? (
                            <div className="p-2 text-sm text-gray-500">No opportunity types available</div>
                          ) : (
                            opportunityTypes.map((option: FilterOption) => (
                              <SelectItem key={option.id} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="compensation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compensation</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. $15/hour, Unpaid, College Credit"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ethnicityFocus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ethnicity Focus</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select ethnicity focus (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">
                            No specific focus
                          </SelectItem>
                          {ethnicities?.map((option: FilterOption) => (
                            <SelectItem key={option.id} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="genderFocus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender Focus</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender focus (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">
                            No specific focus
                          </SelectItem>
                          {genders?.map((option: FilterOption) => (
                            <SelectItem key={option.id} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Contact and External Links */}
            <div>
              <h3 className="text-lg font-medium mb-4">
                Contact and External Links
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. John Smith, Internship Coordinator"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. internships@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="externalUrl"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>External URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. https://example.com/apply"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Link to external website with more information or
                        application
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Detailed Information (Optional) */}
            <div>
              <h3 className="text-lg font-medium mb-4">
                Detailed Information (Optional)
              </h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="details"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What You'll Learn</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detailed information about the learning objectives"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requirements</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Requirements for applicants"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="applicationProcess"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Application Process</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Steps to apply for this opportunity"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Visibility Settings - Only for superadmin */}
            {user?.permissions?.canEditAllOpportunities && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-medium mb-4">
                    Visibility Settings
                  </h3>

                  <FormField
                    control={form.control}
                    name="isGlobal"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mb-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Global Visibility
                          </FormLabel>
                          <FormDescription>
                            Make this opportunity visible to all schools
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {!form.watch("isGlobal") && (
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="schoolId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary School</FormLabel>
                            <Select
                              onValueChange={(value) =>
                                field.onChange(parseInt(value))
                              }
                              defaultValue={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select primary school" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {schools?.map((school: School) => (
                                  <SelectItem
                                    key={school.id}
                                    value={school.id.toString()}
                                  >
                                    {school.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              School that owns this opportunity
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div>
                        <FormLabel>Additional Visible Schools</FormLabel>
                        <FormDescription className="mb-2">
                          Select additional schools that can see this
                          opportunity
                        </FormDescription>
                        <div className="max-h-[200px] overflow-y-auto border rounded-md p-2">
                          {schools?.map((school: School) => (
                            <div
                              key={school.id}
                              className="flex items-center space-x-2 mb-2"
                            >
                              <Checkbox
                                id={`school-${school.id}`}
                                checked={selectedSchools.includes(school.id)}
                                onCheckedChange={() =>
                                  handleSchoolSelection(school.id)
                                }
                                disabled={school.id === form.watch("schoolId")}
                              />
                              <label
                                htmlFor={`school-${school.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {school.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/opportunities")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="bg-primary hover:bg-primary/90"
                onClick={() => {
                  console.log("🔘 SUBMIT BUTTON CLICKED!");
                  console.log("Button state:", {
                    disabled: mutation.isPending,
                    isEditMode,
                    formIsValid: form.formState.isValid,
                    hasErrors: Object.keys(form.formState.errors).length > 0,
                  });
                }}
              >
                {mutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditMode ? "Update Opportunity" : "Create Opportunity"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
