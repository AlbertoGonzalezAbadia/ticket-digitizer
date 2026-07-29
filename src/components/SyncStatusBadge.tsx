interface SyncStatusBadgeProps {
  pendingCount: number
}

export function SyncStatusBadge({ pendingCount }: SyncStatusBadgeProps) {
  if (pendingCount === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-teal-700">
        <span className="h-2 w-2 rounded-full bg-teal-500" />
        Todo sincronizado
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-amber-700">
      <span className="h-2 w-2 rounded-full bg-amber-500" />
      {pendingCount} pendiente{pendingCount === 1 ? '' : 's'}
    </span>
  )
}
