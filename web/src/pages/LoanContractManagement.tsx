import { useState, useEffect } from 'preact/hooks';
import { getLoans, type Loan } from '@/lib/api-client';
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
import { formatCurrency } from '@/lib/formatter';

export function LoanContractManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const itemsPerPage = 10;

  const fetchLoans = async (page: number = currentPage, search: string = searchTerm) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getLoans({
        page,
        limit: itemsPerPage,
        search: search || undefined,
      });
      setLoans(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถดึงข้อมูลเงินกู้ได้');
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setCurrentPage(1);
      fetchLoans(1, searchTerm);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  useEffect(() => {
    fetchLoans(currentPage, searchTerm);
  }, [currentPage]);


  if (loading && loans.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">จัดการสัญญาเงินกู้</h1>
          <div className="flex items-center gap-2">
            <Input
              placeholder="ค้นหาสัญญา..."
              value={searchTerm}
              onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
              className="w-[300px]"
            />
            <Link href="/admin/loans/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                สร้างสัญญา
              </Button>
            </Link>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">กำลังโหลดข้อมูลสัญญาเงินกู้...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">จัดการสัญญาเงินกู้</h1>
          <p className="text-sm text-muted-foreground">ทั้งหมด {total} สัญญา</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="ค้นหาสัญญา..."
            value={searchTerm}
            onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
            className="w-[300px]"
          />
          <Link href="/admin/loans/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              สร้างสัญญา
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
              <TableHead>เลขที่สัญญา</TableHead>
              <TableHead>ชื่อลูกค้า</TableHead>
              <TableHead>เลขบัตรประชาชน</TableHead>
              <TableHead>ประเภทเงินกู้</TableHead>
              <TableHead>จำนวนเงินต้น</TableHead>
              <TableHead>วันเริ่มต้น</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>ยอดคงเหลือ</TableHead>
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
            ) : loans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="text-sm text-muted-foreground">
                    {searchTerm ? 'ไม่พบสัญญาที่ตรงกับการค้นหาของคุณ' : 'ไม่มีข้อมูลสัญญาเงินกู้'}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              loans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell className="font-medium">{loan.contract_number}</TableCell>
                  <TableCell>
                    {loan.client ? `${loan.client.first_name} ${loan.client.last_name}` : '-'}
                  </TableCell>
                  <TableCell>
                    {loan.client ? loan.client.citizen_id : '-'}
                  </TableCell>
                  <TableCell>{loan.loan_type}</TableCell>
                  <TableCell className='text-right'>{formatCurrency(loan.principal_amount)}</TableCell>
                  <TableCell>{loan.contract_start_date}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${loan.contract_status === 'Active' ? 'bg-green-100 text-green-800' :
                      loan.contract_status === 'Closed' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                      {loan.contract_status}
                    </span>
                  </TableCell>
                  <TableCell className='text-right'>{formatCurrency(loan.outstanding_balance)}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/loans/${loan.id}/edit`}>
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
