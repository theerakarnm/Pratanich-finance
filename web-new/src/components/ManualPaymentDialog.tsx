import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';

interface ManualPaymentDialogProps {
  loanId: string;
  contractNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type PaymentMethod = 'Cash' | 'Check' | 'Bank Transfer';

export function ManualPaymentDialog({
  loanId,
  contractNumber,
  isOpen,
  onClose,
  onSuccess,
}: ManualPaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate amount
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      toast.error('กรุณากรอกจำนวนเงินที่ถูกต้อง');
      return;
    }

    // Validate payment date
    if (!paymentDate) {
      toast.error('กรุณาเลือกวันที่ชำระ');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.post('/api/admin/payments/manual', {
        loanId,
        amount: amountValue,
        paymentDate: paymentDate.toISOString(),
        paymentMethod,
        notes: notes.trim() || undefined,
      });

      toast.success('บันทึกการชำระเงินสำเร็จ');
      handleClose();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'ไม่สามารถบันทึกการชำระเงินได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setAmount('');
    setPaymentDate(new Date());
    setPaymentMethod('Cash');
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            เพิ่มการชำระเงิน
          </DialogTitle>
          <DialogDescription>
            สัญญาเลขที่ {contractNumber}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">จำนวนเงิน (บาท) *</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount((e.target as HTMLInputElement).value)}
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="paymentDate">วันที่ชำระ *</Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate ? paymentDate.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const val = (e.target as HTMLInputElement).value;
                setPaymentDate(val ? new Date(val) : undefined);
              }}
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">วิธีการชำระ *</Label>
            <select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              disabled={isSubmitting}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="Cash">เงินสด</option>
              <option value="Check">เช็ค</option>
              <option value="Bank Transfer">โอนเงิน</option>
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">หมายเหตุ</Label>
            <Textarea
              id="notes"
              placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
              value={notes}
              onChange={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                'บันทึกการชำระ'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
