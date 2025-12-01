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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export function LoanContractForm({ initialData, onSubmit, isEditing = false, clients = [] }: LoanContractFormProps) {
  const form = useForm<LoanContractFormValues>({
    resolver: zodResolver(loanContractSchema) as any,
    defaultValues: initialData || {
      contract_number: "",
      loan_type: "Personal Loan",
      principal_amount: 0,
      approved_amount: 0,
      interest_rate: 15,
      term_months: 12,
      installment_amount: 0,
      contract_start_date: "",
      contract_end_date: "",
      due_day: 1,
      contract_status: "Active",
      outstanding_balance: 0,
      overdue_days: 0,
      client_id: "",
    },
  });

  return (
    <Card className="w-full mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? "แก้ไขสัญญาเงินกู้" : "สร้างสัญญาเงินกู้ใหม่"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ลูกค้า</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditing}>
                      <FormControl>
                        <SelectTrigger className="w-full">
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
                    <FormLabel>เลขที่สัญญา</FormLabel>
                    <FormControl>
                      <Input placeholder="LN2023110001" {...field} />
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
                    <FormLabel>ประเภทสินเชื่อ</FormLabel>
                    <FormControl>
                      <Input placeholder="สินเชื่อส่วนบุคคล" {...field} />
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
                    <FormLabel>สถานะ</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="เลือกสถานะ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Active">ปกติ</SelectItem>
                        <SelectItem value="Closed">ปิดบัญชี</SelectItem>
                        <SelectItem value="Overdue">ค้างชำระ</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="principal_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ยอดเงินต้น</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
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
                    <FormLabel>ยอดอนุมัติ</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
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
                    <FormLabel>อัตราดอกเบี้ย (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
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
                    <FormLabel>ระยะเวลา (เดือน)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
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
                    <FormLabel>ยอดผ่อนชำระ</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
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
                    <FormLabel>วันครบกำหนดชำระ</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="31" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contract_start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>วันเริ่มสัญญา</FormLabel>
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
                    <FormLabel>วันสิ้นสุดสัญญา</FormLabel>
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
                name="outstanding_balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ยอดคงเหลือ</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
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
                    <FormLabel>จำนวนวันที่ค้างชำระ</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => window.history.back()}>
                ยกเลิก
              </Button>
              <Button type="submit">{isEditing ? "บันทึกการแก้ไข" : "สร้างสัญญา"}</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
