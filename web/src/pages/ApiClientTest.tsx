import { useState } from 'preact/hooks';
import { getUsers, getClients, ApiError } from '@/lib/api-client';
import type { User, Client } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function ApiClientTest() {
  useDocumentTitle('API Client Test');

  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const data = await getUsers();
      setUsers(data);
      console.log('✅ Users fetched successfully:', data);
    } catch (error) {
      if (error instanceof ApiError) {
        const errorMsg = `${error.message} (Status: ${error.status})`;
        setUsersError(errorMsg);
        console.error('❌ Failed to fetch users:', errorMsg);
      } else {
        setUsersError('Unknown error occurred');
        console.error('❌ Failed to fetch users:', error);
      }
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchClients = async () => {
    setClientsLoading(true);
    setClientsError(null);
    try {
      const data = await getClients({ page: 1, limit: 10 });
      setClients(data.data);
      console.log('✅ Clients fetched successfully:', data);
    } catch (error) {
      if (error instanceof ApiError) {
        const errorMsg = `${error.message} (Status: ${error.status})`;
        setClientsError(errorMsg);
        console.error('❌ Failed to fetch clients:', errorMsg);
      } else {
        setClientsError('Unknown error occurred');
        console.error('❌ Failed to fetch clients:', error);
      }
    } finally {
      setClientsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">API Client Test Page</h1>
        <p className="text-muted-foreground mb-6">
          This page tests the Axios API client with Better Auth cookie authentication.
          Open the browser console to see detailed logs.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Users Test */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Test Users API</h2>
            <Button
              onClick={fetchUsers}
              disabled={usersLoading}
              className="mb-4 w-full"
            >
              {usersLoading ? 'Loading...' : 'Fetch Users'}
            </Button>

            {usersError && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-lg mb-4">
                <p className="font-semibold">Error:</p>
                <p className="text-sm">{usersError}</p>
              </div>
            )}

            {users.length > 0 && (
              <div className="space-y-2">
                <p className="font-semibold text-sm text-muted-foreground">
                  Found {users.length} users:
                </p>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {users.map((user) => (
                    <div key={user.id} className="bg-muted p-3 rounded-lg text-sm">
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-muted-foreground">{user.email}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Clients Test */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Test Clients API</h2>
            <Button
              onClick={fetchClients}
              disabled={clientsLoading}
              className="mb-4 w-full"
            >
              {clientsLoading ? 'Loading...' : 'Fetch Clients'}
            </Button>

            {clientsError && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-lg mb-4">
                <p className="font-semibold">Error:</p>
                <p className="text-sm">{clientsError}</p>
              </div>
            )}

            {clients.length > 0 && (
              <div className="space-y-2">
                <p className="font-semibold text-sm text-muted-foreground">
                  Found {clients.length} clients:
                </p>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {clients.map((client) => (
                    <div key={client.id} className="bg-muted p-3 rounded-lg text-sm">
                      <p className="font-semibold">
                        {client.first_name} {client.last_name}
                      </p>
                      <p className="text-muted-foreground">{client.mobile_number}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        <Card className="p-6 mt-6">
          <h3 className="text-lg font-semibold mb-3">Verification Checklist</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground">1.</span>
              <span>Open browser DevTools → Network tab</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground">2.</span>
              <span>Click "Fetch Users" or "Fetch Clients"</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground">3.</span>
              <span>Check that cookies are sent in the request headers</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground">4.</span>
              <span>Verify the response is properly unwrapped (no nested .data.data)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground">5.</span>
              <span>Check console for success/error logs</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
