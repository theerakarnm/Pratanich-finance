import { ClientForm, type ClientFormValues } from "@/components/forms/ClientForm";
import { useLocation, useRoute } from "wouter";
import { useEffect, useState } from "preact/hooks";
import { ConnectCodeGenerator } from "@/components/ConnectCodeGenerator";
import { ConnectionStatusBadge } from "@/components/ConnectionStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { getClientById, type Client } from "@/lib/api-client";
import { useClientsStore } from "@/store";
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function ClientEdit() {
  useDocumentTitle('แก้ไขข้อมูลลูกค้า');

  const [, params] = useRoute("/admin/clients/:id/edit");
  const [, setLocation] = useLocation();
  const { updateClient } = useClientsStore();
  const [clientData, setClientData] = useState<ClientFormValues | undefined>(undefined);
  const [client, setClient] = useState<Client | null>(null);
  const [_loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);

  const fetchClient = async () => {
    if (!params?.id) return;
    try {
      setLoading(true);
      const clientResponse = await getClientById(params.id);
      setClient(clientResponse);
      // Transform API data to form values if necessary
      // The API returns snake_case which matches the form values
      setClientData({
        citizen_id: clientResponse.citizen_id,
        title_name: clientResponse.title_name,
        first_name: clientResponse.first_name,
        last_name: clientResponse.last_name,
        date_of_birth: clientResponse.date_of_birth,
        mobile_number: clientResponse.mobile_number,
        email: clientResponse.email || "",
        line_id: clientResponse.line_id || "",
      });
    } catch (err) {
      console.error("Failed to fetch client:", err);
      setError("Failed to load client data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClient();
  }, [params?.id]);

  const handleSubmit = async (data: ClientFormValues) => {
    if (!params?.id) return;
    try {
      await updateClient(params.id, data);
      alert("อัพเดทข้อมูลลูกค้าสำเร็จแล้ว!");
      setLocation("/admin/clients");
    } catch (err) {
      console.error("Failed to update client:", err);
      alert("ไม่สามารถอัพเดทข้อมูลลูกค้าได้: " + (err instanceof Error ? err.message : "ข้อผิดพลาดที่ไม่ทราบสาเหตุ"));
    }
  };

  if (!clientData && params?.id) {
    return <div>กำลังโหลด...</div>;
  }

  const isConnected = !!(client?.line_user_id);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">แก้ไขข้อมูลลูกค้า</h1>
      </div>

      {client && (
        <Card>
          <CardHeader>
            <CardTitle>การเชื่อมต่อ LINE</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <ConnectionStatusBadge
                  isConnected={isConnected}
                  connectedAt={client.connected_at}
                  lineDisplayName={client.line_display_name}
                  variant="detailed"
                />
              </div>
              {!isConnected && (
                <ConnectCodeGenerator
                  clientId={client.id}
                  onCodeGenerated={() => {
                    // Optionally refresh client data after code generation
                    fetchClient();
                  }}
                />
              )}
            </div>

            {isConnected && client.line_display_name && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-muted-foreground">LINE Display Name</div>
                    <div>{client.line_display_name}</div>
                  </div>
                  {client.line_picture_url && (
                    <div>
                      <div className="font-medium text-muted-foreground">Profile Picture</div>
                      <img
                        src={client.line_picture_url}
                        alt={client.line_display_name}
                        className="h-10 w-10 rounded-full mt-1"
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <ClientForm initialData={clientData} onSubmit={handleSubmit} isEditing />
    </div>
  );
}
