import { LoanContractForm, type LoanContractFormValues } from "@/components/forms/LoanContractForm";
import { useLocation } from "wouter";

import { createLoan, getClients, type Client } from "@/lib/api-client";
import { useState, useEffect } from "preact/hooks";

export function LoanContractCreate() {
  const [, setLocation] = useLocation();
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
      alert("Loan Contract created successfully!");
      setLocation("/admin/loans");
    } catch (err) {
      console.error("Failed to create loan contract:", err);
      setError(err instanceof Error ? err.message : "Failed to create loan contract");
      alert("Failed to create loan contract: " + (err instanceof Error ? err.message : "Unknown error"));
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
