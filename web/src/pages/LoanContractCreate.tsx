import { LoanContractForm, type LoanContractFormValues } from "@/components/forms/LoanContractForm";
import { useLocation } from "wouter";
import { getClients, type Client } from "@/lib/api-client";
import { useLoansStore } from "@/store";
import { useState, useEffect } from "preact/hooks";

export function LoanContractCreate() {
  const [, setLocation] = useLocation();
  const { createLoan } = useLoansStore();
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await getClients({ limit: 1000 }); // Fetch all clients (or enough for dropdown)
        setClients(response.data);
      } catch (err) {
        console.error("Failed to fetch clients:", err);
      }
    };
    fetchClients();
  }, []);

  const handleSubmit = async (data: LoanContractFormValues) => {
    try {
      setError(null);
      await createLoan(data);
      alert("สร้างสัญญาเงินกู้สำเร็จแล้ว!");
      setLocation("/admin/loans");
    } catch (err) {
      console.error("Failed to create loan contract:", err);
      setError(err instanceof Error ? err.message : "Failed to create loan contract");
      alert("ไม่สามารถสร้างสัญญาเงินกู้ได้: " + (err instanceof Error ? err.message : "ข้อผิดพลาดที่ไม่ทราบสาเหตุ"));
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Create New Loan Contract</h1>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <LoanContractForm onSubmit={handleSubmit} clients={clients} />
    </div>
  );
}
