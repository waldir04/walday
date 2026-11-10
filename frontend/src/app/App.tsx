import { AppRouter } from './router'
import { PreferencesProvider } from '../features/user-preferences/model/preferencesContext'

export function App() {
  return (
    <PreferencesProvider>
      <AppRouter />
    </PreferencesProvider>
  )
}
