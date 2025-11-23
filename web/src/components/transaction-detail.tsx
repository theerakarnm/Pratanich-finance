import type { Transaction } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, Hash, Building2, User } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/formatter";

interface TransactionDetailProps {
  transaction: Transaction;
}

export function TransactionDetail({ transaction }: TransactionDetailProps) {
  const { data, success } = transaction;

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
          {data.transDate} • {data.transTime}
        </p>
      </div>

      {/* Amount Card */}
      <Card className="border-none shadow-sm bg-slate-50">
        <CardContent className="flex flex-col items-center justify-center p-6">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Amount</span>
          <span className="text-4xl font-bold text-primary mt-2">
            {formatNumber(data.amount, { decimalPlaces: 1 })}
          </span>
          {data.transFeeAmount > 0 && (
            <span className="text-sm text-muted-foreground mt-1">
              + {formatCurrency(data.transFeeAmount)} Fee
            </span>
          )}
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
              <p className="font-semibold">{data.sender.name}</p>
              <p className="text-xs text-muted-foreground">{data.sender.displayName}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-gray-500">Bank</p>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span>{data.sendingBank}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Account</p>
              <p className="font-mono">{data.sender.account.value}</p>
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
              <p className="font-semibold">{data.receiver.name}</p>
              <p className="text-xs text-muted-foreground">{data.receiver.displayName}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-gray-500">Bank</p>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span>{data.receivingBank}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Account</p>
              <p className="font-mono">{data.receiver.account.value}</p>
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
            <span className="font-mono text-sm">{data.transRef}</span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-xs text-muted-foreground">Request ID</span>
            <span className="font-mono text-sm truncate" title={data.rqUID}>{data.rqUID}</span>
          </div>
          {data.ref1 && (
            <div className="flex flex-col space-y-1">
              <span className="text-xs text-muted-foreground">Reference 1</span>
              <span className="text-sm">{data.ref1}</span>
            </div>
          )}
          {data.ref2 && (
            <div className="flex flex-col space-y-1">
              <span className="text-xs text-muted-foreground">Reference 2</span>
              <span className="text-sm">{data.ref2}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
