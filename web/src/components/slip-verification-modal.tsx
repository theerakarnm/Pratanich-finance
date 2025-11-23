import { useState } from 'preact/hooks';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { verifySlip, type VerifySlipParams } from '@/lib/api-client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SlipVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SlipVerificationModal({ open, onOpenChange }: SlipVerificationModalProps) {
  const [qrData, setQrData] = useState('');
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      setFile(target.files[0]);
      setQrData(''); // Clear QR data if file is selected
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const params: VerifySlipParams = {
        log: true,
      };

      if (amount) {
        params.amount = parseFloat(amount);
      }

      if (file) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          // Remove data:image/jpeg;base64, prefix
          const base64 = (reader.result as string).split(',')[1];
          params.files = base64;
          try {
            const res = await verifySlip(params);
            setResult(res);
          } catch (err: any) {
            setError(err.message || 'Verification failed');
          } finally {
            setLoading(false);
          }
        };
        reader.onerror = () => {
          setError('Failed to read file');
          setLoading(false);
        };
        return; // Wait for file read
      } else if (qrData) {
        params.data = qrData;
      } else {
        setError('Please provide QR data or upload a slip image');
        setLoading(false);
        return;
      }

      const res = await verifySlip(params);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      if (!file) setLoading(false);
    }
  };

  const resetForm = () => {
    setQrData('');
    setAmount('');
    setFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) resetForm();
      onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Verify Payment Slip</DialogTitle>
          <DialogDescription>
            Enter QR code data or upload a slip image to verify the transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="qr-data">QR Code Data</Label>
            <Input
              id="qr-data"
              placeholder="004100060000010103..."
              value={qrData}
              onInput={(e) => {
                setQrData((e.target as HTMLInputElement).value);
                if ((e.target as HTMLInputElement).value) setFile(null);
              }}
              disabled={!!file || loading}
            />
          </div>

          <div className="relative flex items-center justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or upload image</span>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="slip-image">Slip Image</Label>
            <Input
              id="slip-image"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={!!qrData || loading}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amount">Amount (Optional)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onInput={(e) => setAmount((e.target as HTMLInputElement).value)}
              disabled={loading}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert variant={result.success ? "default" : "destructive"} className={result.success ? "border-green-500 text-green-700" : ""}>
              {result.success ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4" />}
              <AlertTitle>{result.success ? "Verification Successful" : "Verification Failed"}</AlertTitle>
              <AlertDescription>
                <div className="mt-2 text-sm">
                  <p><strong>Sender:</strong> {result.sender?.displayName}</p>
                  <p><strong>Receiver:</strong> {result.receiver?.displayName}</p>
                  <p><strong>Amount:</strong> {result.amount}</p>
                  <p><strong>Date:</strong> {result.transDate} {result.transTime}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleVerify} disabled={loading || (!qrData && !file)}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
