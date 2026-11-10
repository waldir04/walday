import { useTranslation } from 'react-i18next'

export function HomePage() {
  const { t } = useTranslation()
  return <h1 className="text-2xl font-semibold">{t('app.name')}</h1>
}
