import { useState } from 'preact/hooks';
import { transactions, type Transaction as TransactionType } from '@/data/mockData';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { TransactionDetail } from "@/components/transaction-detail";
import { formatCurrency } from '@/lib/formatter';

import { SlipVerificationModal } from "@/components/slip-verification-modal";

export function Transaction() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionType | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const itemsPerPage = 10;

  const filteredTransactions = transactions.filter(t =>
    t.data.transRef.includes(searchTerm) ||
    t.data.sender.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.data.receiver.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setShowVerifyModal(true)}>
            Verify Slip
          </Button>
          <Input
            placeholder="Search reference, sender, receiver..."
            value={searchTerm}
            onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
            className="max-w-sm"
          />
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date/Time</TableHead>
              <TableHead>Ref No.</TableHead>
              <TableHead>Sender</TableHead>
              <TableHead>Receiver</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentTransactions.map((t) => (
              <TableRow key={t.data.transRef}>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{t.data.transDate}</span>
                    <span className="text-xs text-muted-foreground">{t.data.transTime}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{t.data.transRef}</TableCell>
                <TableCell>{t.data.sender.displayName}</TableCell>
                <TableCell>{t.data.receiver.displayName}</TableCell>
                <TableCell className='text-right'>{formatCurrency(t.data.amount)}</TableCell>
                <TableCell>
                  <Badge variant={t.success ? "default" : "destructive"}>
                    {t.success ? "Success" : "Failed"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedTransaction(t)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Transaction Reference: {selectedTransaction?.data.transRef}
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && <TransactionDetail transaction={selectedTransaction} />}
        </DialogContent>
      </Dialog>

      <SlipVerificationModal open={showVerifyModal} onOpenChange={setShowVerifyModal} />
    </div >
  );
}
