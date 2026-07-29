import { useRef, useState, type ChangeEvent } from 'react'
import { SyncStatusBadge } from '../components/SyncStatusBadge'
import { useTickets } from '../state/TicketsContext'

interface CameraScreenProps {
  onCaptured: (ticketId: string) => void
}

type CaptureState = 'idle' | 'processing' | 'error'

const STATUS_TEXT: Record<CaptureState, string> = {
  idle: 'Toca para escanear un ticket',
  processing: 'Analizando ticket...',
  error: 'No se pudo guardar. Inténtalo de nuevo.',
}

export function CameraScreen({ onCaptured }: CameraScreenProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const { pendingCount, captureTicket } = useTickets()
  const [state, setState] = useState<CaptureState>('idle')

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setState('processing')
    try {
      const ticketId = await captureTicket(file)
      setState('idle')
      onCaptured(ticketId)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 2000)
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
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          disabled={state === 'processing'}
          className="hidden"
          id="camera-input"
        />
        <label
          htmlFor="camera-input"
          className={`flex h-40 w-40 items-center justify-center rounded-full bg-teal-700 text-white shadow-2xl shadow-teal-900/30 transition active:scale-95 ${
            state === 'processing' ? 'pointer-events-none opacity-70' : 'cursor-pointer'
          }`}
          aria-label="Hacer foto de un ticket"
        >
          {state === 'processing' ? (
            <svg
              className="h-12 w-12 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
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
          )}
        </label>
        <p className={`text-sm ${state === 'error' ? 'text-red-600' : 'text-teal-900/60'}`}>
          {STATUS_TEXT[state]}
        </p>

        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          disabled={state === 'processing'}
          className="hidden"
          id="upload-input"
        />
        <label
          htmlFor="upload-input"
          className={`text-sm font-medium text-teal-700 underline underline-offset-2 ${
            state === 'processing' ? 'pointer-events-none opacity-50' : 'cursor-pointer'
          }`}
        >
          Subir factura (PDF o imagen)
        </label>
      </div>

      <div className="h-10" />
    </div>
  )
}
