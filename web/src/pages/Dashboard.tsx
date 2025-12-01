import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'preact/hooks';
import { getClients, getLoans } from '@/lib/api-client';
import { Users, FileText, DollarSign, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { formatCurrency, formatNumber } from '@/lib/formatter';

export function Dashboard() {
  const [totalClients, setTotalClients] = useState(0);
  const [totalLoans, setTotalLoans] = useState(0);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [clientsResponse, loansResponse] = await Promise.all([
          getClients({ limit: 1 }), // Just get the total count
          getLoans({ limit: 1000 }) // Get more loans to calculate accurate balance
        ]);

        setTotalClients(clientsResponse.meta.total);
        setTotalLoans(loansResponse.meta.total);

        const totalOutstanding = loansResponse.data.reduce(
          (acc, loan) => acc + loan.outstanding_balance,
          0
        );
        setOutstandingBalance(totalOutstanding);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'ไม่สามารถดึงข้อมูลแดชบอร์ดได้');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const todayTransactions = 0; // Will implement when transactions API is available

  // Mock data for charts
  const loanTrends = [
    { name: 'Jan', value: 4000 },
    { name: 'Feb', value: 3000 },
    { name: 'Mar', value: 2000 },
    { name: 'Apr', value: 2780 },
    { name: 'May', value: 1890 },
    { name: 'Jun', value: 2390 },
  ];

  const transactionVolume = [
    { name: 'Mon', value: 2400 },
    { name: 'Tue', value: 1398 },
    { name: 'Wed', value: 9800 },
    { name: 'Thu', value: 3908 },
    { name: 'Fri', value: 4800 },
    { name: 'Sat', value: 3800 },
    { name: 'Sun', value: 4300 },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">แดชบอร์ด</h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">กำลังโหลดข้อมูลแดชบอร์ด...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">แดชบอร์ด</h1>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <div className="text-sm text-red-800">ข้อผิดพลาด: {error}</div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ลูกค้าทั้งหมด</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalClients, {
              decimalPlaces: 0
            })}</div>
            <p className="text-xs text-muted-foreground">ลูกค้าที่ลงทะเบียน</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">เงินกู้ทั้งหมด</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalLoans, {
              decimalPlaces: 0
            })}</div>
            <p className="text-xs text-muted-foreground">สัญญาเงินกู้ที่ใช้งานอยู่</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ยอดคงเหลือ</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(outstandingBalance)}</div>
            <p className="text-xs text-muted-foreground">ยอดคงเหลือทั้งหมด</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">รายการวันนี้</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(todayTransactions, {
              decimalPlaces: 0
            })}</div>
            <p className="text-xs text-muted-foreground">รายการทำรายการวันนี้</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>แนวโน้มการกู้</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={loanTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>ปริมาณรายการ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={transactionVolume}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
