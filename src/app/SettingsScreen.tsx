import { useState } from 'react'
import { Button } from '../components/Button'
import { isSignedIn, signIn, signOut } from '../lib/google/auth'

export function SettingsScreen() {
  const [connected, setConnected] = useState(isSignedIn())
  const [status, setStatus] = useState<'idle' | 'connecting' | 'error'>('idle')

  const handleConnect = async () => {
    setStatus('connecting')
    try {
      await signIn()
      setConnected(true)
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  const handleDisconnect = () => {
    signOut()
    setConnected(false)
  }

  return (
    <div className="flex h-full flex-col px-6 py-8">
      <h1 className="mb-6 text-lg font-semibold text-teal-950">Ajustes</h1>

      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-teal-100 bg-white p-4">
          <p className="mb-1 text-sm font-medium text-teal-950">Cuenta de Google</p>
          <p className="mb-3 text-sm text-teal-900/60">
            Conecta tu cuenta para guardar los tickets en Drive y Sheets.
          </p>
          {connected ? (
            <>
              <p className="mb-3 text-sm text-teal-700">Conectado ✓</p>
              <Button variant="secondary" onClick={handleDisconnect} className="w-full py-2.5">
                Desconectar
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleConnect}
                disabled={status === 'connecting'}
                className="w-full py-2.5"
              >
                {status === 'connecting' ? 'Conectando...' : 'Conectar con Google'}
              </Button>
              {status === 'error' && (
                <p className="mt-2 text-sm text-red-600">
                  No se pudo conectar. Inténtalo de nuevo.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <p className="mt-auto pt-6 text-center text-xs text-teal-900/30">
        Versión {__APP_VERSION__} ·{' '}
        {new Date(__BUILD_TIME__).toLocaleString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </div>
  )
}
