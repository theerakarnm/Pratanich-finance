import { useState, useEffect } from 'preact/hooks';
import { getClients, type Client } from '@/lib/api-client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from 'wouter';
import { ChevronLeft, ChevronRight, Edit, Plus } from "lucide-react";

export function ClientManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const itemsPerPage = 10;

  const fetchClients = async (page: number = currentPage, search: string = searchTerm) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getClients({
        page,
        limit: itemsPerPage,
        search: search || undefined,
      });
      setClients(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch clients');
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setCurrentPage(1);
      fetchClients(1, searchTerm);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  useEffect(() => {
    fetchClients(currentPage, searchTerm);
  }, [currentPage]);

  if (loading && clients.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Client Management</h1>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
              className="w-[300px]"
            />
            <Link href="/admin/clients/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Client
              </Button>
            </Link>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading clients...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Management</h1>
          <p className="text-sm text-muted-foreground">Total {total} clients</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
            className="w-[300px]"
          />
          <Link href="/admin/clients/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Client
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <div className="text-sm text-red-800">Error: {error}</div>
        </div>
      )}

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Citizen ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>First Name</TableHead>
              <TableHead>Last Name</TableHead>
              <TableHead>Date of Birth</TableHead>
              <TableHead>Mobile Number</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="text-sm text-muted-foreground">Loading...</div>
                </TableCell>
              </TableRow>
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="text-sm text-muted-foreground">
                    {searchTerm ? 'No clients found matching your search.' : 'No clients available.'}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.citizen_id}</TableCell>
                  <TableCell>{client.title_name}</TableCell>
                  <TableCell>{client.first_name}</TableCell>
                  <TableCell>{client.last_name}</TableCell>
                  <TableCell>{client.date_of_birth}</TableCell>
                  <TableCell>{client.mobile_number}</TableCell>
                  <TableCell>{client.email || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/clients/${client.id}/edit`}>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1 || loading}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages || loading}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
