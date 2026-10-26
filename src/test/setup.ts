import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'

// jsdom no implementa scroll (usado por el autoscroll del chat)
Element.prototype.scrollTo = () => {}

// localStorage limpio entre pruebas para no contaminar el carrito/sesión
beforeEach(() => {
  window.localStorage.clear()
})