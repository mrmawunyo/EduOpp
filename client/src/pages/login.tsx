import { useState } from "react";
import { useLocation, Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import classroomSvg from "../assets/classroom.svg";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      // Use the AuthProvider's login function
      const success = await login(values.email, values.password);
      
      if (success) {
        // Add a small delay to ensure user state is updated before redirect
        setTimeout(() => {
          setLocation("/dashboard");
        }, 100);
      }
    } catch (error) {
      console.error("Login error:", error);
      // Toast will be handled by the AuthProvider
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="flex w-full max-w-4xl shadow-xl rounded-lg overflow-hidden">
        {/* Left side - classroom image */}
        <div className="hidden md:flex md:w-1/2 bg-primary/10 items-center justify-center p-6">
          <div className="w-full h-full rounded-lg overflow-hidden">
            <img 
              src={classroomSvg} 
              alt="Classroom illustration" 
              className="w-full h-auto object-cover" 
            />
            <div className="mt-4 text-center">
              <h2 className="font-bold text-xl text-primary">Connecting Students to Opportunities</h2>
              <p className="text-gray-600 mt-2">Explore career paths and find your future</p>
            </div>
          </div>
        </div>
        
        {/* Right side - login form */}
        <Card className="flex-1 border-0 shadow-none">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Career Opportunities Platform
            </CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="your.email@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-0">
            <Separator />
            <div className="w-full flex flex-col space-y-2 text-sm text-center">
              <Link href="/forgot-password" className="text-primary hover:underline">
                Forgot your password?
              </Link>
              <Link href="/register" className="text-primary hover:underline">
                Register as a new teacher
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}