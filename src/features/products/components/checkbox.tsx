import type { ChangeEvent } from 'react'

export function Checkbox({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const handle = (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)
  return (
    <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={handle}
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      {label}
    </label>
  )
}
