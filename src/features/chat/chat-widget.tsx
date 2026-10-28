import { useEffect, useRef, useState } from 'react'
import { Bot, Handshake, MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { confidentConfidenceLabel } from '@/lib/utils'
import { useChat } from './use-chat'
import { KitCartButton } from './kit-cart-button'
import { type ChatAnswerMode, type ChatMessage } from '@/types/domain'

/** Render mínimo de markdown del asistente: **negrita**, [enlaces](/ruta) y saltos de línea. */
function renderAssistantContent(content: string, onNavigate?: () => void) {
  const lines = content.split('\n')
  return lines.map((line, li) => (
    <span key={li}>
      {li > 0 && <br />}
      {line
        .split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g)
        .filter(Boolean)
        .map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={i} className="font-semibold">
                {part.slice(2, -2)}
              </strong>
            )
          }
          const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
          if (link && (link[2].startsWith('/') || link[2].startsWith('http'))) {
            return (
              <Link
                key={i}
                to={link[2]}
                onClick={onNavigate}
                className="font-medium text-brand-700 underline-offset-2 hover:underline"
              >
                {link[1]}
              </Link>
            )
          }
          return <span key={i}>{part}</span>
        })}
    </span>
  ))
}

/** Indicador de origen en pruebas: (A) Azure · (W) base de datos de la tienda · (F) fallback. */
function sourceTagOf(mode: ChatAnswerMode | undefined): string | null {
  if (!mode) return null
  if (mode === 'azure') return 'A'
  if (mode === 'fallback') return 'F'
  return 'W'
}

function MessageBubble({ message, onNavigate }: { message: ChatMessage; onNavigate?: () => void }) {
  const isUser = message.role === 'user'
  const lowConfidence = !isUser && message.confidence != null && message.confidence < 0.35
  const tag = isUser ? null : sourceTagOf(message.metadata?.mode)
  return (
    <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm',
          isUser
            ? 'bg-brand-600 text-white rounded-br-sm'
            : 'border border-slate-200 bg-white text-slate-800 rounded-bl-sm',
        )}
      >
        {isUser ? (
          message.content
        ) : (
          <>
            {tag && (
              <span
                className="mr-1 font-mono text-[10px] text-slate-400"
                title={
                  tag === 'A'
                    ? 'Respuesta de Azure'
                    : tag === 'W'
                      ? 'Respuesta de la base de datos de la tienda'
                      : 'Respuesta de reserva'
                }
              >
                ({tag})
              </span>
            )}
            {renderAssistantContent(message.content, onNavigate)}
          </>
        )}
      </div>
      {lowConfidence && (
        <span className="mt-1 text-[10px] text-amber-600">Respuesta con baja confianza</span>
      )}
    </div>
  )
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const scrollerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { messages, isBusy, send, loadHistory, suggestions } = useChat()

  // Última respuesta del asistente: de ahí salen los chips del kit y el botón al carrito.
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant') ?? null
  const kitState = lastAssistant?.metadata?.kit ?? null
  const kitChoosing = kitState?.status === 'choosing' ? kitState : null
  const kitDone = kitState?.status === 'done' && kitState.selections.length > 0 ? kitState : null

  useEffect(() => {
    if (open) {
      void loadHistory()
      const id = window.setTimeout(() => inputRef.current?.focus(), 150)
      return () => window.clearTimeout(id)
    }
  }, [open, loadHistory])

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isBusy])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input
    if (!text.trim()) return
    setInput('')
    void send(text)
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 print:hidden">
      {open ? (
        <section
          className="flex h-[520px] max-h-[80vh] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-panel"
          aria-label="Asistente de InnovVentas"
          role="dialog"
        >
          <header className="flex items-center justify-between gap-2 bg-brand-700 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" aria-hidden />
              <div>
                <p className="font-display text-sm font-semibold leading-tight">Asistente InnovVentas</p>
                <p className="text-[11px] text-brand-200">Respondemos dudas de la tienda</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar asistente"
              className="rounded-lg p-1.5 hover:bg-brand-600"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500">
                <p className="flex items-center gap-1.5 font-medium text-slate-700">
                  <Sparkles className="h-3.5 w-3.5 text-brand-500" /> ¡Hola! Soy el asistente de InnovVentas.
                </p>
                <p className="mt-1">
                  Pregúntame sobre productos, envíos, garantías o cómo rastrear tu pedido. Usa los botones
                  de abajo para recorrer el catálogo o escribe tu consulta.
                </p>
              </div>
            )}
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} onNavigate={() => setOpen(false)} />
            ))}
            {isBusy && (
              <div className="flex items-center gap-1 text-slate-400" aria-live="polite">
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:120ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:240ms]" />
                <span className="ml-1 text-xs">Escribiendo…</span>
              </div>
            )}
          </div>

          {kitDone && (
            <div className="border-t border-slate-200 bg-white px-4 py-2">
              <KitCartButton kit={kitDone} onDone={() => setOpen(false)} />
            </div>
          )}

          {/* Kit en curso: chips con las opciones del paso actual. */}
          {kitChoosing ? (
            <div
              role="group"
              aria-label="Opciones del kit"
              className="flex max-h-[76px] flex-wrap gap-1.5 overflow-y-auto border-t border-slate-200 px-4 py-2"
            >
              {kitChoosing.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  disabled={isBusy}
                  onClick={() => void send(o.name)}
                  className="rounded-full border border-brand-300 bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-800 hover:border-brand-500 hover:text-brand-900 disabled:opacity-50"
                >
                  {o.name}
                </button>
              ))}
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void send('siguiente')}
                className="rounded-full border border-dashed border-slate-300 bg-white px-2.5 py-1 text-[11px] text-slate-500 hover:border-slate-400 disabled:opacity-50"
              >
                Siguiente →
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void send('es todo')}
                className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:border-emerald-500 disabled:opacity-50"
              >
                ✅ Es todo
              </button>
            </div>
          ) : (
          <div className="flex max-h-[76px] flex-wrap gap-1.5 overflow-y-auto border-t border-slate-200 px-4 py-2">
            {suggestions.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => void send(s.message)}
                disabled={isBusy}
                className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] text-slate-600 hover:border-brand-400 hover:text-brand-700 disabled:opacity-50"
              >
                {s.label}
              </button>
            ))}
          </div>
          )}

          <div className="flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-2.5">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend(e)
              }}
              placeholder="Escribe tu pregunta…"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              aria-label="Mensaje para el asistente"
            />
            <Button type="button" size="icon" onClick={handleSend} loading={isBusy} aria-label="Enviar mensaje">
              {!isBusy && <Send className="h-4 w-4" />}
            </Button>
          </div>
          <div className="bg-slate-100 px-4 py-2 text-center text-[11px] text-slate-500">
            ¿Respuesta poco clara?{' '}
            <Link to="/contacto" onClick={() => setOpen(false)} className="font-medium text-brand-700 hover:underline">
              Contacta al equipo humano
            </Link>
          </div>
        </section>
      ) : (
        <Button
          type="button"
          size="lg"
          className="h-14 w-14 rounded-full p-0 shadow-panel"
          onClick={() => setOpen(true)}
          aria-label="Abrir asistente"
        >
          <MessageCircle className="h-6 w-6" aria-hidden />
        </Button>
      )}
    </div>
  )
}

export function ChatHandoffHint() {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-brand-700">
      <Handshake className="h-3.5 w-3.5" /> Atención humana disponible
    </span>
  )
}
