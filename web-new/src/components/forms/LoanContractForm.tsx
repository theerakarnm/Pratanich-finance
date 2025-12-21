import * as React from "react";
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
