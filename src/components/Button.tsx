import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary'
}

export function Button({ children, variant = 'primary', className = '', ...rest }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded-2xl font-medium transition active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100'
  const variants = {
    primary: 'bg-teal-700 text-white shadow-lg shadow-teal-900/20 hover:bg-teal-800',
    secondary: 'bg-white text-teal-900 border border-teal-200 hover:bg-teal-50',
  }

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}
