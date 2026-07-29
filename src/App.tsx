import { useState } from 'react'
import { CameraScreen } from './app/CameraScreen'
import { HistoryScreen } from './app/HistoryScreen'
import { SettingsScreen } from './app/SettingsScreen'
import { BottomNav, type Screen } from './components/BottomNav'
import { InstallPrompt } from './components/InstallPrompt'
import { UpdateToast } from './components/UpdateToast'
import { TicketsProvider } from './state/TicketsContext'

function App() {
  const [screen, setScreen] = useState<Screen>('camera')
  const [hasCaptured, setHasCaptured] = useState(false)

  return (
    <TicketsProvider>
      <div className="flex h-full flex-col bg-teal-50/40">
        <main className="flex-1 overflow-y-auto">
          {screen === 'camera' && <CameraScreen onCapture={() => setHasCaptured(true)} />}
          {screen === 'history' && <HistoryScreen />}
          {screen === 'settings' && <SettingsScreen />}
        </main>

        <BottomNav active={screen} onChange={setScreen} />
        <InstallPrompt eligible={hasCaptured} />
        <UpdateToast />
      </div>
    </TicketsProvider>
  )
}

export default App
