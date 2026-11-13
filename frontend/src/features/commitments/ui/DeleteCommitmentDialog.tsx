import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'

export interface DeleteCommitmentDialogProps {
  open: boolean
  title: string
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteCommitmentDialog({
  open,
  title,
  onConfirm,
  onCancel,
}: DeleteCommitmentDialogProps) {
  const { t } = useTranslation('commitments')

  return (
    <ConfirmDialog
      open={open}
      heading={t('commitments.confirmDelete.heading')}
      description={t('commitments.confirmDelete.description', { title })}
      confirmLabel={t('commitments.confirmDelete.confirm')}
      cancelLabel={t('commitments.confirmDelete.cancel')}
      onConfirm={onConfirm}
      onCancel={onCancel}
      danger
    />
  )
}
