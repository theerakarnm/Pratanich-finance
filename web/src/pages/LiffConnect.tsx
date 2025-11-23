import { useState, useEffect } from 'preact/hooks';
import { useLocation } from 'wouter';
import liff from '@line/liff';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import apiClient from '@/lib/api-client';

interface VerifyConnectCodeResponse {
  valid: boolean;
  clientId?: string;
  error?: string;
}

interface CompleteConnectionResponse {
  success: boolean;
  clientId: string;
  hasLoans: boolean;
}

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export function LiffConnect() {
  const [, setLocation] = useLocation();
  const [isInitializing, setIsInitializing] = useState(true);
  const [liffError, setLiffError] = useState<string | null>(null);
  const [profile, setProfile] = useState<LineProfile | null>(null);
  
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize LIFF
  useEffect(() => {
    const liffId = import.meta.env.VITE_LIFF_ID;

    if (!liffId) {
      setLiffError('LIFF_ID is missing. Please check your configuration.');
      setIsInitializing(false);
      return;
    }

    liff
      .init({ liffId })
      .then(() => {
        if (!liff.isLoggedIn()) {
          liff.login();
          return null;
        }
        
        return liff.getProfile();
      })
      .then((profile) => {
        if (profile) {
          setProfile(profile);
          // Check if user is already connected
          checkExistingConnection(profile.userId);
        }
      })
      .catch((error: Error) => {
        setLiffError(error.toString());
      })
      .finally(() => {
        setIsInitializing(false);
      });
  }, []);

  // Check if LINE user is already connected
  const checkExistingConnection = async (lineUserId: string) => {
    try {
      const response = await apiClient.get<{ clientId: string; firstName: string; lastName: string; connectedAt: string }>(
        `/api/connect/client/${lineUserId}`
      );
      
      if (response.data) {
        // User is already connected, redirect to loan summary
        setLocation(`/liff/loans/${response.data.clientId}`);
      }
    } catch (error) {
      // User not connected yet, continue with connect flow
      console.log('User not connected yet');
    }
  };

  // Handle code input change (format as XXXX-XXXX)
  const handleCodeChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    let value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (value.length > 8) {
      value = value.slice(0, 8);
    }
    
    if (value.length > 4) {
      value = `${value.slice(0, 4)}-${value.slice(4)}`;
    }
    
    setCode(value);
    setError(null);
  };

  // Verify connect code
  const handleVerifyCode = async () => {
    if (!code || code.replace('-', '').length !== 8) {
      setError('Please enter a valid 8-character connect code');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await apiClient.post<VerifyConnectCodeResponse>('/api/connect/verify', {
        code: code.replace('-', ''),
      });

      if (response.data.valid && response.data.clientId) {
        // Automatically proceed to complete connection
        await handleCompleteConnection(response.data.clientId);
      } else {
        setError(response.data.error || 'Invalid connect code');
      }
    } catch (error: any) {
      if (error.message) {
        setError(error.message);
      } else {
        setError('Failed to verify connect code. Please try again.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // Complete connection with LINE profile
  const handleCompleteConnection = async (_clientId: string) => {
    if (!profile) {
      setError('LINE profile not available. Please try again.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const response = await apiClient.post<CompleteConnectionResponse>('/api/connect/complete', {
        code: code.replace('-', ''),
        lineUserId: profile.userId,
        lineDisplayName: profile.displayName,
        linePictureUrl: profile.pictureUrl,
      });

      if (response.data.success) {
        // Redirect to loan summary page
        setLocation(`/liff/loans/${response.data.clientId}`);
      }
    } catch (error: any) {
      if (error.message) {
        // Check for rate limit error
        if (error.code === 'RATE_LIMIT_EXCEEDED' && error.details?.retryAfter) {
          const minutes = Math.ceil(error.details.retryAfter / 60);
          setError(`Too many attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`);
        } else {
          setError(error.message);
        }
      } else {
        setError('Failed to complete connection. Please try again.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e: Event) => {
    e.preventDefault();
    handleVerifyCode();
  };

  // Loading state
  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // LIFF error state
  if (liffError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>LIFF Initialization Failed</AlertTitle>
          <AlertDescription>{liffError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connect Your Account</CardTitle>
          <CardDescription>
            Enter the connect code provided by your loan officer to link your LINE account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile && (
            <div className="mb-6 flex items-center gap-3 rounded-lg bg-green-50 p-3">
              {profile.pictureUrl && (
                <img 
                  src={profile.pictureUrl} 
                  alt={profile.displayName}
                  className="h-10 w-10 rounded-full"
                />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">
                  {profile.displayName}
                </p>
                <p className="text-xs text-green-700">
                  LINE account ready
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Connect Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="XXXX-XXXX"
                value={code}
                onInput={handleCodeChange}
                disabled={isVerifying || isConnecting}
                className="text-center text-lg font-mono tracking-wider"
                maxLength={9}
              />
              <p className="text-xs text-gray-500">
                Enter the 8-character code provided by your loan officer
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={!code || code.replace('-', '').length !== 8 || isVerifying || isConnecting}
            >
              {isVerifying || isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isVerifying ? 'Verifying...' : 'Connecting...'}
                </>
              ) : (
                'Connect Account'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
