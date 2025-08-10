import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { newsApi } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { Edit, MessageSquare, Plus, ThumbsUp, Trash2 } from 'lucide-react';

// Form schema for creating/editing news posts
const newsPostSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  content: z.string().min(1, { message: 'Content is required' }),
  imageUrl: z.string().url({ message: 'Invalid URL' }).optional().or(z.literal('')),
  isGlobal: z.boolean().default(false),
});

type NewsPostFormValues = z.infer<typeof newsPostSchema>;

export default function NewsFeed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);

  // Fetch news posts
  const { data: newsPosts, isLoading, error } = useQuery({
    queryKey: ['/api/news'],
    queryFn: newsApi.getAll,
  });

  // Create form
  const createForm = useForm<NewsPostFormValues>({
    resolver: zodResolver(newsPostSchema),
    defaultValues: {
      title: '',
      content: '',
      imageUrl: '',
      isGlobal: false,
    },
  });

  // Edit form
  const editForm = useForm<NewsPostFormValues>({
    resolver: zodResolver(newsPostSchema),
    defaultValues: {
      title: '',
      content: '',
      imageUrl: '',
      isGlobal: false,
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (values: NewsPostFormValues) => newsApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news'] });
      toast({
        title: 'Post created',
        description: 'Your news post has been published successfully',
      });
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create post: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (values: NewsPostFormValues & { id: number }) => {
      const { id, ...data } = values;
      return newsApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news'] });
      toast({
        title: 'Post updated',
        description: 'The news post has been updated successfully',
      });
      setIsEditDialogOpen(false);
      setSelectedPost(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update post: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => newsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news'] });
      toast({
        title: 'Post deleted',
        description: 'The news post has been deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete post: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  // Handle create form submission
  const onCreateSubmit = (values: NewsPostFormValues) => {
    createMutation.mutate(values);
  };

  // Handle edit form submission
  const onEditSubmit = (values: NewsPostFormValues) => {
    if (!selectedPost) return;
    updateMutation.mutate({ ...values, id: selectedPost.id });
  };

  // Handle delete post
  const handleDeletePost = (id: number) => {
    if (window.confirm('Are you sure you want to delete this news post?')) {
      deleteMutation.mutate(id);
    }
  };

  // Handle edit post
  const handleEditPost = (post: any) => {
    setSelectedPost(post);
    editForm.reset({
      title: post.title,
      content: post.content,
      imageUrl: post.imageUrl || '',
      isGlobal: post.isGlobal,
    });
    setIsEditDialogOpen(true);
  };

  // Check if user can edit/delete a post
  const canModifyPost = (post: any) => {
    return user?.permissions?.canEditAllOpportunities || 
           user?.permissions?.canManageUsers || 
           user?.id === post.authorId;
  };

  const isTeacherOrAdmin = user?.permissions?.canCreateOpportunities || user?.permissions?.canManageUsers || user?.permissions?.canEditAllOpportunities;

  return (
    <div className="p-4 md:p-6">
      <PageHeader 
        title="News Feed"
        description="The latest news and announcements from teachers and admins"
        action={isTeacherOrAdmin ? {
          label: "Create Post",
          icon: <Plus className="h-4 w-4" />,
          onClick: () => setIsCreateDialogOpen(true)
        } : undefined}
      />

      {/* News Posts */}
      <div className="max-w-3xl mx-auto mt-6">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive dark:text-red-400 text-center">Error loading news posts</p>
            </CardContent>
          </Card>
        ) : newsPosts && newsPosts.length > 0 ? (
          <div className="space-y-6">
            {newsPosts.map((post: any) => (
              <Card key={post.id} className="overflow-hidden">
                {post.imageUrl && (
                  <div className="w-full h-48 overflow-hidden">
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{post.title}</CardTitle>
                    {post.isGlobal && (
                      <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                        Global
                      </span>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="flex items-center mb-4">
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarFallback>
                        {post.author?.firstName?.[0] || 'U'}
                        {post.author?.lastName?.[0] || ''}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {post.author?.firstName} {post.author?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(post.createdAt), 'MMMM d, yyyy • h:mm a')}
                      </p>
                    </div>
                  </div>
                  
                  <p className="whitespace-pre-line">{post.content}</p>
                </CardContent>
                
                <CardFooter className="border-t p-4 flex justify-between">
                  <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      <span>{post.likes || 0}</span>
                    </Button>
                  </div>
                  
                  {canModifyPost(post) && (
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEditPost(post)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeletePost(post.id)}
                        className="text-destructive hover:text-destructive/90"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">No news posts yet</p>
              {isTeacherOrAdmin && (
                <Button 
                  className="mt-4 bg-primary text-white" 
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  Create the first post
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Post Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create News Post</DialogTitle>
            <DialogDescription>
              Share news, announcements, or updates with students and teachers
            </DialogDescription>
          </DialogHeader>

          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter post title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Write your post content here..." 
                        className="min-h-[150px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/image.jpg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {user?.permissions?.canEditAllOpportunities && (
                <FormField
                  control={createForm.control}
                  name="isGlobal"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Global Post</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Make this post visible to all schools
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Publishing...' : 'Publish Post'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Post Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit News Post</DialogTitle>
            <DialogDescription>
              Update your news post content
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter post title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Write your post content here..." 
                        className="min-h-[150px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/image.jpg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {user?.permissions?.canEditAllOpportunities && (
                <FormField
                  control={editForm.control}
                  name="isGlobal"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Global Post</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Make this post visible to all schools
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Updating...' : 'Update Post'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
