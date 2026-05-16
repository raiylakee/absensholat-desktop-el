import { cn } from "@/lib/utils"
import { SpinnerIcon } from "@phosphor-icons/react"

function Spinner({ className, size = "sm", ...props }: React.ComponentProps<"svg"> & { size?: "sm" | "md" | "lg" }) {
  const sizeValue = size === "lg" ? 32 : size === "md" ? 24 : 16
  return (
    <SpinnerIcon role="status" aria-label="Loading" className={cn("animate-spin", className)} width={sizeValue} height={sizeValue} {...props} />
  )
}

export { Spinner }
