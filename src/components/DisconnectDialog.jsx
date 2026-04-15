import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function DisconnectDialog({ open, onClose, onConfirm }) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Disconnect from GitHub?</DialogTitle>
          <DialogDescription className="pt-2">
            This will delete your saved token and repository from local storage.
            You'll need to reconnect to use Paceboard again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Disconnect</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
