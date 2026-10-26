import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { OrderStatus } from '@/types/database'
import { adminSetOrderStatus, fetchMyOrders, fetchOrderByNumber, trackOrderByNumberAndEmail } from './api'

export function useMyOrders() {
  return useQuery({
    queryKey: ['orders', 'mine'] as const,
    queryFn: fetchMyOrders,
  })
}

export function useOrderDetail(orderNumber: string) {
  return useQuery({
    queryKey: ['orders', 'detail', orderNumber] as const,
    queryFn: () => fetchOrderByNumber(orderNumber),
  })
}

export function useTrackOrderMutation() {
  return useMutation({
    mutationFn: ({ orderNumber, email }: { orderNumber: string; email: string }) =>
      trackOrderByNumberAndEmail(orderNumber, email),
  })
}

/** Lista de administración de pedidos (RLS permite lectura completa a admins). */
export async function fetchAdminOrders(status: OrderStatus | 'all') {
  let query = supabase
    .from('orders')
    .select('id, order_number, email, status, total, item_count, created_at')
    .order('created_at', { ascending: false })
    .limit(200)
  if (status !== 'all') query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as unknown as Array<{
    id: string
    order_number: string
    email: string
    status: string
    total: number
    item_count: number
    created_at: string
  }>
}

export function useAdminOrders(status: OrderStatus | 'all') {
  return useQuery({
    queryKey: ['admin', 'orders', status] as const,
    queryFn: () => fetchAdminOrders(status),
    placeholderData: keepPreviousData,
  })
}

export function useAdminSetOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      adminSetOrderStatus(orderId, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })
}
