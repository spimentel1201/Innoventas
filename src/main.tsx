import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { queryClient } from '@/lib/query-client'
import { AuthProvider } from '@/features/auth/auth-context'
import { CartProvider } from '@/features/cart/cart-context'
import { router } from '@/router'
import '@/styles.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('No se encontró el elemento #root en index.html')

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <RouterProvider router={router} />
          {/* Notificaciones globales (top-center para no tapar el chat). */}
          <Toaster
            position="top-center"
            richColors
            closeButton
            toastOptions={{
              classNames: { toast: 'font-sans' },
            }}
          />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
