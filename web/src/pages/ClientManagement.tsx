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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConnectionStatusBadge } from "@/components/ConnectionStatusBadge";
import { Link } from 'wouter';
import { ChevronLeft, ChevronRight, Edit, Plus } from "lucide-react";

export function ClientManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [connectionFilter, setConnectionFilter] = useState<string>('all');
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
      setError(err instanceof Error ? err.message : 'ไม่สามารถดึงข้อมูลลูกค้าได้');
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

  // Filter clients based on connection status
  const filteredClients = clients.filter(client => {
    if (connectionFilter === 'connected') {
      return !!client.line_user_id;
    } else if (connectionFilter === 'not-connected') {
      return !client.line_user_id;
    }
    return true; // 'all'
  });

  if (loading && clients.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">จัดการลูกค้า</h1>
          <div className="flex items-center gap-2">
            <Input
              placeholder="ค้นหาลูกค้า..."
              value={searchTerm}
              onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
              className="w-[300px]"
            />
            <Link href="/admin/clients/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                สร้างลูกค้า
              </Button>
            </Link>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">กำลังโหลดข้อมูลลูกค้า...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">จัดการลูกค้า</h1>
          <p className="text-sm text-muted-foreground">ทั้งหมด {total} คน</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="ค้นหาลูกค้า..."
            value={searchTerm}
            onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
            className="w-[250px]"
          />
          <Select value={connectionFilter} onValueChange={setConnectionFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="สถานะการเชื่อมต่อ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ลูกค้าทั้งหมด</SelectItem>
              <SelectItem value="connected">เชื่อมต่อแล้ว</SelectItem>
              <SelectItem value="not-connected">ยังไม่เชื่อมต่อ</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/admin/clients/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              สร้างลูกค้า
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <div className="text-sm text-red-800">ข้อผิดพลาด: {error}</div>
        </div>
      )}

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>เลขบัตรประชาชน</TableHead>
              <TableHead>คำนำหน้า</TableHead>
              <TableHead>ชื่อ</TableHead>
              <TableHead>นามสกุล</TableHead>
              <TableHead>วันเกิด</TableHead>
              <TableHead>เบอร์โทรศัพท์</TableHead>
              <TableHead>อีเมล</TableHead>
              <TableHead>สถานะ LINE</TableHead>
              <TableHead className="text-right">การกระทำ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="text-sm text-muted-foreground">กำลังโหลด...</div>
                </TableCell>
              </TableRow>
            ) : filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="text-sm text-muted-foreground">
                    {searchTerm || connectionFilter !== 'all' ? 'ไม่พบลูกค้าที่ตรงกับตัวกรองของคุณ' : 'ไม่มีข้อมูลลูกค้า'}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.citizen_id}</TableCell>
                  <TableCell>{client.title_name}</TableCell>
                  <TableCell>{client.first_name}</TableCell>
                  <TableCell>{client.last_name}</TableCell>
                  <TableCell>{client.date_of_birth}</TableCell>
                  <TableCell>{client.mobile_number}</TableCell>
                  <TableCell>{client.email || '-'}</TableCell>
                  <TableCell>
                    <ConnectionStatusBadge
                      isConnected={!!client.line_user_id}
                      connectedAt={client.connected_at}
                      lineDisplayName={client.line_display_name}
                    />
                  </TableCell>
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
          ก่อนหน้า
        </Button>
        <div className="text-sm text-muted-foreground">
          หน้า {currentPage} จาก {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages || loading}
        >
          ถัดไป
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
