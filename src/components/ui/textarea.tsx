import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex field-sizing-content min-h-16 w-full rounded-[var(--input-radius)] border-0 bg-[var(--input-background)] px-3 py-3 text-sm transition-colors outline-none hover:bg-[var(--input-background-hover)] focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:bg-[var(--input-background)] aria-invalid:ring-2 aria-invalid:ring-destructive/40 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
