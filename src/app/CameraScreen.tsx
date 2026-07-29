import { useRef, useState, type ChangeEvent } from 'react'
import { SyncStatusBadge } from '../components/SyncStatusBadge'
import { useTickets } from '../state/TicketsContext'

interface CameraScreenProps {
  onCapture: () => void
}

type CaptureState = 'idle' | 'saving' | 'saved' | 'error'

const STATUS_TEXT: Record<CaptureState, string> = {
  idle: 'Toca para escanear un ticket',
  saving: 'Guardando...',
  saved: 'Guardado ✓',
  error: 'No se pudo guardar. Inténtalo de nuevo.',
}

export function CameraScreen({ onCapture }: CameraScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { pendingCount, captureTicket } = useTickets()
  const [state, setState] = useState<CaptureState>('idle')

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return

    setState('saving')
    try {
      await captureTicket(file)
      setState('saved')
      onCapture()
    } catch {
      setState('error')
    } finally {
      setTimeout(() => setState('idle'), 1500)
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-between px-6 py-8">
      <div className="flex w-full items-center justify-between">
        <h1 className="text-lg font-semibold text-teal-950">Tickets</h1>
        <SyncStatusBadge pendingCount={pendingCount} />
      </div>

      <div className="flex flex-col items-center gap-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          disabled={state === 'saving'}
          className="hidden"
          id="camera-input"
        />
        <label
          htmlFor="camera-input"
          className={`flex h-40 w-40 items-center justify-center rounded-full bg-teal-700 text-white shadow-2xl shadow-teal-900/30 transition active:scale-95 ${
            state === 'saving' ? 'pointer-events-none opacity-70' : 'cursor-pointer'
          }`}
          aria-label="Hacer foto de un ticket"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-16 w-16"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 0 1 8.94 4.5h6.12a2.31 2.31 0 0 1 2.113 1.675l.415 1.325h1.163c1.145 0 2.075.93 2.075 2.075v8.05a2.075 2.075 0 0 1-2.075 2.075H4.25a2.075 2.075 0 0 1-2.075-2.075v-8.05c0-1.146.93-2.075 2.075-2.075H5.4l.415-1.325a2.31 2.31 0 0 1 1.012-1.5Z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.25a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" />
          </svg>
        </label>
        <p className={`text-sm ${state === 'error' ? 'text-red-600' : 'text-teal-900/60'}`}>
          {STATUS_TEXT[state]}
        </p>
      </div>

      <div className="h-10" />
    </div>
  )
}
