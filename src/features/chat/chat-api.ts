import { invokeEdgeFunction } from '@/lib/edge'
import type { ChatAnswerMode, ChatMessage, ChatMessageMetadata } from '@/types/domain'

export type { ChatAnswerMode }

/** Mensaje como lo entrega la Edge Function (fecha en formato BD). */
export interface ChatMessageRow {
  id: string
  role: string
  content: string
  created_at: string
  confidence: number | null
  metadata?: ChatMessageMetadata | null
}

export function toChatMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    role: row.role === 'user' ? 'user' : 'assistant',
    content: row.content,
    confidence: row.confidence,
    createdAt: row.created_at,
    metadata: row.metadata ?? null,
  }
}

/** Envía un mensaje al asistente (Edge Function con Azure CQA en el servidor). */
export async function sendChatMessage(body: {
  message: string
  sessionId: string
}): Promise<{ conversationId: string; message: ChatMessageRow; mode: ChatAnswerMode }> {
  return invokeEdgeFunction('chat', body)
}

export interface ChatHistoryResponse {
  conversationId: string | null
  messages: ChatMessageRow[]
}

/** Recupera el historial por sessionId (la Edge Function valida la propiedad). */
export async function getChatHistory(sessionId: string): Promise<ChatHistoryResponse | null> {
  return invokeEdgeFunction<ChatHistoryResponse | null>('chat', undefined, {
    method: 'GET',
    headers: { 'x-innov-session': sessionId },
  })
}
