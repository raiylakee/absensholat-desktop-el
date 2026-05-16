import { useState, useMemo } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckIcon, CaretDownIcon } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  disabled?: boolean
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Pilih...",
  searchPlaceholder = "Cari...",
  className,
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filtered = useMemo(
    () => options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase())),
    [options, search]
  )

  const selected = options.find((o) => o.value === value)

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch("") }}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "h-8 w-full justify-between font-normal",
              !selected && "text-muted-foreground",
              className
            )}
            disabled={disabled}
          />
        }
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <CaretDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) min-w-40 p-0" align="start" sideOffset={4}>
        <div className="border-b p-2">
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-sm"
            autoFocus
          />
        </div>
        <div className="max-h-52 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Tidak ditemukan</p>
          ) : (
            filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                  value === option.value && "bg-accent/60"
                )}
                onClick={() => {
                  onValueChange?.(option.value)
                  setOpen(false)
                  setSearch("")
                }}
              >
                <CheckIcon
                  className={cn("size-3.5 shrink-0", value === option.value ? "opacity-100" : "opacity-0")}
                />
                {option.label}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
