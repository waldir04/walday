import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'

export interface DeleteTaskDialogProps {
  open: boolean
  taskTitle: string
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteTaskDialog({
  open,
  taskTitle,
  onConfirm,
  onCancel,
}: DeleteTaskDialogProps) {
  const { t } = useTranslation('tasks')

  return (
    <ConfirmDialog
      open={open}
      heading={t('delete.heading')}
      description={<p>{t('delete.message', { title: taskTitle })}</p>}
      confirmLabel={t('delete.confirm')}
      cancelLabel={t('delete.cancel')}
      danger
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
