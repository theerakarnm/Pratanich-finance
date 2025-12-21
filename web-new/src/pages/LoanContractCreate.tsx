import { LoanContractForm, type LoanContractFormValues } from "@/components/forms/LoanContractForm";
import { useLocation } from "wouter";
import { getClients, type Client } from "@/lib/api-client";
import { useLoansStore } from "@/store";
import { useState, useEffect } from "react";
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function LoanContractCreate() {
  useDocumentTitle('สร้างสัญญาเงินกู้ใหม่');

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
    <div className="min-h-screen bg-slate-50/50">
      <div className="container mx-auto py-8 px-4">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            ✨ สร้างสัญญาเงินกู้ใหม่
          </h1>
          <p className="text-muted-foreground mt-2">
            กรอกข้อมูลสัญญาและดูผลลัพธ์แบบเรียลไทม์ทางด้านขวา
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Form */}
        <LoanContractForm onSubmit={handleSubmit} clients={clients} />
      </div>
    </div>
  );
}

