import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { LOCALE, CURRENCY } from '@/lib/config'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const moneyFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  currencyDisplay: 'narrowSymbol', // "S/" en lugar de "PEN"
  minimumFractionDigits: 2,
})

export function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return moneyFormatter.format(value)
}

/** Versión compacta para espacios chicos (badges): omite ",00" cuando es entero. */
export function formatMoneyCompact(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return Number.isInteger(value) ? value.toLocaleString(LOCALE) : moneyFormatter.format(value)
}

export function formatDate(
  iso: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat(LOCALE, opts).format(new Date(iso))
  } catch {
    return '—'
  }
}

export function formatDateTime(iso: string | null | undefined): string {
  return formatDate(iso, { dateStyle: 'medium', timeStyle: 'short' })
}

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'U'
}

/** Sanitiza texto de búsqueda antes de construir filtros PostgREST (ilike). */
export function sanitizeSearchQuery(q: string): string {
  return q.trim().replace(/[%(),*]/g, '').slice(0, 80)
}

export function confidentConfidenceLabel(confidence: number | null): string | null {
  if (confidence == null) return null
  if (confidence >= 0.75) return 'Alta confianza'
  if (confidence >= 0.45) return 'Confianza media'
  return 'Baja confianza'
}
