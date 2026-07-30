import { useState } from 'react'
import { Button } from '../components/Button'
import { isSignedIn, signIn, signOut } from '../lib/google/auth'
import { useTickets } from '../state/TicketsContext'

function DeleteAllCard() {
  const { tickets, deleteAllTickets } = useTickets()
  const [deleting, setDeleting] = useState(false)
  const unsyncedCount = tickets.filter((t) => t.status !== 'synced').length

  if (tickets.length === 0) return null

  const handleClick = async () => {
    const warning =
      unsyncedCount > 0
        ? `¿Borrar los ${tickets.length} tickets de la app? ${unsyncedCount} todavía no se han sincronizado — sus datos se perderán. Lo que ya está en Drive/Sheets no se toca.`
        : `¿Borrar los ${tickets.length} tickets de la app? Todos ya están sincronizados en Drive/Sheets, así que esos datos no se tocan — solo desaparecen de aquí.`
    if (!window.confirm(warning)) return
    setDeleting(true)
    await deleteAllTickets()
    setDeleting(false)
  }

  return (
    <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm shadow-teal-900/5">
      <p className="mb-1 text-sm font-medium text-teal-950">Borrar todos los tickets</p>
      <p className="mb-3 text-xs text-teal-900/60">
        Borra los {tickets.length} tickets de esta app (no de Drive/Sheets).
        {unsyncedCount > 0 && ` ${unsyncedCount} sin sincronizar se perderían.`}
      </p>
      <button
        type="button"
        onClick={handleClick}
        disabled={deleting}
        className="inline-flex w-full items-center justify-center rounded-2xl border border-red-200 bg-white py-2.5 font-medium text-red-600 transition hover:bg-red-50 active:scale-[0.97] disabled:opacity-50"
      >
        {deleting ? 'Borrando...' : 'Borrar todos'}
      </button>
    </div>
  )
}

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
        <div className="rounded-2xl border border-teal-100 bg-white p-4 shadow-sm shadow-teal-900/5">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 12h7.5M12 8.25v7.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-teal-950">Cuenta de Google</p>
              <p className="text-xs text-teal-900/60">Drive y Sheets</p>
            </div>
            {connected && (
              <span className="ml-auto inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-medium text-teal-700">
                Conectado
              </span>
            )}
          </div>
          {connected ? (
            <Button variant="secondary" onClick={handleDisconnect} className="w-full py-2.5">
              Desconectar
            </Button>
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

        <DeleteAllCard />
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
