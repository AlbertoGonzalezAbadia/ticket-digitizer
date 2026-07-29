import { useEffect, useState } from 'react'
import { Button } from './Button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface InstallPromptProps {
  /** Only surface the banner once the caller has a good reason to show it (e.g. after a first successful scan). */
  eligible: boolean
}

export function InstallPrompt({ eligible }: InstallPromptProps) {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!deferredEvent || !eligible || dismissed) return null

  const install = async () => {
    await deferredEvent.prompt()
    await deferredEvent.userChoice
    setDeferredEvent(null)
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 flex items-center justify-between gap-3 rounded-2xl bg-teal-900 px-4 py-3 text-white shadow-xl">
      <p className="text-sm leading-snug">
        Instala la app en tu pantalla de inicio para acceder más rápido.
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-lg px-2 py-1 text-sm text-teal-200"
        >
          Ahora no
        </button>
        <Button onClick={install} className="px-3 py-1.5 text-sm">
          Instalar
        </Button>
      </div>
    </div>
  )
}
