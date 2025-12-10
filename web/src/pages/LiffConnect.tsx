import { useState, useEffect } from 'preact/hooks';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { useLiffStore } from '@/store';

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

export function LiffConnect() {
  const [, setLocation] = useLocation();
  const { isInitializing, isLoggedIn, profile, error: liffError, initLiff, login } = useLiffStore();

  const [code, setCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('code');

  // Initialize LIFF
  useEffect(() => {
    initLiff();
  }, []);

  // Auto-login if not logged in
  useEffect(() => {
    if (!isInitializing && !isLoggedIn && !liffError) {
      login();
    }
  }, [isInitializing, isLoggedIn, liffError]);

  // Check if LINE user is already connected when profile is available
  useEffect(() => {
    if (profile?.userId) {
      checkExistingConnection(profile.userId);
    }
  }, [profile]);

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

  // Verify phone and contract
  const handleVerifyPhone = async () => {
    if (!phoneNumber || !contractNumber) {
      setError('Please enter both phone number and contract number');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await apiClient.post<VerifyConnectCodeResponse>('/api/connect/verify-phone', {
        phoneNumber,
        contractNumber,
      });

      if (response.data.valid && response.data.clientId) {
        // Automatically proceed to complete connection
        await handleCompletePhoneConnection(response.data.clientId);
      } else {
        setError(response.data.error || 'Invalid phone number or contract number');
      }
    } catch (error: any) {
      if (error.message) {
        setError(error.message);
      } else {
        setError('Failed to verify credentials. Please try again.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // Complete phone connection with LINE profile
  const handleCompletePhoneConnection = async (_clientId: string) => {
    if (!profile) {
      setError('LINE profile not available. Please try again.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const response = await apiClient.post<CompleteConnectionResponse>('/api/connect/complete-phone', {
        phoneNumber,
        contractNumber,
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
    if (activeTab === 'code') {
      handleVerifyCode();
    } else {
      handleVerifyPhone();
    }
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
          <CardTitle>เชื่อมต่อบัญชีของคุณ</CardTitle>
          <CardDescription>
            เลือกวิธีการเชื่อมต่อบัญชี LINE ของคุณกับระบบ
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
                  บัญชี LINE พร้อมใช้งาน
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="code">รหัสเชื่อมต่อ</TabsTrigger>
              <TabsTrigger value="phone">เบอร์โทร + สัญญา</TabsTrigger>
            </TabsList>

            <TabsContent value="code">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">รหัสเชื่อมต่อ</Label>
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
                    กรอกรหัส 8 หลักที่ได้รับจากเจ้าหน้าที่
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
                      {isVerifying ? 'กำลังตรวจสอบ...' : 'กำลังเชื่อมต่อ...'}
                    </>
                  ) : (
                    'เชื่อมต่อบัญชี'
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="phone">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">เบอร์โทรศัพท์มือถือ</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="081-234-5678"
                    value={phoneNumber}
                    onInput={(e) => {
                      setPhoneNumber((e.target as HTMLInputElement).value);
                      setError(null);
                    }}
                    disabled={isVerifying || isConnecting}
                  />
                  <p className="text-xs text-gray-500">
                    กรอกเบอร์โทรที่ลงทะเบียนไว้กับระบบ
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contract">เลขที่สัญญา</Label>
                  <Input
                    id="contract"
                    type="text"
                    placeholder="เลขที่สัญญาเงินกู้"
                    value={contractNumber}
                    onInput={(e) => {
                      setContractNumber((e.target as HTMLInputElement).value);
                      setError(null);
                    }}
                    disabled={isVerifying || isConnecting}
                  />
                  <p className="text-xs text-gray-500">
                    กรอกเลขที่สัญญาเงินกู้ของคุณ
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
                  disabled={!phoneNumber || !contractNumber || isVerifying || isConnecting}
                >
                  {isVerifying || isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isVerifying ? 'กำลังตรวจสอบ...' : 'กำลังเชื่อมต่อ...'}
                    </>
                  ) : (
                    'เชื่อมต่อบัญชี'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
