import { useState, useEffect } from 'preact/hooks';
import liff from '@line/liff';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

export function LiffClient() {
  const [liffObject, setLiffObject] = useState<typeof liff | null>(null);
  const [liffError, setLiffError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof liff.getProfile>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('start liff.init()...');
    const liffId = import.meta.env.VITE_LIFF_ID;

    if (!liffId) {
      console.error('LIFF_ID is not defined in environment variables');
      setLiffError('LIFF_ID is missing. Please check your configuration.');
      setIsLoading(false);
      return;
    }

    liff
      .init({ liffId })
      .then(() => {
        console.log('liff.init() done');
        setLiffObject(liff);
        return liff
      })
      .then((liff) => {
        if (!liff.isLoggedIn()) {
          liff.login()
        }
        return liff.getProfile()
      })
      .then((profile) => {
        console.log('liff.getProfile() done');
        setProfile(profile);
      })
      .catch((error: Error) => {
        console.log(`liff.init() failed: ${error}`);
        setLiffError(error.toString());
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
          <CardTitle>LIFF Client</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-green-50 p-4 text-green-700">
            <p className="font-medium">LIFF Initialized Successfully!</p>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Language:</strong> {liffObject?.getLanguage()}</p>
            <p><strong>Version:</strong> {liffObject?.getVersion()}</p>
            <p><strong>OS:</strong> {liffObject?.getOS()}</p>
            <p><strong>In Client:</strong> {liffObject?.isInClient() ? 'Yes' : 'No'}</p>
            <p><strong>Logged In:</strong> {liffObject?.isLoggedIn() ? 'Yes' : 'No'}</p>
          </div>

          <div>
            <h1>User Information</h1>
            {!profile ? (
              <p>No Profile Found...</p>
            ) : (
              <div>
                <p><strong>Display Name:</strong> {profile.displayName}</p>
                <p><strong>Picture URL:</strong> <img src={profile.pictureUrl} alt="Profile" /></p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
