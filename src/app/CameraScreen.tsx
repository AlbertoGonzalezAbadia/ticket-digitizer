import { useRef } from 'react'
import { SyncStatusBadge } from '../components/SyncStatusBadge'

interface CameraScreenProps {
  onCapture: () => void
}

export function CameraScreen({ onCapture }: CameraScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = () => {
    // Capture -> IndexedDB queue + OCR pipeline lands in M2/M3.
    // For now this confirms the native camera opens correctly on-device.
    onCapture()
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex h-full flex-col items-center justify-between px-6 py-8">
      <div className="flex w-full items-center justify-between">
        <h1 className="text-lg font-semibold text-teal-950">Tickets</h1>
        <SyncStatusBadge pendingCount={0} />
      </div>

      <div className="flex flex-col items-center gap-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          id="camera-input"
        />
        <label
          htmlFor="camera-input"
          className="flex h-40 w-40 cursor-pointer items-center justify-center rounded-full bg-teal-700 text-white shadow-2xl shadow-teal-900/30 transition active:scale-95"
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
        <p className="text-sm text-teal-900/60">Toca para escanear un ticket</p>
      </div>

      <div className="h-10" />
    </div>
  )
}
