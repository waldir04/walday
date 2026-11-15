import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'

export interface RemoveScheduleDialogProps {
  open: boolean
  taskTitle: string
  pending: boolean
  onConfirm: () => Promise<boolean>
  onClose: () => void
}

export function RemoveScheduleDialog({
  open,
  taskTitle,
  pending,
  onConfirm,
  onClose,
}: RemoveScheduleDialogProps) {
  const { t } = useTranslation('agenda')

  return (
    <ConfirmDialog
      open={open}
      heading={t('dialog.removeTitle')}
      description={t('dialog.removeMessage', { title: taskTitle })}
      confirmLabel={pending ? t('dialog.pending') : t('dialog.removeConfirm')}
      cancelLabel={t('dialog.cancel')}
      onConfirm={() => {
        if (pending) return
        void onConfirm().then((saved) => {
          if (saved) onClose()
        })
      }}
      onCancel={onClose}
      danger
    />
  )
}
