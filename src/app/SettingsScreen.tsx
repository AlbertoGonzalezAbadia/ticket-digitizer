import { Button } from '../components/Button'

export function SettingsScreen() {
  return (
    <div className="flex h-full flex-col px-6 py-8">
      <h1 className="mb-6 text-lg font-semibold text-teal-950">Ajustes</h1>

      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-teal-100 bg-white p-4">
          <p className="mb-1 text-sm font-medium text-teal-950">Cuenta de Google</p>
          <p className="mb-3 text-sm text-teal-900/60">
            Conecta tu cuenta para guardar los tickets en Drive y Sheets.
          </p>
          <Button disabled className="w-full py-2.5">
            Próximamente
          </Button>
        </div>
      </div>
    </div>
  )
}
