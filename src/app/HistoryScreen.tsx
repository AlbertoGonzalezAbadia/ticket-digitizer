export function HistoryScreen() {
  return (
    <div className="flex h-full flex-col px-6 py-8">
      <h1 className="mb-6 text-lg font-semibold text-teal-950">Historial</h1>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-teal-900/50">
        <p>Todavía no hay tickets guardados.</p>
        <p className="text-sm">Los tickets que escanees aparecerán aquí.</p>
      </div>
    </div>
  )
}
