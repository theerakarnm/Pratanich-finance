import { useState } from 'preact/hooks';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { format } from 'date-fns';

interface ConnectCodeDisplayProps {
  code: string;
  expiresAt: string;
}

export function ConnectCodeDisplay({ code, expiresAt }: ConnectCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const expirationDate = new Date(expiresAt);
  const formattedExpiration = format(expirationDate, 'PPp');

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/50 p-6 text-center">
        <div className="mb-2 text-sm font-medium text-muted-foreground">Connect Code</div>
        <div className="mb-4 font-mono text-4xl font-bold tracking-wider text-primary">
          {code}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="w-full"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy Code
            </>
          )}
        </Button>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
        <p className="text-sm text-amber-800">
          <span className="font-medium">Expires:</span> {formattedExpiration}
        </p>
      </div>

      <div className="text-xs text-muted-foreground">
        Share this code with the client to connect their LINE account. The code is valid for 7 days and can only be used once.
      </div>
    </div>
  );
}
