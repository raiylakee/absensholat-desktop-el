import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export const PASSWORD_REQUIREMENTS = "Minimal 12 karakter, mengandung huruf besar, huruf kecil, angka, dan karakter khusus"

interface PasswordInputProps extends React.ComponentProps<"input"> {
  helperText?: string
}

function PasswordInput({ className, helperText, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = React.useState(false)

  return (
    <div>
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          className={cn("pr-8", className)}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute right-0 top-0 h-full px-2 hover:bg-transparent"
          onClick={() => setShowPassword((prev) => !prev)}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="size-4 text-muted-foreground" />
          ) : (
            <Eye className="size-4 text-muted-foreground" />
          )}
        </Button>
      </div>
      {helperText && (
        <p className="text-xs text-muted-foreground mt-1.5 ml-1">{helperText}</p>
      )}
    </div>
  )
}

export { PasswordInput }
