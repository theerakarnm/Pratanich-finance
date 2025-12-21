import { LoanContractForm, type LoanContractFormValues } from "@/components/forms/LoanContractForm";
import { useLocation, useRoute } from "wouter";
import { useEffect, useState } from "react";
import { getLoanById, getClients, type Client } from "@/lib/api-client";
import { useLoansStore } from "@/store";
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function LoanContractEdit() {
  useDocumentTitle('แก้ไขสัญญาเงินกู้');

  const [, params] = useRoute("/admin/loans/:id/edit");
  const [, setLocation] = useLocation();
  const { updateLoan } = useLoansStore();
  const [contractData, setContractData] = useState<LoanContractFormValues | undefined>(undefined);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!params?.id) return;
      try {
        setLoading(true);
        const [loan, clientsResponse] = await Promise.all([
          getLoanById(params.id),
          getClients({ limit: 1000 })
        ]);

        setClients(clientsResponse.data);

        setContractData({
          contract_number: loan.contract_number,
          loan_type: loan.loan_type,
          principal_amount: loan.principal_amount,
          approved_amount: loan.approved_amount,
          interest_rate: loan.interest_rate,
          term_months: loan.term_months,
          installment_amount: loan.installment_amount,
          contract_start_date: loan.contract_start_date,
          contract_end_date: loan.contract_end_date,
          due_day: loan.due_day,
          contract_status: loan.contract_status,
          outstanding_balance: loan.outstanding_balance,
          overdue_days: loan.overdue_days,
          client_id: loan.client_id,
        });
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError("Failed to load loan contract data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params?.id]);

  const handleSubmit = async (data: LoanContractFormValues) => {
    if (!params?.id) return;
    try {
      await updateLoan(params.id, data);
      alert("แก้ไขสัญญาเงินกู้สำเร็จแล้ว!");
      setLocation("/admin/loans");
    } catch (err) {
      console.error("Failed to update loan contract:", err);
      alert("ไม่สามารถแก้ไขสัญญาเงินกู้ได้: " + (err instanceof Error ? err.message : "ข้อผิดพลาดที่ไม่ทราบสาเหตุ"));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="container mx-auto py-8 px-4">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            ✏️ แก้ไขสัญญาเงินกู้
          </h1>
          <p className="text-muted-foreground mt-2">
            แก้ไขข้อมูลสัญญาและดูผลลัพธ์แบบเรียลไทม์ทางด้านขวา
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Form */}
        <LoanContractForm initialData={contractData} onSubmit={handleSubmit} isEditing clients={clients} />
      </div>
    </div>
  );
}

