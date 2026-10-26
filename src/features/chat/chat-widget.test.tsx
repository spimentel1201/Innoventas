import { render, fireEvent, waitFor, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ChatWidget } from './chat-widget'
import * as chatApi from './chat-api'

vi.mock('./chat-api', () => ({
  sendChatMessage: vi.fn(),
  getChatHistory: vi.fn(),
  toChatMessage: (row: { id: string; role: string; content: string; created_at: string; confidence: number | null }) => ({
    id: row.id,
    role: row.role === 'user' ? 'user' : 'assistant',
    content: row.content,
    confidence: row.confidence,
    createdAt: row.created_at,
  }),
}))

function renderWidget() {
  return render(
    <MemoryRouter>
      <ChatWidget />
    </MemoryRouter>,
  )
}

async function openPanel() {
  vi.mocked(chatApi.getChatHistory).mockResolvedValue(null)
  renderWidget()
  await waitFor(() => screen.getByRole('button', { name: /abrir asistente/i }))
  fireEvent.click(screen.getByRole('button', { name: /abrir asistente/i }))
  return screen.getByLabelText('Mensaje para el asistente')
}

describe('ChatWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('abre el panel y muestra sugerencias', async () => {
    await openPanel()
    expect(screen.getByText('¿Qué laptops tienen disponibles?')).toBeInTheDocument()
  })

  it('envía mensaje y muestra la respuesta del asistente', async () => {
    await openPanel()
    vi.mocked(chatApi.sendChatMessage).mockResolvedValue({
      conversationId: 'c1',
      message: {
        id: 'a1',
        role: 'assistant',
        content: '¡Hola! Te ayudo con tu pedido.',
        created_at: new Date().toISOString(),
        confidence: 0.9,
      },
      mode: 'azure',
    } as never)

    const input = screen.getByLabelText('Mensaje para el asistente')
    fireEvent.change(input, { target: { value: '¿Cuánto tarda el envío?' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar mensaje/i }))

    await waitFor(() => expect(chatApi.sendChatMessage).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByText('¡Hola! Te ayudo con tu pedido.')).toBeInTheDocument())
  })

  it('falla con gracia cuando la Edge Function no responde', async () => {
    await openPanel()
    vi.mocked(chatApi.sendChatMessage).mockRejectedValue(new Error('fetch failed'))

    const input = screen.getByLabelText('Mensaje para el asistente')
    fireEvent.change(input, { target: { value: 'hola' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar mensaje/i }))

    // el optimistic user message se agrega y luego se retira tras el error
    await waitFor(() => expect(chatApi.sendChatMessage).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('hola')).not.toBeInTheDocument()
    // el estado vuelve a abierto de nuevo (input interactivo)
    expect(input).toBeEnabled()
  })
})
