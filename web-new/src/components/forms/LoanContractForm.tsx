import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputWithAdornment } from "@/components/ui/input-with-adornment";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

const loanContractSchema = z.object({
  contract_number: z.string().min(1, "กรุณากรอกเลขที่สัญญา"),
  loan_type: z.string().min(1, "กรุณาเลือกประเภทเงินกู้"),
  principal_amount: z.coerce.number().min(1, "จำนวนเงินต้นต้องมากกว่า 0"),
  approved_amount: z.coerce.number().min(1, "จำนวนเงินที่อนุมัติต้องมากกว่า 0"),
  interest_rate: z.coerce.number().min(0, "อัตราดอกเบี้ยต้องเป็นค่าบวก"),
  term_months: z.coerce.number().min(1, "ระยะเวลาต้องอย่างน้อย 1 เดือน"),
  installment_amount: z.coerce.number().min(0, "จำนวนเงินผ่อนต้องเป็นค่าบวก"),
  contract_start_date: z.string().min(1, "กรุณากรอกวันเริ่มต้นสัญญา"),
  contract_end_date: z.string().min(1, "กรุณากรอกวันสิ้นสุดสัญญา"),
  due_day: z.coerce.number().min(1).max(31, "วันที่ชำระต้องอยู่ระหว่าง 1 ถึง 31"),
  contract_status: z.enum(["Active", "Closed", "Overdue"]),
  outstanding_balance: z.coerce.number().min(0, "ยอดคงเหลือต้องเป็นค่าบวก"),
  overdue_days: z.coerce.number().min(0, "จำนวนวันที่ค้างชำระต้องเป็นค่าบวก"),
  client_id: z.string().min(1, "กรุณาเลือกลูกค้า"),
  license_plate: z.string().optional().nullable(),
  engine_number: z.string().optional().nullable(),
});

export type LoanContractFormValues = z.infer<typeof loanContractSchema>;

interface LoanContractFormProps {
  initialData?: LoanContractFormValues;
  onSubmit: (data: LoanContractFormValues) => void;
  isEditing?: boolean;
  clients?: { id: string; first_name: string; last_name: string; citizen_id: string }[];
}

// Section header component for visual grouping
function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-1 pb-2">
      <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase">{title}</h3>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

