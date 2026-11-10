import { useTranslation } from 'react-i18next'

export function NotFoundPage() {
  const { t } = useTranslation()
  return <h1 className="text-2xl font-semibold">{t('notFound.title')}</h1>
}
