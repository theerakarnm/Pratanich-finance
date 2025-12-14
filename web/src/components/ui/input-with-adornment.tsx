import { cn } from "@/lib/utils"
import { forwardRef } from "preact/compat"

interface InputWithAdornmentProps extends React.ComponentProps<"input"> {
  leadingAdornment?: React.ReactNode;
  trailingAdornment?: React.ReactNode;
}

const InputWithAdornment = forwardRef<HTMLInputElement, InputWithAdornmentProps>(
  ({ className, type, leadingAdornment, trailingAdornment, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {leadingAdornment && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium pointer-events-none select-none z-10">
            {leadingAdornment}
          </div>
        )}
        <input
          type={type}
          data-slot="input"
          className={cn(
            "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-10 w-full min-w-0 rounded-lg border bg-transparent py-2 text-base shadow-xs transition-all duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-primary focus-visible:ring-primary/30 focus-visible:ring-[3px] focus-visible:shadow-md",
            "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
            leadingAdornment ? "pl-11" : "px-3",
            trailingAdornment ? "pr-14" : "px-3",
            leadingAdornment && !trailingAdornment && "pr-3",
            trailingAdornment && !leadingAdornment && "pl-3",
            className
          )}
          ref={ref}
          {...props}
        />
        {trailingAdornment && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium pointer-events-none select-none z-10">
            {trailingAdornment}
          </div>
        )}
      </div>
    )
  }
)
InputWithAdornment.displayName = "InputWithAdornment"

export { InputWithAdornment }
