import { ClientForm, type ClientFormValues } from "@/components/forms/ClientForm";
import { useLocation, useRoute } from "wouter";
import { useEffect, useState } from "preact/hooks";

import { getClientById, updateClient } from "@/lib/api-client";

export function ClientEdit() {
  const [, params] = useRoute("/admin/clients/:id/edit");
  const [, setLocation] = useLocation();
  const [clientData, setClientData] = useState<ClientFormValues | undefined>(undefined);
  const [_loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClient = async () => {
      if (!params?.id) return;
      try {
        setLoading(true);
        const client = await getClientById(params.id);
        // Transform API data to form values if necessary
        // The API returns snake_case which matches the form values
        setClientData({
          citizen_id: client.citizen_id,
          title_name: client.title_name,
          first_name: client.first_name,
          last_name: client.last_name,
          date_of_birth: client.date_of_birth,
          mobile_number: client.mobile_number,
          email: client.email || "",
          line_id: client.line_id || "",
        });
      } catch (err) {
        console.error("Failed to fetch client:", err);
        setError("Failed to load client data");
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [params?.id]);

  const handleSubmit = async (data: ClientFormValues) => {
    if (!params?.id) return;
    try {
      await updateClient(params.id, data);
      alert("Client updated successfully!");
      setLocation("/admin/clients");
    } catch (err) {
      console.error("Failed to update client:", err);
      alert("Failed to update client: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  if (!clientData && params?.id) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Edit Client</h1>
      <ClientForm initialData={clientData} onSubmit={handleSubmit} isEditing />
    </div>
  );
}
