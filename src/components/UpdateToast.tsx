import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from './Button'

export function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed inset-x-4 top-4 z-50 flex items-center justify-between gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-xl">
      <p className="text-sm leading-snug">Hay una actualización disponible.</p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="rounded-lg px-2 py-1 text-sm text-slate-300"
        >
          Más tarde
        </button>
        <Button onClick={() => updateServiceWorker(true)} className="px-3 py-1.5 text-sm">
          Actualizar
        </Button>
      </div>
    </div>
  )
}
