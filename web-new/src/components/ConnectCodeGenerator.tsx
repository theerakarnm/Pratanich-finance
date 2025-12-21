import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Link2, Loader2 } from 'lucide-react';
import { generateConnectCode } from '@/lib/api-client';
import { ConnectCodeDisplay } from './ConnectCodeDisplay';

interface ConnectCodeGeneratorProps {
  clientId: string;
  onCodeGenerated?: (code: string) => void;
}

export function ConnectCodeGenerator({ clientId, onCodeGenerated }: ConnectCodeGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<{
    code: string;
    expiresAt: string;
  } | null>(null);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await generateConnectCode(clientId);
      setGeneratedCode({
        code: response.code,
        expiresAt: response.expiresAt,
      });
      onCodeGenerated?.(response.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate connect code');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Reset state after dialog closes
    setTimeout(() => {
      setGeneratedCode(null);
      setError(null);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link2 className="h-4 w-4" />
          Generate Connect Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Connect Code</DialogTitle>
          <DialogDescription>
            Generate a unique code for the client to connect their LINE account.
          </DialogDescription>
        </DialogHeader>

        {!generatedCode ? (
          <div className="space-y-4">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              This will create a new connect code that expires in 7 days. The client can use this code to link their LINE account.
            </p>
          </div>
        ) : (
          <ConnectCodeDisplay code={generatedCode.code} expiresAt={generatedCode.expiresAt} />
        )}

        <DialogFooter>
          {!generatedCode ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Generate Code
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
