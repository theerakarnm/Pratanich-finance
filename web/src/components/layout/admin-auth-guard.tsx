import { useAdminAuthStore } from '@/store/admin-auth';
import { useEffect } from 'preact/hooks';
import { navigate } from 'wouter/use-browser-location';

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const { isAuthenticated, user, checkAuth, isLoading } = useAdminAuthStore();

  useEffect(() => {
    // Check authentication status on mount
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isLoading) return;

    console.log('Auth Guard User:', user);

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/auth/login', { replace: true });
      return;
    }

    // Check if user has admin role
    if (user?.role !== 'admin') {
      navigate('/auth/login', { replace: true });
    }
  }, [isAuthenticated, user, navigate, isLoading]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Don't render children until authentication is verified
  if (!isAuthenticated || !user || user.role !== 'admin') {
    return null;
  }

  return <>{children}</>;
}
