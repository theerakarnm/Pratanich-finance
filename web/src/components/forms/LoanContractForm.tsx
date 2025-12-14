import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
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

// Live preview component for loan summary
// function LoanPreviewCard({
//   principal,
//   interestRate,
//   termMonths,
//   installmentAmount,
// }: {
//   principal: number | string;
//   interestRate: number | string;
//   termMonths: number | string;
//   installmentAmount: number | string;
// }) {
//   const calculations = useMemo(() => {
//     const p = Number(principal) || 0;
//     const r = Number(interestRate) || 0;
//     const t = Number(termMonths) || 0;
//     const i = Number(installmentAmount) || 0;

//     if (!p || !r || !t) {
//       return { monthlyPayment: 0, totalInterest: 0, totalRepayment: 0 };
//     }

//     // Simple interest calculation: Total = Principal + (Principal × Rate × Time)
//     const totalInterest = (p * (r / 100) * (t / 12));
//     const totalRepayment = p + totalInterest;
//     const monthlyPayment = i > 0 ? i : totalRepayment / t;

//     return { monthlyPayment, totalInterest, totalRepayment };
//   }, [principal, interestRate, termMonths, installmentAmount]);

//   const formatCurrency = (value: number) => {
//     return new Intl.NumberFormat('th-TH', {
//       minimumFractionDigits: 2,
//       maximumFractionDigits: 2,
//     }).format(value);
//   };

//   return (
//     <Card className="bg-linear-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 shadow-lg sticky top-6">
//       <CardHeader className="pb-4">
//         <CardTitle className="text-lg flex items-center gap-2">
//           <span className="text-2xl">📊</span>
//           สรุปสัญญา
//         </CardTitle>
//         <CardDescription>
//           คำนวณอัตโนมัติจากข้อมูลที่กรอก
//         </CardDescription>
//       </CardHeader>
//       <CardContent className="space-y-6">
//         {/* Monthly Payment - Hero Number */}
//         <div className="bg-primary rounded-xl p-5 text-primary-foreground text-center shadow-md">
//           <p className="text-xs uppercase tracking-wider opacity-90 mb-1">ยอดผ่อนชำระต่อเดือน</p>
//           <p className="text-3xl font-bold tracking-tight">
//             ฿{formatCurrency(calculations.monthlyPayment)}
//           </p>
//         </div>

//         {/* Other Stats */}
//         <div className="grid grid-cols-1 gap-4">
//           <div className="bg-background/60 rounded-lg p-4 border border-border/50">
//             <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">ยอดเงินต้น</p>
//             <p className="text-lg font-semibold text-foreground">฿{formatCurrency(Number(principal) || 0)}</p>
//           </div>
//           <div className="bg-background/60 rounded-lg p-4 border border-border/50">
//             <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">ดอกเบี้ยรวม</p>
//             <p className="text-lg font-semibold text-amber-600">฿{formatCurrency(calculations.totalInterest)}</p>
//           </div>
//           <div className="bg-background/60 rounded-lg p-4 border border-border/50">
//             <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">ยอดชำระรวมทั้งหมด</p>
//             <p className="text-lg font-semibold text-foreground">฿{formatCurrency(calculations.totalRepayment)}</p>
//           </div>
//         </div>

//         {/* Duration Badge */}
//         <div className="flex items-center justify-center gap-2 text-muted-foreground">
//           <span className="text-lg">🗓️</span>
//           <span className="text-sm">ระยะเวลา {termMonths || 0} เดือน</span>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }

export function LoanContractForm({ initialData, onSubmit, isEditing = false, clients = [] }: LoanContractFormProps) {
  const form = useForm<LoanContractFormValues>({
    resolver: zodResolver(loanContractSchema) as any,
    defaultValues: initialData || {
      contract_number: "",
      loan_type: "Personal Loan",
      principal_amount: "" as unknown as number,
      approved_amount: "" as unknown as number,
      interest_rate: "" as unknown as number,
      term_months: "" as unknown as number,
      installment_amount: "" as unknown as number,
      contract_start_date: "",
      contract_end_date: "",
      due_day: 1,
      contract_status: "Active",
      outstanding_balance: "" as unknown as number,
      overdue_days: 0,
      client_id: "",
    },
  });

  // Watch values for live preview
  const principalAmount = form.watch("principal_amount");

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
    if (termMonths > 0) {
      const installment = Number(form.watch("installment_amount")) || 0;
      if (installment === 0) {
        form.setValue("installment_amount", Number((principalAmount / termMonths).toFixed(2)));
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
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-xs uppercase tracking-wide">ลูกค้า</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditing}>
                            <FormControl>
                              <SelectTrigger className="h-10 rounded-lg w-full">
                                <SelectValue placeholder="เลือกลูกค้า" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clients.map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.first_name} {client.last_name} ({client.citizen_id})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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

                    <FormField
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
                    />

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
