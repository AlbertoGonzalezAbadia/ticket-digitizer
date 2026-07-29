export type Screen = 'camera' | 'history' | 'settings'

interface BottomNavProps {
  active: Screen
  onChange: (screen: Screen) => void
}

const items: { id: Screen; label: string }[] = [
  { id: 'camera', label: 'Inicio' },
  { id: 'history', label: 'Historial' },
  { id: 'settings', label: 'Ajustes' },
]

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="flex shrink-0 border-t border-teal-100 bg-white pb-[env(safe-area-inset-bottom)]">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`flex-1 py-3 text-sm font-medium transition ${
            active === item.id ? 'text-teal-800' : 'text-teal-900/40'
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}
