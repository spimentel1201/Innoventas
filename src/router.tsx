import { createBrowserRouter, Navigate, Outlet, useRouteError, Link } from 'react-router-dom'
import { AppLayout } from '@/layouts/app-layout'
import { AdminLayout } from '@/layouts/admin-layout'
import { GuestOnly, RequireAdmin, RequireAuth } from '@/features/auth/guards'

/* Páginas públicas */
import { HomePage } from '@/pages/home'
import { CatalogPage } from '@/pages/catalog'
import { ProductDetailPage } from '@/pages/product-detail'
import { CategoriesPage } from '@/pages/categories'
import { OffersPage } from '@/pages/offers'
import { BestSellersPage } from '@/pages/best-sellers'
import { CartPage } from '@/pages/cart'
import { CheckoutPage } from '@/pages/checkout'
import { OrderConfirmationPage } from '@/pages/order-confirmation'
import { OrderTrackingPage } from '@/pages/order-tracking'
import { ContactPage } from '@/pages/contact'
import { FaqPage } from '@/pages/faq'
import { PolicyPage } from '@/pages/policies'
import { NotFoundPage } from '@/pages/not-found'

/* Autenticación */
import { LoginPage } from '@/pages/auth/login'
import { RegisterPage } from '@/pages/auth/register'
import { ForgotPasswordPage } from '@/pages/auth/forgot-password'

/* Cuenta */
import { AccountOrdersPage } from '@/pages/account/orders'
import { AccountProfilePage } from '@/pages/account/profile'

/* Administración */
import { AdminDashboardPage } from '@/pages/admin/dashboard'
import { AdminProductsPage } from '@/pages/admin/products'
import { AdminOffersPage } from '@/pages/admin/offers'
import { AdminOrdersPage, AdminSupportPage } from '@/pages/admin/orders-support'

/** ErrorBoundary de ruta: evita la pantalla cruda "Unexpected Application Error". */
function RouteErrorBoundary() {
  const error = useRouteError()
  return (
    <div className="container flex max-w-xl flex-col items-center pb-20 pt-16 text-center">
      <p className="font-display text-5xl font-bold text-slate-900">😬</p>
      <h1 className="mt-4 font-display text-xl font-semibold text-slate-900">Algo salió mal</h1>
      <p className="mt-2 text-sm text-slate-500">
        Ocurrió un error inesperado en esta página. Puedes volver al inicio e intentarlo de nuevo.
      </p>
      <p className="mt-2 max-w-md truncate text-xs text-slate-400" title={String(error)}>
        {error instanceof Error ? error.message : String(error ?? '')}
      </p>
      <Link to="/" className="mt-6 inline-flex h-10 items-center rounded-lg bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700">
        Volver al inicio
      </Link>
    </div>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'catalogo', element: <CatalogPage /> },
      { path: 'producto/:slug', element: <ProductDetailPage /> },
      { path: 'categorias', element: <CategoriesPage /> },
      { path: 'ofertas', element: <OffersPage /> },
      { path: 'mas-vendidos', element: <BestSellersPage /> },
      { path: 'carrito', element: <CartPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'pedido-confirmado/:orderNumber', element: <OrderConfirmationPage /> },
      { path: 'seguimiento', element: <OrderTrackingPage /> },
      { path: 'faq', element: <FaqPage /> },
      { path: 'contacto', element: <ContactPage /> },
      { path: 'politicas/:slug', element: <PolicyPage /> },

      /* Autenticación (solo visitantes) */
      {
        element: <GuestOnly><Outlet /></GuestOnly>,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'registro', element: <RegisterPage /> },
        ],
      },
      /* Recuperación: funciona con y sin sesión (enlace del correo de reset). */
      { path: 'recuperar-password', element: <ForgotPasswordPage /> },

      /* Cuenta (requiere sesión) */
      {
        element: <RequireAuth />,
        children: [
          { path: 'cuenta/perfil', element: <AccountProfilePage /> },
          { path: 'cuenta/pedidos', element: <AccountOrdersPage /> },
        ],
      },

      /* Administración (rol validado por RLS/RPC; el cliente solo oculta) */
      {
        element: <RequireAdmin />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { path: 'admin', element: <AdminDashboardPage /> },
              { path: 'admin/productos', element: <AdminProductsPage /> },
              { path: 'admin/ofertas', element: <AdminOffersPage /> },
              { path: 'admin/pedidos', element: <AdminOrdersPage /> },
              { path: 'admin/soporte', element: <AdminSupportPage /> },
            ],
          },
        ],
      },

      { path: 'cuenta', element: <Navigate to="/cuenta/pedidos" replace /> },
      { path: 'iniciar-sesion', element: <Navigate to="/login" replace /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
