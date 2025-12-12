import { LoanContractForm, type LoanContractFormValues } from "@/components/forms/LoanContractForm";
import { useLocation, useRoute } from "wouter";
import { useEffect, useState } from "preact/hooks";
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
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Edit Loan Contract</h1>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <LoanContractForm initialData={contractData} onSubmit={handleSubmit} isEditing clients={clients} />
    </div>
  );
}
