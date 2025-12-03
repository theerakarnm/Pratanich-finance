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

const clientSchema = z.object({
  citizen_id: z.string().length(13, "เลขบัตรประชาชนต้องมี 13 หลัก"),
  title_name: z.string().min(1, "กรุณากรอกคำนำหน้า"),
  first_name: z.string().min(1, "กรุณากรอกชื่อ"),
  last_name: z.string().min(1, "กรุณากรอกนามสกุล"),
  date_of_birth: z.string().min(1, "กรุณากรอกวันเกิด"), // Keep as string for simplicity for now, can enhance with Calendar later
  mobile_number: z.string().min(10, "เบอร์โทรศัพท์ต้องมีอย่างน้อย 10 หลัก"),
  email: z.email("อีเมลไม่ถูกต้อง").optional(),
  line_id: z.string().optional(),
});

export type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientFormProps {
  initialData?: ClientFormValues;
  onSubmit: (data: ClientFormValues) => void;
  isEditing?: boolean;
}

export function ClientForm({ initialData, onSubmit, isEditing = false }: ClientFormProps) {
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: initialData || {
      citizen_id: "",
      title_name: "",
      first_name: "",
      last_name: "",
      date_of_birth: "",
      mobile_number: "",
      email: "",
      line_id: "",
    },
  });

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? "แก้ไขข้อมูลลูกค้า" : "สร้างลูกค้าใหม่"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, (data) => {
            console.log(data)
          })} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="citizen_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>เลขบัตรประชาชน</FormLabel>
                    <FormControl>
                      <Input placeholder="1234567890123" maxLength={13} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>คำนำหน้า</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="เลือกคำนำหน้า" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Mr.">นาย</SelectItem>
                        <SelectItem value="Mrs.">นาง</SelectItem>
                        <SelectItem value="Ms.">นางสาว</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อ</FormLabel>
                    <FormControl>
                      <Input placeholder="สมชาย" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>นามสกุล</FormLabel>
                    <FormControl>
                      <Input placeholder="ใจดี" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>วันเกิด</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value ? new Date(field.value) : undefined}
                        onChange={(date) => {
                          field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                        }}
                        placeholder="เลือกวันที่"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobile_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>เบอร์โทรศัพท์</FormLabel>
                    <FormControl>
                      <Input placeholder="0812345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>อีเมล</FormLabel>
                    <FormControl>
                      <Input placeholder="somchai@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* <FormField
                control={form.control}
                name="line_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Line ID</FormLabel>
                    <FormControl>
                      <Input placeholder="@johndoe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              /> */}
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => window.history.back()}>
                ยกเลิก
              </Button>
              <Button type="submit">{isEditing ? "อัพเดทข้อมูลลูกค้า" : "สร้างลูกค้า"}</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
