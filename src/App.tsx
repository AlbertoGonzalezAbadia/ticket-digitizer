import { useState } from 'react'
import { CameraScreen } from './app/CameraScreen'
import { ConfirmScreen } from './app/ConfirmScreen'
import { HistoryScreen } from './app/HistoryScreen'
import { SettingsScreen } from './app/SettingsScreen'
import { BottomNav, type Screen } from './components/BottomNav'
import { InstallPrompt } from './components/InstallPrompt'
import { UpdateToast } from './components/UpdateToast'
import { TicketsProvider } from './state/TicketsContext'

function App() {
  const [screen, setScreen] = useState<Screen>('camera')
  const [hasCaptured, setHasCaptured] = useState(false)
  const [confirmingTicketId, setConfirmingTicketId] = useState<string | null>(null)
  const [confirmMode, setConfirmMode] = useState<'capture' | 'edit'>('capture')

  return (
    <TicketsProvider>
      <div className="flex h-full flex-col bg-gradient-to-b from-teal-50 via-teal-50/40 to-white">
        <main className="flex-1 overflow-y-auto">
          {confirmingTicketId ? (
            <ConfirmScreen
              ticketId={confirmingTicketId}
              mode={confirmMode}
              onDone={() => setConfirmingTicketId(null)}
            />
          ) : (
            <>
              {screen === 'camera' && (
                <CameraScreen
                  onCaptured={(ticketId) => {
                    setHasCaptured(true)
                    setConfirmMode('capture')
                    setConfirmingTicketId(ticketId)
                  }}
                />
              )}
              {screen === 'history' && (
                <HistoryScreen
                  onEditTicket={(ticketId) => {
                    setConfirmMode('edit')
                    setConfirmingTicketId(ticketId)
                  }}
                />
              )}
              {screen === 'settings' && <SettingsScreen />}
            </>
          )}
        </main>

        {!confirmingTicketId && <BottomNav active={screen} onChange={setScreen} />}
        <InstallPrompt eligible={hasCaptured} />
        <UpdateToast />
      </div>
    </TicketsProvider>
  )
}

export default App
