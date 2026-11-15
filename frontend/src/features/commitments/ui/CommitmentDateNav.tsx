import { useTranslation } from 'react-i18next'
import { DateNav } from '@/shared/ui/DateNav'

export interface CommitmentDateNavProps {
  date: string
  onChange: (_date: string) => void
}

export function CommitmentDateNav({ date, onChange }: CommitmentDateNavProps) {
  const { t } = useTranslation('commitments')

  return (
    <DateNav
      date={date}
      onChange={onChange}
      labels={{
        label: t('commitments.dateNav.label'),
        previous: t('commitments.dateNav.previous'),
        next: t('commitments.dateNav.next'),
        today: t('commitments.dateNav.today'),
      }}
    />
  )
}
