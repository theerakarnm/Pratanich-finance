import * as React from "react"
import { CalendarIcon } from "lucide-react"
import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

dayjs.extend(customParseFormat)

interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

function formatDate(date: Date | undefined) {
  if (!date) {
    return ""
  }

  return dayjs(date).format("DD/MM/YYYY")
}



export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className,
  disabled = false,
  startYear = new Date().getFullYear() - 100,
  endYear = new Date().getFullYear() + 100,
}: DatePickerProps & { startYear?: number; endYear?: number }) {
  const [open, setOpen] = React.useState(false)
  const [alertOpen, setAlertOpen] = React.useState(false)
  const [month, setMonth] = React.useState<Date | undefined>(value)
  const [inputValue, setInputValue] = React.useState("")

  // Sync input value when prop value changes
  React.useEffect(() => {
    setInputValue(formatDate(value))
    if (value) {
      setMonth(value)
    }
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = (e.target as HTMLInputElement).value
    setInputValue(val)
  }

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue === "") {
        onChange?.(undefined)
        return
      }

      // Only validate if the input value is different from the current prop value formatted
      // This prevents validation loop when the prop value updates the input
      if (inputValue === formatDate(value)) {
        return
      }

      const date = dayjs(inputValue, "DD/MM/YYYY", true)
      if (date.isValid()) {
        setMonth(date.toDate())
        onChange?.(date.toDate())
      } else {
        // Only show toast if user has typed something (length check to avoid annoying toasts on partial input)
        if (inputValue.length >= 10) {
          toast("Invalid date format", {
            duration: 5000,
          })
        }
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [inputValue, onChange, value])

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative flex gap-2">
        <Input
          value={inputValue}
          placeholder={placeholder}
          className="bg-background pr-10"
          disabled={disabled}
          onInput={handleInputChange}
          onClick={(e) => {
            e.preventDefault()
            setOpen(true)
          }}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
              disabled={disabled}
            >
              <CalendarIcon className="size-3.5" />
              <span className="sr-only">Select date</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden p-0"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            <Calendar
              mode="single"
              selected={value}
              captionLayout="dropdown"
              fromYear={startYear}
              toYear={endYear}
              month={month}
              onMonthChange={setMonth}
              onSelect={(date) => {
                setInputValue(formatDate(date))
                onChange?.(date)
                setOpen(false)
              }}
            />
            <div className="p-3 border-t border-border">
              <Button
                variant="ghost"
                className="w-full justify-start text-left font-normal"
                onClick={() => {
                  const today = new Date()
                  setMonth(today)
                  setInputValue(formatDate(today))
                  onChange?.(today)
                  setOpen(false)
                }}
              >
                Today
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Invalid Date Format</AlertDialogTitle>
              <AlertDialogDescription>
                Please enter a valid date in DD/MM/YYYY format.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={() => {
                  setAlertOpen(false)
                  setInputValue(formatDate(value))
                }}
              >
                OK
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
