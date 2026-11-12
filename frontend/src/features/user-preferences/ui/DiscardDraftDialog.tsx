import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'

export interface DiscardDraftDialogProps {
  open: boolean
  onDiscard: () => void
  onStay: () => void
}

export function DiscardDraftDialog({
  open,
  onDiscard,
  onStay,
}: DiscardDraftDialogProps) {
  const { t } = useTranslation('preferences')

  return (
    <ConfirmDialog
      open={open}
      heading={t('dialogs.discard.heading')}
      description={t('dialogs.discard.description')}
      confirmLabel={t('dialogs.discard.confirm')}
      cancelLabel={t('dialogs.discard.stay')}
      onConfirm={onDiscard}
      onCancel={onStay}
    />
  )
}
