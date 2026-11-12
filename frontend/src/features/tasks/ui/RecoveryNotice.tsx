import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { quarantineTotal, type QuarantineSummary } from '@/entities/task'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'

export interface RecoveryNoticeProps {
  quarantine: QuarantineSummary | null
  unsupported: boolean
  pending: boolean
  onDiscard: () => void
  onCancelDiscard: () => void
  onDialogActiveChange?: (_active: boolean) => void
}

export function RecoveryNotice({
  quarantine,
  unsupported,
  pending,
  onDiscard,
  onCancelDiscard,
  onDialogActiveChange,
}: RecoveryNoticeProps) {
  const { t } = useTranslation('tasks')
  const [confirming, setConfirming] = useState(false)

  if (unsupported) {
    return (
      <section
        role="alert"
        aria-labelledby="recovery-heading"
        className="rounded-card border border-warning bg-surface p-section"
      >
        <h2
          id="recovery-heading"
          className="text-title font-semibold text-warning"
        >
          {t('recovery.unsupportedHeading')}
        </h2>
        <p className="mt-1 text-body text-text">
          {t('recovery.unsupportedDescription')}
        </p>
      </section>
    )
  }

  const count = quarantine ? quarantineTotal(quarantine) : 0
  if (count === 0) return null

  function openConfirmation() {
    setConfirming(true)
    onDialogActiveChange?.(true)
  }

  function closeConfirmation() {
    setConfirming(false)
    onDialogActiveChange?.(false)
  }

  return (
    <section
      role="alert"
      aria-labelledby="recovery-heading"
      className="rounded-card border border-warning bg-surface p-section"
    >
      <h2
        id="recovery-heading"
        className="text-title font-semibold text-warning"
      >
        {t('recovery.heading')}
      </h2>
      <p className="mt-1 text-body text-text">
        {t('recovery.count', { count })}
      </p>
      <div className="mt-3">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={openConfirmation}
        >
          {t('recovery.discard')}
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        heading={t('recovery.confirmHeading')}
        description={<p>{t('recovery.confirmMessage', { count })}</p>}
        confirmLabel={t('recovery.confirm')}
        cancelLabel={t('recovery.cancel')}
        danger
        onConfirm={() => {
          closeConfirmation()
          onDiscard()
        }}
        onCancel={() => {
          closeConfirmation()
          onCancelDiscard()
        }}
      />
    </section>
  )
}
