import { describe, expect, it } from 'vitest'
import { clamp, formatMoney, initials, sanitizeSearchQuery, slugify, confidentConfidenceLabel } from '@/lib/utils'

describe('formatMoney', () => {
  it('formata soles (PEN) con símbolo S/ y locale es-PE', () => {
    expect(formatMoney(1499)).toMatch(/^S\/\s1,499\.00$/u)
    expect(formatMoney(15)).toMatch(/^S\/\s15\.00$/u)
  })
  it('devuelve — para valores nulos', () => {
    expect(formatMoney(null)).toBe('—')
  })
})

describe('slugify', () => {
  it('remueve acentos y normaliza', () => {
    expect(slugify('Laptop-proof Ñoño 14"')).toBe('laptop-proof-nono-14')
  })
})

describe('clamp', () => {
  it('limita dentro del rango', () => {
    expect(clamp(15, 1, 10)).toBe(10)
    expect(clamp(-3, 0, 10)).toBe(0)
    expect(clamp(5, 0, 10)).toBe(5)
  })
})

describe('initials', () => {
  it('toma dos iniciales', () => {
    expect(initials('Ana López Reyes')).toBe('AL')
  })
  it('usa U como respaldo', () => {
    expect(initials('   ')).toBe('U')
  })
})

describe('sanitizeSearchQuery', () => {
  it('elimina caracteres peligrosos para PostgREST', () => {
    expect(sanitizeSearchQuery('  lapt%op(1)  ')).toBe('laptop1')
  })
})

describe('confidentConfidenceLabel', () => {
  it('clasifica por rangos', () => {
    expect(confidentConfidenceLabel(0.9)).toBe('Alta confianza')
    expect(confidentConfidenceLabel(0.5)).toBe('Confianza media')
    expect(confidentConfidenceLabel(0.2)).toBe('Baja confianza')
    expect(confidentConfidenceLabel(null)).toBeNull()
  })
})
