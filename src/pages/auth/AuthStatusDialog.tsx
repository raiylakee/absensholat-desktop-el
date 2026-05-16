import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type AuthStatusDialogProps = {
  open: boolean
  title: string
  description: string
  variant?: "default" | "destructive"
  onClose: () => void
}

export function AuthStatusDialog({ open, title, description, variant = "default", onClose }: AuthStatusDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className={variant === "destructive" ? "text-destructive" : undefined}>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