export function LoanContractForm({ initialData, onSubmit, isEditing = false, clients = [] }: LoanContractFormProps) {
  const form = useForm<LoanContractFormValues>({
    resolver: zodResolver(loanContractSchema) as any,
    defaultValues: initialData || {
      contract_number: "",
      loan_type: "Personal Loan",
      principal_amount: "" as unknown as number,
      approved_amount: "" as unknown as number,
      interest_rate: 24,
      term_months: "" as unknown as number,
      installment_amount: "" as unknown as number,
      contract_start_date: "",
      contract_end_date: "",
      due_day: 1,
      contract_status: "Active",
      outstanding_balance: "" as unknown as number,
      overdue_days: 0,
      client_id: "",
      license_plate: "",
      engine_number: "",
    },
  });

  // State for client search combobox
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");

  // Filter clients based on search query (by name or citizen_id)
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) {
      return clients;
    }
    const query = clientSearchQuery.toLowerCase().trim();
    return clients.filter((client) => {
      const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
      const citizenId = client.citizen_id.toLowerCase();
      return fullName.includes(query) || citizenId.includes(query);
    });
  }, [clients, clientSearchQuery]);

  // Get selected client display name
  const selectedClient = useMemo(() => {
    const clientId = form.watch("client_id");
    return clients.find((c) => c.id === clientId);
  }, [clients, form.watch("client_id")]);

  // Watch values for live preview
  const principalAmount = form.watch("principal_amount");
  const watchedApprovedAmount = form.watch("approved_amount");
  const watchedInterestRate = form.watch("interest_rate");
  const watchedTermMonths = form.watch("term_months");
  const watchedStartDate = form.watch("contract_start_date");

  // Calculate amortization schedule
  interface AmortizationRow {
    paymentNumber: number;
    paymentDate: Date;
    principal: number;
    interest: number;
    payment: number;
    remainingBalance: number;
  }

  const amortizationSchedule = useMemo<AmortizationRow[]>(() => {
    const approvedAmount = Number(watchedApprovedAmount) || 0;
    const annualInterestRate = Number(watchedInterestRate) || 0;
    const termMonths = Number(watchedTermMonths) || 0;
    const startDate = watchedStartDate ? new Date(watchedStartDate) : new Date();

    if (approvedAmount <= 0 || termMonths <= 0) {
      return [];
    }

    const schedule: AmortizationRow[] = [];
    let balance = approvedAmount;
    const monthlyInterestRate = annualInterestRate / 12 / 100;

    // Calculate monthly payment
    let monthlyPayment: number;
    if (annualInterestRate === 0) {
      monthlyPayment = approvedAmount / termMonths;
    } else {
      const compoundFactor = Math.pow(1 + monthlyInterestRate, termMonths);
      monthlyPayment = approvedAmount * (monthlyInterestRate * compoundFactor) / (compoundFactor - 1);
    }

    for (let i = 1; i <= termMonths; i++) {
      const interestPayment = balance * monthlyInterestRate;
      const principalPayment = monthlyPayment - interestPayment;
      balance = Math.max(0, balance - principalPayment);

      // Calculate payment date (add i months to start date)
      const paymentDate = new Date(startDate);
      paymentDate.setMonth(paymentDate.getMonth() + i);

      schedule.push({
        paymentNumber: i,
        paymentDate,
        principal: principalPayment,
        interest: interestPayment,
        payment: monthlyPayment,
        remainingBalance: balance,
      });
    }

    return schedule;
  }, [watchedApprovedAmount, watchedInterestRate, watchedTermMonths, watchedStartDate]);

  function handlePrincipalAmountBlur() {
    const principal = Number(principalAmount) || 0;
    if (principal > 0) {
      const approved = Number(form.watch("approved_amount")) || 0;
      const outstanding = Number(form.watch("outstanding_balance")) || 0;
      if (approved === 0) {
        form.setValue("approved_amount", principal);
      }
      if (outstanding === 0) {
        form.setValue("outstanding_balance", principal);
      }
    }
  }

  function handleTermMonthsBlur() {
    const termMonths = Number(form.watch("term_months")) || 0;
    const approvedAmount = Number(form.watch("approved_amount")) || 0;
    const annualInterestRate = Number(form.watch("interest_rate")) || 0;

    if (termMonths > 0 && approvedAmount > 0) {
      const installment = Number(form.watch("installment_amount")) || 0;
      if (installment === 0) {
        let calculatedInstallment: number;

        if (annualInterestRate === 0) {
          // Simple division if no interest
          calculatedInstallment = approvedAmount / termMonths;
        } else {
          // Loan amortization formula: M = P × [r(1+r)^n] / [(1+r)^n - 1]
          // Where: P = principal, r = monthly interest rate, n = term in months
          const monthlyInterestRate = annualInterestRate / 12 / 100;
          const compoundFactor = Math.pow(1 + monthlyInterestRate, termMonths);
          calculatedInstallment = approvedAmount * (monthlyInterestRate * compoundFactor) / (compoundFactor - 1);
        }

        form.setValue("installment_amount", Number(calculatedInstallment.toFixed(2)));
      }
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Form Column */}
      <div className="lg:col-span-3">
        <Card className="shadow-xl border-0 bg-white">
          <CardHeader className="border-b pb-6">
            <CardTitle className="text-2xl">{isEditing ? "แก้ไขสัญญาเงินกู้" : "สร้างสัญญาเงินกู้ใหม่"}</CardTitle>
            <CardDescription>
              กรอกรายละเอียดสัญญาเงินกู้ด้านล่าง ระบบจะคำนวณยอดผ่อนชำระอัตโนมัติ
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                {/* Section A: Borrower Info */}
                <section className="space-y-4">
                  <SectionHeader title="ข้อมูลผู้กู้" description="ข้อมูลลูกค้าและรายละเอียดสัญญา" />
                  <Separator className="mb-4" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="client_id"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-muted-foreground text-xs uppercase tracking-wide">ลูกค้า</FormLabel>
                          <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                aria-expanded={clientPopoverOpen}
                                className={cn(
                                  "h-10 w-full justify-between rounded-lg font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                disabled={isEditing}
                              >
                                {selectedClient
                                  ? `${selectedClient.first_name} ${selectedClient.last_name} (${selectedClient.citizen_id})`
                                  : "ค้นหาลูกค้าด้วยชื่อหรือเลขบัตรประชาชน..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start">
                              <Command shouldFilter={false}>
                                <CommandInput
                                  placeholder="ค้นหาชื่อหรือเลขบัตรประชาชน..."
                                  value={clientSearchQuery}
                                  onValueChange={setClientSearchQuery}
                                />
                                <CommandList>
                                  <CommandEmpty>ไม่พบลูกค้า</CommandEmpty>
                                  <CommandGroup>
                                    {filteredClients.map((client) => (
                                      <CommandItem
                                        key={client.id}
                                        value={client.id}
                                        onSelect={() => {
                                          field.onChange(client.id);
                                          setClientPopoverOpen(false);
                                          setClientSearchQuery("");
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === client.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <div className="flex flex-col">
                                          <span className="font-medium">
                                            {client.first_name} {client.last_name}
                                          </span>
                                          <span className="text-xs text-muted-foreground">
                                            {client.citizen_id}
                                          </span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contract_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-xs uppercase tracking-wide">เลขที่สัญญา</FormLabel>
                          <FormControl>
                            <Input placeholder="LN2023110001" className="h-10 rounded-lg" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* <FormField
                      control={form.control}
                      name="loan_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-xs uppercase tracking-wide">ประเภทสินเชื่อ</FormLabel>
                          <FormControl>
                            <Input placeholder="สินเชื่อส่วนบุคคล" className="h-10 rounded-lg" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    /> */}

                    <FormField
                      control={form.control}
                      name="contract_status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-xs uppercase tracking-wide">สถานะ</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-10 rounded-lg">
                                <SelectValue placeholder="เลือกสถานะ" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Active">
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                  ปกติ
                                </span>
                              </SelectItem>
                              <SelectItem value="Closed">
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                                  ปิดบัญชี
                                </span>
                              </SelectItem>
                              <SelectItem value="Overdue">
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                  ค้างชำระ
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="license_plate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-xs uppercase tracking-wide">ทะเบียนรถ</FormLabel>
                          <FormControl>
                            <Input placeholder="กข 1234 กทม" className="h-10 rounded-lg" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="engine_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-xs uppercase tracking-wide">เลขเครื่อง</FormLabel>
                          <FormControl>
                            <Input placeholder="EX-12345678" className="h-10 rounded-lg" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </section>

                {/* Section B: Financial Terms */}
                <section className="space-y-4">
                  <SectionHeader title="เงื่อนไขทางการเงิน" description="ยอดเงินต้น อัตราดอกเบี้ย และระยะเวลา" />
                  <Separator className="mb-4" />

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="principal_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-xs uppercase tracking-wide">ยอดเงินต้น</FormLabel>
                          <FormControl>
                            <InputWithAdornment
                              type="number"
                              step="0.01"
                              trailingAdornment="บาท"
                              placeholder="0.00"
                              {...field}
                              onBlur={handlePrincipalAmountBlur}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="approved_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-xs uppercase tracking-wide">ยอดอนุมัติ</FormLabel>
                          <FormControl>
                            <InputWithAdornment
                              type="number"
                              step="0.01"
                              trailingAdornment="บาท"
                              placeholder="0.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="interest_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-xs uppercase tracking-wide">อัตราดอกเบี้ย</FormLabel>
                          <FormControl>
                            <InputWithAdornment
                              type="number"
                              step="0.01"
                              trailingAdornment="%"
                              placeholder="0.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="term_months"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-xs uppercase tracking-wide">ระยะเวลา (เดือน)</FormLabel>
                          <FormControl>
                            <InputWithAdornment
                              type="number"
                              trailingAdornment="เดือน"
                              placeholder="12, 24, 36"
                              {...field}
                              onBlur={handleTermMonthsBlur}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="installment_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-xs uppercase tracking-wide">ยอดผ่อนชำระ</FormLabel>
                          <FormControl>
                            <InputWithAdornment
                              type="number"
                              step="0.01"
                              trailingAdornment="บาท"
                              placeholder="0.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </section>

                {/* Section C: Schedule */}
                <section className="space-y-4">
                  <SectionHeader title="กำหนดการ" description="วันเริ่มต้น สิ้นสุด และวันครบกำหนดชำระ" />
                  <Separator className="mb-4" />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="contract_start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-xs uppercase tracking-wide">วันเริ่มสัญญา</FormLabel>
                          <FormControl>
                            <DatePicker
                              value={field.value ? new Date(field.value) : undefined}
                              onChange={(date) =>
                                field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                              }
                              placeholder="เลือกวันเริ่มต้น"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contract_end_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-xs uppercase tracking-wide">วันสิ้นสุดสัญญา</FormLabel>
                          <FormControl>
                            <DatePicker
                              value={field.value ? new Date(field.value) : undefined}
                              onChange={(date) =>
                                field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                              }
                              placeholder="เลือกวันสิ้นสุด"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="due_day"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-xs uppercase tracking-wide">วันครบกำหนดชำระ</FormLabel>
                          <FormControl>
                            <InputWithAdornment
                              type="number"
                              min="1"
                              max="31"
                              trailingAdornment="ของเดือน"
                              placeholder="1"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </section>

                {/* Section D: Account Status */}
                <section className="space-y-4">
                  <SectionHeader title="สถานะบัญชี" description="ยอดคงเหลือและวันค้างชำระ" />
                  <Separator className="mb-4" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="outstanding_balance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-xs uppercase tracking-wide">ยอดคงเหลือ</FormLabel>
                          <FormControl>
                            <InputWithAdornment
                              type="number"
                              step="0.01"
                              trailingAdornment="บาท"
                              placeholder="0.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="overdue_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-xs uppercase tracking-wide">จำนวนวันที่ค้างชำระ</FormLabel>
                          <FormControl>
                            <InputWithAdornment
                              type="number"
                              trailingAdornment="วัน"
                              placeholder="0"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </section>

                {/* Section E: Amortization Preview */}
                {amortizationSchedule.length > 0 && (
                  <section className="space-y-4">
                    <SectionHeader title="ตารางผ่อนชำระ" description="ตัวอย่างตารางการผ่อนชำระรายเดือน" />
                    <Separator className="mb-4" />

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground">ยอดกู้</p>
                        <p className="text-lg font-bold text-blue-700">
                          {Number(watchedApprovedAmount).toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground">ผ่อนต่อเดือน</p>
                        <p className="text-lg font-bold text-green-700">
                          {amortizationSchedule[0]?.payment.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                        </p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground">ดอกเบี้ยรวม</p>
                        <p className="text-lg font-bold text-orange-700">
                          {amortizationSchedule.reduce((sum, row) => sum + row.interest, 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                        </p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground">ยอดรวมทั้งหมด</p>
                        <p className="text-lg font-bold text-purple-700">
                          {(amortizationSchedule[0]?.payment * amortizationSchedule.length).toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                        </p>
                      </div>
                    </div>

                    {/* Amortization Table */}
                    <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">งวดที่</th>
                            <th className="px-3 py-2 text-left font-medium">วันที่ชำระ</th>
                            <th className="px-3 py-2 text-right font-medium">เงินต้น</th>
                            <th className="px-3 py-2 text-right font-medium">ดอกเบี้ย</th>
                            <th className="px-3 py-2 text-right font-medium">ยอดชำระ</th>
                            <th className="px-3 py-2 text-right font-medium">คงเหลือ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {amortizationSchedule.map((row) => (
                            <tr key={row.paymentNumber} className="hover:bg-muted/30">
                              <td className="px-3 py-2 font-medium">{row.paymentNumber}</td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {format(row.paymentDate, "dd/MM/yyyy")}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {row.principal.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-right text-orange-600">
                                {row.interest.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                {row.payment.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-right text-muted-foreground">
                                {row.remainingBalance.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* Submit Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.history.back()}
                    className="h-12 px-8 rounded-xl"
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    className="h-12 px-8 flex-1 rounded-xl text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {isEditing ? "💾 บันทึกการแก้ไข" : "✨ สร้างสัญญา"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Preview Sidebar Column */}
      {/* <div className="lg:col-span-1">
        <LoanPreviewCard
          principal={principalAmount}
          interestRate={interestRate}
          termMonths={termMonths}
          installmentAmount={installmentAmount}
        />
      </div> */}
    </div>
  );
}
