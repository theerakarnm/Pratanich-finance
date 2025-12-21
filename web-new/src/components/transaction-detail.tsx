import type { SlipOKLog } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, Hash, Building2, User } from "lucide-react";
import { formatNumber } from "@/lib/formatter";
import BANK_DATA from "@/config/bank-code";

interface TransactionDetailProps {
  transaction: SlipOKLog;
}

export function TransactionDetail({ transaction }: TransactionDetailProps) {
  const { success, sender, receiver, transDate, transTime, transRef, amount, sendingBank, receivingBank } = transaction;

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="flex flex-col items-center justify-center space-y-2 py-4">
        {success ? (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
        )}
        <h2 className="text-2xl font-bold text-gray-900">
          {success ? "Transaction Successful" : "Transaction Failed"}
        </h2>
        <p className="text-muted-foreground text-sm">
          {transDate} • {transTime}
        </p>
      </div>

      {/* Amount Card */}
      <Card className="border-none shadow-sm bg-slate-50">
        <CardContent className="flex flex-col items-center justify-center p-6">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Amount</span>
          <span className="text-4xl font-bold text-primary mt-2">
            {formatNumber(parseFloat(amount), { decimalPlaces: 2 })}
          </span>
        </CardContent>
      </Card>

      {/* Transfer Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Sender */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" /> Sender
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Name</p>
              <p className="font-semibold">{sender?.displayName || '-'}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-gray-500">Bank</p>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span>{(BANK_DATA as Record<string, { abbreviation: string; fullName: string }>)[sendingBank]?.fullName || '-'}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Account</p>
              <p className="font-mono">{sender?.account?.value || '-'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Receiver */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" /> Receiver
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Name</p>
              <p className="font-semibold">{receiver?.displayName || '-'}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-gray-500">Bank</p>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span>{(BANK_DATA as Record<string, { abbreviation: string; fullName: string }>)[receivingBank]?.fullName || '-'}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Account</p>
              <p className="font-mono">{receiver?.account?.value || '-'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Transaction Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Hash className="h-3 w-3" /> Transaction Ref
            </span>
            <span className="font-mono text-sm">{transRef}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
