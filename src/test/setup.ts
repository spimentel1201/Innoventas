import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'

// jsdom no implementa scroll (usado por el autoscroll del chat)
Element.prototype.scrollTo = () => {}

// Node ≥ 24/25 expone un `localStorage` global propio (requiere --localstorage-file)
// que en el entorno de pruebas pisa el de jsdom y llega vacío, sin la API Web
// Storage. Si el storage disponible no es funcional, lo reemplazamos por un almacén
// en memoria con la misma interfaz para que las pruebas usen `localStorage` real.
function isWebStorage(value: unknown): value is Storage {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Storage).getItem === 'function' &&
    typeof (value as Storage).setItem === 'function' &&
    typeof (value as Storage).removeItem === 'function' &&
    typeof (value as Storage).clear === 'function'
  )
}

if (!isWebStorage(window.localStorage)) {
  let store: Record<string, string> = {}
  const memoryStorage: Storage = {
    get length() {
      return Object.keys(store).length
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null
    },
    setItem(key: string, value: string) {
      store[key] = String(value)
    },
    removeItem(key: string) {
      delete store[key]
    },
    clear() {
      store = {}
    },
  }
  Object.defineProperty(window, 'localStorage', {
    value: memoryStorage,
    configurable: true,
    writable: true,
  })
  if (globalThis !== (window as unknown as typeof globalThis)) {
    Object.defineProperty(globalThis, 'localStorage', {
      value: memoryStorage,
      configurable: true,
      writable: true,
    })
  }
}

// localStorage limpio entre pruebas para no contaminar el carrito/sesión
beforeEach(() => {
  window.localStorage.clear()
})