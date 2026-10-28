import { render, fireEvent, waitFor, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ChatWidget } from './chat-widget'
import * as chatApi from './chat-api'
import type { KitState } from '@/types/domain'

vi.mock('./chat-api', () => ({
  sendChatMessage: vi.fn(),
  getChatHistory: vi.fn(),
  toChatMessage: (row: {
    id: string
    role: string
    content: string
    created_at: string
    confidence: number | null
    metadata?: import('@/types/domain').ChatMessageMetadata | null
  }) => ({
    id: row.id,
    role: row.role === 'user' ? 'user' : 'assistant',
    content: row.content,
    confidence: row.confidence,
    createdAt: row.created_at,
    metadata: row.metadata ?? null,
  }),
}))

// KitCartButton necesita el contexto del carrito; lo sustituimos para el widget.
vi.mock('@/features/cart/cart-context', () => ({
  useCart: () => ({ addItem: vi.fn() }),
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

  it('abre el panel y muestra los atajos de producto', async () => {
    await openPanel()
    expect(screen.getByRole('button', { name: 'Audífonos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Laptops' })).toBeInTheDocument()
  })

  it('al pulsar un atajo envía la pregunta de esa categoría', async () => {
    await openPanel()
    vi.mocked(chatApi.sendChatMessage).mockResolvedValue({
      conversationId: 'c1',
      message: {
        id: 'a1',
        role: 'assistant',
        content: 'Tenemos 9 audífonos en el Catálogo.',
        created_at: new Date().toISOString(),
        confidence: null,
      },
      mode: 'catalog',
    } as never)

    fireEvent.click(screen.getByRole('button', { name: 'Audífonos' }))

    await waitFor(() =>
      expect(chatApi.sendChatMessage).toHaveBeenCalledWith({
        message: '¿Qué audífonos tienen disponibles?',
        sessionId: expect.any(String),
      }),
    )
    await waitFor(() => screen.getByText('Tenemos 9 audífonos en el Catálogo.'))
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

  it('marca el origen de la respuesta: (A) para Azure y (W) para la base de datos', async () => {
    await openPanel()
    const input = screen.getByLabelText('Mensaje para el asistente')

    vi.mocked(chatApi.sendChatMessage).mockResolvedValue({
      conversationId: 'c1',
      message: {
        id: 'a1',
        role: 'assistant',
        content: 'El envío cuesta S/ 15.',
        created_at: new Date().toISOString(),
        confidence: 0.9,
        metadata: { mode: 'azure' },
      },
      mode: 'azure',
    } as never)
    fireEvent.change(input, { target: { value: '¿Cuánto tarda el envío?' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar mensaje/i }))
    await waitFor(() => expect(screen.getByText('(A)')).toBeInTheDocument())

    vi.mocked(chatApi.sendChatMessage).mockResolvedValue({
      conversationId: 'c1',
      message: {
        id: 'a2',
        role: 'assistant',
        content: 'Tenemos 9 audífonos.',
        created_at: new Date().toISOString(),
        confidence: null,
        metadata: { mode: 'catalog' },
      },
      mode: 'catalog',
    } as never)
    fireEvent.change(input, { target: { value: '¿Qué audífonos tienen?' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar mensaje/i }))
    await waitFor(() => expect(screen.getByText('(W)')).toBeInTheDocument())
  })

  it('en un kit muestra los chips de opciones y envía el producto elegido', async () => {
    await openPanel()
    const kitChoosing: KitState = {
      profile: 'gamer',
      categories: ['mouse', 'teclados'],
      stepIndex: 0,
      selections: [],
      options: [
        { id: 'p1', slug: 'logitech-g305-lightspeed', name: 'Logitech G305 Lightspeed', price: 179, stock: 24 },
      ],
      status: 'choosing',
      total: 0,
    }
    // mockImplementation con ids incrementales: cada respuesta es un mensaje nuevo.
    let seq = 0
    vi.mocked(chatApi.sendChatMessage).mockImplementation(async () => ({
      conversationId: 'c1',
      message: {
        id: `a${++seq}`,
        role: 'assistant',
        content: '**Paso 1/2 · mouse**',
        created_at: new Date().toISOString(),
        confidence: null,
        metadata: { mode: 'kit', kit: kitChoosing },
      },
      mode: 'kit',
    }) as never)

    const input = screen.getByLabelText('Mensaje para el asistente')
    fireEvent.change(input, { target: { value: 'armar kit gamer' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar mensaje/i }))

    const option = await screen.findByRole('button', { name: 'Logitech G305 Lightspeed' })
    fireEvent.click(option)
    await waitFor(() =>
      expect(chatApi.sendChatMessage).toHaveBeenLastCalledWith({
        message: 'Logitech G305 Lightspeed',
        sessionId: expect.any(String),
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /es todo/i }))
    await waitFor(() =>
      expect(chatApi.sendChatMessage).toHaveBeenLastCalledWith({
        message: 'es todo',
        sessionId: expect.any(String),
      }),
    )
  })

  it('al terminar el kit muestra el botón para ir al carrito con el total', async () => {
    await openPanel()
    const kitDone: KitState = {
      profile: 'gamer',
      categories: ['mouse', 'teclados'],
      stepIndex: 2,
      selections: [
        { id: 'p1', slug: 'logitech-g305-lightspeed', name: 'Logitech G305 Lightspeed', price: 179, category: 'mouse' },
      ],
      options: [],
      status: 'done',
      total: 179,
    }
    vi.mocked(chatApi.sendChatMessage).mockResolvedValue({
      conversationId: 'c1',
      message: {
        id: 'a1',
        role: 'assistant',
        content: '**Tu kit gamer está listo** ✅',
        created_at: new Date().toISOString(),
        confidence: null,
        metadata: { mode: 'kit', kit: kitDone },
      },
      mode: 'kit',
    } as never)

    const input = screen.getByLabelText('Mensaje para el asistente')
    fireEvent.change(input, { target: { value: 'es todo' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar mensaje/i }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /ir al carrito/i })).toBeInTheDocument(),
    )
  })
})
