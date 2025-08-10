import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { usersApi, schoolsApi } from "@/lib/api";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Search,
  Plus,
  Check,
  X,
  Edit,
  Trash2,
  User,
  UserCog,
  Loader2,
  Filter,
} from "lucide-react";

// Define schema for user creation
const createUserSchema = z
  .object({
    email: z.string().email({ message: "Invalid email address" }),
    username: z
      .string()
      .min(3, { message: "Username must be at least 3 characters" }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string(),
    firstName: z.string().min(1, { message: "First name is required" }),
    lastName: z.string().min(1, { message: "Last name is required" }),
    roleId: z.number(),
    schoolId: z.number().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type CreateUserFormValues = z.infer<typeof createUserSchema>;

// Define schema for user editing (without password fields)
const editUserSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters" }),
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  roleId: z.number(),
  schoolId: z.number().optional(),
});

type EditUserFormValues = z.infer<typeof editUserSchema>;

// Define schema for filtering
const filterSchema = z.object({
  searchTerm: z.string().optional(),
  role: z
    .enum(["all", "student", "teacher", "moderator", "admin", "superadmin"])
    .default("all"),
  schoolId: z.number().optional(),
});

type FilterValues = z.infer<typeof filterSchema>;

export default function UserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>("all");
  const [filters, setFilters] = useState<FilterValues>({
    searchTerm: "",
    role: "all",
    schoolId: user?.schoolId || undefined,
  });
  const [editingUser, setEditingUser] = useState<any>(null);

  // Create form
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      roleId: 2, // Default to teacher role ID
      schoolId: user?.schoolId,
    },
  });

  // Edit form (uses editUserSchema without password fields)
  const editForm = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      email: "",
      username: "",
      firstName: "",
      lastName: "",
      roleId: 2, // Default to teacher role ID
      schoolId: user?.schoolId,
    },
  });

  // Filters form
  const filterForm = useForm<FilterValues>({
    defaultValues: filters,
  });

  // Fetch users based on school
  const {
    data: users,
    isLoading: isLoadingUsers,
    error: usersError,
  } = useQuery({
    queryKey: ["/api/users/school", filters.schoolId],
    queryFn: () =>
      usersApi.getBySchool(filters.schoolId || user?.schoolId || 0),
    enabled: !!user?.schoolId || user?.permissions?.canEditAllOpportunities,
  });

  // Fetch schools (for superadmin)
  const { data: schools, isLoading: isLoadingSchools } = useQuery({
    queryKey: ["/api/schools"],
    queryFn: schoolsApi.getAll,
    enabled: user?.permissions?.canEditAllOpportunities,
  });

  // Fetch user roles
  const { data: userRoles, isLoading: isLoadingRoles } = useQuery({
    queryKey: ["/api/user-roles"],
    queryFn: usersApi.getRoles,
    enabled: user?.permissions?.canManageUsers,
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (values: CreateUserFormValues) => usersApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/school"] });
      toast({
        title: "User created",
        description: "The user account has been created successfully",
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create user: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Handle create form submission
  const onSubmit = (values: CreateUserFormValues) => {
    createUserMutation.mutate(values);
  };

  // Handle filter submission
  const onFilterSubmit = (values: FilterValues) => {
    setFilters(values);
  };

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EditUserFormValues }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/school"] });
      toast({
        title: "User updated",
        description: "The user has been updated successfully",
      });
      setEditingUser(null);
      editForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update user: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Handle edit user
  const handleEditUser = (userData: any) => {
    setEditingUser(userData);
    editForm.reset({
      email: userData.email,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      roleId: userData.roleId,
      schoolId: userData.schoolId,
    });
  };

  // Handle edit form submission
  const onEditSubmit = (values: EditUserFormValues) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data: values });
    }
  };

  // Filter users based on search term and role
  // Helper function to get user role from user.roleName property (from user_roles.name)
  const getUserRole = (user: any) => {
    return user.roleName || "student";
  };

  // Helper function to get role name by roleId
  const getRoleNameById = (roleId: number) => {
    const role = userRoles?.find((r: any) => r.id === roleId);
    return role?.name || "Unknown";
  };

  const filteredUsers = users
    ? users.filter((user) => {
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        const email = user.email.toLowerCase();
        const username = user.username.toLowerCase();
        const searchMatch =
          !filters.searchTerm ||
          fullName.includes(filters.searchTerm.toLowerCase()) ||
          email.includes(filters.searchTerm.toLowerCase()) ||
          username.includes(filters.searchTerm.toLowerCase());

        const userRole = getUserRole(user);
        const roleMatch = filters.role === "all" || userRole === filters.role;

        // Apply tab filtering
        if (selectedTab === "all") return searchMatch && roleMatch;
        if (selectedTab === "active")
          return searchMatch && roleMatch && user.isActive;
        if (selectedTab === "inactive")
          return searchMatch && roleMatch && !user.isActive;

        return searchMatch && roleMatch;
      })
    : [];

  // Get role badge color
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "superadmin":
        return "destructive";
      case "admin":
        return "default";
      case "teacher":
        return "secondary";
      case "student":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="User Management"
        description="Manage user accounts across the platform"
        action={{
          label: "Create User",
          icon: <Plus className="h-4 w-4" />,
          onClick: () => setIsCreateDialogOpen(true),
        }}
      />

      {/* Filter and search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Form {...filterForm}>
            <form
              onSubmit={filterForm.handleSubmit(onFilterSubmit)}
              className="flex flex-col sm:flex-row gap-4 items-end"
            >
              <div className="flex-1">
                <FormField
                  control={filterForm.control}
                  name="searchTerm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Search</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search by name, email, or username"
                            className="pl-8"
                            {...field}
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="w-full sm:w-[200px]">
                <FormField
                  control={filterForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            <SelectItem value="student">Students</SelectItem>
                            <SelectItem value="teacher">Teachers</SelectItem>
                            <SelectItem value="admin">Admins</SelectItem>
                            {user?.permissions?.canManageUsers && (
                              <SelectItem value="superadmin">
                                Super Admins
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {user?.permissions?.canEditAllOpportunities && (
                <div className="w-full sm:w-[200px]">
                  <FormField
                    control={filterForm.control}
                    name="schoolId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(value) =>
                              field.onChange(
                                value ? parseInt(value) : undefined,
                              )
                            }
                            defaultValue={
                              field.value ? String(field.value) : undefined
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select school" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Schools</SelectItem>
                              {schools?.map((school) => (
                                <SelectItem
                                  key={school.id}
                                  value={String(school.id)}
                                >
                                  {school.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <Button type="submit" className="h-10">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* User list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>User Accounts</CardTitle>
            <Badge variant="outline">{filteredUsers?.length || 0} users</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" onValueChange={setSelectedTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Users</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="inactive">Inactive</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-0">
              {isLoadingUsers ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : usersError ? (
                <div className="text-center py-8">
                  <p className="text-destructive">Error loading users</p>
                  <Button
                    onClick={() =>
                      queryClient.invalidateQueries({
                        queryKey: ["/api/users/school"],
                      })
                    }
                    className="mt-4"
                  >
                    Retry
                  </Button>
                </div>
              ) : filteredUsers && filteredUsers.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((userData) => (
                        <TableRow key={userData.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                {userData.profilePicture ? (
                                  <AvatarImage
                                    src={userData.profilePicture}
                                    alt={`${userData.firstName} ${userData.lastName}`}
                                  />
                                ) : (
                                  <AvatarFallback>
                                    {userData.firstName[0]}
                                    {userData.lastName[0]}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <span className="font-medium">
                                {userData.firstName} {userData.lastName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{userData.email}</TableCell>
                          <TableCell>
                            <Badge
                              variant={getRoleBadgeVariant(
                                getUserRole(userData),
                              )}
                            >
                              {getRoleNameById(userData.roleId)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {userData.isActive ? (
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200"
                              >
                                <Check className="h-3 w-3 mr-1" /> Active
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-red-50 text-red-700 border-red-200"
                              >
                                <X className="h-3 w-3 mr-1" /> Inactive
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {/* Prevent users from editing their own record */}
                              {userData.id !== user?.id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditUser(userData)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {userData.id !== user?.id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                              {userData.id === user?.id && (
                                <span className="text-sm text-muted-foreground px-2 py-1">
                                  Current User
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No users found</p>
                  <Button
                    className="mt-4 bg-primary text-white"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    Create new user
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system with appropriate role and permissions
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
                      <Input
                        placeholder="john.doe@example.com"
                        type="email"
                        {...field}
                      />
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
                        <Input
                          placeholder="********"
                          type="password"
                          {...field}
                        />
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
                        <Input
                          placeholder="********"
                          type="password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingRoles ? (
                          <div className="flex items-center justify-center p-2">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Loading roles...
                          </div>
                        ) : (
                          userRoles?.map((role: any) => (
                            <SelectItem key={role.id} value={String(role.id)}>
                              {role.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      This determines the user's permissions in the system
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {user?.permissions?.canManageAllUsers && (
                <FormField
                  control={form.control}
                  name="schoolId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(parseInt(value))
                        }
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a school" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingSchools ? (
                            <div className="flex items-center justify-center p-2">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Loading schools...
                            </div>
                          ) : (
                            schools?.map((school) => (
                              <SelectItem
                                key={school.id}
                                value={String(school.id)}
                              >
                                {school.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The school this user belongs to
                      </FormDescription>
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
                <Button type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserCog className="mr-2 h-4 w-4" />
                      Create User
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details and permissions
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <Form {...editForm}>
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
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
                    control={editForm.control}
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
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="john.doe@example.com"
                          type="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
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

                <FormField
                  control={editForm.control}
                  name="roleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(parseInt(value))
                        }
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingRoles ? (
                            <div className="flex items-center justify-center p-2">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Loading roles...
                            </div>
                          ) : (
                            userRoles?.map((role: any) => (
                              <SelectItem key={role.id} value={String(role.id)}>
                                {role.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        This determines the user's permissions in the system
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {user?.permissions?.canEditAllOpportunities && (
                  <FormField
                    control={editForm.control}
                    name="schoolId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(parseInt(value))
                          }
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a school" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingSchools ? (
                              <div className="flex items-center justify-center p-2">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Loading schools...
                              </div>
                            ) : (
                              schools?.map((school) => (
                                <SelectItem
                                  key={school.id}
                                  value={String(school.id)}
                                >
                                  {school.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The school this user belongs to
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <DialogFooter className="mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingUser(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    <User className="mr-2 h-4 w-4" />
                    Update User
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
