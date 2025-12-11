import { useState, useEffect } from 'preact/hooks';
import liff from '@line/liff';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';

import { useLiffStore } from '@/store';
import { getClientByLineUserId, ApiError } from '@/lib/api-client';

export function LiffClient() {
  const { initLiff, profile, error: liffError, isInitializing } = useLiffStore();
  const [, setLocation] = useLocation();
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    initLiff().then(() => {
      if (!liff.isLoggedIn()) {
        liff.login();
      }
    });
  }, []);

  // Check client connection status after profile is loaded
  useEffect(() => {
    const checkClientConnection = async () => {
      if (!profile?.userId) return;

      setIsCheckingConnection(true);
      setConnectionError(null);

      try {
        // Try to get client by LINE user ID
        const client = await getClientByLineUserId(profile.userId);

        // Client found - user is connected, redirect to loans page
        setLocation(`/liff/loans/${client.clientId}`);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          // Client not found - user is not connected, redirect to connect page
          setLocation('/liff/connect');
        } else {
          // Other error occurred
          console.error('Error checking client connection:', error);
          setConnectionError(
            error instanceof Error ? error.message : 'Failed to check connection status'
          );
        }
      } finally {
        setIsCheckingConnection(false);
      }
    };

    checkClientConnection();
  }, [profile?.userId, setLocation]);

  const isLoading = isInitializing || isCheckingConnection;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">
            {isInitializing ? 'Initializing...' : 'Checking your account...'}
          </p>
        </div>
      </div>
    );
  }

  if (liffError || connectionError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {liffError ? 'LIFF Initialization Failed' : 'Connection Check Failed'}
          </AlertTitle>
          <AlertDescription>{liffError || connectionError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // This should rarely be shown as the user is redirected quickly
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
