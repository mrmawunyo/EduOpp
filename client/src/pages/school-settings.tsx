import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { schoolsApi } from '@/lib/api';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { 
  Building,
  Edit,
  Loader2,
  Plus,
  School,
  Trash2,
  Users
} from 'lucide-react';

// Define schema for school creation/editing
const schoolSchema = z.object({
  name: z.string().min(1, { message: 'School name is required' }),
  description: z.string().optional(),
  logoUrl: z.string().url({ message: 'Invalid URL' }).optional().or(z.literal('')),
});

type SchoolFormValues = z.infer<typeof schoolSchema>;

export default function SchoolSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<any>(null);

  // Create form
  const form = useForm<SchoolFormValues>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      name: '',
      description: '',
      logoUrl: '',
    },
  });

  // Edit form
  const editForm = useForm<SchoolFormValues>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      name: '',
      description: '',
      logoUrl: '',
    },
  });

  // Fetch schools
  const { 
    data: schools, 
    isLoading: isLoadingSchools, 
    error: schoolsError 
  } = useQuery({
    queryKey: ['/api/schools'],
    queryFn: schoolsApi.getAll,
  });

  // Fetch school details (for admin who can only see their own school)
  const {
    data: schoolDetails,
    isLoading: isLoadingSchoolDetails,
  } = useQuery({
    queryKey: ['/api/schools', user?.schoolId],
    queryFn: () => schoolsApi.getById(user?.schoolId || 0),
    enabled: user?.permissions?.canManageSettings && !!user?.schoolId,
  });

  // Create school mutation
  const createSchoolMutation = useMutation({
    mutationFn: (values: SchoolFormValues) => schoolsApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schools'] });
      toast({
        title: 'School created',
        description: 'The school has been created successfully',
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create school: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  // Update school mutation
  const updateSchoolMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SchoolFormValues }) => 
      schoolsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schools'] });
      toast({
        title: 'School updated',
        description: 'The school has been updated successfully',
      });
      setEditingSchool(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update school: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  // Handle create form submission
  const onSubmit = (values: SchoolFormValues) => {
    createSchoolMutation.mutate(values);
  };

  // Handle edit form submission
  const onEditSubmit = (values: SchoolFormValues) => {
    if (!editingSchool) return;
    updateSchoolMutation.mutate({
      id: editingSchool.id,
      data: values,
    });
  };

  // Handle edit school
  const handleEditSchool = (school: any) => {
    setEditingSchool(school);
    editForm.reset({
      name: school.name,
      description: school.description || '',
      logoUrl: school.logoUrl || '',
    });
  };

  // For admin role - only manage their own school
  if (user?.permissions?.canManageUsers && !user?.permissions?.canEditAllOpportunities) {
    return (
      <div className="p-4 md:p-6">
        <PageHeader 
          title="School Settings"
          description="Manage your school's information and settings"
        />

        {isLoadingSchoolDetails ? (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </CardContent>
          </Card>
        ) : schoolDetails ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>School Information</CardTitle>
                <CardDescription>View and edit your school's details</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
                    <FormField
                      control={editForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>School Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Westfield High School" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Brief description of your school" 
                              className="min-h-[100px]" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Provide a brief description of your school
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="logoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Logo URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com/logo.png" {...field} />
                          </FormControl>
                          <FormDescription>
                            URL for your school's logo
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      disabled={updateSchoolMutation.isPending}
                    >
                      {updateSchoolMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Building className="mr-2 h-4 w-4" />
                          Update School
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>School Overview</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center text-center">
                <div className="mb-4">
                  {schoolDetails.logoUrl ? (
                    <img 
                      src={schoolDetails.logoUrl} 
                      alt={schoolDetails.name} 
                      className="h-24 w-24 object-contain"
                    />
                  ) : (
                    <div className="h-24 w-24 bg-primary-light rounded-full flex items-center justify-center">
                      <School className="h-12 w-12 text-white" />
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-medium">{schoolDetails.name}</h3>
                {schoolDetails.description && (
                  <p className="text-sm text-muted-foreground mt-2">{schoolDetails.description}</p>
                )}

                <div className="mt-6 w-full">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm font-medium">School ID</span>
                    <span className="text-sm">{schoolDetails.id}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm font-medium">Created</span>
                    <span className="text-sm">
                      {new Date(schoolDetails.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No school information available</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // For superadmin role - manage all schools
  return (
    <div className="p-4 md:p-6">
      <PageHeader 
        title="School Management"
        description="Manage all schools in the system"
        action={{
          label: "Add School",
          icon: <Plus className="h-4 w-4" />,
          onClick: () => setIsCreateDialogOpen(true)
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>All Schools</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingSchools ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : schoolsError ? (
            <div className="text-center py-8">
              <p className="text-destructive">Error loading schools</p>
              <Button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/schools'] })} 
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          ) : schools && schools.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schools.map((school) => (
                    <TableRow key={school.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            {school.logoUrl ? (
                              <AvatarImage src={school.logoUrl} alt={school.name} />
                            ) : (
                              <AvatarFallback>
                                {school.name.charAt(0)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <p className="font-medium">{school.name}</p>
                            {school.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {school.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{school.id}</TableCell>
                      <TableCell>
                        {new Date(school.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditSchool(school)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No schools found</p>
              <Button 
                className="mt-4 bg-primary text-white" 
                onClick={() => setIsCreateDialogOpen(true)}
              >
                Add your first school
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create School Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New School</DialogTitle>
            <DialogDescription>
              Create a new school in the system
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Westfield High School" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of the school" 
                        className="min-h-[100px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Provide a brief description of the school
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/logo.png" {...field} />
                    </FormControl>
                    <FormDescription>
                      URL for the school's logo
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createSchoolMutation.isPending}
                >
                  {createSchoolMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Building className="mr-2 h-4 w-4" />
                      Create School
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit School Dialog */}
      <Dialog open={!!editingSchool} onOpenChange={(open) => !open && setEditingSchool(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit School</DialogTitle>
            <DialogDescription>
              Update school information
            </DialogDescription>
          </DialogHeader>

          {editingSchool && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Westfield High School" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the school" 
                          className="min-h-[100px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Provide a brief description of the school
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/logo.png" {...field} />
                      </FormControl>
                      <FormDescription>
                        URL for the school's logo
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="mt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setEditingSchool(null)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateSchoolMutation.isPending}
                  >
                    {updateSchoolMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Building className="mr-2 h-4 w-4" />
                        Update School
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
