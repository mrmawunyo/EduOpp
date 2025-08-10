import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { usersApi, preferencesApi } from '@/lib/api';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { 
  Search, 
  Plus, 
  ChevronRight, 
  Mail, 
  Check, 
  X,
  Loader2,
  Filter,
  Download
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

// Define schema for student creation
const createStudentSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string(),
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().min(1, { message: 'Last name is required' }),
  role: z.literal('student'),
  schoolId: z.number().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type CreateStudentFormValues = z.infer<typeof createStudentSchema>;

// Define schema for filtering
const filterSchema = z.object({
  searchTerm: z.string().optional(),
  schoolId: z.number().optional(),
});

type FilterValues = z.infer<typeof filterSchema>;

export default function Students() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>('all');
  const [filters, setFilters] = useState<FilterValues>({
    searchTerm: '',
    schoolId: user?.schoolId || undefined,
  });
  const [studentDetailsId, setStudentDetailsId] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Create form
  const form = useForm<CreateStudentFormValues>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      role: 'student',
      schoolId: user?.schoolId,
    },
  });

  // Filters form
  const filterForm = useForm<FilterValues>({
    defaultValues: filters,
  });

  // Fetch students based on user role
  const { 
    data: students, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['/api/users/school', filters.schoolId, 'student'],
    queryFn: () => usersApi.getBySchool(filters.schoolId || user?.schoolId || 0, 'student'),
    enabled: !!user?.schoolId || user?.permissions?.canEditAllOpportunities,
  });

  // Fetch student details
  const {
    data: studentDetails,
    isLoading: isLoadingDetails,
  } = useQuery({
    queryKey: ['/api/student-preferences', studentDetailsId],
    queryFn: () => preferencesApi.get(studentDetailsId || undefined),
    enabled: !!studentDetailsId && showDetails,
  });

  // Create student mutation
  const createStudentMutation = useMutation({
    mutationFn: (values: CreateStudentFormValues) => usersApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/school'] });
      toast({
        title: 'Student created',
        description: 'The student account has been created successfully',
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create student: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  // Handle create form submission
  const onSubmit = (values: CreateStudentFormValues) => {
    createStudentMutation.mutate(values);
  };

  // Handle filter submission
  const onFilterSubmit = (values: FilterValues) => {
    setFilters(values);
  };

  // Handle view student details
  const handleViewStudentDetails = (studentId: number) => {
    setStudentDetailsId(studentId);
    setShowDetails(true);
  };

  // Filter students based on search term and tab
  const filteredStudents = students ? students.filter(student => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const email = student.email.toLowerCase();
    const username = student.username.toLowerCase();
    const searchMatch = !filters.searchTerm || 
      fullName.includes(filters.searchTerm.toLowerCase()) ||
      email.includes(filters.searchTerm.toLowerCase()) ||
      username.includes(filters.searchTerm.toLowerCase());

    // Apply tab filtering
    if (selectedTab === 'all') return searchMatch;
    if (selectedTab === 'active') return searchMatch && student.isActive;
    if (selectedTab === 'inactive') return searchMatch && !student.isActive;
    
    return searchMatch;
  }) : [];

  // Export students to CSV
  const exportStudents = () => {
    if (!filteredStudents || filteredStudents.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no students matching your filters',
        variant: 'destructive',
      });
      return;
    }

    // Create CSV content
    const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Username', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredStudents.map(student => 
        [
          student.id, 
          student.firstName, 
          student.lastName, 
          student.email, 
          student.username, 
          student.isActive ? 'Active' : 'Inactive'
        ].join(',')
      )
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'students.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-6">
      <PageHeader 
        title="Students"
        description="Manage and view student accounts"
        action={{
          label: "Add Student",
          icon: <Plus className="h-4 w-4" />,
          onClick: () => setIsCreateDialogOpen(true)
        }}
      />

      {/* Filter and search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form 
            onSubmit={filterForm.handleSubmit(onFilterSubmit)}
            className="flex flex-col sm:flex-row gap-4 items-end"
          >
            <div className="flex-1">
              <FormLabel htmlFor="searchTerm" className="text-sm font-medium">Search</FormLabel>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="searchTerm"
                  placeholder="Search by name, email, or username"
                  className="pl-8"
                  {...filterForm.register('searchTerm')}
                />
              </div>
            </div>

            {user?.permissions?.canEditAllOpportunities && (
              <div className="w-full sm:w-[200px]">
                <FormLabel htmlFor="schoolId" className="text-sm font-medium">School</FormLabel>
                <Select 
                  onValueChange={(value) => filterForm.setValue('schoolId', parseInt(value))}
                  defaultValue={String(user.schoolId || '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select school" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Schools</SelectItem>
                    {/* Schools would be dynamically loaded here */}
                    <SelectItem value="1">Westfield High School</SelectItem>
                    <SelectItem value="2">East Valley College</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" variant="outline" size="icon" className="h-10 w-10">
                <Filter className="h-4 w-4" />
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="icon" 
                className="h-10 w-10"
                onClick={exportStudents}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabs and student list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Student Accounts</CardTitle>
            <Badge variant="outline">{filteredStudents?.length || 0} students</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" onValueChange={setSelectedTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Students</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="inactive">Inactive</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-0">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-destructive">Error loading students</p>
                  <Button 
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/users/school'] })} 
                    className="mt-4"
                  >
                    Retry
                  </Button>
                </div>
              ) : filteredStudents && filteredStudents.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                {student.profilePicture ? (
                                  <AvatarImage src={student.profilePicture} alt={`${student.firstName} ${student.lastName}`} />
                                ) : (
                                  <AvatarFallback>
                                    {student.firstName[0]}
                                    {student.lastName[0]}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <span className="font-medium">{student.firstName} {student.lastName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span>{student.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>{student.username}</TableCell>
                          <TableCell>
                            {student.isActive ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <Check className="h-3 w-3 mr-1" /> Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                <X className="h-3 w-3 mr-1" /> Inactive
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => handleViewStudentDetails(student.id)}
                            >
                              Details <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No students found</p>
                  <Button 
                    className="mt-4 bg-primary text-white" 
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    Add your first student
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Student Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>
              Create a new student account in the system
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john.doe@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input placeholder="********" type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input placeholder="********" type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {user?.permissions?.canEditAllOpportunities && (
                <FormField
                  control={form.control}
                  name="schoolId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a school" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* Schools would be dynamically loaded here */}
                          <SelectItem value="1">Westfield High School</SelectItem>
                          <SelectItem value="2">East Valley College</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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
                  disabled={createStudentMutation.isPending}
                >
                  {createStudentMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Student'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Student Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>
              View detailed information about this student
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : studentDetails ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-medium">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">First Name</p>
                    <p>{studentDetails.firstName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Name</p>
                    <p>{studentDetails.lastName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p>{studentDetails.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Username</p>
                    <p>{studentDetails.username || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-medium">Preferences</h3>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Industries</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {studentDetails.industries && studentDetails.industries.length > 0 ? (
                        studentDetails.industries.map((industry, index) => (
                          <Badge key={index} variant="outline" className="bg-neutral-100 dark:bg-gray-700">
                            {industry}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No preferences set</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Age Groups</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {studentDetails.ageGroups && studentDetails.ageGroups.length > 0 ? (
                        studentDetails.ageGroups.map((ageGroup, index) => (
                          <Badge key={index} variant="outline" className="bg-neutral-100 dark:bg-gray-700">
                            {ageGroup}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No preferences set</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Locations</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {studentDetails.locations && studentDetails.locations.length > 0 ? (
                        studentDetails.locations.map((location, index) => (
                          <Badge key={index} variant="outline" className="bg-neutral-100 dark:bg-gray-700">
                            {location}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No preferences set</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Other Preferences</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {studentDetails.ethnicityFocus && studentDetails.ethnicityFocus.length > 0 && (
                        <Badge variant="outline" className="bg-neutral-100 dark:bg-gray-700">
                          Ethnicity: {studentDetails.ethnicityFocus.join(', ')}
                        </Badge>
                      )}
                      {studentDetails.genderFocus && studentDetails.genderFocus.length > 0 && (
                        <Badge variant="outline" className="bg-neutral-100 dark:bg-gray-700">
                          Gender: {studentDetails.genderFocus.join(', ')}
                        </Badge>
                      )}
                      {(!studentDetails.ethnicityFocus || !studentDetails.ethnicityFocus.length) && 
                       (!studentDetails.genderFocus || !studentDetails.genderFocus.length) && (
                        <p className="text-sm text-muted-foreground">No preferences set</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center py-4">No details available for this student</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
