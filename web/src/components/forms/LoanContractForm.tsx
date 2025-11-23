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
  contract_number: z.string().min(1, "Contract number is required"),
  loan_type: z.string().min(1, "Loan type is required"),
  principal_amount: z.coerce.number().min(1, "Principal amount must be greater than 0"),
  approved_amount: z.coerce.number().min(1, "Approved amount must be greater than 0"),
  interest_rate: z.coerce.number().min(0, "Interest rate must be positive"),
  term_months: z.coerce.number().min(1, "Term must be at least 1 month"),
  installment_amount: z.coerce.number().min(0, "Installment amount must be positive"),
  contract_start_date: z.string().min(1, "Start date is required"),
  contract_end_date: z.string().min(1, "End date is required"),
  due_day: z.coerce.number().min(1).max(31, "Due day must be between 1 and 31"),
  contract_status: z.enum(["Active", "Closed", "Overdue"]),
  outstanding_balance: z.coerce.number().min(0, "Outstanding balance must be positive"),
  overdue_days: z.coerce.number().min(0, "Overdue days must be positive"),
  client_id: z.string().min(1, "Client is required"),
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
        <CardTitle>{isEditing ? "Edit Loan Contract" : "Create New Loan Contract"}</CardTitle>
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
                    <FormLabel>Client</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditing}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select client" />
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
                    <FormLabel>Contract Number</FormLabel>
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
                    <FormLabel>Loan Type</FormLabel>
                    <FormControl>
                      <Input placeholder="Personal Loan" {...field} />
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
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                        <SelectItem value="Overdue">Overdue</SelectItem>
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
                    <FormLabel>Principal Amount</FormLabel>
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
                    <FormLabel>Approved Amount</FormLabel>
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
                    <FormLabel>Interest Rate (%)</FormLabel>
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
                    <FormLabel>Term (Months)</FormLabel>
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
                    <FormLabel>Installment Amount</FormLabel>
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
                    <FormLabel>Due Day</FormLabel>
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
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value ? new Date(field.value) : undefined}
                        onChange={(date) =>
                          field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                        }
                        placeholder="Pick a start date"
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
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value ? new Date(field.value) : undefined}
                        onChange={(date) =>
                          field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                        }
                        placeholder="Pick an end date"
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
                    <FormLabel>Outstanding Balance</FormLabel>
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
                    <FormLabel>Overdue Days</FormLabel>
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
                Cancel
              </Button>
              <Button type="submit">{isEditing ? "Update Contract" : "Create Contract"}</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
