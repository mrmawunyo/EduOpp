import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

const systemSettingsSchema = z.object({
  siteName: z.string().min(1, { message: "Site name is required" }),
  contactEmail: z.string().email({ message: "Invalid email address" }),
  enableRegistration: z.boolean(),
  enableNotifications: z.boolean(),
  studentRegistrationRequiresApproval: z.boolean(),
  defaultOpportunityVisibility: z.enum(["school", "public"]),
  maxUploadSizeMB: z.coerce.number().positive(),
  defaultLocale: z.string(),
});

type SystemSettingsFormValues = z.infer<typeof systemSettingsSchema>;

const filterOptionsSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  category: z.string().min(1, { message: "Category is required" }),
  isDefault: z.boolean().optional(),
});

type FilterOptionFormValues = z.infer<typeof filterOptionsSchema>;

export default function SystemSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingFilter, setIsCreatingFilter] = useState(false);
  const [filterOptions, setFilterOptions] = useState<any[]>([]);

  // General settings form
  const systemForm = useForm<SystemSettingsFormValues>({
    resolver: zodResolver(systemSettingsSchema),
    defaultValues: {
      siteName: "Career Opportunities Platform",
      contactEmail: "admin@example.com",
      enableRegistration: true,
      enableNotifications: true,
      studentRegistrationRequiresApproval: true,
      defaultOpportunityVisibility: "school",
      maxUploadSizeMB: 10,
      defaultLocale: "en-US",
    },
  });

  // Filter option form
  const filterForm = useForm<FilterOptionFormValues>({
    resolver: zodResolver(filterOptionsSchema),
    defaultValues: {
      name: "",
      category: "",
      isDefault: false,
    },
  });

  // Fetch system settings
  useEffect(() => {
    // For demonstration, we'll use mock data
    // In a real app, this would be fetched from the API
    setFilterOptions([
      { id: 1, name: "Full-time", category: "Employment Type", isDefault: true },
      { id: 2, name: "Part-time", category: "Employment Type", isDefault: false },
      { id: 3, name: "Technology", category: "Industry", isDefault: false },
      { id: 4, name: "Healthcare", category: "Industry", isDefault: false },
      { id: 5, name: "Finance", category: "Industry", isDefault: false },
      { id: 6, name: "Remote", category: "Location", isDefault: false },
      { id: 7, name: "On-site", category: "Location", isDefault: true },
    ]);
  }, []);

  const onSystemSubmit = (values: SystemSettingsFormValues) => {
    setIsSubmitting(true);
    // In a real app, this would be an API call
    setTimeout(() => {
      console.log("System settings:", values);
      toast({
        title: "Settings saved",
        description: "Your system settings have been updated successfully",
      });
      setIsSubmitting(false);
    }, 1000);
  };

  const onFilterSubmit = (values: FilterOptionFormValues) => {
    setIsCreatingFilter(true);
    // In a real app, this would be an API call
    setTimeout(() => {
      const newOption = {
        id: Math.floor(Math.random() * 1000),
        ...values,
      };
      setFilterOptions([...filterOptions, newOption]);
      filterForm.reset({
        name: "",
        category: "",
        isDefault: false,
      });
      toast({
        title: "Filter option created",
        description: `Successfully created ${values.name} filter option`,
      });
      setIsCreatingFilter(false);
    }, 1000);
  };

  const deleteFilterOption = (id: number) => {
    // In a real app, this would be an API call
    setFilterOptions(filterOptions.filter(option => option.id !== id));
    toast({
      title: "Filter option deleted",
      description: "Filter option has been deleted successfully",
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-2xl font-bold">System Settings</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="filters">Filter Options</TabsTrigger>
        </TabsList>
        
        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General System Settings</CardTitle>
              <CardDescription>
                Configure your platform's core settings and functionality.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...systemForm}>
                <form onSubmit={systemForm.handleSubmit(onSystemSubmit)} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={systemForm.control}
                      name="siteName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Site Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            The name of your platform displayed to users
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={systemForm.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            System emails will be sent from this address
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={systemForm.control}
                      name="enableRegistration"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">User Registration</FormLabel>
                            <FormDescription>
                              Allow new users to register themselves on the platform
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={systemForm.control}
                      name="enableNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Email Notifications</FormLabel>
                            <FormDescription>
                              Send email notifications for important events
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={systemForm.control}
                      name="studentRegistrationRequiresApproval"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Student Approval</FormLabel>
                            <FormDescription>
                              Require admin approval for student registrations
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={systemForm.control}
                      name="maxUploadSizeMB"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Upload Size (MB)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormDescription>
                            Maximum file size for document uploads
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Filter Options Tab */}
        <TabsContent value="filters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filter Options</CardTitle>
              <CardDescription>
                Manage the filter options available for opportunities across the platform.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Create Filter Option Form */}
                <Form {...filterForm}>
                  <form onSubmit={filterForm.handleSubmit(onFilterSubmit)} className="space-y-4 border p-4 rounded-lg">
                    <h3 className="text-lg font-medium">Add New Filter Option</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={filterForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Remote, Full-time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={filterForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Location, Employment Type" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={filterForm.control}
                        name="isDefault"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-start gap-2 pt-8">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Default option</FormLabel>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Button type="submit" disabled={isCreatingFilter}>
                      {isCreatingFilter ? "Adding..." : "Add Filter Option"}
                    </Button>
                  </form>
                </Form>
                
                {/* Filter Options List */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Existing Filter Options</h3>
                  
                  <div className="border rounded-md">
                    <div className="grid grid-cols-12 gap-2 p-3 bg-muted font-medium">
                      <div className="col-span-4">Name</div>
                      <div className="col-span-3">Category</div>
                      <div className="col-span-3">Default</div>
                      <div className="col-span-2">Actions</div>
                    </div>
                    
                    {filterOptions.map((option) => (
                      <div key={option.id} className="grid grid-cols-12 gap-2 p-3 border-t">
                        <div className="col-span-4">{option.name}</div>
                        <div className="col-span-3">{option.category}</div>
                        <div className="col-span-3">
                          {option.isDefault ? "Yes" : "No"}
                        </div>
                        <div className="col-span-2">
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => deleteFilterOption(option.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {filterOptions.length === 0 && (
                      <div className="p-4 text-center text-muted-foreground">
                        No filter options created yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}