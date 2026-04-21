'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void
  confirmLabel?: string
  isLoading?: boolean
  variant?: 'destructive' | 'default'
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel = 'Confirm',
  isLoading = false,
  variant = 'destructive',
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        style={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 8px 40px rgba(27,45,91,0.14)' }}
      >
        <DialogHeader className="gap-3">
          {variant === 'destructive' && (
            <div
              className="flex size-11 items-center justify-center rounded-xl mx-auto"
              style={{ background: 'rgba(192,57,43,0.08)' }}
            >
              <AlertTriangle className="size-5" style={{ color: '#C0392B' }} />
            </div>
          )}
          <DialogTitle className="font-heading text-xl text-center" style={{ color: '#1B2D5B' }}>
            {title}
          </DialogTitle>
          <DialogDescription className="text-center text-sm" style={{ color: '#7A8BA8' }}>
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2 mt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="flex-1"
            style={{ borderColor: 'rgba(27,45,91,0.12)', color: '#7A8BA8' }}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1"
            style={
              variant === 'destructive'
                ? { background: '#C0392B', color: '#fff' }
                : { background: '#1B2D5B', color: '#F8F0E8' }
            }
          >
            {isLoading ? 'Please wait…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
