'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, GraduationCap } from 'lucide-react';

// Default district ID from seed data
const DEFAULT_DISTRICT_ID = 'lincoln-unified';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('admin@lincoln.schoolos.dev');
  const [password, setPassword] = useState('SchoolOS2025!');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // First, we need to get the district ID from the slug
      // For now, we'll fetch districts and find by domain
      const districtResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/health`
      );
      
      if (!districtResponse.ok) {
        throw new Error('API is not reachable');
      }

      // Get all districts and find Lincoln
      // For simplicity, we'll use the database directly via a special endpoint
      // Since we don't have a district lookup endpoint, we'll pass the slug
      // The backend will need to handle this
      
      await login(email, password, DEFAULT_DISTRICT_ID);
      toast.success('Welcome to SchoolOS!');
      router.push('/dashboard');
    } catch (error: unknown) {
      console.error('Login error:', error);
      const message = error instanceof Error ? error.message : 'Invalid email or password';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to SchoolOS</CardTitle>
          <CardDescription>
            Sign in to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@lincoln.schoolos.dev"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium text-muted-foreground mb-2">Demo Credentials:</p>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Admin:</span> admin@lincoln.schoolos.dev</p>
              <p><span className="font-medium">Teacher:</span> jennifer.smith@lincoln.schoolos.dev</p>
              <p><span className="font-medium">Parent:</span> robert.davis@lincoln.schoolos.dev</p>
              <p><span className="font-medium">Password:</span> SchoolOS2025!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
