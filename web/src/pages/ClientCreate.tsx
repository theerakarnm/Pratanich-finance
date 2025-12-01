import { ClientForm, type ClientFormValues } from "@/components/forms/ClientForm";
import { useLocation } from "wouter";

import { createClient } from "@/lib/api-client";
import { useState } from "preact/hooks";

export function ClientCreate() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: ClientFormValues) => {
    try {
      setError(null);
      await createClient(data);
      alert("สร้างลูกค้าสำเร็จแล้ว!");
      setLocation("/admin/clients");
    } catch (err) {
      console.error("Failed to create client:", err);
      setError(err instanceof Error ? err.message : "ไม่สามารถสร้างลูกค้าได้");
      alert("ไม่สามารถสร้างลูกค้าได้: " + (err instanceof Error ? err.message : "ข้อผิดพลาดที่ไม่ทราบสาเหตุ"));
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Create New Client</h1>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <ClientForm onSubmit={handleSubmit} />
    </div>
  );
}
