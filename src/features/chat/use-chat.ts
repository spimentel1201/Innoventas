import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { CHAT_SESSION_KEY } from '@/lib/config'
import { CHAT_SUGGESTIONS } from '@/lib/constants'
import { getChatHistory, sendChatMessage, toChatMessage } from './chat-api'
import type { ChatMessage } from '@/types/domain'

function getSessionId(): string {
  try {
    const existing = window.localStorage.getItem(CHAT_SESSION_KEY)
    if (existing) return existing
    const fresh = window.crypto.randomUUID()
    window.localStorage.setItem(CHAT_SESSION_KEY, fresh)
    return fresh
  } catch {
    return 'anon-session'
  }
}

export type ChatStatus = 'open' | 'loading' | 'error'

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [status, setStatus] = useState<ChatStatus>('open')
  const [historyLoadedRef] = useState<{ val: boolean }>({ val: false })
  const sessionIdRef = useRef<string | null>(null)

  const ensureSession = useCallback(() => {
    if (!sessionIdRef.current) sessionIdRef.current = getSessionId()
    return sessionIdRef.current
  }, [])

  useEffect(() => {
    if (!sessionIdRef.current) sessionIdRef.current = getSessionId()
  }, [])

  const loadHistory = useCallback(async () => {
    if (historyLoadedRef.val) return
    const sessionId = ensureSession()
    try {
      const res = await getChatHistory(sessionId)
      if (res) {
        setConversationId(res.conversationId)
        setMessages(res.messages.slice(-25).map(toChatMessage))
      }
    } catch {
      // Historial opcional: la conversación continúa en el cliente
    } finally {
      historyLoadedRef.val = true
    }
  }, [ensureSession, historyLoadedRef])

  const send = useCallback(
    async (rawMessage: string) => {
      const text = rawMessage.trim()
      if (!text) return
      const sessionId = ensureSession()
      const optimistic: ChatMessage = {
        id: `local-${Date.now()}`,
        role: 'user',
        content: text,
        confidence: null,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, optimistic])
      setStatus('loading')
      try {
        const res = await sendChatMessage({ message: text, sessionId })
        setConversationId(res.conversationId)
        setMessages((prev) => [
          ...prev,
          toChatMessage(res.message),
        ])
        setStatus('open')
      } catch (err) {
        setStatus('error')
        const code = (err as { code?: string }).code
        if (code === 'TOO_MANY_MESSAGES') {
          toast.error('Demasiados mensajes seguidos; espera unos segundos.')
        } else {
          toast.error('El asistente no está disponible. Inténtalo más tarde o escríbenos vía contacto.')
        }
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      }
    },
    [ensureSession],
  )

  return {
    messages,
    conversationId,
    status,
    isBusy: status === 'loading',
    send,
    loadHistory,
    suggestions: CHAT_SUGGESTIONS,
  }
}
