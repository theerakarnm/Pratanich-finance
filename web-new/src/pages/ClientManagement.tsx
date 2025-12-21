import { useEffect } from 'react';
import { useClientsStore } from '@/store';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ConnectionStatusBadge } from "@/components/ConnectionStatusBadge";
import { Link } from 'wouter';
import { ChevronLeft, ChevronRight, Edit, Plus, Trash2 } from "lucide-react";
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function ClientManagement() {
  useDocumentTitle('จัดการลูกค้า');

  // Use Zustand store
  const {
    clients,
    totalPages,
    total,
    searchTerm,
    connectionFilter,
    currentPage,
    showDeleteDialog,
    clientToDelete,
    isLoading,
    error,
    setSearchTerm,
    setConnectionFilter,
    setCurrentPage,
    setShowDeleteDialog,
    setClientToDelete,
    fetchClients,
    deleteClientById,
  } = useClientsStore();

  // Initial fetch
  useEffect(() => {
    fetchClients();
  }, []);

  // Debounced search effect
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchClients();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Fetch on page change
  useEffect(() => {
    fetchClients();
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

  const handleDeleteClick = (client: typeof clients[0]) => {
    setClientToDelete(client);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;
    await deleteClientById(clientToDelete.id);
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setClientToDelete(null);
  };

  if (isLoading && clients.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">จัดการลูกค้า</h1>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Input
              placeholder="ค้นหาลูกค้า..."
              value={searchTerm}
              onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
              className="w-full md:w-[300px]"
            />
            <Link href="/admin/clients/new">
              <Button className="w-full md:w-auto">
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
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">จัดการลูกค้า</h1>
          <p className="text-sm text-muted-foreground">ทั้งหมด {total} คน</p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Input
            placeholder="ค้นหาลูกค้า..."
            value={searchTerm}
            onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
            className="w-full md:w-[250px]"
          />
          <Select value={connectionFilter} onValueChange={(value) => setConnectionFilter(value as 'all' | 'connected' | 'not-connected')}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="สถานะการเชื่อมต่อ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ลูกค้าทั้งหมด</SelectItem>
              <SelectItem value="connected">เชื่อมต่อแล้ว</SelectItem>
              <SelectItem value="not-connected">ยังไม่เชื่อมต่อ</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/admin/clients/new">
            <Button className="w-full md:w-auto">
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

      <div className="rounded-md border bg-white overflow-x-auto">
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
            {isLoading ? (
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
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/clients/${client.id}/edit`}>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(client)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
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
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1 || isLoading}
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
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || isLoading}
        >
          ถัดไป
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบลูกค้า</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบลูกค้า {clientToDelete?.first_name} {clientToDelete?.last_name}?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
